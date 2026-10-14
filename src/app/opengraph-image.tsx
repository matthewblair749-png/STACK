import { ImageResponse } from "next/og";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/site";

export const alt = `${SITE_NAME} - ${SITE_TAGLINE}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** The preview card shown when someone shares a STACK link: the landing page's desk, in miniature. Text only, so it never goes stale. */
export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "radial-gradient(ellipse 70% 65% at 50% 42%, #ffffff 0%, #f3f3f4 75%)",
          color: "#0b0b0c",
          position: "relative",
        }}
      >
        {/* A sticky note in the corner, like the one on the landing page's desk. */}
        <div
          style={{
            position: "absolute",
            left: 70,
            bottom: 60,
            width: 270,
            gap: 6,
            padding: "22px 24px",
            display: "flex",
            flexDirection: "column",
            background: "linear-gradient(170deg,#fff3a6,#ffe680)",
            boxShadow: "0 22px 24px -16px rgba(0,0,0,0.35)",
            transform: "rotate(-5deg)",
            fontSize: 24,
            whiteSpace: "nowrap",
            color: "#3b3423",
          }}
        >
          <div>1. reply to Sarah</div>
          <div>2. fix the build</div>
          <div>3. prep 2pm</div>
        </div>
        <div style={{ display: "flex", padding: "10px 22px", borderRadius: 999, background: "#e7edff", color: "#2f5eff", fontSize: 26, fontWeight: 600 }}>
          {SITE_NAME}
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: 34, fontSize: 84, fontWeight: 700, letterSpacing: -3, lineHeight: 1.02 }}>
          <div>Your workday, sorted</div>
          <div>before you start</div>
        </div>
        <div style={{ marginTop: 30, fontSize: 30, color: "#5c5c63" }}>{SITE_TAGLINE}</div>
      </div>
    ),
    size,
  );
}
