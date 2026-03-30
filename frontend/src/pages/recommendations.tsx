import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getRecommendations, getRecommendation } from "../lib/api";
import type { Recommendation } from "../types/api";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";

interface Props {
  userId: number;
}

const actionColor: Record<Recommendation["action"], string> = {
  BUY: "text-green-600",
  HOLD: "text-blue-600",
  SELL: "text-red-600",
  AVOID: "text-red-400",
  WATCHLIST: "text-yellow-600",
};

const convictionBadge: Record<Recommendation["conviction"], string> = {
  LOW: "bg-muted text-muted-foreground",
  MEDIUM: "bg-yellow-100 text-yellow-800",
  HIGH: "bg-green-100 text-green-800",
};

function DetailPanel({ id, onClose }: { id: number; onClose: () => void }) {
  const query = useQuery({
    queryKey: ["recommendation", id],
    queryFn: () => getRecommendation(id),
  });

  const rec = query.data?.recommendation;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{rec ? `${rec.company_name} (${rec.ticker})` : "Loading…"}</CardTitle>
        <Button size="sm" variant="secondary" onClick={onClose}>Close</Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {query.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {query.isError && <p className="text-sm text-red-600">Failed to load detail</p>}
        {rec && (
          <>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <span className="text-muted-foreground">Action</span>
              <span className={`font-semibold ${actionColor[rec.action]}`}>{rec.action}</span>
              <span className="text-muted-foreground">Conviction</span>
              <span className={`inline-flex w-fit rounded-full px-2 py-0.5 text-xs font-medium ${convictionBadge[rec.conviction]}`}>
                {rec.conviction}
              </span>
              <span className="text-muted-foreground">Weight</span>
              <span>{rec.suggested_weight_pct}%</span>
              <span className="text-muted-foreground">Horizon</span>
              <span>{rec.time_horizon}</span>
            </div>

            {rec.risks.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-1">Risks</p>
                <ul className="list-disc list-inside space-y-0.5 text-sm text-muted-foreground">
                  {rec.risks.map((r, i) => <li key={i}>{r}</li>)}
                </ul>
              </div>
            )}

            {rec.alternatives.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-1">Alternatives</p>
                <div className="flex flex-wrap gap-2">
                  {rec.alternatives.map((a, i) => (
                    <span key={i} className="rounded-full bg-muted px-2 py-0.5 text-xs">{a}</span>
                  ))}
                </div>
              </div>
            )}

            {rec.reasoning_steps.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Reasoning chain</p>
                <div className="space-y-2">
                  {rec.reasoning_steps.map((step, i) => (
                    <div key={i} className="rounded-lg border border-border bg-white p-3">
                      <p className="text-xs font-semibold text-primary mb-1">{step.type}</p>
                      <p className="text-sm leading-relaxed">{step.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <p className="text-xs text-muted-foreground border-t border-border pt-3">{rec.disclaimer}</p>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export function RecommendationsPage({ userId }: Props) {
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const listQuery = useQuery({
    queryKey: ["recommendations", userId],
    queryFn: () => getRecommendations(userId),
  });

  const items = listQuery.data?.recommendations ?? [];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Recommendations</h2>

      {listQuery.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {listQuery.isError && <p className="text-sm text-red-600">Failed to load recommendations</p>}

      {items.length === 0 && !listQuery.isLoading && (
        <p className="text-sm text-muted-foreground">No recommendations yet. Run an analysis first.</p>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {items.map((rec) => (
          <Card
            key={rec.id}
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => setSelectedId(rec.id === selectedId ? null : rec.id)}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                {rec.company_name} <span className="text-muted-foreground font-normal text-sm">({rec.ticker})</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center gap-3">
                <span className={`font-bold text-lg ${actionColor[rec.action]}`}>{rec.action}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${convictionBadge[rec.conviction]}`}>
                  {rec.conviction}
                </span>
              </div>
              <p className="text-muted-foreground">Weight: {rec.suggested_weight_pct}% · {rec.time_horizon}</p>
              {rec.created_at && (
                <p className="text-xs text-muted-foreground">
                  {new Date(rec.created_at).toLocaleDateString()}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {selectedId !== null && (
        <DetailPanel id={selectedId} onClose={() => setSelectedId(null)} />
      )}
    </div>
  );
}
