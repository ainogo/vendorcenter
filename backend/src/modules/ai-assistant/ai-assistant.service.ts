import type { Intent, Action, AssistantResponse, VendorResult, ConversationTurn } from "./ai-assistant.types.js";
import {
  searchVendorsByCategory,
  searchVendorsByKeyword,
  getTopRatedVendors,
  getVendorServicePriceRange,
  getVendorDetailForAI,
  getServiceCategories,
  getPlatformStats,
  getCustomerBookingsForAI,
  getCustomerProfileForAI,
} from "./ai-assistant.repository.js";
import {
  isGeminiAvailable,
  callGemini,
  getConversationHistory,
  addToConversation,
  type GeminiCallResult,
} from "./gemini.service.js";
import { randomUUID } from "crypto";

// ═══════════════════════════════════════════════════════════════
// LLM-Powered AI Assistant Service
// Architecture: Gemini function-calling → tool dispatch → response
// Fallback:     rule-based engine when Gemini key is absent
// ═══════════════════════════════════════════════════════════════

// ─── Tool Dispatcher ─────────────────────────────────────────
// Executes the function call requested by Gemini using repository data.

interface ToolResult {
  vendors: VendorResult[];
  raw: unknown;
}

async function executeTool(
  name: string,
  args: Record<string, unknown>,
  lat?: number,
  lng?: number,
  userId?: string,
): Promise<ToolResult> {
  switch (name) {
    case "search_vendors_by_category": {
      const category = String(args.category ?? "");
      const radius = Number(args.radius_km ?? 50);
      const limit = Number(args.limit ?? 5);
      const rows = await searchVendorsByCategory(category, lat, lng, radius, limit);
      const vendors = await Promise.all(rows.map(formatVendor));
      return { vendors, raw: rows };
    }
    case "search_vendors_by_keyword": {
      const keyword = String(args.keyword ?? "");
      const radius = Number(args.radius_km ?? 50);
      const limit = Number(args.limit ?? 5);
      const rows = await searchVendorsByKeyword(keyword, lat, lng, radius, limit);
      const vendors = await Promise.all(rows.map(formatVendor));
      return { vendors, raw: rows };
    }
    case "get_top_rated_vendors": {
      const radius = Number(args.radius_km ?? 50);
      const limit = Number(args.limit ?? 5);
      const rows = await getTopRatedVendors(lat, lng, radius, limit);
      const vendors = await Promise.all(rows.map(formatVendor));
      return { vendors, raw: rows };
    }
    case "get_vendor_detail": {
      const vendorId = String(args.vendor_id ?? "");
      const detail = await getVendorDetailForAI(vendorId);
      if (!detail) return { vendors: [], raw: { error: "Vendor not found" } };
      const vendor: VendorResult = {
        name: detail.businessName,
        vendorId: detail.vendorId,
        rating: detail.rating > 0 ? `${Number(detail.rating).toFixed(1)} / 5 (${detail.reviews} reviews)` : "New vendor",
        distance: "N/A",
        price_range: detail.services.length > 0
          ? `₹${Math.min(...detail.services.map((s: any) => s.price))} – ₹${Math.max(...detail.services.map((s: any) => s.price))}`
          : "Contact for pricing",
        availability: detail.workingHours || "Contact vendor",
        categories: Array.isArray(detail.serviceCategories) ? detail.serviceCategories : [],
        completedBookings: 0,
        rankScore: 0,
      };
      return { vendors: [vendor], raw: detail };
    }
    case "get_service_categories": {
      const radius = Number(args.radius_km ?? 25);
      const categories = await getServiceCategories(lat, lng, radius);
      return { vendors: [], raw: categories };
    }
    case "get_platform_info": {
      const stats = await getPlatformStats();
      const topic = String(args.topic ?? "general");
      return { vendors: [], raw: { topic, stats, faq: FAQ_RESPONSES[topic] ?? FAQ_RESPONSES.general } };
    }
    case "get_my_bookings": {
      if (!userId) return { vendors: [], raw: { error: "User not logged in. Please log in to view your bookings." } };
      const limit = Number(args.limit ?? 5);
      const statusFilter = args.status ? String(args.status) : undefined;
      let bookings = await getCustomerBookingsForAI(userId, 10);
      if (statusFilter) {
        bookings = bookings.filter((b: any) => b.status === statusFilter);
      }
      return { vendors: [], raw: { bookings: bookings.slice(0, limit), total: bookings.length } };
    }
    case "get_my_profile": {
      if (!userId) return { vendors: [], raw: { error: "User not logged in." } };
      const profile = await getCustomerProfileForAI(userId);
      return { vendors: [], raw: profile || { error: "Profile not found" } };
    }
    default:
      return { vendors: [], raw: { error: `Unknown tool: ${name}` } };
  }
}

