import React from "react";
import { Link, useLocation } from "wouter";
import { Store, ShieldCheck } from "lucide-react";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const isAdmin = location.startsWith("/admin");

  return (
    <div className="min-h-[100dvh] flex flex-col w-full bg-background text-foreground">
      <header className="sticky top-0 z-50 w-full border-b border-border/70 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4 md:px-6">
          <Link
            href="/"
            className="flex items-center gap-2 font-semibold tracking-tight"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Store className="h-4 w-4" />
            </span>
            <span className="text-base text-foreground">착한가격업소 찾기</span>
          </Link>
          <nav className="flex items-center gap-1">
            <Link
              href="/"
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                !isAdmin
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              }`}
            >
              둘러보기
            </Link>
            <Link
              href="/admin"
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                isAdmin
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              }`}
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              관리자
            </Link>
          </nav>
        </div>
      </header>
      <main className="flex-1 flex flex-col w-full">{children}</main>
    </div>
  );
}
