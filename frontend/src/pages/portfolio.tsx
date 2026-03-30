import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { savePortfolio } from "../lib/api";
import type { PortfolioHoldingInput } from "../lib/api";
import type { PortfolioHolding } from "../types/api";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";

interface Props {
  userId: number;
}

const emptyRow = (): PortfolioHoldingInput => ({ ticker: "", weight_pct: 0, avg_buy_price: 0 });

export function PortfolioPage({ userId }: Props) {
  const [rows, setRows] = useState<PortfolioHoldingInput[]>([emptyRow()]);
  const [saved, setSaved] = useState<PortfolioHolding[] | null>(null);

  const totalWeight = rows.reduce((sum, r) => sum + (r.weight_pct || 0), 0);

  const mutation = useMutation({
    mutationFn: () => {
      const valid = rows.filter(r => r.ticker.trim() && r.weight_pct > 0 && r.avg_buy_price > 0);
      if (!valid.length) throw new Error("Добавьте хотя бы одну позицию");
      return savePortfolio(userId, valid);
    },
    onSuccess: (data) => setSaved(data.holdings),
  });

  function updateRow(index: number, patch: Partial<PortfolioHoldingInput>) {
    setRows(rs => rs.map((r, i) => i === index ? { ...r, ...patch } : r));
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Portfolio</h2>

      <Card>
        <CardHeader>
          <CardTitle>Holdings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="pb-2 pr-4">Ticker</th>
                  <th className="pb-2 pr-4">Weight %</th>
                  <th className="pb-2 pr-4">Avg buy price ($)</th>
                  <th className="pb-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((row, i) => (
                  <tr key={i}>
                    <td className="py-2 pr-4">
                      <input
                        className="w-24 rounded-md border border-border px-2 py-1 uppercase"
                        placeholder="AAPL"
                        value={row.ticker}
                        onChange={(e) => updateRow(i, { ticker: e.target.value.toUpperCase() })}
                      />
                    </td>
                    <td className="py-2 pr-4">
                      <input
                        type="number" min={0} max={100} step={0.1}
                        className="w-24 rounded-md border border-border px-2 py-1"
                        value={row.weight_pct}
                        onChange={(e) => updateRow(i, { weight_pct: Number(e.target.value) })}
                      />
                    </td>
                    <td className="py-2 pr-4">
                      <input
                        type="number" min={0.01} step={0.01}
                        className="w-28 rounded-md border border-border px-2 py-1"
                        value={row.avg_buy_price}
                        onChange={(e) => updateRow(i, { avg_buy_price: Number(e.target.value) })}
                      />
                    </td>
                    <td className="py-2">
                      <button
                        className="text-muted-foreground hover:text-red-500"
                        onClick={() => setRows(rs => rs.filter((_, idx) => idx !== i))}
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center gap-4">
            <Button size="sm" variant="secondary" onClick={() => setRows(rs => [...rs, emptyRow()])}>
              + Add row
            </Button>
            <span className={`text-sm ${totalWeight > 100 ? "text-red-600" : "text-muted-foreground"}`}>
              Total weight: {totalWeight.toFixed(1)}%
            </span>
          </div>

          {mutation.error && (
            <p className="text-sm text-red-600">{String(mutation.error)}</p>
          )}

          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || totalWeight > 100}>
            {mutation.isPending ? "Saving…" : "Save portfolio"}
          </Button>
        </CardContent>
      </Card>

      {saved && (
        <Card>
          <CardHeader><CardTitle>Saved holdings</CardTitle></CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="pb-2 pr-6">Ticker</th>
                  <th className="pb-2 pr-6">Weight %</th>
                  <th className="pb-2">Avg buy ($)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {saved.map((h) => (
                  <tr key={h.id ?? h.ticker}>
                    <td className="py-2 pr-6 font-medium">{h.ticker}</td>
                    <td className="py-2 pr-6">{h.weight_pct}%</td>
                    <td className="py-2">${h.avg_buy_price}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
