export type ReasoningType = "MACRO" | "SECTOR" | "COMPANY" | "FINAL";
export type InvestmentHorizon = "SHORT" | "MEDIUM" | "LONG";
export type RiskTolerance = "CONSERVATIVE" | "MODERATE" | "AGGRESSIVE";
export type InvestmentGoal = "CAPITAL_PRESERVATION" | "INCOME" | "GROWTH" | "SPECULATION";
export type PreferredGeography = "US" | "GLOBAL" | "EM" | "EUROPE";

export interface UserProfile {
  id: number | null;
  telegram_id: string | null;
  email: string;
  created_at: string | null;
}

export interface RiskProfile {
  id: number | null;
  user_id: number;
  investment_horizon: InvestmentHorizon;
  risk_tolerance: RiskTolerance;
  investment_goal: InvestmentGoal;
  monthly_contribution_usd: number;
  excluded_sectors: string[];
  preferred_geography: PreferredGeography;
  risk_score: number;
  recommended_allocation: Record<string, number>;
  updated_at: string | null;
}

export interface PortfolioHolding {
  id: number | null;
  user_id: number;
  ticker: string;
  weight_pct: number;
  avg_buy_price: number;
  added_at: string | null;
}

export interface Conversation {
  id: number | null;
  user_id: number;
  title: string;
  created_at: string | null;
}

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
  conversation_id: number;
  user_id: number;
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
  created_at: string | null;
}
