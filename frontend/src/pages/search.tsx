import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { searchMessages } from "../lib/api";
import type { Message } from "../types/api";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";

interface Props {
  userId: number;
}

const roleLabel: Record<Message["role"], string> = {
  USER: "You",
  ASSISTANT: "Advisor",
  SYSTEM: "System",
};

const roleBg: Record<Message["role"], string> = {
  USER: "bg-primary/10 text-primary",
  ASSISTANT: "bg-muted text-foreground",
  SYSTEM: "bg-yellow-50 text-yellow-700",
};

export function SearchPage({ userId }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Message[] | null>(null);

  const mutation = useMutation({
    mutationFn: () => {
      if (!query.trim()) throw new Error("Введите поисковый запрос");
      return searchMessages(userId, query.trim());
    },
    onSuccess: (data) => setResults(data.messages),
  });

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Search messages</h2>

      <div className="flex gap-3 max-w-xl">
        <input
          className="flex-1 rounded-md border border-border px-3 py-2 text-sm"
          placeholder="Найти в истории сообщений…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") mutation.mutate(); }}
        />
        <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
          {mutation.isPending ? "Searching…" : "Search"}
        </Button>
      </div>

      {mutation.error && (
        <p className="text-sm text-red-600">{String(mutation.error)}</p>
      )}

      {results !== null && (
        <Card>
          <CardHeader>
            <CardTitle>
              {results.length === 0 ? "No results" : `${results.length} message(s) found`}
            </CardTitle>
          </CardHeader>
          {results.length > 0 && (
            <CardContent className="space-y-3">
              {results.map((msg) => (
                <div key={msg.id} className={`rounded-lg p-3 text-sm ${roleBg[msg.role]}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-xs uppercase tracking-wide">{roleLabel[msg.role]}</span>
                    <span className="text-xs opacity-60">{new Date(msg.created_at).toLocaleString()}</span>
                  </div>
                  <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                </div>
              ))}
            </CardContent>
          )}
        </Card>
      )}
    </div>
  );
}