// ─── LLM-Powered Query Processing ───────────────────────────

export async function processAssistantQuery(
  message: string,
  lat?: number,
  lng?: number,
  conversationId?: string,
  userId?: string,
): Promise<AssistantResponse & { conversationId: string }> {
  const sessionId = conversationId || randomUUID();

  // Try Gemini first; fall back to rule-based engine
  if (isGeminiAvailable()) {
    try {
      return await processWithGemini(message, lat, lng, sessionId, userId);
    } catch (err) {
      console.error("[ai-assistant] Gemini error, falling back to rule-based:", err);
    }
  }

  const fallback = await processWithRules(message, lat, lng, userId);
  return { ...fallback, conversationId: sessionId };
}

async function processWithGemini(
  message: string,
  lat: number | undefined,
  lng: number | undefined,
  sessionId: string,
  userId?: string,
): Promise<AssistantResponse & { conversationId: string }> {
  const history = getConversationHistory(sessionId);

  // Add context about user location and auth status
  const contextParts: string[] = [];
  if (lat != null && lng != null) contextParts.push(`[User location: ${lat.toFixed(4)}, ${lng.toFixed(4)}]`);
  if (userId) contextParts.push(`[Authenticated user: ${userId}]`);
  else contextParts.push(`[User not logged in]`);
  const enrichedMessage = contextParts.length > 0 ? `${contextParts.join(" ")} ${message}` : message;

  // Step 1: Send to Gemini — may return text or function calls
  const geminiResult = await callGemini(enrichedMessage, history);

  let allVendors: VendorResult[] = [];
  let finalText = geminiResult.text;

  // Step 2: If Gemini requested tool calls, execute them
  if (geminiResult.functionCalls.length > 0) {
    const toolResults: Array<{ name: string; result: ToolResult }> = [];

    for (const fc of geminiResult.functionCalls) {
      const result = await executeTool(fc.name, fc.args, lat, lng, userId);
      toolResults.push({ name: fc.name, result });
      allVendors = allVendors.concat(result.vendors);
    }

    // Step 3: Send tool results back to Gemini to get natural language response
    // Build the conversation up to this point for the follow-up call
    const updatedHistory: ConversationTurn[] = [
      ...history,
      { role: "user", parts: [{ text: enrichedMessage }] },
      {
        role: "model",
        parts: geminiResult.functionCalls.map((fc) => ({
          text: `[Called ${fc.name} with ${JSON.stringify(fc.args)}]`,
        })),
      },
    ];

    // Build a tool-results summary for Gemini
    const toolSummary = toolResults
      .map((tr) => {
        const vendorCount = tr.result.vendors.length;
        if (vendorCount > 0) {
          const vendorLines = tr.result.vendors.map(
            (v) => `• ${v.name} — ${v.rating}, ${v.distance}, ${v.price_range}`
          );
          return `Tool "${tr.name}" returned ${vendorCount} vendor(s):\n${vendorLines.join("\n")}`;
        }
        return `Tool "${tr.name}" returned: ${JSON.stringify(tr.result.raw)}`;
      })
      .join("\n\n");

    try {
      const followUpResult = await callGemini(
        `Here are the results from the tools you called:\n\n${toolSummary}\n\nPlease provide a helpful response to the user based on these results.`,
        updatedHistory,
      );
      finalText = followUpResult.text || finalText;
    } catch {
      // If follow-up call fails, use whatever text we have
    }
  }

  // Save conversation turns
  addToConversation(sessionId, { role: "user", parts: [{ text: message }] });
  addToConversation(sessionId, { role: "model", parts: [{ text: finalText }] });

  // Determine intent and action from context
  const intent = inferIntent(geminiResult, allVendors);
  const action = inferAction(allVendors, finalText);

  return {
    intent,
    message: finalText || "I'm here to help you find local services. What are you looking for?",
    vendors: allVendors,
    action,
    conversationId: sessionId,
  };
}

