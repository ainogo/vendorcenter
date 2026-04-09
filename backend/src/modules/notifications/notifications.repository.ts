import { pool } from "../../db/pool.js";
import nodemailer, { type Transporter } from "nodemailer";
import { env } from "../../config/env.js";
import { isFirebaseConfigured, getFirebaseMessaging } from "../../services/firebaseService.js";

type EmailAttachment = {
  filename: string;
  content: string;
  encoding: "base64";
};

type QueuedEmailJob = {
  id: string;
  recipientEmail: string;
  senderEmail: string;
  subject: string;
  bodyHtml: string;
  attachments: EmailAttachment[] | null;
  attempts: number;
};

let smtpTransporter: Transporter | null = null;

async function sendViaBrevoApi(input: {
  to: string;
  from: string;
  subject: string;
  html: string;
  attachments?: EmailAttachment[] | null;
}) {
  if (!env.brevoApiKey) {
    throw new Error("BREVO_API_KEY missing. Configure BREVO_API_KEY for HTTPS email fallback.");
  }

  const payload: {
    sender: { email: string; name: string };
    to: Array<{ email: string }>;
    subject: string;
    htmlContent: string;
    attachment?: Array<{ name: string; content: string }>;
  } = {
    sender: { email: input.from, name: "VendorCenter" },
    to: [{ email: input.to }],
    subject: input.subject,
    htmlContent: input.html,
  };

  if (input.attachments && input.attachments.length > 0) {
    payload.attachment = input.attachments.map((a) => ({
      name: a.filename,
      content: a.content,
    }));
  }

  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "api-key": env.brevoApiKey,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Brevo API send failed (${res.status}): ${body.slice(0, 180)}`);
  }
}

function getSmtpTransporter() {
  if (smtpTransporter) {
    return smtpTransporter;
  }

  smtpTransporter = nodemailer.createTransport({
    host: env.smtpHost,
    port: env.smtpPort,
    secure: env.smtpPort === 465,
    auth: {
      user: env.smtpUser,
      pass: env.smtpPass
    }
  });

  return smtpTransporter;
}

export async function createNotification(input: {
  recipientId: string;
  recipientRole: string;
  category: string;
  title: string;
  message: string;
  payload?: Record<string, unknown>;
}) {
  const result = await pool.query(
    `INSERT INTO notifications (recipient_id, recipient_role, category, title, message, payload)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, recipient_id as "recipientId", recipient_role as "recipientRole", category, title, message, payload, created_at as "createdAt"`,
    [input.recipientId, input.recipientRole, input.category, input.title, input.message, input.payload ?? null]
  );
  return result.rows[0];
}

/** Send FCM push notification to all devices of a user. Non-critical — errors are logged, not thrown. */
export async function sendPushToUser(userId: string, title: string, body: string, data?: Record<string, string>) {
  if (!isFirebaseConfigured()) return;

  try {
    const tokensResult = await pool.query<{ token: string }>(
      "SELECT token FROM device_tokens WHERE user_id = $1",
      [userId]
    );
    if (tokensResult.rows.length === 0) return;

    const messaging = getFirebaseMessaging();
    const tokens = tokensResult.rows.map(r => r.token);

    const response = await messaging.sendEachForMulticast({
      tokens,
      notification: { title, body },
      data: data ?? {},
      android: {
        priority: "high",
        notification: {
          channelId: "vendorcenter_bookings",
          priority: "high",
          defaultSound: true,
          defaultVibrateTimings: true,
        },
      },
    });

    // Clean up invalid tokens
    if (response.failureCount > 0) {
      const invalidTokens: string[] = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success && resp.error?.code &&
          ["messaging/invalid-registration-token", "messaging/registration-token-not-registered"].includes(resp.error.code)) {
          invalidTokens.push(tokens[idx]);
        }
      });
      if (invalidTokens.length > 0) {
        await pool.query("DELETE FROM device_tokens WHERE token = ANY($1)", [invalidTokens]);
        console.log(`[push] Cleaned ${invalidTokens.length} invalid device tokens`);
      }
    }

    console.log(`[push] Sent to ${response.successCount}/${tokens.length} devices for user ${userId}`);
  } catch (err) {
    console.error("[push] Failed to send push notification", err);
  }
}

export async function listNotifications(recipientId: string) {
  const result = await pool.query(
    `SELECT id, recipient_id as "recipientId", recipient_role as "recipientRole", category, title, message, payload, read_at as "readAt", created_at as "createdAt"
     FROM notifications WHERE recipient_id = $1 ORDER BY created_at DESC`,
    [recipientId]
  );
  return result.rows;
}

export async function queueEmailJob(input: {
  recipientEmail: string;
  senderEmail: string;
  subject: string;
  bodyHtml: string;
  attachments?: EmailAttachment[];
}) {
  const result = await pool.query(
    `INSERT INTO email_jobs (recipient_email, sender_email, subject, body_html, attachments)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, recipient_email as "recipientEmail", sender_email as "senderEmail", subject, status, attempts, created_at as "createdAt"`,
    [input.recipientEmail, input.senderEmail, input.subject, input.bodyHtml, input.attachments ? JSON.stringify(input.attachments) : null]
  );
  return result.rows[0];
}

export async function listEmailJobs(limit = 50) {
  const result = await pool.query(
    `SELECT id, recipient_email as "recipientEmail", sender_email as "senderEmail", subject, status, attempts, last_error as "lastError", created_at as "createdAt", updated_at as "updatedAt"
     FROM email_jobs ORDER BY created_at DESC LIMIT $1`,
    [limit]
  );
  return result.rows;
}

export async function processQueuedEmailJobs(maxJobs = 20) {
  const select = await pool.query<QueuedEmailJob>(
    `SELECT
      id,
      recipient_email as "recipientEmail",
      sender_email as "senderEmail",
      subject,
      body_html as "bodyHtml",
      attachments,
      attempts
     FROM email_jobs
     WHERE status = 'queued'
     ORDER BY created_at ASC
     LIMIT $1`,
    [maxJobs]
  );

  const useSmtp = env.emailTransportMode === "smtp";
  const useBrevoApi = env.emailTransportMode === "brevo_api";
  let processed = 0;

  for (const row of select.rows) {
    try {
      const fromEmail = row.senderEmail || env.emailFromNoreply;

      if (useSmtp) {
        if (!env.smtpHost || !env.smtpUser || !env.smtpPass) {
          throw new Error("SMTP credentials missing. Set SMTP_HOST, SMTP_USER and SMTP_PASS.");
        }

        const transporter = getSmtpTransporter();
        const mailOpts: nodemailer.SendMailOptions = {
          to: row.recipientEmail,
          from: fromEmail,
          subject: row.subject,
          html: row.bodyHtml,
        };
        if (row.attachments && row.attachments.length > 0) {
          mailOpts.attachments = row.attachments.map((a) => ({
            filename: a.filename,
            content: Buffer.from(a.content, "base64"),
          }));
        }

        try {
          await transporter.sendMail(mailOpts);
        } catch (smtpError) {
          const message = (smtpError as Error).message || "SMTP error";
          const isTimeout = /timeout/i.test(message);

          if (isTimeout && env.brevoApiKey) {
            console.warn(`[email-worker] SMTP timeout for id=${row.id}. Falling back to Brevo API over HTTPS.`);
            await sendViaBrevoApi({
              to: row.recipientEmail,
              from: fromEmail,
              subject: row.subject,
              html: row.bodyHtml,
              attachments: row.attachments,
            });
          } else {
            throw smtpError;
          }
        }
      } else if (useBrevoApi) {
        await sendViaBrevoApi({
          to: row.recipientEmail,
          from: fromEmail,
          subject: row.subject,
          html: row.bodyHtml,
          attachments: row.attachments,
        });
      }

      await pool.query(
        `UPDATE email_jobs
         SET status = 'sent', attempts = attempts + 1, last_error = NULL, updated_at = NOW()
         WHERE id = $1`,
        [row.id]
      );
      processed += 1;
      console.log(`[email-worker] ✓ sent email id=${row.id} to=${row.recipientEmail} subject="${row.subject}"`);
    } catch (error) {
      console.error(`[email-worker] ✗ failed email id=${row.id} to=${row.recipientEmail} error=${(error as Error).message}`);
      await pool.query(
        `UPDATE email_jobs
         SET status = 'failed', attempts = attempts + 1, last_error = $2, updated_at = NOW()
         WHERE id = $1`,
        [row.id, (error as Error).message]
      );
    }
  }

  return processed;
}
