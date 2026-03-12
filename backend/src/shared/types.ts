export type AppRole = "customer" | "vendor" | "admin" | "employee";

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