function inferIntent(result: GeminiCallResult, vendors: VendorResult[]): Intent {
  if (result.functionCalls.length === 0) return "GENERAL";
  const toolNames = result.functionCalls.map((fc) => fc.name);
  if (toolNames.includes("get_platform_info")) return "FAQ";
  if (toolNames.includes("get_top_rated_vendors")) return "RECOMMENDATION";
  if (vendors.length > 0) return "SERVICE_SEARCH";
  return "GENERAL";
}

function inferAction(vendors: VendorResult[], text: string): Action {
  if (vendors.length > 0) return "SHOW_RESULTS";
  if (/location|share your location|enable location/i.test(text)) return "ASK_LOCATION";
  return "NONE";
}

// ═══════════════════════════════════════════════════════════════
// FALLBACK: Rule-Based Engine (no LLM key)
// ═══════════════════════════════════════════════════════════════

const CATEGORY_MAP: Record<string, string> = {
  plumber: "Plumbing", plumbing: "Plumbing", pipe: "Plumbing", leak: "Plumbing",
  tap: "Plumbing", faucet: "Plumbing", drain: "Plumbing",
  electrician: "Electrical", electrical: "Electrical", wiring: "Electrical",
  switch: "Electrical", fan: "Electrical", light: "Electrical",
  ac: "AC Repair", "ac repair": "AC Repair", "air conditioner": "AC Repair",
  "air conditioning": "AC Repair", cooling: "AC Repair", hvac: "AC Repair",
  clean: "Cleaning", cleaning: "Cleaning", cleaner: "Cleaning",
  maid: "Cleaning", housekeeping: "Cleaning",
  paint: "Painting", painting: "Painting", painter: "Painting", wall: "Painting",
  carpenter: "Carpentry", carpentry: "Carpentry", furniture: "Carpentry", wood: "Carpentry",
  pest: "Pest Control", "pest control": "Pest Control", termite: "Pest Control", cockroach: "Pest Control",
  salon: "Salon", haircut: "Salon", beauty: "Salon", spa: "Salon", grooming: "Salon",
  appliance: "Appliance Repair", "appliance repair": "Appliance Repair",
  fridge: "Appliance Repair", washing: "Appliance Repair", microwave: "Appliance Repair",
  moving: "Moving", packers: "Moving", movers: "Moving", relocation: "Moving", shifting: "Moving",
  photography: "Photography", photographer: "Photography", photo: "Photography",
  catering: "Catering", caterer: "Catering", food: "Catering", cook: "Catering",
};

const FAQ_RESPONSES: Record<string, string> = {
  how_it_works: "VendorCenter connects you with verified local service providers. Search for a service, browse vendor profiles, compare ratings, and book directly. Track your booking status at every step.",
  general: "VendorCenter connects you with verified local service providers. Search for a service, browse vendor profiles, compare ratings, and book directly.",
  how: "VendorCenter connects you with verified local service providers. Search for a service, browse vendor profiles, compare ratings, and book directly.",
  payment: "We support secure online payments. Payment is processed only after service completion and OTP verification. Your money is safe until you confirm satisfaction.",
  safety: "All vendors go through a verification process. Check their ratings, reviews, and completed booking history before choosing.",
  cancellation: "You can cancel a pending booking from your account page. Once a service is in progress, contact the vendor directly.",
  review: "After a completed booking, leave a rating (1–5 stars) and a written review. Your feedback helps other customers.",
  refund: "Refund policies depend on the service and vendor. If you have a dispute, reach out through your booking page.",
  otp: "OTP verification confirms service completion. The vendor marks the service as done and you receive an OTP to verify before payment is processed.",
};

// ─── Conversational Pattern Engine ───────────────────────────
// Matches a wide range of conversational inputs so the chatbot
// NEVER falls through to "I couldn't find vendors" for non-service queries.

