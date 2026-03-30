import { useState } from "react";
import { Dashboard } from "./pages/dashboard";
import { ProfilePage } from "./pages/profile";
import { PortfolioPage } from "./pages/portfolio";
import { RecommendationsPage } from "./pages/recommendations";
import { DocumentsPage } from "./pages/documents";
import { SearchPage } from "./pages/search";

type Page = "dashboard" | "profile" | "portfolio" | "recommendations" | "documents" | "search";

const NAV: { id: Page; label: string }[] = [
  { id: "dashboard", label: "Dashboard" },
  { id: "profile", label: "Risk Profile" },
  { id: "portfolio", label: "Portfolio" },
  { id: "recommendations", label: "Recommendations" },
  { id: "documents", label: "Documents" },
  { id: "search", label: "Search" },
];

export default function App() {
  const [page, setPage] = useState<Page>("dashboard");
  const [userId, setUserId] = useState<number | null>(null);
  const [conversationId, setConversationId] = useState<number | null>(null);

  const requireUser = (child: React.ReactNode) => {
    if (userId === null) {
      return (
        <div className="mx-auto max-w-7xl p-6">
          <p className="text-sm text-muted-foreground">
            Сначала создайте пользователя на вкладке&nbsp;
            <button className="underline" onClick={() => setPage("dashboard")}>Dashboard</button>.
          </p>
        </div>
      );
    }
    return child;
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="border-b border-border bg-card/60 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-1 px-6 py-3">
          {NAV.map((item) => (
            <button
              key={item.id}
              onClick={() => setPage(item.id)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                page === item.id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {item.label}
            </button>
          ))}
          {userId !== null && (
            <span className="ml-auto text-xs text-muted-foreground">
              user #{userId}
            </span>
          )}
        </div>
      </nav>

      <main className="mx-auto max-w-7xl p-6">
        {page === "dashboard" && (
          <Dashboard
            userId={userId}
            conversationId={conversationId}
            onSessionCreated={(uid, cid) => { setUserId(uid); setConversationId(cid); }}
          />
        )}
        {page === "profile" && requireUser(<ProfilePage userId={userId!} />)}
        {page === "portfolio" && requireUser(<PortfolioPage userId={userId!} />)}
        {page === "recommendations" && requireUser(<RecommendationsPage userId={userId!} />)}
        {page === "documents" && <DocumentsPage />}
        {page === "search" && requireUser(<SearchPage userId={userId!} />)}
      </main>
    </div>
  );
}
