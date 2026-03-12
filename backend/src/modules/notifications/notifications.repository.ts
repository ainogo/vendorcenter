import { pool } from "../../db/pool.js";
import nodemailer, { type Transporter } from "nodemailer";
import { env } from "../../config/env.js";

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
  let processed = 0;

  for (const row of select.rows) {
    try {
      if (useSmtp) {
        if (!env.smtpHost || !env.smtpUser || !env.smtpPass) {
          throw new Error("SMTP credentials missing. Set SMTP_HOST, SMTP_USER and SMTP_PASS.");
        }

        const transporter = getSmtpTransporter();
        const mailOpts: nodemailer.SendMailOptions = {
          to: row.recipientEmail,
          from: row.senderEmail || env.emailFromNoreply,
          subject: row.subject,
          html: row.bodyHtml,
        };
        if (row.attachments && row.attachments.length > 0) {
          mailOpts.attachments = row.attachments.map((a) => ({
            filename: a.filename,
            content: Buffer.from(a.content, "base64"),
          }));
        }
        await transporter.sendMail(mailOpts);
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
