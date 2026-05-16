import { getGroqApiKey, getGeminiApiKey } from "@/lib/config";
import { logAppEvent } from "@/lib/logger";
import type { ParsedBy } from "@/types";

// ─── AI-Powered SMS Parser (Groq primary + Gemini backup) ───────────────────
// - Hard 10-second timeout on every call
// - JSON response validation
// - Never throws — returns null on any failure

const SYSTEM_PROMPT = `You are a precise Indian bank SMS parser. Extract transaction details from the given SMS.

Return ONLY a JSON object with these fields:
{
  "amount": number or null,
  "type": "credit" or "debit" or null,
  "merchant": string or null (the payee/payer name, e.g. "SWIGGY", "NACH-REC LIMITED", "Amazon"),
  "bank": string or null (e.g. "SBI", "HDFC", "ICICI"),
  "balance": number or null (available balance after transaction)
}

Rules:
- If you cannot extract a field with confidence, set it to null. Never guess.
- "type" must be "credit" (money received) or "debit" (money spent/deducted).
- "amount" must be the transaction amount, not the balance.
- Do NOT include any text outside the JSON object.
- Do NOT wrap in markdown code fences.`;

export type AiParseResult = {
  amount: number | null;
  type: "credit" | "debit" | null;
  merchant: string | null;
  bank: string | null;
  balance: number | null;
  parsedBy: ParsedBy;
};

// ─── Timeout utility ─────────────────────────────────────────────────────────

function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number): Promise<Response> {
  return new Promise((resolve, reject) => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      controller.abort();
      reject(new Error(`Request timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    fetch(url, { ...options, signal: controller.signal })
      .then(resolve)
      .catch(reject)
      .finally(() => clearTimeout(timer));
  });
}

// ─── Response Validation ─────────────────────────────────────────────────────

function validateAiResponse(raw: string): AiParseResult | null {
  try {
    // Strip markdown code fences if present
    let cleaned = raw.trim();
    if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
    }

    const parsed = JSON.parse(cleaned);

    // Validate amount
    const amount = typeof parsed.amount === "number" && parsed.amount > 0 ? parsed.amount : null;

    // Validate type
    const type = (parsed.type === "credit" || parsed.type === "debit") ? parsed.type : null;

    // Validate merchant
    const merchant = typeof parsed.merchant === "string" && parsed.merchant.trim().length > 0
      ? parsed.merchant.trim()
      : null;

    // Validate bank
    const bank = typeof parsed.bank === "string" && parsed.bank.trim().length > 0
      ? parsed.bank.trim()
      : null;

    // Validate balance
    const balance = typeof parsed.balance === "number" && parsed.balance >= 0 ? parsed.balance : null;

    // Must have at least amount to be useful
    if (!amount) return null;

    return { amount, type, merchant, bank, balance, parsedBy: "groq" }; // parsedBy updated by caller
  } catch {
    return null;
  }
}

// ─── Groq API Call ───────────────────────────────────────────────────────────

async function callGroq(smsBody: string): Promise<AiParseResult | null> {
  const apiKey = getGroqApiKey();
  if (!apiKey) return null;

  try {
    const response = await fetchWithTimeout(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: smsBody },
          ],
          temperature: 0,
          max_tokens: 200,
        }),
      },
      10000, // 10 second hard timeout
    );

    if (!response.ok) {
      await logAppEvent("warn", "AI Parser: Groq API error", {
        status: response.status,
        statusText: response.statusText,
      });
      return null;
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) return null;

    const result = validateAiResponse(content);
    if (result) {
      result.parsedBy = "groq";
    }
    return result;
  } catch (err) {
    await logAppEvent("warn", "AI Parser: Groq call failed", String(err));
    return null;
  }
}

// ─── Gemini API Call ─────────────────────────────────────────────────────────

async function callGemini(smsBody: string): Promise<AiParseResult | null> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) return null;

  try {
    const response = await fetchWithTimeout(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: `${SYSTEM_PROMPT}\n\nSMS:\n${smsBody}` },
              ],
            },
          ],
          generationConfig: {
            temperature: 0,
            maxOutputTokens: 200,
          },
        }),
      },
      10000, // 10 second hard timeout
    );

    if (!response.ok) {
      await logAppEvent("warn", "AI Parser: Gemini API error", {
        status: response.status,
        statusText: response.statusText,
      });
      return null;
    }

    const data = await response.json();
    const content = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!content) return null;

    const result = validateAiResponse(content);
    if (result) {
      result.parsedBy = "gemini";
    }
    return result;
  } catch (err) {
    await logAppEvent("warn", "AI Parser: Gemini call failed", String(err));
    return null;
  }
}

// ─── Check Internet ──────────────────────────────────────────────────────────

async function isInternetAvailable(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);
    const resp = await fetch("https://clients3.google.com/generate_204", {
      method: "HEAD",
      signal: controller.signal,
    });
    clearTimeout(timer);
    return resp.status === 204 || resp.ok;
  } catch {
    return false;
  }
}

// ─── Main Export: AI Parse Pipeline ──────────────────────────────────────────
// Tries Groq first, then Gemini. Returns null if both fail or no internet.

export async function parseSmsWithAi(smsBody: string): Promise<AiParseResult | null> {
  try {
    // Check internet first — don't waste time if offline
    const online = await isInternetAvailable();
    if (!online) {
      await logAppEvent("info", "AI Parser: No internet, skipping AI parsing.");
      return null;
    }

    // Try Groq first (fastest)
    await logAppEvent("info", "AI Parser: Trying Groq...");
    const groqResult = await callGroq(smsBody);
    if (groqResult) {
      await logAppEvent("info", "AI Parser: Groq succeeded", {
        amount: groqResult.amount,
        type: groqResult.type,
        merchant: groqResult.merchant,
      });
      return groqResult;
    }

    // Groq failed — try Gemini
    await logAppEvent("info", "AI Parser: Groq failed, trying Gemini...");
    const geminiResult = await callGemini(smsBody);
    if (geminiResult) {
      await logAppEvent("info", "AI Parser: Gemini succeeded", {
        amount: geminiResult.amount,
        type: geminiResult.type,
        merchant: geminiResult.merchant,
      });
      return geminiResult;
    }

    await logAppEvent("info", "AI Parser: Both Groq and Gemini failed.");
    return null;
  } catch (err) {
    await logAppEvent("error", "AI Parser: Unexpected error", String(err));
    return null;
  }
}
