import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import {
  createConversation,
  createUser,
  getRecommendations,
  openReasoningStream,
  sendMessage,
  updateProfile,
} from "../lib/api";
import type { ReasoningStep } from "../types/api";

interface Props {
  userId: number | null;
  conversationId: number | null;
  onSessionCreated: (userId: number, conversationId: number) => void;
}

export function Dashboard({ userId, conversationId, onSessionCreated }: Props) {
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("investor@example.com");
  const [question, setQuestion] = useState("Оцени Apple для моего портфеля");
  const [steps, setSteps] = useState<ReasoningStep[]>([]);
  const [streamError, setStreamError] = useState<string | null>(null);

  const setupMutation = useMutation({
    mutationFn: async () => {
      const user = await createUser(email);
      await updateProfile(user.user.id!, {
        investment_horizon: "LONG",
        risk_tolerance: "MODERATE",
        investment_goal: "GROWTH",
        monthly_contribution_usd: 1000,
        excluded_sectors: [],
        preferred_geography: "US",
        risk_score: 6,
        recommended_allocation: { equities: 60, bonds: 30, cash: 10 },
      });
      const conversation = await createConversation(user.user.id!, "Main dialog");
      return { userId: user.user.id as number, conversationId: conversation.conversation.id as number };
    },
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: ["users"] });
      onSessionCreated(result.userId, result.conversationId);
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
      await new Promise<void>((resolve, reject) => {
        const source = openReasoningStream(conversationId, userId, question);
        const timeoutId = window.setTimeout(() => {
          setStreamError("Streaming timeout");
          source.close();
          reject(new Error("Streaming timeout"));
        }, 60000);

        const closeStream = () => {
          window.clearTimeout(timeoutId);
          source.close();
        };

        source.addEventListener("reasoning_step", (event) => {
          const payload = JSON.parse((event as MessageEvent).data) as ReasoningStep;
          setSteps((prev) => [...prev, payload]);
        });

        source.addEventListener("stream_error", (event) => {
          const payload = JSON.parse((event as MessageEvent).data) as { message?: string };
          setStreamError(payload.message ?? "Streaming failed");
          closeStream();
          reject(new Error(payload.message ?? "Streaming failed"));
        });

        source.addEventListener("recommendation_saved", () => {
          closeStream();
          void recommendationsQuery.refetch();
          resolve();
        });

        source.onerror = () => {
          setStreamError("Streaming connection error");
          closeStream();
          reject(new Error("Streaming connection error"));
        };
      });
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
            <p className="text-xs font-medium text-muted-foreground">Create new user</p>
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

      <section>
        <Card>
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
      </section>

      <section>
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
