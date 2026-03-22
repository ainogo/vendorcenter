import { GoogleGenerativeAI, SchemaType, type Tool } from "@google/generative-ai";
import { env } from "../../config/env.js";
import type { ConversationTurn } from "./ai-assistant.types.js";

// ─── Gemini Client Singleton ─────────────────────────────────

let genAI: GoogleGenerativeAI | null = null;

function getClient(): GoogleGenerativeAI | null {
  if (!env.geminiApiKey) return null;
  if (!genAI) {
    genAI = new GoogleGenerativeAI(env.geminiApiKey);
  }
  return genAI;
}

export function isGeminiAvailable(): boolean {
  return !!env.geminiApiKey;
}

// ─── Tool (Function) Declarations ────────────────────────────

const TOOL_DECLARATIONS: Tool[] = [
  {
    functionDeclarations: [
      {
        name: "search_vendors_by_category",
        description:
          "Search for vendors providing a specific service category. Use when the user is looking for a specific type of service provider like plumber, electrician, cleaner, painter, AC repair, carpenter, pest control, salon, appliance repair, movers, photographer, or caterer.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            category: {
              type: SchemaType.STRING,
              description:
                "The service category name. One of: Plumbing, Electrical, Cleaning, Painting, Carpentry, Pest Control, AC Repair, Salon, Appliance Repair, Moving, Photography, Catering.",
            },
            radius_km: {
              type: SchemaType.NUMBER,
              description: "Search radius in kilometers. Default 50.",
            },
            limit: {
              type: SchemaType.NUMBER,
              description: "Max number of vendors to return. Default 5.",
            },
          },
          required: ["category"],
        },
      },
      {
        name: "search_vendors_by_keyword",
        description:
          "Search for vendors by keyword when the query does not match a standard category. Searches business names and category tags.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            keyword: {
              type: SchemaType.STRING,
              description: "The keyword to search for in vendor names and service categories.",
            },
            radius_km: {
              type: SchemaType.NUMBER,
              description: "Search radius in kilometers. Default 50.",
            },
            limit: {
              type: SchemaType.NUMBER,
              description: "Max number of vendors to return. Default 5.",
            },
          },
          required: ["keyword"],
        },
      },
      {
        name: "get_top_rated_vendors",
        description:
          "Get the highest-rated vendors across all categories. Use when the user asks for best, top-rated, recommended, or popular vendors without specifying a category.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            radius_km: {
              type: SchemaType.NUMBER,
              description: "Search radius in kilometers. Default 50.",
            },
            limit: {
              type: SchemaType.NUMBER,
              description: "Max number of vendors to return. Default 5.",
            },
          },
          required: [],
        },
      },
      {
        name: "get_vendor_detail",
        description:
          "Get detailed information about a specific vendor including their services and pricing.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            vendor_id: {
              type: SchemaType.STRING,
              description: "The unique vendor ID.",
            },
          },
          required: ["vendor_id"],
        },
      },
      {
        name: "get_service_categories",
        description:
          "List available service categories with vendor counts. Use when user asks what services are available or wants to browse categories.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            radius_km: {
              type: SchemaType.NUMBER,
              description: "Radius to check for available vendors. Default 25.",
            },
          },
          required: [],
        },
      },
      {
        name: "get_platform_info",
        description:
          "Get general platform information and stats. Use for FAQ-type questions about how the platform works, safety, payments, booking process, cancellation policy, etc.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            topic: {
              type: SchemaType.STRING,
              description:
                "The topic: how_it_works, payment, safety, cancellation, review, refund, otp, general.",
            },
          },
          required: ["topic"],
        },
      },
      {
        name: "get_my_bookings",
        description:
          "Get the logged-in user's bookings. Use when the user asks about their bookings, appointments, booking status, schedule, or booking history. Only works for authenticated users.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            status: {
              type: SchemaType.STRING,
              description:
                "Optional booking status filter: pending, confirmed, in_progress, completed, cancelled. Omit to return all bookings.",
            },
          },
          required: [],
        },
      },
      {
        name: "get_my_profile",
        description:
          "Get the logged-in user's profile details (name, email, phone). Use when the user asks about their account info or profile.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {},
          required: [],
        },
      },
    ],
  },
];

// ─── System Prompt ───────────────────────────────────────────

