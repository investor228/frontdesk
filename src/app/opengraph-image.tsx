import { ImageResponse } from "next/og";

/**
 * Link preview card. Generated at build time, so pasting the URL into Slack,
 * email or a chat shows the product rather than a bare string.
 *
 * No custom font is loaded on purpose — a webfont fetch is one more thing that
 * can fail a build, and the system stack renders cleanly at this size.
 */
export const alt =
  "Frontdesk — turn your price list and FAQ into a chat assistant for your website";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#faf9f6",
          padding: "72px 80px",
          fontFamily: "sans-serif",
        }}
      >
        {/* Wordmark with the service-bell mark from the favicon */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 12,
              background: "#0f766e",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 30,
            }}
          >
            🛎
          </div>
          <div style={{ fontSize: 34, fontWeight: 600, color: "#16191d" }}>
            Frontdesk
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontSize: 68,
              fontWeight: 700,
              color: "#16191d",
              lineHeight: 1.1,
              letterSpacing: "-0.02em",
            }}
          >
            Your customers ask the
          </div>
          <div
            style={{
              fontSize: 68,
              fontWeight: 700,
              color: "#16191d",
              lineHeight: 1.1,
              letterSpacing: "-0.02em",
            }}
          >
            same five questions.
          </div>
          <div
            style={{
              fontSize: 68,
              fontWeight: 700,
              color: "#0f766e",
              lineHeight: 1.1,
              letterSpacing: "-0.02em",
            }}
          >
            Answer them once.
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          {["Upload your docs", "Get a chat widget", "Never invents a price"].map(
            (label) => (
              <div
                key={label}
                style={{
                  display: "flex",
                  fontSize: 24,
                  color: "#0f5f5a",
                  background: "#d2f2ea",
                  padding: "10px 20px",
                  borderRadius: 999,
                }}
              >
                {label}
              </div>
            ),
          )}
        </div>
      </div>
    ),
    size,
  );
}
