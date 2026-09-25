/** Request/response contract between the chat UI and POST /api/assistant. */
import type { DraftField, DraftPatch, DraftState } from "./draft";
import type { ClientType, DataSource, Quote } from "./types";

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export interface AssistantRequest {
  sessionId: string;
  messageId: string;
  message: string;
  history: ChatTurn[];
  draft: DraftState;
}

export interface QuoteView {
  modelLabel: string;
  clientType: ClientType;
  price: number;
  advancePercent: number;
  advanceAmount: number;
  principal: number;
  months: number;
  annualRate: number;
  monthlyPayment: number;
  source: DataSource;
  checkedAt: string;
}

export type AssistantCard =
  | { type: "quote"; quote: QuoteView }
  | { type: "offers"; offers: Quote[]; maxMonthly: number; clientType: ClientType }
  | { type: "vehicles"; options: Array<{ id: number; label: string; partner: string }> }
  | { type: "missing"; fields: DraftField[] }
  | { type: "summary" };

export interface AssistantResponse {
  reply: string;
  /** Validated field changes; the client applies them only to fields unchanged since `baseRevs`. */
  patch: DraftPatch;
  baseRevs: DraftState["revs"];
  cards: AssistantCard[];
  mode: "llm" | "fallback";
  /** Shown above the reply, e.g. when the model is unavailable. */
  notice?: string;
}

export const LIMITS = {
  message: 1_000,
  historyTurns: 16,
  historyChars: 2_000,
} as const;

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
