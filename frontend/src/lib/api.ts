import type { Message, Recommendation } from "../types/api";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

export async function createUser(email: string) {
  const res = await fetch(`${API_BASE}/api/users`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  if (!res.ok) throw new Error("Failed to create user");
  return res.json();
}

export async function upsertRiskProfile(userId: number) {
  const res = await fetch(`${API_BASE}/api/users/${userId}/profile`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      investment_horizon: "LONG",
      risk_tolerance: "MODERATE",
      investment_goal: "GROWTH",
      monthly_contribution_usd: 1000,
      excluded_sectors: [],
      preferred_geography: "US",
      risk_score: 6,
      recommended_allocation: {
        equities: 60,
        bonds: 30,
        cash: 10,
      },
    }),
  });
  if (!res.ok) throw new Error("Failed to create risk profile");
  return res.json();
}

export async function createConversation(userId: number, title: string) {
  const res = await fetch(`${API_BASE}/api/conversations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: userId, title }),
  });
  if (!res.ok) throw new Error("Failed to create conversation");
  return res.json();
}

export async function sendMessage(conversationId: number, userId: number, content: string) {
  const res = await fetch(`${API_BASE}/api/conversations/${conversationId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: userId, content }),
  });
  if (!res.ok) throw new Error("Failed to send message");
  return (await res.json()) as { messages: Message[] };
}

export async function getMessages(conversationId: number) {
  const res = await fetch(`${API_BASE}/api/conversations/${conversationId}/messages`);
  if (!res.ok) throw new Error("Failed to load messages");
  return (await res.json()) as { messages: Message[] };
}

export async function getRecommendations(userId: number) {
  const res = await fetch(`${API_BASE}/api/recommendations?user_id=${userId}`);
  if (!res.ok) throw new Error("Failed to load recommendations");
  return (await res.json()) as { recommendations: Recommendation[] };
}

export function openReasoningStream(conversationId: number, userId: number, question: string) {
  const url = `${API_BASE}/api/conversations/${conversationId}/stream?user_id=${userId}&question=${encodeURIComponent(question)}`;
  return new EventSource(url);
}
