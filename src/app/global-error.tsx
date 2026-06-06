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

  // global-error replaces the root layout, so neither Tailwind tokens nor
  // next-themes are available here. Colors are inlined from the Trust & Authority
  // palette (navy #0F172A, sky #0369A1) and dark mode is honored via
  // prefers-color-scheme in a self-contained <style> block.
  return (
    <html lang="en">
      <head>
        <title>Something went wrong · Launch Pad</title>
        <style>{`
          :root {
            color-scheme: light dark;
            --ge-bg: #f8fafc;
            --ge-fg: #0f172a;
            --ge-muted: #475569;
            --ge-eyebrow: #64748b;
            --ge-card: #ffffff;
            --ge-border: #e2e8f0;
            --ge-brand: #0369a1;
            --ge-brand-hover: #075e8d;
            --ge-brand-fg: #ffffff;
          }
          @media (prefers-color-scheme: dark) {
            :root {
              --ge-bg: #04060f;
              --ge-fg: #f1f5f9;
              --ge-muted: #94a3b8;
              --ge-eyebrow: #94a3b8;
              --ge-card: #0b1220;
              --ge-border: #1e293b;
              --ge-brand: #38bdf8;
              --ge-brand-hover: #7dd3fc;
              --ge-brand-fg: #0f172a; /* sky-400 is light — dark text for contrast */
            }
          }
          .ge-body {
            margin: 0;
            font-family: ui-sans-serif, system-ui, sans-serif;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 1.5rem;
            background-color: var(--ge-bg);
            color: var(--ge-fg);
          }
          .ge-btn {
            cursor: pointer;
            border-radius: 8px;
            border: none;
            background-color: var(--ge-brand);
            color: var(--ge-brand-fg);
            padding: 10px 18px;
            font-size: 14px;
            font-weight: 600;
            transition: background-color 200ms ease;
          }
          .ge-btn:hover { background-color: var(--ge-brand-hover); }
          .ge-btn:focus-visible { outline: 2px solid var(--ge-brand); outline-offset: 2px; }
          .ge-link {
            display: inline-flex;
            align-items: center;
            border-radius: 8px;
            border: 1px solid var(--ge-border);
            background: var(--ge-card);
            color: var(--ge-fg);
            padding: 10px 18px;
            font-size: 14px;
            font-weight: 600;
            text-decoration: none;
            transition: border-color 200ms ease;
          }
          .ge-link:hover { border-color: var(--ge-brand); }
          .ge-link:focus-visible { outline: 2px solid var(--ge-brand); outline-offset: 2px; }
        `}</style>
      </head>
      <body className="ge-body">
        <div style={{ maxWidth: 480, textAlign: "center" }}>
          <div
            style={{
              fontSize: 13,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "var(--ge-eyebrow)",
              marginBottom: 12,
            }}
          >
            Launch Pad
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 600, margin: "0 0 8px" }}>
            Something went seriously wrong
          </h1>
          <p style={{ fontSize: 14, color: "var(--ge-muted)", margin: "0 0 20px" }}>
            We hit an unexpected error before the app could load. Please try
            again, or head back to the home page.
          </p>
          {error.digest && (
            <p
              style={{
                fontSize: 12,
                color: "var(--ge-eyebrow)",
                fontFamily: "ui-monospace, SFMono-Regular, monospace",
                marginBottom: 20,
              }}
            >
              Reference: {error.digest}
            </p>
          )}
          <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
            <button type="button" onClick={() => reset()} className="ge-btn">
              Try again
            </button>
            <a href="/" className="ge-link">
              Go home
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
