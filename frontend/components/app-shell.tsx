"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  BookOpen,
  FilePlus,
  Moon,
  PanelLeft,
  Search,
  Sun,
  User,
} from "lucide-react";
import { useTheme } from "./theme-provider";
import { CommandPalette } from "./command-palette";
import { PaperImportModal } from "./paper-import-modal";
import { AuthModal } from "./auth/auth-modal";
import { listPapers } from "@/lib/persistence/papers";

const navigationItems = [
  { label: "Library", href: "/library", icon: BookOpen, match: ["/library", "/papers", "/understand", "/discover"] },
  { label: "Visualization", href: "/visualize", icon: BarChart3, match: ["/visualize", "/data"] },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { resolvedTheme, toggleTheme } = useTheme();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [commandOpen, setCommandOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [paperCount, setPaperCount] = useState(0);

  useEffect(() => {
    void listPapers().then((items) => setPaperCount(items.length));
  }, [pathname]);

  // Global Cmd+K
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommandOpen((prev) => !prev);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const [user, setUser] = useState<{ name: string; email: string } | null>(null);
  const [authOpen, setAuthOpen] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("uresearch_user");
      if (stored) setUser(JSON.parse(stored));
    } catch {
      // ignore
    }

    function onAuthChanged() {
      try {
        const stored = localStorage.getItem("uresearch_user");
        setUser(stored ? JSON.parse(stored) : null);
      } catch {
        // ignore
      }
    }
    window.addEventListener("uresearch_auth_changed", onAuthChanged);
    return () => window.removeEventListener("uresearch_auth_changed", onAuthChanged);
  }, []);

  const activeItem = navigationItems.find((item) =>
    item.match.some((m) => pathname.startsWith(m))
  );

  // For landing page (/), render without the sidebar frame
  if (pathname === "/") {
    return <>{children}</>;
  }

  return (
    <div className="app-shell-container">
      {/* Sidebar */}
      <aside className={`uresearch-sidebar ${sidebarOpen ? "" : "collapsed"}`}>
        {/* Brand */}
        <div
          style={{
            height: 52,
            padding: sidebarOpen ? "0 16px" : "0 12px",
            display: "flex",
            alignItems: "center",
            justifyContent: sidebarOpen ? "space-between" : "center",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <Link
            href="/library"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              textDecoration: "none",
              color: "inherit",
            }}
          >
            <div
              style={{
                width: 26,
                height: 26,
                borderRadius: 6,
                background: "var(--foreground)",
                color: "var(--background)",
                display: "grid",
                placeItems: "center",
                fontWeight: 700,
                fontSize: 12,
                fontFamily: "var(--font-mono)",
              }}
            >
              UR
            </div>
            {sidebarOpen && (
              <span style={{ fontWeight: 650, fontSize: 14, letterSpacing: "-0.015em" }}>
                UResearch
              </span>
            )}
          </Link>

          {sidebarOpen && (
            <button
              onClick={() => setSidebarOpen(false)}
              className="button ghost"
              style={{ padding: 4, height: 26, width: 26 }}
              title="Collapse sidebar"
            >
              <PanelLeft size={14} />
            </button>
          )}
        </div>

        {/* Navigation */}
        <div style={{ flex: 1, padding: "10px 8px", overflowY: "auto" }}>
          <nav style={{ display: "grid", gap: 3 }}>
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = item.match.some((m) => pathname.startsWith(m));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={item.label}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: sidebarOpen ? "8px 10px" : "8px 0",
                    justifyContent: sidebarOpen ? "flex-start" : "center",
                    borderRadius: 6,
                    textDecoration: "none",
                    fontSize: 13,
                    fontWeight: isActive ? 600 : 500,
                    color: isActive ? "var(--foreground)" : "var(--muted-foreground)",
                    background: isActive ? "var(--secondary)" : "transparent",
                    transition: "all 0.1s ease",
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) e.currentTarget.style.background = "var(--secondary)";
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) e.currentTarget.style.background = "transparent";
                  }}
                >
                  <Icon
                    size={16}
                    style={{
                      color: isActive ? "var(--foreground)" : "var(--muted-foreground)",
                      flexShrink: 0,
                    }}
                  />
                  {sidebarOpen && <span style={{ flex: 1 }}>{item.label}</span>}
                  {sidebarOpen && item.label === "Library" && paperCount > 0 && (
                    <span className="badge">{paperCount}</span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: sidebarOpen ? "10px 14px" : "10px",
            borderTop: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            justifyContent: sidebarOpen ? "space-between" : "center",
          }}
        >
          {sidebarOpen ? (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--muted-foreground)" }}>
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: "var(--success)",
                  }}
                />
                <span>Local & Private</span>
              </div>
              <button
                onClick={toggleTheme}
                className="button ghost"
                style={{ padding: 4, height: 26, width: 26 }}
                title="Toggle Theme"
              >
                {resolvedTheme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
              </button>
            </>
          ) : (
            <button
              onClick={toggleTheme}
              className="button ghost"
              style={{ padding: 4, height: 26, width: 26 }}
              title="Toggle Theme"
            >
              {resolvedTheme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
            </button>
          )}
        </div>
      </aside>

      {/* Main Container */}
      <div className="uresearch-main">
        {/* Topbar */}
        <header className="uresearch-topbar">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {!sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(true)}
                className="button ghost"
                style={{ padding: 4, height: 28, width: 28 }}
                title="Expand sidebar"
              >
                <PanelLeft size={15} />
              </button>
            )}
            <span style={{ fontSize: 13, fontWeight: 600 }}>
              {activeItem?.label ?? "UResearch"}
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              onClick={() => setCommandOpen(true)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "4px 10px",
                border: "1px solid var(--border)",
                borderRadius: 6,
                background: "var(--card)",
                color: "var(--muted-foreground)",
                fontSize: 12,
                cursor: "pointer",
                height: 30,
              }}
            >
              <Search size={13} />
              <span>Search...</span>
              <kbd
                style={{
                  fontSize: 10,
                  fontFamily: "var(--font-mono)",
                  padding: "1px 4px",
                  borderRadius: 3,
                  background: "var(--secondary)",
                  border: "1px solid var(--border)",
                }}
              >
                ⌘K
              </kbd>
            </button>

            <button
              className="button primary"
              style={{ height: 30, fontSize: 12, padding: "0 10px" }}
              onClick={() => setImportOpen(true)}
            >
              <FilePlus size={13} /> Import Paper
            </button>

            {/* User Profile / Sign In */}
            <button
              className="button ghost"
              style={{ height: 30, padding: "0 8px", fontSize: 12, gap: 5 }}
              onClick={() => setAuthOpen(true)}
              title={user ? `Signed in as ${user.name}` : "Sign In / Sign Up"}
            >
              <User size={13} style={{ color: user ? "var(--scholar-accent)" : "inherit" }} />
              <span>{user ? user.name : "Sign In"}</span>
            </button>
          </div>
        </header>

        {/* Content */}
        <main>{children}</main>
      </div>

      {/* Command Palette */}
      <CommandPalette
        open={commandOpen}
        onClose={() => setCommandOpen(false)}
        onOpenImport={() => setImportOpen(true)}
      />

      {/* Paper Import Modal */}
      <PaperImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onPaperImported={() => {
          void listPapers().then((items) => setPaperCount(items.length));
        }}
      />

      {/* Auth Modal */}
      <AuthModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        onSuccess={(profile) => {
          setUser(profile);
        }}
      />
    </div>
  );
}
