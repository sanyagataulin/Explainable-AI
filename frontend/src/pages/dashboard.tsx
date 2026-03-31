import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
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
import { useTranslation } from "../i18n";
import type { ReasoningStep, Recommendation } from "../types/api";

// Helper to translate recommendation action
function getActionLabel(action: Recommendation["action"]): string {
  const actionMap: Record<Recommendation["action"], string> = {
    BUY: "ПОКУПАТЬ",
    SELL: "ПРОДАВАТЬ",
    HOLD: "ДЕРЖАТЬ",
    AVOID: "ИЗБЕГАТЬ",
    WATCHLIST: "НАБЛЮДЕНИЕ",
  };
  return actionMap[action] || action;
}

// Helper to translate conviction level
function getConvictionLabel(conviction: Recommendation["conviction"]): string {
  const convictionMap: Record<Recommendation["conviction"], string> = {
    LOW: "Низкая",
    MEDIUM: "Средняя",
    HIGH: "Высокая",
  };
  return convictionMap[conviction] || conviction;
}

interface Props {
  userId: number | null;
  conversationId: number | null;
  onSessionCreated: (userId: number, conversationId: number) => void;
}

export function Dashboard({ userId, conversationId, onSessionCreated }: Props) {
  const { t } = useTranslation();
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
        throw new Error(t.errors.sessionNotCreated);
      }
      setSteps([]);
      setStreamError(null);
      await sendMessage(conversationId, userId, question);
      await new Promise<void>((resolve, reject) => {
        const source = openReasoningStream(conversationId, userId, question);
        const timeoutId = window.setTimeout(() => {
          setStreamError(t.chainOfThought.timeout);
          source.close();
          reject(new Error(t.chainOfThought.timeout));
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
          setStreamError(payload.message ?? t.errors.streamingFailed);
          closeStream();
          reject(new Error(payload.message ?? t.errors.streamingFailed));
        });

        source.addEventListener("recommendation_saved", () => {
          closeStream();
          void recommendationsQuery.refetch();
          resolve();
        });

        source.onerror = () => {
          setStreamError(t.chainOfThought.connectionError);
          closeStream();
          reject(new Error(t.chainOfThought.connectionError));
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
        <h1 className="text-4xl font-bold">{t.header.title}</h1>
        <p className="mt-2 text-muted-foreground">{t.header.subtitle}</p>
      </header>

      <section className="grid gap-6 md:grid-cols-2">
        <Card className="fade-up">
          <CardHeader>
            <CardTitle>{t.sessionSetup.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground">{t.sessionSetup.createNewUser}</p>
            <input
              className="w-full rounded-md border border-border bg-white px-3 py-2"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t.sessionSetup.emailPlaceholder}
            />
            <Button onClick={() => setupMutation.mutate()} disabled={setupMutation.isPending}>
              {setupMutation.isPending ? t.sessionSetup.buttonCreating : t.sessionSetup.buttonCreate}
            </Button>
            <p className="text-sm text-muted-foreground">
              {t.common.userId}: {userId ?? "-"}, {t.common.conversationId}: {conversationId ?? "-"}
            </p>
          </CardContent>
        </Card>

        <Card className="fade-up" style={{ animationDelay: "120ms" }}>
          <CardHeader>
            <CardTitle>{t.askQuestion.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <textarea
              className="min-h-24 w-full rounded-md border border-border bg-white px-3 py-2"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder={t.askQuestion.questionPlaceholder}
            />
            <Button onClick={() => askMutation.mutate()} disabled={askMutation.isPending || !conversationId}>
              {askMutation.isPending ? t.askQuestion.buttonStreaming : t.askQuestion.buttonRun}
            </Button>
          </CardContent>
        </Card>
      </section>

      <section>
        <Card>
          <CardHeader>
            <CardTitle>{t.chainOfThought.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {streamError ? <p className="text-sm text-red-600">{streamError}</p> : null}
              {steps.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t.chainOfThought.noSteps}</p>
              ) : (
                steps.map((step, idx) => (
                  <div key={`${step.type}-${idx}`} className="rounded-lg border border-border bg-white p-3">
                    <p className="text-xs font-semibold text-primary mb-2">{t.reasoningStepTypes[step.type as keyof typeof t.reasoningStepTypes] || step.type}</p>
                    <div className="text-sm leading-relaxed prose prose-sm max-w-none dark:prose-invert
                      [&_p]:m-0 [&_p]:mb-2 [&_p:last-child]:mb-0
                      [&_ul]:m-0 [&_ul]:mb-2 [&_ul]:ml-4 [&_li]:mb-1
                      [&_ol]:m-0 [&_ol]:mb-2 [&_ol]:ml-4 [&_li]:mb-1
                      [&_strong]:font-semibold [&_em]:italic
                      [&_code]:bg-gray-100 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs [&_code]:font-mono
                      [&_blockquote]:border-l-4 [&_blockquote]:border-gray-300 [&_blockquote]:pl-3 [&_blockquote]:py-1 [&_blockquote]:text-gray-600
                      [&_h1]:text-lg [&_h1]:font-bold [&_h1]:mb-2
                      [&_h2]:text-base [&_h2]:font-bold [&_h2]:mb-1.5
                      [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mb-1
                      [&_table]:border-collapse [&_table]:w-full [&_table]:mb-2
                      [&_th]:border [&_th]:border-gray-300 [&_th]:px-2 [&_th]:py-1 [&_th]:text-left [&_th]:bg-gray-50
                      [&_td]:border [&_td]:border-gray-300 [&_td]:px-2 [&_td]:py-1">
                      <ReactMarkdown>{step.content}</ReactMarkdown>
                    </div>
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
            <CardTitle>{t.latestRecommendation.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {latestRecommendation ? (
              <>
                <div className="pb-3 border-b border-border">
                  <p className="font-semibold text-base">
                    {latestRecommendation.company_name} ({latestRecommendation.ticker})
                  </p>
                </div>
                
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">{t.latestRecommendation.action}</p>
                    <p className="font-semibold text-primary">{getActionLabel(latestRecommendation.action)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">{t.latestRecommendation.conviction}</p>
                    <p className="font-semibold text-primary">{getConvictionLabel(latestRecommendation.conviction)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">{t.latestRecommendation.weight}</p>
                    <p className="font-semibold text-primary">{latestRecommendation.suggested_weight_pct}%</p>
                  </div>
                </div>

                {latestRecommendation.risks && latestRecommendation.risks.length > 0 && (
                  <div className="pt-3 border-t border-border">
                    <p className="text-xs font-semibold text-muted-foreground mb-2">Риски:</p>
                    <ul className="text-xs space-y-1 ml-4">
                      {latestRecommendation.risks.map((risk, idx) => (
                        <li key={idx} className="list-disc text-sm">
                          <div className="prose prose-sm max-w-none dark:prose-invert
                            [&_p]:m-0 [&_strong]:font-semibold [&_em]:italic
                            [&_code]:bg-gray-100 [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs">
                            <ReactMarkdown>{risk}</ReactMarkdown>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {latestRecommendation.alternatives && latestRecommendation.alternatives.length > 0 && (
                  <div className="pt-3 border-t border-border">
                    <p className="text-xs font-semibold text-muted-foreground mb-2">Альтернативы:</p>
                    <ul className="text-xs space-y-1 ml-4">
                      {latestRecommendation.alternatives.map((alt, idx) => (
                        <li key={idx} className="list-disc text-sm">
                          <div className="prose prose-sm max-w-none dark:prose-invert
                            [&_p]:m-0 [&_strong]:font-semibold [&_em]:italic
                            [&_code]:bg-gray-100 [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs">
                            <ReactMarkdown>{alt}</ReactMarkdown>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="pt-3 border-t border-border">
                  <p className="text-xs text-muted-foreground leading-relaxed">{latestRecommendation.disclaimer}</p>
                </div>
              </>
            ) : (
              <p className="text-muted-foreground">{t.latestRecommendation.noRecommendations}</p>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
