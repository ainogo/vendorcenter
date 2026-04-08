/**
 * India Post PIN code lookup service.
 * Uses free public API: https://api.postalpincode.in/pincode/{pincode}
 * No API key required. In-memory LRU cache with 24h TTL.
 */

interface PostOffice {
  Name: string;
  BranchType: string;
  DeliveryStatus: string;
  Circle: string;
  District: string;
  Division: string;
  Region: string;
  Block: string;
  State: string;
  Country: string;
  Pincode: string;
}

interface IndiaPostResponse {
  Message: string;
  Status: "Success" | "Error" | "404";
  PostOffice: PostOffice[] | null;
}

export interface PincodeLookupResult {
  valid: boolean;
  pincode: string;
  state: string;
  district: string;
  region: string;
  block: string;
  country: string;
  postOffices: { name: string; branchType: string; deliveryStatus: string }[];
}

// Simple LRU cache (Map preserves insertion order)
const cache = new Map<string, { data: PincodeLookupResult; expiresAt: number }>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const MAX_CACHE_SIZE = 2000;

// Rate limit: max 2 requests/sec
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL_MS = 500;

function cleanCache() {
  const now = Date.now();
  for (const [key, entry] of cache) {
    if (entry.expiresAt < now) {
      cache.delete(key);
    }
  }
  // Evict oldest if over size
  while (cache.size > MAX_CACHE_SIZE) {
    const firstKey = cache.keys().next().value;
    if (firstKey) cache.delete(firstKey);
  }
}

export async function lookupPincode(pincode: string): Promise<PincodeLookupResult> {
  // Validate format
  if (!/^\d{6}$/.test(pincode)) {
    return { valid: false, pincode, state: "", district: "", region: "", block: "", country: "", postOffices: [] };
  }

  // Check cache
  const cached = cache.get(pincode);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  // Rate limit
  const now = Date.now();
  const waitMs = MIN_REQUEST_INTERVAL_MS - (now - lastRequestTime);
  if (waitMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }
  lastRequestTime = Date.now();

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(`https://api.postalpincode.in/pincode/${pincode}`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) {
      return { valid: false, pincode, state: "", district: "", region: "", block: "", country: "", postOffices: [] };
    }

    const data: IndiaPostResponse[] = await response.json();
    const result = data[0];

    if (!result || result.Status !== "Success" || !result.PostOffice?.length) {
      const notFound: PincodeLookupResult = { valid: false, pincode, state: "", district: "", region: "", block: "", country: "", postOffices: [] };
      // Cache unsuccessful lookups too (shorter TTL)
      cache.set(pincode, { data: notFound, expiresAt: Date.now() + 60 * 60 * 1000 });
      return notFound;
    }

    const firstPO = result.PostOffice[0];
    const lookupResult: PincodeLookupResult = {
      valid: true,
      pincode,
      state: firstPO.State,
      district: firstPO.District,
      region: firstPO.Region,
      block: firstPO.Block,
      country: firstPO.Country,
      postOffices: result.PostOffice.map((po) => ({
        name: po.Name,
        branchType: po.BranchType,
        deliveryStatus: po.DeliveryStatus,
      })),
    };

    cache.set(pincode, { data: lookupResult, expiresAt: Date.now() + CACHE_TTL_MS });
    cleanCache();

    return lookupResult;
  } catch (err) {
    console.warn(`[india-post] API error for ${pincode}: ${(err as Error).message}`);
    // Return invalid but don't cache — let next call retry
    return { valid: false, pincode, state: "", district: "", region: "", block: "", country: "", postOffices: [] };
  }
}

/**
 * Bulk lookup multiple pincodes. Respects rate limiting.
 */
export async function bulkLookupPincodes(pincodes: string[]): Promise<PincodeLookupResult[]> {
  const results: PincodeLookupResult[] = [];
  for (const pin of pincodes) {
    results.push(await lookupPincode(pin));
  }
  return results;
}
