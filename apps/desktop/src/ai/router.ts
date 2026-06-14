// AI provider router — BYOK abstraction over OpenAI, Anthropic, Gemini, Groq,
// Ollama, and custom OpenAI-compatible endpoints (PRD §8).
//
// All AI features are opt-in. The IDE works fully without any API key. Keys are
// stored in the macOS Keychain (never in files) and calls go directly from the
// user's machine to the chosen provider — NexCode never proxies requests.
//
// TODO (Phase 3): implement the adapter-per-provider routing layer.

export type AIProvider = "openai" | "anthropic" | "gemini" | "groq" | "ollama" | "custom";

export interface AIRouter {
  /** Route a chat/completion request to the configured provider for a feature. */
  complete(/* request */): Promise<unknown>;
}
