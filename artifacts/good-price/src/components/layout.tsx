import React from "react";
import { Link, useLocation } from "wouter";
import { Store, MapPin, Settings } from "lucide-react";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  return (
    <div className="min-h-[100dvh] flex flex-col w-full max-w-2xl mx-auto bg-background shadow-xl sm:border-x sm:border-border">
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 items-center px-4 justify-between">
          <Link href="/" className="flex items-center gap-2 font-bold text-primary">
            <Store className="h-5 w-5" />
            <span>착한가격업소 찾기</span>
          </Link>
          <nav className="flex items-center gap-4">
            <Link 
              href="/" 
              className={`text-sm font-medium transition-colors hover:text-primary ${location === '/' ? 'text-primary' : 'text-muted-foreground'}`}
            >
              목록
            </Link>
            <Link 
              href="/admin" 
              className={`flex items-center gap-1 text-sm font-medium transition-colors hover:text-primary ${location === '/admin' ? 'text-primary' : 'text-muted-foreground'}`}
            >
              <Settings className="h-4 w-4" />
              관리자
            </Link>
          </nav>
        </div>
      </header>
      <main className="flex-1 flex flex-col h-full w-full">
        {children}
      </main>
    </div>
  );
}
