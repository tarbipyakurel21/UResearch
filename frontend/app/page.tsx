"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Bot,
  Check,
  Columns,
  Database,
  ExternalLink,
  Eye,
  FileText,
  Highlighter,
  Lock,
  Moon,
  ScanSearch,
  Search,
  ShieldCheck,
  Sparkles,
  Sun,
  User,
} from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { AuthModal, type UserProfile } from "@/components/auth/auth-modal";

export default function LandingPage() {
  const { resolvedTheme, toggleTheme } = useTheme();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("uresearch_user");
      if (stored) {
        setCurrentUser(JSON.parse(stored));
      }
    } catch {
      // ignore
    }

    function onAuthChanged() {
      try {
        const stored = localStorage.getItem("uresearch_user");
        setCurrentUser(stored ? JSON.parse(stored) : null);
      } catch {
        // ignore
      }
    }

    window.addEventListener("uresearch_auth_changed", onAuthChanged);
    return () => window.removeEventListener("uresearch_auth_changed", onAuthChanged);
  }, []);

  function handleOpenAuth(mode: "signin" | "signup") {
    setAuthMode(mode);
    setAuthModalOpen(true);
  }

  function handleSignOut() {
    try {
      localStorage.removeItem("uresearch_user");
      setCurrentUser(null);
      window.dispatchEvent(new Event("uresearch_auth_changed"));
    } catch {
      // ignore
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--background)", color: "var(--foreground)" }}>
      {/* Top Academic Navigation Bar */}
      <header className="landing-navbar">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              background: "var(--foreground)",
              color: "var(--background)",
              display: "grid",
              placeItems: "center",
              fontWeight: 800,
              fontSize: 13,
              fontFamily: "var(--font-mono)",
            }}
          >
            UR
          </div>
          <span style={{ fontSize: 15, fontWeight: 750, letterSpacing: "-0.02em" }}>
            UResearch
          </span>
          <span
            style={{
              fontSize: 10,
              padding: "1px 6px",
              borderRadius: 999,
              background: "var(--scholar-accent-soft)",
              color: "var(--scholar-accent)",
              fontWeight: 600,
            }}
          >
            Workspace
          </span>
        </div>

        {/* Center Nav Links */}
        <nav style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <Link
            href="/papers"
            style={{ fontSize: 13, textDecoration: "none", color: "var(--muted-foreground)", fontWeight: 500 }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--foreground)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--muted-foreground)")}
          >
            Literature Reader
          </Link>
          <Link
            href="/visualize"
            style={{ fontSize: 13, textDecoration: "none", color: "var(--muted-foreground)", fontWeight: 500 }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--foreground)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--muted-foreground)")}
          >
            Visualizer
          </Link>
          <Link
            href="/data"
            style={{ fontSize: 13, textDecoration: "none", color: "var(--muted-foreground)", fontWeight: 500 }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--foreground)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--muted-foreground)")}
          >
            Datasets
          </Link>
          <Link
            href="/audit"
            style={{ fontSize: 13, textDecoration: "none", color: "var(--muted-foreground)", fontWeight: 500 }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--foreground)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--muted-foreground)")}
          >
            Human Audit
          </Link>
        </nav>

        {/* Right Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            className="button ghost"
            style={{ height: 30, width: 30, padding: 0 }}
            onClick={toggleTheme}
            title="Toggle theme"
          >
            {resolvedTheme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
          </button>

          {currentUser ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "3px 8px",
                  borderRadius: 6,
                  background: "var(--secondary)",
                  fontSize: 12,
                }}
              >
                <User size={13} style={{ color: "var(--scholar-accent)" }} />
                <span style={{ fontWeight: 600 }}>{currentUser.name}</span>
              </div>
              <button
                className="button ghost"
                style={{ height: 30, fontSize: 12, padding: "0 8px" }}
                onClick={handleSignOut}
              >
                Sign Out
              </button>
              <Link
                href="/papers"
                className="button primary"
                style={{
                  height: 30,
                  fontSize: 12,
                  padding: "0 12px",
                  background: "var(--scholar-accent)",
                  borderColor: "var(--scholar-accent)",
                }}
              >
                Open Reader
              </Link>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <button
                className="button ghost"
                style={{ height: 30, fontSize: 12, padding: "0 10px" }}
                onClick={() => handleOpenAuth("signin")}
              >
                Sign In
              </button>
              <button
                className="button"
                style={{ height: 30, fontSize: 12, padding: "0 10px" }}
                onClick={() => handleOpenAuth("signup")}
              >
                Sign Up
              </button>
              <Link
                href="/papers"
                className="button primary"
                style={{
                  height: 30,
                  fontSize: 12,
                  padding: "0 12px",
                  background: "var(--scholar-accent)",
                  borderColor: "var(--scholar-accent)",
                }}
              >
                Launch Reader
              </Link>
            </div>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <section className="landing-hero">
        <div className="landing-badge">
          <ShieldCheck size={13} />
          <span>Local-First Academic Workspace · 100% Private</span>
        </div>

        <h1 className="landing-title">
          The Modern Academic Paper<br />Reading Workspace
        </h1>

        <p className="landing-subtitle">
          Distraction-free literature reading, grounded citation verification, and private local-first intelligence built for rigorous research. Prioritize the paper with resizable multi-column workspaces.
        </p>

        <div className="landing-actions">
          <Link
            href="/papers"
            className="button primary"
            style={{
              height: 40,
              fontSize: 13.5,
              fontWeight: 650,
              padding: "0 20px",
              gap: 8,
              background: "var(--scholar-accent)",
              borderColor: "var(--scholar-accent)",
            }}
          >
            <BookOpen size={15} />
            <span>Open Paper Reading Workspace</span>
            <ArrowRight size={14} />
          </Link>

          {!currentUser && (
            <button
              className="button"
              style={{ height: 40, fontSize: 13, fontWeight: 600, padding: "0 16px", gap: 6 }}
              onClick={() => handleOpenAuth("signup")}
            >
              <User size={14} />
              <span>Create Free Account</span>
            </button>
          )}

          <Link
            href="/overview"
            className="button ghost"
            style={{ height: 40, fontSize: 13, padding: "0 14px", border: "1px solid var(--border)" }}
          >
            Explore Dashboard
          </Link>
        </div>

        {/* Live Interactive Workspace Preview Frame */}
        <div className="landing-preview-frame">
          {/* Mock Window Topbar */}
          <div
            style={{
              height: 38,
              background: "var(--card)",
              borderBottom: "1px solid var(--border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0 14px",
              fontSize: 11,
              color: "var(--muted-foreground)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ display: "flex", gap: 5 }}>
                <span style={{ width: 9, height: 9, borderRadius: "50%", background: "#ef4444", display: "inline-block" }} />
                <span style={{ width: 9, height: 9, borderRadius: "50%", background: "#f59e0b", display: "inline-block" }} />
                <span style={{ width: 9, height: 9, borderRadius: "50%", background: "#10b981", display: "inline-block" }} />
              </div>
              <span style={{ fontWeight: 650, color: "var(--foreground)" }}>
                Attention Is All You Need (Vaswani et al., 2017)
              </span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span className="badge primary" style={{ fontSize: 10 }}>NEURIPS 2017</span>
              <span>Page 1 / 5</span>
              <span style={{ color: "var(--success)", fontWeight: 600 }}>● Local IndexedDB</span>
            </div>
          </div>

          {/* 3-Column Preview Mockup */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "200px 1fr 300px",
              height: 480,
              background: "var(--bg-academic)",
              textAlign: "left",
              overflow: "hidden",
            }}
          >
            {/* Left Mock Sidebar */}
            <div
              style={{
                borderRight: "1px solid var(--border)",
                background: "var(--card)",
                padding: "10px 12px",
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              <div style={{ fontSize: 10, fontWeight: 750, textTransform: "uppercase", color: "var(--muted-foreground)" }}>
                Document Outline
              </div>
              <div style={{ display: "grid", gap: 4, fontSize: 11 }}>
                <div style={{ padding: "4px 6px", borderRadius: 4, background: "var(--scholar-accent-soft)", color: "var(--scholar-accent)", fontWeight: 600 }}>
                  Abstract
                </div>
                <div style={{ padding: "4px 6px", color: "var(--muted-foreground)" }}>
                  1. Introduction
                </div>
                <div style={{ padding: "4px 6px", color: "var(--muted-foreground)" }}>
                  2. Background
                </div>
                <div style={{ padding: "4px 6px", color: "var(--muted-foreground)" }}>
                  3. Model Architecture
                </div>
                <div style={{ padding: "4px 6px", color: "var(--muted-foreground)" }}>
                  4. Why Self-Attention
                </div>
                <div style={{ padding: "4px 6px", color: "var(--muted-foreground)" }}>
                  5. Conclusion
                </div>
              </div>

              <div style={{ marginTop: "auto", borderTop: "1px solid var(--border)", paddingTop: 10 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "var(--muted-foreground)", marginBottom: 4 }}>
                  Saved Notes (2)
                </div>
                <div style={{ fontSize: 10.5, padding: 6, background: "var(--secondary)", borderRadius: 4 }}>
                  <span className="hl-yellow" style={{ padding: "0 2px" }}>&ldquo;eschewing recurrence...&rdquo;</span>
                  <div style={{ color: "var(--muted-foreground)", fontSize: 9.5, marginTop: 2 }}>Core thesis</div>
                </div>
              </div>
            </div>

            {/* Center Paper Sheet Preview */}
            <div
              style={{
                padding: "24px 28px",
                overflowY: "hidden",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                position: "relative",
              }}
            >
              {/* Mock Floating Selection Pill */}
              <div
                style={{
                  position: "absolute",
                  top: 70,
                  left: "35%",
                  zIndex: 20,
                  display: "flex",
                  alignItems: "center",
                  gap: 3,
                  padding: "3px 6px",
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: 6,
                  boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
                  fontSize: 10.5,
                }}
              >
                <span className="badge" style={{ background: "#fef08a", color: "#854d0e", fontSize: 9.5 }}>Highlight</span>
                <span className="button ghost" style={{ height: 20, padding: "0 4px", fontSize: 10 }}>Note</span>
                <span className="button primary" style={{ height: 20, padding: "0 6px", fontSize: 10, background: "var(--scholar-accent)", color: "white" }}>
                  <Sparkles size={9} style={{ marginRight: 3 }} /> Explain
                </span>
                <span className="button ghost" style={{ height: 20, padding: "0 4px", fontSize: 10 }}>Ask AI</span>
              </div>

              <div
                className="academic-page-sheet"
                style={{
                  width: "100%",
                  maxWidth: 520,
                  padding: "24px 30px",
                  fontSize: 11,
                  lineHeight: 1.6,
                }}
              >
                <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4, fontFamily: "Georgia, serif" }}>
                  Attention Is All You Need
                </h2>
                <div style={{ fontSize: 9.5, color: "var(--muted-foreground)", marginBottom: 12 }}>
                  Ashish Vaswani, Noam Shazeer, Niki Parmar, Jakob Uszkoreit, et al.
                </div>
                <div style={{ background: "var(--bg-academic)", padding: "8px 10px", borderRadius: 4, marginBottom: 12 }}>
                  <strong style={{ fontSize: 9.5, textTransform: "uppercase", color: "var(--scholar-accent)" }}>Abstract — </strong>
                  The dominant sequence transduction models are based on complex recurrent or convolutional neural networks. We propose a simple network architecture, the Transformer, based solely on attention mechanisms...
                </div>
                <p style={{ margin: "6px 0" }}>
                  <mark className="hl-yellow" style={{ padding: "1px 2px" }}>
                    In this work we propose the Transformer, a model architecture eschewing recurrence and instead relying entirely on an attention mechanism
                  </mark> to draw global dependencies between input and output.
                </p>
              </div>
            </div>

            {/* Right Mock AI Copilot */}
            <div
              style={{
                borderLeft: "1px solid var(--border)",
                background: "var(--card)",
                padding: "12px",
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, color: "var(--scholar-accent)" }}>
                <Sparkles size={12} />
                <span>AI Research Copilot</span>
              </div>

              <div style={{ padding: "8px 10px", background: "var(--secondary)", borderRadius: 6, fontSize: 11 }}>
                What is the core contribution of this paper?
              </div>

              <div style={{ padding: "10px", background: "var(--card)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 10.5, lineHeight: 1.5 }}>
                <div style={{ fontWeight: 650, marginBottom: 4 }}>Synthesis & Evidence:</div>
                The authors replace sequential recurrence with full parallel self-attention.
                <div style={{ marginTop: 6, display: "flex", gap: 4 }}>
                  <span className="citation-chip" style={{ fontSize: 9.5 }}>
                    <FileText size={8} /> [p. 1, Abstract]
                  </span>
                  <span className="citation-chip" style={{ fontSize: 9.5 }}>
                    <FileText size={8} /> [p. 3, §3.2]
                  </span>
                </div>
              </div>

              <div style={{ marginTop: "auto", borderTop: "1px solid var(--border)", paddingTop: 8 }}>
                <div style={{ background: "var(--secondary)", borderRadius: 4, padding: "5px 8px", fontSize: 10, color: "var(--muted-foreground)" }}>
                  Ask about methodology...
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Value Props Section */}
      <section style={{ maxWidth: 1100, margin: "0 auto", padding: "64px 24px" }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <h2 style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.02em", marginBottom: 8 }}>
            Engineered for Deep Literature Review
          </h2>
          <p style={{ fontSize: 14, color: "var(--muted-foreground)", maxWidth: 540, margin: "0 auto" }}>
            A disciplined academic environment that treats the paper as the primary object while embedding intelligent verification seamlessly into the reading flow.
          </p>
        </div>

        <div className="grid cols-3" style={{ gap: 20 }}>
          {/* Card 1 */}
          <div className="panel" style={{ padding: 22 }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 6,
                background: "var(--scholar-accent-soft)",
                color: "var(--scholar-accent)",
                display: "grid",
                placeItems: "center",
                marginBottom: 14,
              }}
            >
              <BookOpen size={18} />
            </div>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>
              Prioritize the Paper
            </h3>
            <p style={{ fontSize: 12.5, lineHeight: 1.6, color: "var(--muted-foreground)", margin: 0 }}>
              The large central reading workspace visually dominates the screen. Enjoy authentic white paper sheets on a warm off-white canvas with zoom controls, in-document search, and page navigation.
            </p>
          </div>

          {/* Card 2 */}
          <div className="panel" style={{ padding: 22 }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 6,
                background: "rgba(16, 185, 129, 0.1)",
                color: "#10b981",
                display: "grid",
                placeItems: "center",
                marginBottom: 14,
              }}
            >
              <Sparkles size={18} />
            </div>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>
              Grounded Citation Chips
            </h3>
            <p style={{ fontSize: 12.5, lineHeight: 1.6, color: "var(--muted-foreground)", margin: 0 }}>
              AI responses generate interactive citation chips like <code>[p. 3, §3.2]</code>. Click any chip to smoothly scroll back to the exact passage in the paper with an illuminating focus pulse.
            </p>
          </div>

          {/* Card 3 */}
          <div className="panel" style={{ padding: 22 }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 6,
                background: "rgba(139, 92, 246, 0.1)",
                color: "#8b5cf6",
                display: "grid",
                placeItems: "center",
                marginBottom: 14,
              }}
            >
              <Highlighter size={18} />
            </div>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>
              Contextual Selection Actions
            </h3>
            <p style={{ fontSize: 12.5, lineHeight: 1.6, color: "var(--muted-foreground)", margin: 0 }}>
              Select any excerpt in the document to instantly Highlight, attach Margin Notes, request conceptual AI Explanations, or formulate targeted research queries.
            </p>
          </div>

          {/* Card 4 */}
          <div className="panel" style={{ padding: 22 }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 6,
                background: "rgba(245, 158, 11, 0.1)",
                color: "#f59e0b",
                display: "grid",
                placeItems: "center",
                marginBottom: 14,
              }}
            >
              <Columns size={18} />
            </div>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>
              Cursor-Adjustable Resizing
            </h3>
            <p style={{ fontSize: 12.5, lineHeight: 1.6, color: "var(--muted-foreground)", margin: 0 }}>
              Freely drag the divider handles between the navigation sidebar, paper viewer, and AI assistant to adjust your workspace width to your exact reading preferences.
            </p>
          </div>

          {/* Card 5 */}
          <div className="panel" style={{ padding: 22 }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 6,
                background: "rgba(59, 130, 246, 0.1)",
                color: "#3b82f6",
                display: "grid",
                placeItems: "center",
                marginBottom: 14,
              }}
            >
              <Lock size={18} />
            </div>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>
              100% Private & Local-First
            </h3>
            <p style={{ fontSize: 12.5, lineHeight: 1.6, color: "var(--muted-foreground)", margin: 0 }}>
              Your research literature, highlights, annotations, and datasets are stored securely within your browser&apos;s local IndexedDB. Works offline with zero third-party telemetry.
            </p>
          </div>

          {/* Card 6 */}
          <div className="panel" style={{ padding: 22 }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 6,
                background: "rgba(239, 68, 68, 0.1)",
                color: "#ef4444",
                display: "grid",
                placeItems: "center",
                marginBottom: 14,
              }}
            >
              <BarChart3 size={18} />
            </div>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>
              Data & Audit Workspaces
            </h3>
            <p style={{ fontSize: 12.5, lineHeight: 1.6, color: "var(--muted-foreground)", margin: 0 }}>
              Seamlessly connect literature reviews with your experimental data. Import CSV/JSON datasets, plot interactive distributions, and conduct structured human audit reviews.
            </p>
          </div>
        </div>
      </section>

      {/* Bottom CTA Banner */}
      <section
        style={{
          borderTop: "1px solid var(--border)",
          background: "var(--secondary)",
          padding: "54px 24px",
          textAlign: "center",
        }}
      >
        <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 10 }}>
          Ready for Focused Academic Reading?
        </h2>
        <p style={{ fontSize: 13.5, color: "var(--muted-foreground)", marginBottom: 24 }}>
          Load pre-indexed machine learning papers or import your own PDF and arXiv preprints today.
        </p>
        <div style={{ display: "flex", justifyContent: "center", gap: 12 }}>
          <Link
            href="/papers"
            className="button primary"
            style={{
              height: 38,
              fontSize: 13,
              fontWeight: 650,
              padding: "0 18px",
              background: "var(--scholar-accent)",
              borderColor: "var(--scholar-accent)",
            }}
          >
            Launch Literature Workspace
          </Link>
          {!currentUser && (
            <button
              className="button"
              style={{ height: 38, fontSize: 13, padding: "0 16px" }}
              onClick={() => handleOpenAuth("signup")}
            >
              Create Account
            </button>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer
        style={{
          borderTop: "1px solid var(--border)",
          padding: "20px 32px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontSize: 11,
          color: "var(--muted-foreground)",
          background: "var(--card)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span>UResearch Academic Literature & Data Workbench</span>
          <span>·</span>
          <span>Local-First Private Storage</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Link href="/papers" style={{ color: "inherit", textDecoration: "none" }}>
            Papers
          </Link>
          <Link href="/visualize" style={{ color: "inherit", textDecoration: "none" }}>
            Visualizer
          </Link>
          <Link href="/data" style={{ color: "inherit", textDecoration: "none" }}>
            Datasets
          </Link>
          <Link href="/audit" style={{ color: "inherit", textDecoration: "none" }}>
            Audit
          </Link>
        </div>
      </footer>

      {/* Global Auth Modal for Sign In / Sign Up */}
      <AuthModal
        open={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        defaultMode={authMode}
        onSuccess={(user) => {
          setCurrentUser(user);
        }}
      />
    </div>
  );
}
