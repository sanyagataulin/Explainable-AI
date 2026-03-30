import { useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { uploadDocument } from "../lib/api";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";

export function DocumentsPage() {
  const [company, setCompany] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const mutation = useMutation({
    mutationFn: () => {
      if (!company.trim()) throw new Error("Укажите название компании");
      if (!file) throw new Error("Выберите PDF файл");
      return uploadDocument(company.trim(), file);
    },
    onSuccess: (data) => {
      setSuccessMsg(data.message);
      setCompany("");
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
    },
    onError: () => setSuccessMsg(null),
  });

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Documents</h2>
      <p className="text-sm text-muted-foreground">
        Загрузите PDF-отчёт по компании. Он будет проиндексирован в векторном хранилище для RAG.
      </p>

      <Card className="max-w-lg">
        <CardHeader><CardTitle>Upload PDF</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <label className="block text-sm">
            <span className="text-muted-foreground">Company name</span>
            <input
              className="mt-1 block w-full rounded-md border border-border px-3 py-2"
              placeholder="Apple"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
            />
          </label>

          <label className="block text-sm">
            <span className="text-muted-foreground">PDF file</span>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,application/pdf"
              className="mt-1 block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-sm file:font-medium hover:file:bg-muted/80"
              onChange={(e) => {
                setSuccessMsg(null);
                setFile(e.target.files?.[0] ?? null);
              }}
            />
          </label>

          {file && (
            <p className="text-xs text-muted-foreground">
              {file.name} · {(file.size / 1024).toFixed(1)} KB
            </p>
          )}

          {mutation.error && (
            <p className="text-sm text-red-600">{String(mutation.error)}</p>
          )}
          {successMsg && (
            <p className="text-sm text-green-600">{successMsg}</p>
          )}

          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending ? "Indexing…" : "Upload & index"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
