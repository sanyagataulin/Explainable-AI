import type {
  Message,
  PortfolioHolding,
  Recommendation,
  RiskProfile,
  UserProfile,
  InvestmentHorizon,
  RiskTolerance,
  InvestmentGoal,
  PreferredGeography,
} from "../types/api";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// ── Users ────────────────────────────────────────────────────────────────────

export async function getUsers() {
  const res = await fetch(`${API_BASE}/api/users`);
  return handleResponse<{ users: UserProfile[] }>(res);
}

export async function createUser(email: string, telegram_id?: string) {
  const res = await fetch(`${API_BASE}/api/users`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, telegram_id: telegram_id ?? null }),
  });
  return handleResponse<{ user: UserProfile }>(res);
}

export async function getProfile(userId: number) {
  const res = await fetch(`${API_BASE}/api/users/${userId}/profile`);
  return handleResponse<{ profile: RiskProfile }>(res);
}

export interface PutRiskProfilePayload {
  investment_horizon: InvestmentHorizon;
  risk_tolerance: RiskTolerance;
  investment_goal: InvestmentGoal;
  monthly_contribution_usd: number;
  excluded_sectors: string[];
  preferred_geography: PreferredGeography;
  risk_score: number;
  recommended_allocation: Record<string, number>;
}

export async function updateProfile(userId: number, payload: PutRiskProfilePayload) {
  const res = await fetch(`${API_BASE}/api/users/${userId}/profile`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handleResponse<{ profile: RiskProfile }>(res);
}

export async function buildRiskProfile(userId: number, answers: Record<string, string>) {
  const res = await fetch(`${API_BASE}/api/users/${userId}/profile`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ answers }),
  });
  return handleResponse<{ profile: RiskProfile }>(res);
}

export interface PortfolioHoldingInput {
  ticker: string;
  weight_pct: number;
  avg_buy_price: number;
}

export async function savePortfolio(userId: number, holdings: PortfolioHoldingInput[]) {
  const res = await fetch(`${API_BASE}/api/users/${userId}/portfolio`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ holdings }),
  });
  return handleResponse<{ holdings: PortfolioHolding[] }>(res);
}

// ── Conversations ─────────────────────────────────────────────────────────────

export async function createConversation(userId: number, title: string) {
  const res = await fetch(`${API_BASE}/api/conversations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: userId, title }),
  });
  return handleResponse<{ conversation: { id: number; user_id: number; title: string; created_at: string } }>(res);
}

export async function sendMessage(conversationId: number, userId: number, content: string) {
  const res = await fetch(`${API_BASE}/api/conversations/${conversationId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: userId, content }),
  });
  return handleResponse<{ messages: Message[] }>(res);
}

export async function getMessages(conversationId: number) {
  const res = await fetch(`${API_BASE}/api/conversations/${conversationId}/messages`);
  return handleResponse<{ messages: Message[] }>(res);
}

export function openReasoningStream(conversationId: number, userId: number, question: string) {
  const url = `${API_BASE}/api/conversations/${conversationId}/stream?user_id=${userId}&question=${encodeURIComponent(question)}`;
  return new EventSource(url);
}

// ── Recommendations ───────────────────────────────────────────────────────────

export async function getRecommendations(userId: number) {
  const res = await fetch(`${API_BASE}/api/recommendations?user_id=${userId}`);
  return handleResponse<{ recommendations: Recommendation[] }>(res);
}

export async function getRecommendation(recommendationId: number) {
  const res = await fetch(`${API_BASE}/api/recommendations/${recommendationId}`);
  return handleResponse<{ recommendation: Recommendation }>(res);
}

// ── Documents ─────────────────────────────────────────────────────────────────

export async function uploadDocument(company: string, file: File) {
  const formData = new FormData();
  formData.append("company", company);
  formData.append("file", file);
  const res = await fetch(`${API_BASE}/api/documents`, {
    method: "POST",
    body: formData,
  });
  return handleResponse<{ message: string }>(res);
}

// ── Search ────────────────────────────────────────────────────────────────────

export async function searchMessages(userId: number, query: string) {
  const res = await fetch(`${API_BASE}/api/search/messages?user_id=${userId}&q=${encodeURIComponent(query)}`);
  return handleResponse<{ messages: Message[] }>(res);
}
