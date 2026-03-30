import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { getProfile, updateProfile, buildRiskProfile } from "../lib/api";
import type { PutRiskProfilePayload } from "../lib/api";
import type { InvestmentHorizon, InvestmentGoal, RiskTolerance, PreferredGeography } from "../types/api";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";

interface Props {
  userId: number;
}

const defaultPayload: PutRiskProfilePayload = {
  investment_horizon: "LONG",
  risk_tolerance: "MODERATE",
  investment_goal: "GROWTH",
  monthly_contribution_usd: 1000,
  excluded_sectors: [],
  preferred_geography: "US",
  risk_score: 6,
  recommended_allocation: { equities: 60, bonds: 30, cash: 10 },
};

export function ProfilePage({ userId }: Props) {
  const [mode, setMode] = useState<"view" | "edit" | "onboard">("view");
  const [form, setForm] = useState<PutRiskProfilePayload>(defaultPayload);
  const [answers, setAnswers] = useState("");
  const [allocStr, setAllocStr] = useState(JSON.stringify(defaultPayload.recommended_allocation));

  const profileQuery = useQuery({
    queryKey: ["profile", userId],
    queryFn: () => getProfile(userId),
  });

  const updateMutation = useMutation({
    mutationFn: () => {
      let alloc: Record<string, number>;
      try {
        alloc = JSON.parse(allocStr) as Record<string, number>;
      } catch {
        throw new Error("recommended_allocation — не валидный JSON");
      }
      return updateProfile(userId, { ...form, recommended_allocation: alloc });
    },
    onSuccess: () => {
      void profileQuery.refetch();
      setMode("view");
    },
  });

  const buildMutation = useMutation({
    mutationFn: () => {
      const parsed: Record<string, string> = {};
      answers.split("\n").forEach((line, i) => { parsed[`q${i + 1}`] = line; });
      return buildRiskProfile(userId, parsed);
    },
    onSuccess: () => {
      void profileQuery.refetch();
      setMode("view");
    },
  });

  const profile = profileQuery.data?.profile;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <h2 className="text-2xl font-bold">Risk Profile</h2>
        {mode === "view" && (
          <>
            <Button size="sm" onClick={() => { setForm(profile ? { ...profile } as PutRiskProfilePayload : defaultPayload); setMode("edit"); }}>
              Edit directly
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setMode("onboard")}>
              Onboard via chat
            </Button>
          </>
        )}
        {mode !== "view" && (
          <Button size="sm" variant="secondary" onClick={() => setMode("view")}>
            Cancel
          </Button>
        )}
      </div>

      {profileQuery.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {profileQuery.isError && <p className="text-sm text-red-600">Profile not found. Create one below.</p>}

      {mode === "view" && profile && (
        <Card>
          <CardContent className="pt-5 grid grid-cols-2 gap-y-2 gap-x-6 text-sm">
            <span className="text-muted-foreground">Horizon</span><span>{profile.investment_horizon}</span>
            <span className="text-muted-foreground">Risk tolerance</span><span>{profile.risk_tolerance}</span>
            <span className="text-muted-foreground">Goal</span><span>{profile.investment_goal}</span>
            <span className="text-muted-foreground">Monthly contribution</span><span>${profile.monthly_contribution_usd}</span>
            <span className="text-muted-foreground">Geography</span><span>{profile.preferred_geography}</span>
            <span className="text-muted-foreground">Risk score</span><span>{profile.risk_score}/10</span>
            <span className="text-muted-foreground">Excluded sectors</span>
            <span>{profile.excluded_sectors.length ? profile.excluded_sectors.join(", ") : "—"}</span>
            <span className="text-muted-foreground">Allocation</span>
            <span>{Object.entries(profile.recommended_allocation).map(([k, v]) => `${k}: ${v}%`).join(", ")}</span>
          </CardContent>
        </Card>
      )}

      {mode === "edit" && (
        <Card>
          <CardHeader><CardTitle>Edit Risk Profile</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <label className="block text-sm">
              <span className="text-muted-foreground">Horizon</span>
              <select className="mt-1 block w-full rounded-md border border-border px-3 py-2"
                value={form.investment_horizon}
                onChange={(e) => setForm(f => ({ ...f, investment_horizon: e.target.value as InvestmentHorizon }))}>
                {(["SHORT", "MEDIUM", "LONG"] as InvestmentHorizon[]).map(v => <option key={v}>{v}</option>)}
              </select>
            </label>
            <label className="block text-sm">
              <span className="text-muted-foreground">Risk tolerance</span>
              <select className="mt-1 block w-full rounded-md border border-border px-3 py-2"
                value={form.risk_tolerance}
                onChange={(e) => setForm(f => ({ ...f, risk_tolerance: e.target.value as RiskTolerance }))}>
                {(["CONSERVATIVE", "MODERATE", "AGGRESSIVE"] as RiskTolerance[]).map(v => <option key={v}>{v}</option>)}
              </select>
            </label>
            <label className="block text-sm">
              <span className="text-muted-foreground">Investment goal</span>
              <select className="mt-1 block w-full rounded-md border border-border px-3 py-2"
                value={form.investment_goal}
                onChange={(e) => setForm(f => ({ ...f, investment_goal: e.target.value as InvestmentGoal }))}>
                {(["CAPITAL_PRESERVATION", "INCOME", "GROWTH", "SPECULATION"] as InvestmentGoal[]).map(v => <option key={v}>{v}</option>)}
              </select>
            </label>
            <label className="block text-sm">
              <span className="text-muted-foreground">Monthly contribution ($)</span>
              <input type="number" min={0} className="mt-1 block w-full rounded-md border border-border px-3 py-2"
                value={form.monthly_contribution_usd}
                onChange={(e) => setForm(f => ({ ...f, monthly_contribution_usd: Number(e.target.value) }))} />
            </label>
            <label className="block text-sm">
              <span className="text-muted-foreground">Geography</span>
              <select className="mt-1 block w-full rounded-md border border-border px-3 py-2"
                value={form.preferred_geography}
                onChange={(e) => setForm(f => ({ ...f, preferred_geography: e.target.value as PreferredGeography }))}>
                {(["US", "GLOBAL", "EM", "EUROPE"] as PreferredGeography[]).map(v => <option key={v}>{v}</option>)}
              </select>
            </label>
            <label className="block text-sm">
              <span className="text-muted-foreground">Risk score (1–10)</span>
              <input type="number" min={1} max={10} className="mt-1 block w-full rounded-md border border-border px-3 py-2"
                value={form.risk_score}
                onChange={(e) => setForm(f => ({ ...f, risk_score: Number(e.target.value) }))} />
            </label>
            <label className="block text-sm">
              <span className="text-muted-foreground">Excluded sectors (comma-separated)</span>
              <input className="mt-1 block w-full rounded-md border border-border px-3 py-2"
                value={form.excluded_sectors.join(", ")}
                onChange={(e) => setForm(f => ({ ...f, excluded_sectors: e.target.value.split(",").map(s => s.trim()).filter(Boolean) }))} />
            </label>
            <label className="block text-sm">
              <span className="text-muted-foreground">Recommended allocation (JSON)</span>
              <textarea className="mt-1 block w-full rounded-md border border-border px-3 py-2 font-mono text-xs min-h-16"
                value={allocStr}
                onChange={(e) => setAllocStr(e.target.value)} />
            </label>
            {updateMutation.error && (
              <p className="text-sm text-red-600">{String(updateMutation.error)}</p>
            )}
            <Button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Saving…" : "Save"}
            </Button>
          </CardContent>
        </Card>
      )}

      {mode === "onboard" && (
        <Card>
          <CardHeader><CardTitle>Onboarding via LLM</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Введите свободные ответы на 6 вопросов (по одному на строку). LLM извлечёт профиль автоматически.
            </p>
            <textarea
              className="w-full min-h-32 rounded-md border border-border px-3 py-2 text-sm"
              placeholder={"Вопрос 1: например, «инвестиционный горизонт — 5 лет»\nВопрос 2: ...\n..."}
              value={answers}
              onChange={(e) => setAnswers(e.target.value)}
            />
            {buildMutation.error && (
              <p className="text-sm text-red-600">{String(buildMutation.error)}</p>
            )}
            <Button onClick={() => buildMutation.mutate()} disabled={buildMutation.isPending || !answers.trim()}>
              {buildMutation.isPending ? "Parsing…" : "Build profile"}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
