// API key configuration — reads from EXPO_PUBLIC_ environment variables
// These are baked into the JS bundle at build time by Expo.

export function getGroqApiKey(): string | null {
  const key = process.env.EXPO_PUBLIC_GROQ_API_KEY;
  return key && key.trim().length > 0 ? key.trim() : null;
}

export function getGeminiApiKey(): string | null {
  const key = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
  return key && key.trim().length > 0 ? key.trim() : null;
}

export function hasAnyAiKey(): boolean {
  return !!(getGroqApiKey() || getGeminiApiKey());
}