const GREETING_PATTERNS = /\b(hi+|hello|hey+|hola|namaste|good\s*(morning|afternoon|evening|night)|yo|sup|what'?s?\s*up|howdy|greetings|ola|hii+)\b/i;
const THANKS_PATTERNS = /\b(thanks?|thank\s*you|ty|thx|appreciated|great\s*job|well\s*done|awesome|nice|cool|cheers|much\s*appreciated)\b/i;
const GOODBYE_PATTERNS = /\b(bye+|goodbye|see\s*y(ou|a)|later|take\s*care|gtg|good\s*night|night|cya|adios|tata)\b/i;
const IDENTITY_PATTERNS = /\b(who\s+(are|r)\s+you|what\s+(are|r)\s+you|your\s+name|what\s+can\s+you\s+do|help\s+me|what\s+do\s+you\s+do|are\s+you\s+(a\s+)?(bot|ai|human|real|gemini|gpt|chatgpt|robot)|you\s+(a\s+)?(bot|ai|human|real|gemini|gpt)|tell\s+me\s+about\s+(yourself|you))\b/i;
const CAPABILITY_PATTERNS = /\b(what\s+services|what\s+can\s+(i|you)|show\s+me\s+services|what\s+do\s+you\s+offer|available\s+services|list\s+services|what\s+all|categories)\b/i;
const FEELINGS_PATTERNS = /\b(how\s+(are|r)\s+you|how('?s| is)\s+(it\s+going|everything|life|your\s+day|things)|you\s+(good|ok(ay)?|fine|doing\s+well)|feeling|how\s+do\s+you\s+feel|are\s+you\s+(ok(ay)?|good|fine|happy|well))\b/i;
const COMPLIMENT_PATTERNS = /\b(you('?re|\s+are)\s+(great|amazing|awesome|helpful|smart|good|the\s+best|cool|nice|wonderful)|love\s+(this|you|it)|well\s+done|good\s+(job|work|bot))\b/i;
const JOKE_PATTERNS = /\b(tell\s+(me\s+)?a?\s*joke|funny|make\s+me\s+laugh|humor|lol|haha|😂|🤣)\b/i;

// SERVICE_KEYWORDS: if a message contains ANY of these, treat
// it as a potential vendor/service query, not casual chat.
const SERVICE_KEYWORDS = /\b(plumb|electric|clean|paint|carpet|pest|salon|haircut|beauty|spa|applia|fridge|wash|ac\b|air\s*condition|hvac|cool|mov|pack|shift|relocat|photograph|photo\s*shoot|cater|cook|food|fix|repair|install|maintenance|handyman|home\s*service|service\s*provider|vendor|book|hire|appointment|schedule)\b/i;

const CONVERSATIONAL_RESPONSES: Record<string, string[]> = {
  greeting: [
    "Hey there! 👋 Welcome to VendorCenter. I'm here to help you find the best local service providers. Looking for a plumber, electrician, cleaner, or something else?",
    "Hi! I'm your VendorCenter assistant. What service do you need today? I can find plumbers, electricians, cleaners, AC technicians, and more near you.",
    "Hello! Great to have you here. Need help with a home service? Just tell me what you're looking for and I'll find trusted providers nearby.",
  ],
  thanks: [
    "You're welcome! Need help finding more services? I'm right here.",
    "Happy to help! Feel free to ask anytime — whether it's plumbing, cleaning, or anything else.",
    "Glad I could assist! Is there another service you'd like to find?",
  ],
  goodbye: [
    "Take care! Come back whenever you need a service provider. 🙌",
    "Bye! Hope you found what you needed. We're always here when you need us.",
    "See you! Feel free to reach out whenever you need help with home services.",
  ],
  identity: [
    "I'm the VendorCenter AI assistant! I help you find and book verified local service providers — plumbers, electricians, cleaners, painters, AC repair, salon services, movers, and more. Think of me as your personal concierge for home services. Just tell me what you need!",
    "I'm VendorCenter's AI — your go-to assistant for finding trusted local service providers. I can search by category, show ratings, compare pricing, and help you book. What do you need today?",
  ],
  capabilities: [
    "Here's what I can do for you:\n\n• 🔍 **Find services** — Search for plumbers, electricians, cleaners, painters, AC repair, and more\n• ⭐ **Compare vendors** — See ratings, reviews, pricing, and distance\n• 📋 **Browse categories** — Plumbing, Electrical, Cleaning, Painting, Carpentry, Pest Control, AC Repair, Salon, Appliance Repair, Moving, Photography, Catering\n• 📍 **Nearby providers** — Share your location and I'll find the closest ones\n\nJust tell me what service you need!",
  ],
  feelings: [
    "I'm doing great, thanks for asking! 😊 I'm ready to help you find the perfect service provider. What do you need?",
    "All good on my end! How can I help you today? Looking for any home service?",
    "I'm here and ready to help! What service can I find for you?",
  ],
  compliment: [
    "Thank you! That means a lot. 😊 I'm here to make finding services easy for you. Need anything else?",
    "Appreciate that! Let me know if there's anything else I can help you find.",
    "Thanks! I'm glad you like the experience. What else can I help with?",
  ],
  joke: [
    "Why did the plumber bring a ladder? Because the water bill was through the roof! 😄 Now, need help finding a real plumber?",
    "I'm better at finding vendors than telling jokes, but here goes: Why don't electricians ever get surprised? Because they're always current! ⚡ Need an electrician?",
  ],
  fallback: [
    "I'm your VendorCenter assistant — I'm best at helping you find local service providers! Try asking for a plumber, electrician, cleaner, AC repair, painter, or any home service. What do you need?",
    "I specialize in finding trusted local service providers for you. Need a plumber, electrician, cleaner, painter, or something else? Just let me know!",
    "I'm not sure I understood that, but I'm great at finding home service providers! You can ask me to find a plumber, electrician, cleaner, AC technician, salon, or any other service near you.",
    "I'd love to help! I'm designed to find the best local vendors for home services. Try asking something like 'find me a plumber' or 'best electricians near me'.",
  ],
};

function pickRandom(arr: string[]): string {
  return arr[Math.floor(Math.random() * arr.length)];
}

function detectIntent(message: string): Intent {
  const lower = message.toLowerCase().trim();

  // 1) Messages with service keywords are always vendor searches
  if (SERVICE_KEYWORDS.test(lower)) {
    if (/\b(best|top|recommend|popular|highest\s*rated|suggested|good)\b/.test(lower)) return "RECOMMENDATION";
    if (/\b(book|schedule|hire|appointment|need\s+a)\b/.test(lower)) return "BOOKING";
    return "SERVICE_SEARCH";
  }

  // 2) Conversational patterns — handle BEFORE any service routing
  if (GREETING_PATTERNS.test(lower)) return "GENERAL";
  if (THANKS_PATTERNS.test(lower)) return "GENERAL";
  if (GOODBYE_PATTERNS.test(lower)) return "GENERAL";
  if (IDENTITY_PATTERNS.test(lower)) return "GENERAL";
  if (CAPABILITY_PATTERNS.test(lower)) return "GENERAL";
  if (FEELINGS_PATTERNS.test(lower)) return "GENERAL";
  if (COMPLIMENT_PATTERNS.test(lower)) return "GENERAL";
  if (JOKE_PATTERNS.test(lower)) return "GENERAL";

  // 3) Recommendation keywords (non-service-specific fall here)
  if (/\b(best|top|recommend|popular|highest\s*rated)\b/.test(lower)) return "RECOMMENDATION";

  // 4) FAQ-style questions
  if (/\b(how|what|why|when|where|can\s+i|do\s+you|is\s+there|tell\s+me\s+about|explain)\b/.test(lower)) {
    if (/\b(find|search|get|looking|need|want)\b/.test(lower)) return "SERVICE_SEARCH";
    return "FAQ";
  }

  // 5) Booking intent
  if (/\b(book|schedule|hire|appointment|need\s+a)\b/.test(lower)) return "BOOKING";

  // 6) If the message has no service keywords and is short/casual → GENERAL
  //    This prevents "is you gemini" from triggering a vendor search
  if (!extractCategory(lower)) return "GENERAL";

  return "SERVICE_SEARCH";
}

function extractCategory(message: string): string | null {
  const lower = message.toLowerCase();
  const sortedKeys = Object.keys(CATEGORY_MAP).sort((a, b) => b.length - a.length);
  for (const key of sortedKeys) {
    if (lower.includes(key)) return CATEGORY_MAP[key];
  }
  return null;
}

function matchFaq(message: string): string | null {
  const lower = message.toLowerCase();
  for (const [kw, resp] of Object.entries(FAQ_RESPONSES)) {
    if (lower.includes(kw)) return resp;
  }
  return null;
}

async function formatVendor(row: any): Promise<VendorResult> {
  const priceRange = await getVendorServicePriceRange(row.vendorId);
  return {
    name: row.businessName,
    vendorId: row.vendorId,
    rating: row.rating > 0 ? `${Number(row.rating).toFixed(1)} / 5 (${row.reviews} reviews)` : "New vendor",
    distance: row.distance_km != null ? `${row.distance_km} km away` : "Distance unavailable",
    price_range: priceRange,
    availability: row.workingHours || "Contact vendor",
    categories: Array.isArray(row.serviceCategories) ? row.serviceCategories : [],
    completedBookings: row.completedBookings ?? 0,
    rankScore: row.rankScore ?? 0,
  };
}

async function processWithRules(
  message: string,
  lat?: number,
  lng?: number,
  userId?: string,
): Promise<AssistantResponse> {
  const intent = detectIntent(message);
  const category = extractCategory(message);
  const hasLocation = lat != null && lng != null;
  const wantsNearby = /\b(near me|nearby|close|around|my area|closest)\b/i.test(message);

  // ── Booking-related queries (requires login) ──
  const BOOKING_QUERY_PATTERNS = /\b(my booking|my appointment|booking status|booking detail|booking link|when is my|my order|my schedule|upcoming booking|past booking|booking history)\b/i;
  const PROFILE_QUERY_PATTERNS = /\b(my profile|my account|my email|my phone|my name|my detail|account info)\b/i;

  if (BOOKING_QUERY_PATTERNS.test(message)) {
    if (!userId) {
      return { intent: "GENERAL", message: "Please log in to your account so I can look up your bookings. Once you're signed in, just ask me again!", vendors: [], action: "NONE" };
    }
    const bookings = await getCustomerBookingsForAI(userId, 10);
    if (bookings.length === 0) {
      return { intent: "GENERAL", message: "You don't have any bookings yet. Would you like me to help you find a service provider?", vendors: [], action: "NONE" };
    }
    const lines = bookings.map((b: any, i: number) => {
      const date = b.scheduledDate ? new Date(b.scheduledDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "TBD";
      const time = b.scheduledTime || "TBD";
      return `${i + 1}. **${b.serviceName}** with ${b.vendorName || "vendor"} — ${date} at ${time} — Status: ${b.status}${b.paymentStatus ? `, Payment: ${b.paymentStatus}` : ""}`;
    });
    return { intent: "BOOKING", message: `Here are your recent bookings:\n\n${lines.join("\n")}`, vendors: [], action: "NONE" };
  }

  if (PROFILE_QUERY_PATTERNS.test(message)) {
    if (!userId) {
      return { intent: "GENERAL", message: "Please log in to view your profile details.", vendors: [], action: "NONE" };
    }
    const profile = await getCustomerProfileForAI(userId);
    if (!profile) {
      return { intent: "GENERAL", message: "I couldn't find your profile. Please try again later.", vendors: [], action: "NONE" };
    }
    return { intent: "GENERAL", message: `Here's your profile info:\n\n• **Name:** ${profile.name || "Not set"}\n• **Email:** ${profile.email}\n• **Phone:** ${profile.phone || "Not set"}`, vendors: [], action: "NONE" };
  }

  // Handle greetings / casual conversation
  if (intent === "GENERAL") {
    if (GREETING_PATTERNS.test(message)) {
      return { intent: "GENERAL", message: pickRandom(CONVERSATIONAL_RESPONSES.greeting), vendors: [], action: "NONE" };
    }
    if (THANKS_PATTERNS.test(message)) {
      return { intent: "GENERAL", message: pickRandom(CONVERSATIONAL_RESPONSES.thanks), vendors: [], action: "NONE" };
    }
    if (GOODBYE_PATTERNS.test(message)) {
      return { intent: "GENERAL", message: pickRandom(CONVERSATIONAL_RESPONSES.goodbye), vendors: [], action: "NONE" };
    }
    if (IDENTITY_PATTERNS.test(message)) {
      return { intent: "GENERAL", message: pickRandom(CONVERSATIONAL_RESPONSES.identity), vendors: [], action: "NONE" };
    }
    if (CAPABILITY_PATTERNS.test(message)) {
      return { intent: "GENERAL", message: pickRandom(CONVERSATIONAL_RESPONSES.capabilities), vendors: [], action: "NONE" };
    }
    if (FEELINGS_PATTERNS.test(message)) {
      return { intent: "GENERAL", message: pickRandom(CONVERSATIONAL_RESPONSES.feelings), vendors: [], action: "NONE" };
    }
    if (COMPLIMENT_PATTERNS.test(message)) {
      return { intent: "GENERAL", message: pickRandom(CONVERSATIONAL_RESPONSES.compliment), vendors: [], action: "NONE" };
    }
    if (JOKE_PATTERNS.test(message)) {
      return { intent: "GENERAL", message: pickRandom(CONVERSATIONAL_RESPONSES.joke), vendors: [], action: "NONE" };
    }
    // Catch-all for any GENERAL intent — friendly fallback, NEVER "I couldn't find vendors"
    return { intent: "GENERAL", message: pickRandom(CONVERSATIONAL_RESPONSES.fallback), vendors: [], action: "NONE" };
  }

  if (wantsNearby && !hasLocation) {
    return {
      intent,
      message: "I'd love to help you find nearby vendors! Could you please share your location or enable location services?",
      vendors: [],
      action: "ASK_LOCATION",
    };
  }

  if (intent === "FAQ") {
    const faqAnswer = matchFaq(message);
    if (faqAnswer) return { intent: "FAQ", message: faqAnswer, vendors: [], action: "NONE" };
    if (category) return await ruleSearch(category, null, lat, lng);
    return { intent: "FAQ", message: "Great question! I'm here to help you find and book local services. You can ask me to find plumbers, electricians, AC repair, cleaners, painters — or ask about how payments, bookings, and reviews work.", vendors: [], action: "NONE" };
  }

  if (intent === "BOOKING" || intent === "RECOMMENDATION" || intent === "SERVICE_SEARCH") {
    if (category) return await ruleSearch(category, null, lat, lng, intent);
    if (intent === "RECOMMENDATION") {
      const rows = await getTopRatedVendors(lat, lng, 50, 5);
      const vendors = await Promise.all(rows.map(formatVendor));
      return {
        intent: "RECOMMENDATION",
        message: vendors.length > 0
          ? `Here are the highest-rated vendors${hasLocation ? " near you" : ""}.`
          : "I don't have enough data for recommendations yet. Check back as vendors get more reviews!",
        vendors,
        action: vendors.length > 0 ? "SHOW_RESULTS" : "NONE",
      };
    }
    // keyword fallback
    const words = message.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    for (const word of words) {
      const rows = await searchVendorsByKeyword(word, lat, lng, 50, 5);
      if (rows.length > 0) {
        const vendors = await Promise.all(rows.map(formatVendor));
        return { intent: "SERVICE_SEARCH", message: `I found vendors matching "${word}":`, vendors, action: "SHOW_RESULTS" };
      }
    }
  }

  // Final fallback — graceful response instead of error-looking message
  return {
    intent: "GENERAL",
    message: pickRandom(CONVERSATIONAL_RESPONSES.fallback),
    vendors: [],
    action: "NONE",
  };
}

async function ruleSearch(
  category: string,
  keyword: string | null,
  lat?: number,
  lng?: number,
  intent: Intent = "SERVICE_SEARCH",
): Promise<AssistantResponse> {
  const rows = await searchVendorsByCategory(category, lat, lng, 50, 5);
  if (rows.length > 0) {
    const vendors = await Promise.all(rows.map(formatVendor));
    return {
      intent,
      message: `I found ${vendors.length} ${category} vendor${vendors.length > 1 ? "s" : ""}${lat != null ? " near you" : ""}:`,
      vendors,
      action: intent === "BOOKING" ? "BOOK_SERVICE" : "SHOW_RESULTS",
    };
  }
  if (keyword) {
    const kwRows = await searchVendorsByKeyword(keyword, lat, lng, 50, 5);
    if (kwRows.length > 0) {
      const vendors = await Promise.all(kwRows.map(formatVendor));
      return { intent, message: `Found vendors matching "${keyword}":`, vendors, action: "SHOW_RESULTS" };
    }
  }
  return {
    intent,
    message: `No ${category} vendors found${lat != null ? " near your location" : ""}. Try a different category.`,
    vendors: [],
    action: "NONE",
  };
}
