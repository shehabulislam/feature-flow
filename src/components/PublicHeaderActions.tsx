"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { LogIn, LayoutDashboard, User, LogOut, ChevronDown } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import { useState } from "react";

export default function PublicHeaderActions() {
  const { data: session, status } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const isOwner = (session?.user as any)?.role === "owner";

  return (
    <div className="flex items-center gap-2">
      <ThemeToggle />
      {status === "loading" ? null : session?.user ? (
        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          >
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-[10px] font-bold">
              {session.user.name?.[0]?.toUpperCase() || "U"}
            </div>
            <span className="hidden sm:inline max-w-[100px] truncate">
              {session.user.name || session.user.email}
            </span>
            <ChevronDown className="w-3.5 h-3.5" />
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-full mt-1 w-48 p-1.5 bg-surface border border-border rounded-xl shadow-xl z-50 animate-scale-in">
                <div className="px-3 py-2 border-b border-border mb-1">
                  <p className="text-sm font-medium truncate">{session.user.name || "User"}</p>
                  <p className="text-xs text-muted-foreground truncate">{session.user.email}</p>
                </div>
                {isOwner && (
                  <Link
                    href="/dashboard"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg transition-colors"
                  >
                    <LayoutDashboard className="w-4 h-4" />
                    Dashboard
                  </Link>
                )}
                <button
                  onClick={() => signOut({ callbackUrl: window.location.href })}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-danger hover:bg-danger/10 rounded-lg transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Sign out
                </button>
              </div>
            </>
          )}
        </div>
      ) : (
        <Link
          href="/login"
          className="flex items-center gap-1.5 ml-1 px-4 py-2 rounded-xl text-sm font-semibold bg-primary hover:bg-primary-hover text-white transition-all duration-200 hover:shadow-lg hover:shadow-primary/25 active:scale-95"
        >
          <LogIn className="w-4 h-4" />
          <span className="hidden sm:inline">Sign in</span>
        </Link>
      )}
    </div>
  );
}
