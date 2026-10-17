"use client";

import React, { useEffect } from "react";
import { AlertTriangle, Trash2, X } from "lucide-react";

interface DeleteConfirmModalProps {
  open: boolean;
  title?: string;
  itemName?: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteConfirmModal({
  open,
  title = "Delete Paper",
  itemName,
  message,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
}: DeleteConfirmModalProps) {
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onCancel();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        background: "rgba(0, 0, 0, 0.45)",
        backdropFilter: "blur(4px)",
        display: "grid",
        placeItems: "center",
        padding: 20,
        animation: "fadeIn 0.15s ease-out",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          background: "var(--card)",
          border: "1px solid var(--border)",
          borderRadius: 14,
          boxShadow: "0 20px 48px rgba(0, 0, 0, 0.18)",
          padding: 24,
          position: "relative",
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        {/* Close Button */}
        <button
          onClick={onCancel}
          className="button ghost"
          style={{
            position: "absolute",
            top: 14,
            right: 14,
            width: 28,
            height: 28,
            padding: 0,
            borderRadius: 6,
          }}
          title="Close dialog"
        >
          <X size={15} />
        </button>

        {/* Icon & Heading */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: "rgba(239, 68, 68, 0.12)",
              color: "#ef4444",
              display: "grid",
              placeItems: "center",
              flexShrink: 0,
            }}
          >
            <Trash2 size={20} />
          </div>

          <div style={{ flex: 1, minWidth: 0, paddingTop: 2 }}>
            <h3
              style={{
                margin: "0 0 6px",
                fontSize: 16,
                fontWeight: 700,
                color: "var(--foreground)",
                lineHeight: 1.25,
              }}
            >
              {title}
            </h3>
            <p
              style={{
                margin: 0,
                fontSize: 13,
                lineHeight: 1.5,
                color: "var(--muted-foreground)",
              }}
            >
              {message ?? (
                <>
                  Are you sure you want to delete{" "}
                  {itemName ? (
                    <strong style={{ color: "var(--foreground)" }}>
                      &ldquo;{itemName}&rdquo;
                    </strong>
                  ) : (
                    "this paper"
                  )}
                  ? This will permanently remove it from your library.
                </>
              )}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
            gap: 10,
            marginTop: 6,
          }}
        >
          <button
            type="button"
            className="button ghost"
            style={{ height: 34, fontSize: 13, padding: "0 14px" }}
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className="button"
            style={{
              height: 34,
              fontSize: 13,
              fontWeight: 650,
              padding: "0 16px",
              background: "#ef4444",
              color: "#ffffff",
              border: "1px solid #dc2626",
              borderRadius: 6,
              cursor: "pointer",
            }}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
