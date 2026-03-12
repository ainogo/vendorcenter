import { AppRole } from "./types.js";

export interface UserRecord {
  id: string;
  email: string;
  role: AppRole;
  password: string;
  verified: boolean;
}

export interface OtpRecord {
  id: string;
  email: string;
  purpose: "signup" | "vendor_onboarding" | "password_reset" | "employee_login";
  code: string;
  expiresAt: number;
  used: boolean;
  attempts: number;
}

export interface ActivityRecord {
  id: string;
  actorId: string;
  role: AppRole;
  action: string;
  entity: string;
  metadata?: Record<string, unknown>;
  createdAt: number;
}

export const db = {
  users: new Map<string, UserRecord>(),
  otps: new Map<string, OtpRecord>(),
  activities: [] as ActivityRecord[],
  bookings: [] as {
    id: string;
    customerId: string;
    vendorId: string;
    serviceName: string;
    status: "pending" | "confirmed" | "in_progress" | "completed" | "cancelled";
    transactionId: string;
    paymentStatus: "pending" | "success" | "failed" | "refunded";
    createdAt: number;
  }[],
  zones: [] as {
    country: string;
    state: string;
    city: string;
    zone: string;
  }[]
};
