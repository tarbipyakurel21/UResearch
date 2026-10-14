"use client";

import React, { useEffect, useState } from "react";
import {
  Check,
  GraduationCap,
  KeyRound,
  Lock,
  Mail,
  ShieldCheck,
  Sparkles,
  User,
  X,
} from "lucide-react";

export interface UserProfile {
  name: string;
  email: string;
  institution?: string;
  role?: string;
  signedInAt: string;
}

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
  defaultMode?: "signin" | "signup";
  onSuccess?: (user: UserProfile) => void;
}

export function AuthModal({
  open,
  onClose,
  defaultMode = "signin",
  onSuccess,
}: AuthModalProps) {
  const [mode, setMode] = useState<"signin" | "signup">(defaultMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [institution, setInstitution] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    setMode(defaultMode);
    setError("");
    setSuccessMsg("");
  }, [defaultMode, open]);

  if (!open) return null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password.trim()) {
      setError("Please provide an email and password.");
      return;
    }

    if (mode === "signup" && !name.trim()) {
      setError("Please provide your name.");
      return;
    }

    setLoading(true);

    setTimeout(() => {
      const userProfile: UserProfile = {
        name: mode === "signup" ? name.trim() : email.split("@")[0],
        email: email.trim(),
        institution: institution.trim() || "Independent Researcher",
        role: "Academic Researcher",
        signedInAt: new Date().toISOString(),
      };

      try {
        localStorage.setItem("uresearch_user", JSON.stringify(userProfile));
        window.dispatchEvent(new Event("uresearch_auth_changed"));
      } catch {
        // ignore storage errors
      }

      setLoading(false);
      setSuccessMsg(
        mode === "signup"
          ? `Account created for ${userProfile.name}!`
          : `Signed in as ${userProfile.email}`
      );

      setTimeout(() => {
        onSuccess?.(userProfile);
        onClose();
      }, 700);
    }, 500);
  }

  function handleGuestSignIn() {
    setLoading(true);
    setTimeout(() => {
      const guestProfile: UserProfile = {
        name: "Guest Scholar",
        email: "scholar@local.workspace",
        institution: "Local IndexedDB Workspace",
        role: "Guest Researcher",
        signedInAt: new Date().toISOString(),
      };
      try {
        localStorage.setItem("uresearch_user", JSON.stringify(guestProfile));
        window.dispatchEvent(new Event("uresearch_auth_changed"));
      } catch {
        // ignore
      }
      setLoading(false);
      onSuccess?.(guestProfile);
      onClose();
    }, 400);
  }

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="modal"
        style={{
          width: 420,
          background: "var(--card)",
          borderRadius: 8,
          overflow: "hidden",
          border: "1px solid var(--border)",
          boxShadow: "0 20px 50px rgba(0, 0, 0, 0.22)",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "18px 22px 14px",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
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
                fontSize: 12,
                fontFamily: "var(--font-mono)",
              }}
            >
              UR
            </div>
            <div>
              <h2 style={{ fontSize: 15, margin: 0 }}>
                {mode === "signin" ? "Sign In to UResearch" : "Create Research Account"}
              </h2>
              <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>
                Private local-first academic workbench
              </span>
            </div>
          </div>

          <button
            className="button ghost"
            style={{ height: 24, width: 24, padding: 0 }}
            onClick={onClose}
          >
            <X size={14} />
          </button>
        </div>

        {/* Tab switch */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            borderBottom: "1px solid var(--border)",
            background: "var(--secondary)",
          }}
        >
          <button
            onClick={() => {
              setMode("signin");
              setError("");
            }}
            style={{
              padding: "10px",
              background: mode === "signin" ? "var(--card)" : "transparent",
              border: 0,
              borderBottom: mode === "signin" ? "2px solid var(--scholar-accent)" : "2px solid transparent",
              fontSize: 12,
              fontWeight: mode === "signin" ? 700 : 500,
              color: mode === "signin" ? "var(--scholar-accent)" : "var(--muted-foreground)",
              cursor: "pointer",
            }}
          >
            Sign In
          </button>
          <button
            onClick={() => {
              setMode("signup");
              setError("");
            }}
            style={{
              padding: "10px",
              background: mode === "signup" ? "var(--card)" : "transparent",
              border: 0,
              borderBottom: mode === "signup" ? "2px solid var(--scholar-accent)" : "2px solid transparent",
              fontSize: 12,
              fontWeight: mode === "signup" ? 700 : 500,
              color: mode === "signup" ? "var(--scholar-accent)" : "var(--muted-foreground)",
              cursor: "pointer",
            }}
          >
            Create Account
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: "20px 22px" }}>
          {error && (
            <div
              style={{
                padding: "8px 12px",
                borderRadius: 4,
                background: "rgba(239, 68, 68, 0.1)",
                border: "1px solid var(--danger)",
                color: "var(--danger)",
                fontSize: 12,
                marginBottom: 14,
              }}
            >
              {error}
            </div>
          )}

          {successMsg && (
            <div
              style={{
                padding: "8px 12px",
                borderRadius: 4,
                background: "rgba(16, 185, 129, 0.1)",
                border: "1px solid var(--success)",
                color: "var(--success)",
                fontSize: 12,
                marginBottom: 14,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Check size={14} />
              <span>{successMsg}</span>
            </div>
          )}

          <div style={{ display: "grid", gap: 12 }}>
            {mode === "signup" && (
              <div className="field">
                <label style={{ fontSize: 11, fontWeight: 650 }}>Full Name</label>
                <div style={{ position: "relative" }}>
                  <User
                    size={14}
                    style={{
                      position: "absolute",
                      left: 10,
                      top: 10,
                      color: "var(--muted-foreground)",
                    }}
                  />
                  <input
                    className="input"
                    placeholder="e.g. Dr. Jane Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    style={{ paddingLeft: 30, height: 34, fontSize: 12 }}
                  />
                </div>
              </div>
            )}

            <div className="field">
              <label style={{ fontSize: 11, fontWeight: 650 }}>Academic / Work Email</label>
              <div style={{ position: "relative" }}>
                <Mail
                  size={14}
                  style={{
                    position: "absolute",
                    left: 10,
                    top: 10,
                    color: "var(--muted-foreground)",
                  }}
                />
                <input
                  type="email"
                  className="input"
                  placeholder="jane.doe@university.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{ paddingLeft: 30, height: 34, fontSize: 12 }}
                />
              </div>
            </div>

            <div className="field">
              <label style={{ fontSize: 11, fontWeight: 650 }}>Password</label>
              <div style={{ position: "relative" }}>
                <Lock
                  size={14}
                  style={{
                    position: "absolute",
                    left: 10,
                    top: 10,
                    color: "var(--muted-foreground)",
                  }}
                />
                <input
                  type="password"
                  className="input"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ paddingLeft: 30, height: 34, fontSize: 12 }}
                />
              </div>
            </div>

            {mode === "signup" && (
              <div className="field">
                <label style={{ fontSize: 11, fontWeight: 650 }}>
                  Institution / Affiliation <span style={{ opacity: 0.6 }}>(Optional)</span>
                </label>
                <div style={{ position: "relative" }}>
                  <GraduationCap
                    size={14}
                    style={{
                      position: "absolute",
                      left: 10,
                      top: 10,
                      color: "var(--muted-foreground)",
                    }}
                  />
                  <input
                    className="input"
                    placeholder="e.g. Stanford University / DeepMind"
                    value={institution}
                    onChange={(e) => setInstitution(e.target.value)}
                    style={{ paddingLeft: 30, height: 34, fontSize: 12 }}
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              className="button primary"
              style={{
                height: 36,
                marginTop: 6,
                fontSize: 12.5,
                fontWeight: 650,
                background: "var(--scholar-accent)",
                borderColor: "var(--scholar-accent)",
              }}
              disabled={loading}
            >
              {loading
                ? "Validating credentials..."
                : mode === "signin"
                ? "Sign In to Workspace"
                : "Create Research Account"}
            </button>
          </div>

          <div
            style={{
              position: "relative",
              textAlign: "center",
              margin: "18px 0 14px",
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: "50% 0 auto 0",
                height: 1,
                background: "var(--border)",
              }}
            />
            <span
              style={{
                position: "relative",
                background: "var(--card)",
                padding: "0 10px",
                fontSize: 11,
                color: "var(--muted-foreground)",
              }}
            >
              or proceed without account
            </span>
          </div>

          <button
            type="button"
            className="button ghost"
            style={{
              width: "100%",
              height: 34,
              fontSize: 12,
              border: "1px solid var(--border)",
              gap: 6,
            }}
            onClick={handleGuestSignIn}
            disabled={loading}
          >
            <ShieldCheck size={14} style={{ color: "var(--success)" }} />
            <span>Continue as Guest Scholar (100% Local)</span>
          </button>
        </form>
      </div>
    </div>
  );
}
