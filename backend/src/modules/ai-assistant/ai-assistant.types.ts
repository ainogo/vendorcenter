export type Intent = "SERVICE_SEARCH" | "RECOMMENDATION" | "BOOKING" | "FAQ" | "GENERAL";
export type Action = "SHOW_RESULTS" | "ASK_LOCATION" | "BOOK_SERVICE" | "NAVIGATE" | "NONE";

export interface VendorResult {
  name: string;
  vendorId: string;
  rating: string;
  distance: string;
  price_range: string;
  availability: string;
  categories: string[];
  completedBookings: number;
  rankScore: number;
}

export interface AssistantResponse {
  intent: Intent;
  message: string;
  vendors: VendorResult[];
  action: Action;
  followUp?: string;
}

export interface AssistantQuery {
  message: string;
  lat?: number;
  lng?: number;
  conversationId?: string;
}

export interface ConversationTurn {
  role: "user" | "model";
  parts: { text: string }[];
}

export interface ToolCallResult {
  toolName: string;
  result: unknown;
}
