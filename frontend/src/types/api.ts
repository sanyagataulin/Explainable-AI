export type ReasoningType = "MACRO" | "SECTOR" | "COMPANY" | "FINAL";

export interface ReasoningStep {
  type: ReasoningType;
  content: string;
  sources: Array<{ title: string; url: string }>;
  metadata: Record<string, string | number | boolean>;
}

export interface Message {
  id: number;
  conversation_id: number;
  role: "USER" | "ASSISTANT" | "SYSTEM";
  content: string;
  created_at: string;
}

export interface Recommendation {
  id: number;
  ticker: string;
  company_name: string;
  action: "BUY" | "HOLD" | "SELL" | "AVOID" | "WATCHLIST";
  conviction: "LOW" | "MEDIUM" | "HIGH";
  suggested_weight_pct: number;
  risks: string[];
  alternatives: string[];
  reasoning_steps: ReasoningStep[];
  time_horizon: string;
  disclaimer: string;
}
