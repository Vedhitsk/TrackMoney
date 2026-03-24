import { listCategories } from "@/db/queries/categories";
import { listAccounts } from "@/db/queries/accounts";
import type { TransactionDraft } from "@/types";

function normalizeText(text: string) {
  return text.trim().replace(/\s+/g, " ");
}

export async function parseSmsToTransactionDraft(params: {
  rawSms: string;
  senderAddress: string;
  body: string;
  source: "sms";
}): Promise<Omit<TransactionDraft, "id"> | null> {
  const body = normalizeText(params.body);
  if (!body) return null;

  const apiKey = process.env.EXPO_PUBLIC_GROQ_API_KEY;

  if (!apiKey) {
    console.warn("Groq API Key is missing. Falling back to simple regex parser.");
    return fallbackRegexParser(params);
  }

  try {
    // 1. Fetch User Data to feed the AI context
    const [categories, accounts] = await Promise.all([
      listCategories(),
      listAccounts(),
    ]);

    const categoriesCtx = categories.map((c) => `{ id: ${c.id}, name: "${c.name}" }`).join(', ');
    const accountsCtx = accounts.map((a) => `{ id: ${a.id}, name: "${a.name}" }`).join(', ');

    // 2. Build Prompt
    const systemPrompt = `You are a highly intelligent SMS Transaction Parser.
Your job is to read an raw bank/UPI/Wallet SMS and extract transaction details into a STRICT JSON object.

USER CONTEXT:
The user has the following Categories: [${categoriesCtx}]
The user has the following Accounts: [${accountsCtx}]

RULES:
1. Determine if the SMS is a transaction (expense or income). If it's just an OTP, informational message, or promotional, set "action": "ignore".
2. If it is a transaction, extract:
   - "amount": the pure number (e.g. 150.00). Must be positive.
   - "type": strictly "expense" (money left user's account) or "income" (money entered). Note: "debited/paid" = expense, "credited/received" = income.
   - "merchant": the name of the person/store money was sent to or received from. Keep it clean (e.g. "VARAKS ENJOY", "SWIGGY"). Do NOT put bank names here.
   - "categoryId": pick the absolute best matching category ID from the User Context. If NONE match or you are unsure, return null.
   - "accountId": pick the best matching account ID from the User Context based on clues like "HDFC", "SBI", "A/C X1943", "Card". If NONE match or unsure, return null.

OUTPUT FORMAT:
Return ONLY pure JSON. No markdown, no backticks, no explanation.
{
  "action": "process" | "ignore",
  "amount": number,
  "type": "expense" | "income",
  "merchant": string,
  "categoryId": number | null,
  "accountId": number | null
}
`;

    // 3. Call Groq
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `SMS Sender: ${params.senderAddress}\nSMS Body: ${body}` }
        ],
        temperature: 0.1,
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      console.error("Groq API Error:", await res.text());
      return fallbackRegexParser(params);
    }

    const data = await res.json();
    const content = data.choices[0].message.content;
    const result = JSON.parse(content);

    if (result.action === "ignore" || !result.amount || !result.type) {
      return null;
    }

    return {
      rawAmount: Number(result.amount),
      actualAmount: Number(result.amount),
      isShared: false,
      type: result.type,
      categoryId: result.categoryId || null,
      accountId: result.accountId || null,
      toAccountId: null,
      merchant: result.merchant || "Unknown",
      notes: body.slice(0, 200),
      date: new Date(),
      source: params.source,
      isExcluded: false,
    };
  } catch (error) {
    console.error("AI Parser Failed:", error);
    return fallbackRegexParser(params);
  }
}

// Keep the old parser as a fallback in case they run out of API credits or don't set the key!
function fallbackRegexParser(params: { senderAddress: string; body: string; source: "sms" }): Omit<TransactionDraft, "id"> | null {
  const body = normalizeText(params.body);
  
  const extractFirstAmount = (text: string) => {
    const patterns = [/₹\s*([0-9]+(?:\.[0-9]{1,2})?)/i, /Rs\.?\s*([0-9]+(?:\.[0-9]{1,2})?)/i, /INR\s*([0-9]+(?:\.[0-9]{1,2})?)/i];
    for (const re of patterns) {
      const m = text.match(re);
      if (m && Number(m[1]) > 0) return Number(m[1]);
    }
    return null;
  };
  
  const detectDirection = (t: string) => {
    const inc = ["credited", "received", "refund", "reverted"].reduce((a, h) => t.toLowerCase().includes(h) ? a + 1 : a, 0);
    const exp = ["debited", "spent", "paid", "withdrawn"].reduce((a, h) => t.toLowerCase().includes(h) ? a + 1 : a, 0);
    if (inc === 0 && exp === 0) return null;
    return inc >= exp ? "income" : "expense";
  };

  const amount = extractFirstAmount(body);
  const direction = detectDirection(body);

  if (!amount || !direction) return null;

  return {
    rawAmount: amount,
    actualAmount: amount,
    isShared: false,
    type: direction,
    categoryId: null,
    accountId: null,
    toAccountId: null,
    merchant: params.senderAddress.trim() || "Unknown",
    notes: body.slice(0, 200),
    date: new Date(),
    source: params.source,
    isExcluded: false,
  };
}
