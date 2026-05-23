"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error("Global error boundary caught:", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "1.5rem",
          backgroundColor: "#f8fafc",
          color: "#0f172a",
        }}
      >
        <div style={{ maxWidth: 480, textAlign: "center" }}>
          <div
            style={{
              fontSize: 13,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "#64748b",
              marginBottom: 12,
            }}
          >
            Launch Pad
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 600, margin: "0 0 8px" }}>
            Something went seriously wrong
          </h1>
          <p style={{ fontSize: 14, color: "#475569", margin: "0 0 20px" }}>
            We hit an unexpected error before the app could load. Please try
            again.
          </p>
          {error.digest && (
            <p
              style={{
                fontSize: 12,
                color: "#64748b",
                fontFamily: "ui-monospace, SFMono-Regular, monospace",
                marginBottom: 20,
              }}
            >
              Reference: {error.digest}
            </p>
          )}
          <button
            onClick={() => reset()}
            style={{
              cursor: "pointer",
              borderRadius: 8,
              border: "none",
              backgroundColor: "#6366f1",
              color: "white",
              padding: "10px 18px",
              fontSize: 14,
              fontWeight: 500,
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
