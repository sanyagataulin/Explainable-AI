import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, PieChart, Pie, Cell } from "recharts";

import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import {
  createConversation,
  createUser,
  getRecommendations,
  openReasoningStream,
  sendMessage,
  upsertRiskProfile,
} from "../lib/api";
import type { ReasoningStep } from "../types/api";

const allocationData = [
  { name: "Stocks", value: 58 },
  { name: "Bonds", value: 25 },
  { name: "Cash", value: 10 },
  { name: "Alternatives", value: 7 },
];

const sparkData = [
  { day: "Mon", value: 100 },
  { day: "Tue", value: 102 },
  { day: "Wed", value: 101 },
  { day: "Thu", value: 105 },
  { day: "Fri", value: 108 },
];

const colors = ["#0f82c0", "#ff9d2f", "#4ea06f", "#9aa6b2"];

export function Dashboard() {
  const [email, setEmail] = useState("investor@example.com");
  const [question, setQuestion] = useState("Оцени Apple для моего портфеля");
  const [userId, setUserId] = useState<number | null>(null);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [steps, setSteps] = useState<ReasoningStep[]>([]);
  const [streamError, setStreamError] = useState<string | null>(null);

  const setupMutation = useMutation({
    mutationFn: async () => {
      const user = await createUser(email);
      await upsertRiskProfile(user.user.id);
      const conversation = await createConversation(user.user.id, "Main dialog");
      return { userId: user.user.id as number, conversationId: conversation.conversation.id as number };
    },
    onSuccess: (result) => {
      setUserId(result.userId);
      setConversationId(result.conversationId);
    },
  });

  const recommendationsQuery = useQuery({
    queryKey: ["recommendations", userId],
    queryFn: () => getRecommendations(userId ?? 0),
    enabled: Boolean(userId),
  });

  const askMutation = useMutation({
    mutationFn: async () => {
      if (!userId || !conversationId) {
        throw new Error("Create session first");
      }
      setSteps([]);
      setStreamError(null);
      await sendMessage(conversationId, userId, question);
      const source = openReasoningStream(conversationId, userId, question);
      source.addEventListener("reasoning_step", (event) => {
        const payload = JSON.parse((event as MessageEvent).data) as ReasoningStep;
        setSteps((prev) => [...prev, payload]);
      });
      source.addEventListener("stream_error", (event) => {
        const payload = JSON.parse((event as MessageEvent).data) as { message?: string };
        setStreamError(payload.message ?? "Streaming failed");
        source.close();
      });
      source.onerror = () => source.close();
      setTimeout(() => source.close(), 16000);
    },
  });

  const latestRecommendation = useMemo(
    () => recommendationsQuery.data?.recommendations?.[0],
    [recommendationsQuery.data],
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <header className="fade-up">
        <h1 className="text-4xl font-bold">Explainable Investment Advisor</h1>
        <p className="mt-2 text-muted-foreground">Macro to sector to company reasoning in real time.</p>
      </header>

      <section className="grid gap-6 md:grid-cols-2">
        <Card className="fade-up">
          <CardHeader>
            <CardTitle>Session Setup</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <input
              className="w-full rounded-md border border-border bg-white px-3 py-2"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
            />
            <Button onClick={() => setupMutation.mutate()} disabled={setupMutation.isPending}>
              {setupMutation.isPending ? "Creating..." : "Create User + Conversation"}
            </Button>
            <p className="text-sm text-muted-foreground">
              User ID: {userId ?? "-"}, Conversation ID: {conversationId ?? "-"}
            </p>
          </CardContent>
        </Card>

        <Card className="fade-up" style={{ animationDelay: "120ms" }}>
          <CardHeader>
            <CardTitle>Ask Investment Question</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <textarea
              className="min-h-24 w-full rounded-md border border-border bg-white px-3 py-2"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
            />
            <Button onClick={() => askMutation.mutate()} disabled={askMutation.isPending || !conversationId}>
              {askMutation.isPending ? "Streaming..." : "Run Explainable Analysis"}
            </Button>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Chain of Thought Stream</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {streamError ? <p className="text-sm text-red-600">{streamError}</p> : null}
              {steps.length === 0 ? (
                <p className="text-sm text-muted-foreground">No steps yet.</p>
              ) : (
                steps.map((step, idx) => (
                  <div key={`${step.type}-${idx}`} className="rounded-lg border border-border bg-white p-3">
                    <p className="text-xs font-semibold text-primary">{step.type}</p>
                    <p className="text-sm leading-relaxed">{step.content}</p>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Allocation Snapshot</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={allocationData} dataKey="value" nameKey="name" outerRadius={90}>
                  {allocationData.map((entry, index) => (
                    <Cell key={entry.name} fill={colors[index % colors.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Price Trend</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sparkData}>
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="value" stroke="#0f82c0" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Latest Recommendation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {latestRecommendation ? (
              <>
                <p>
                  {latestRecommendation.company_name} ({latestRecommendation.ticker})
                </p>
                <p>
                  Action: <b>{latestRecommendation.action}</b> | Conviction: <b>{latestRecommendation.conviction}</b>
                </p>
                <p>Weight: {latestRecommendation.suggested_weight_pct}%</p>
                <p className="text-xs text-muted-foreground">{latestRecommendation.disclaimer}</p>
              </>
            ) : (
              <p className="text-muted-foreground">No saved recommendations yet.</p>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
