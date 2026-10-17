"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FilePlus, LogOut, Search, User } from "lucide-react";
import { CommandPalette } from "./command-palette";
import { PaperImportModal } from "./paper-import-modal";
import { AuthModal } from "./auth/auth-modal";
import { listPapers } from "@/lib/persistence/papers";

const navigationItems = [
  { label: "Library", href: "/library", match: ["/library", "/papers"] },
  { label: "Ask", href: "/ask", match: ["/ask"] },
  { label: "Discover", href: "/discover", match: ["/discover", "/understand"] },
  { label: "Projects", href: "/projects", match: ["/projects"] },
  { label: "Visualization", href: "/visualize", match: ["/visualize", "/data"] },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
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

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "var(--background)",
        color: "var(--foreground)",
      }}
    >
      {/* Unified Landing Page Style Navbar for All Pages */}
      <header
        style={{
          height: 54,
          padding: "0 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid var(--border)",
          position: "sticky",
          top: 0,
          background: "var(--background)",
          zIndex: 50,
        }}
      >
        {/* Left: UResearch brand with new logo + Library & Visualization nav options */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Link
            href="/"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              textDecoration: "none",
              color: "inherit",
              fontWeight: 650,
              fontSize: 14.5,
              letterSpacing: "-0.01em",
            }}
          >
            <img
              src="/uresearch-logo.png"
              alt="UResearch"
              style={{
                width: 24,
                height: 24,
                borderRadius: 6,
                objectFit: "cover",
              }}
            />
            <span>UResearch</span>
          </Link>

          <nav style={{ display: "flex", alignItems: "center", gap: 4 }}>
            {navigationItems.map((item) => {
              const isActive = item.match.some((m) => pathname.startsWith(m));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="button ghost"
                  style={{
                    height: 32,
                    padding: "0 11px",
                    fontSize: 13,
                    borderRadius: 6,
                    background: isActive ? "var(--secondary)" : "transparent",
                    color: isActive ? "var(--foreground)" : "var(--muted-foreground)",
                    fontWeight: isActive ? 650 : 500,
                    textDecoration: "none",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <span>{item.label}</span>
                  {item.label === "Library" && paperCount > 0 && (
                    <span
                      style={{
                        fontSize: 10,
                        padding: "0 5px",
                        borderRadius: 999,
                        background: isActive ? "var(--accent)" : "var(--border)",
                        color: isActive ? "var(--accent-foreground)" : "var(--muted-foreground)",
                      }}
                    >
                      {paperCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right: Search trigger [ ⌘K ] and User Info / Login */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, flexShrink: 0 }}>
          <div
            onClick={() => setCommandOpen(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              height: 32,
              padding: "0 10px",
              borderRadius: 6,
              border: "1px solid var(--border)",
              background: "var(--secondary)",
              cursor: "pointer",
              transition: "all 0.15s ease",
              width: "auto",
              minWidth: 140,
              maxWidth: 220,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--border-strong)";
              e.currentTarget.style.background = "var(--card)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--border)";
              e.currentTarget.style.background = "var(--secondary)";
            }}
          >
            <Search size={13} style={{ color: "var(--muted-foreground)", flexShrink: 0 }} />
            <span
              style={{
                fontSize: 12,
                color: "var(--muted-foreground)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                flex: 1,
                minWidth: 0,
              }}
            >
              Search...
            </span>
            <kbd
              style={{
                fontSize: 10,
                fontFamily: "var(--font-mono)",
                background: "var(--card)",
                padding: "1px 5px",
                borderRadius: 4,
                color: "var(--muted-foreground)",
                border: "1px solid var(--border)",
                flexShrink: 0,
              }}
            >
              ⌘K
            </kbd>
          </div>

          {/* User Profile Pill or Sign In Trigger */}
          {user ? (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  height: 32,
                  padding: "0 10px",
                  borderRadius: 6,
                  background: "var(--secondary)",
                  border: "1px solid var(--border)",
                  fontSize: 12,
                  fontWeight: 550,
                }}
                title={`Signed in as ${user.email}`}
              >
                <div
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: "50%",
                    background: "var(--scholar-accent)",
                    color: "#fff",
                    fontSize: 10,
                    fontWeight: 700,
                    display: "grid",
                    placeItems: "center",
                  }}
                >
                  {user.name ? user.name[0].toUpperCase() : "U"}
                </div>
                <span
                  style={{
                    maxWidth: 100,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    color: "var(--foreground)",
                  }}
                >
                  {user.name || user.email.split("@")[0]}
                </span>
              </div>

              <button
                className="button ghost"
                style={{
                  height: 32,
                  width: 32,
                  padding: 0,
                  color: "var(--muted-foreground)",
                  borderRadius: 6,
                }}
                onClick={() => {
                  try {
                    localStorage.removeItem("uresearch_user");
                    setUser(null);
                    window.dispatchEvent(new Event("uresearch_auth_changed"));
                  } catch {
                    // ignore
                  }
                }}
                title="Sign out"
              >
                <LogOut size={13} />
              </button>
            </div>
          ) : (
            <button
              className="button ghost"
              style={{
                height: 32,
                padding: "0 10px",
                fontSize: 12.5,
                borderRadius: 6,
                gap: 6,
                fontWeight: 550,
                color: "var(--foreground)",
              }}
              onClick={() => setAuthOpen(true)}
            >
              <User size={13} style={{ color: "var(--muted-foreground)" }} />
              <span>Sign In</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Page Content */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", width: "100%", minWidth: 0 }}>
        {children}
      </main>

      {/* Global Command Palette */}
      <CommandPalette
        open={commandOpen}
        onClose={() => setCommandOpen(false)}
        onOpenImport={() => setImportOpen(true)}
      />

      {/* Global Paper Import Modal */}
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