const SYSTEM_PROMPT = `You are VendorCenter Assistant — a warm, intelligent, and professional AI concierge for a local home services platform called VendorCenter.

CORE MISSION: Help users find, compare, and book trusted local service providers. Think of yourself as a friendly human customer support agent who genuinely cares about helping.

PERSONALITY & TONE:
- Warm, approachable, and human-like — not robotic or overly formal
- Concise but never cold. Add a touch of personality
- Use plain English. No jargon or overly technical language
- Be proactive — anticipate what the user might need next
- Show empathy for urgent needs ("I understand that's frustrating — let me find help right away")
- Occasionally use relevant emojis (👋 ⭐ 🔧 ✨) but don't overdo it

CONVERSATIONAL RULES:
- For greetings (hi, hello, hey, etc.): Respond warmly and briefly, then steer toward helping them find services. Don't just say "hi" back — always add value.
- For casual chat (how are you, what's up, etc.): Respond naturally like a friendly human, then gently guide toward your purpose.
- For identity questions (who are you, are you AI, are you Gemini, etc.): Be honest but confident. You are VendorCenter's AI assistant. Don't reveal internal model details.
- For compliments: Thank them genuinely, then offer to help with more.
- For off-topic questions: Acknowledge politely, then redirect. Example: "That's an interesting question! I'm best at helping with home services though — need a plumber, cleaner, or electrician?"
- For gibberish or unclear input: Don't say "I couldn't find vendors." Instead say something like "I didn't quite catch that — could you tell me what service you're looking for? I can help with plumbing, cleaning, electrical, and more!"
- NEVER respond with "I couldn't find vendors matching your request" for non-service queries. That sounds broken.

SERVICE SEARCH RULES:
- Always use the provided tools to fetch real vendor data. NEVER invent vendor names, prices, or ratings.
- When showing vendors, highlight their key strengths (rating, distance, price range) conversationally.
- If the user needs a specific service, call search_vendors_by_category with the correct mapped category.
- If the query is vague, ask ONE clarifying question — don't bombard with options.
- If location data is available, mention proximity. If not and the user says "near me," ask for location.
- For booking requests: Find vendors first, then tell the user they can click on a vendor card to visit their profile and book.
- When no vendors are found: Acknowledge briefly, apologize, and suggest related alternatives.

RESPONSE LENGTH:
- Simple greetings/chat: 1-2 sentences
- Service results: 2-3 sentences (vendor cards appear separately)
- Complex questions: Up to 4-5 sentences max
- NEVER write long paragraphs. Be conversational, not encyclopedic.

RESPONSE FORMAT:
Your text goes in a chat bubble. Vendor data from tool calls displays as interactive cards below your message. Write conversational text only — no tables, no JSON, no markdown headers.

AVAILABLE SERVICE CATEGORIES:
Plumbing, Electrical, Cleaning, Painting, Carpentry, Pest Control, AC Repair, Salon, Appliance Repair, Moving, Photography, Catering

USER DATA ACCESS:
- If the message context says "[Authenticated user: ...]", the user is logged in and you CAN access their data.
- Use get_my_bookings to look up their upcoming or past bookings when they ask about appointments, booking status, booking history, or schedule.
- Use get_my_profile to retrieve their name, email, or phone when they ask about their account or profile.
- If the user asks about their bookings but is NOT logged in (context says "[User not logged in]"), politely ask them to sign in first.
- Present booking data conversationally: mention service name, vendor name, date/time, status. Don't dump raw data.

USER TERM MAPPING:
- plumber/pipe/leak/tap/faucet/drain → Plumbing
- electrician/wiring/switch/fan/light → Electrical
- AC/air conditioner/cooling/HVAC → AC Repair
- cleaner/maid/housekeeping → Cleaning
- painter/wall painting → Painting
- carpenter/furniture/wood → Carpentry
- pest/termite/cockroach → Pest Control
- haircut/beauty/spa/grooming → Salon
- fridge/washing machine/microwave → Appliance Repair
- packers/movers/relocation/shifting → Moving
- photographer/photo shoot → Photography
- caterer/food/cook → Catering`;

// ─── Conversation Manager ────────────────────────────────────

const MAX_HISTORY = 20;
const conversations = new Map<string, ConversationTurn[]>();

export function getConversationHistory(sessionId: string): ConversationTurn[] {
  return conversations.get(sessionId) ?? [];
}

export function addToConversation(sessionId: string, turn: ConversationTurn) {
  let history = conversations.get(sessionId) ?? [];
  history.push(turn);
  if (history.length > MAX_HISTORY) {
    history = history.slice(-MAX_HISTORY);
  }
  conversations.set(sessionId, history);
}

export function clearConversation(sessionId: string) {
  conversations.delete(sessionId);
}

// Cleanup stale conversations periodically
setInterval(() => {
  if (conversations.size > 1000) {
    const keys = Array.from(conversations.keys());
    for (let i = 0; i < keys.length - 500; i++) {
      conversations.delete(keys[i]);
    }
  }
}, 5 * 60 * 1000);

// ─── LLM Call ────────────────────────────────────────────────

export interface GeminiCallResult {
  text: string;
  functionCalls: Array<{
    name: string;
    args: Record<string, unknown>;
  }>;
}

export async function callGemini(
  userMessage: string,
  history: ConversationTurn[],
): Promise<GeminiCallResult> {
  const client = getClient();
  if (!client) {
    throw new Error("Gemini API key not configured");
  }

  const model = client.getGenerativeModel({
    model: env.geminiModel,
    systemInstruction: SYSTEM_PROMPT,
    tools: TOOL_DECLARATIONS,
  });

  const chat = model.startChat({
    history: history.map((turn) => ({
      role: turn.role,
      parts: turn.parts,
    })),
  });

  const result = await chat.sendMessage(userMessage);
  const response = result.response;
  const candidate = response.candidates?.[0];

  if (!candidate?.content?.parts) {
    return { text: "", functionCalls: [] };
  }

  const textParts: string[] = [];
  const functionCalls: GeminiCallResult["functionCalls"] = [];

  for (const part of candidate.content.parts) {
    if ("text" in part && part.text) {
      textParts.push(part.text);
    }
    if ("functionCall" in part && part.functionCall) {
      functionCalls.push({
        name: part.functionCall.name,
        args: (part.functionCall.args as Record<string, unknown>) ?? {},
      });
    }
  }

  return {
    text: textParts.join(""),
    functionCalls,
  };
}
