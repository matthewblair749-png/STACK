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
          background: "radial-gradient(ellipse 70% 65% at 50% 42%, #fbfaf7 0%, #f1efea 75%)",
          color: "#121110",
          position: "relative",
        }}
      >
        {/* A sticky note in the corner, like the one on the landing page's desk. */}
        <div
          style={{
            position: "absolute",
            left: 70,
            top: 56,
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
        <div style={{ display: "flex", padding: "8px 20px 12px", borderRadius: "10px 10px 0 0", background: "#ffe14d", color: "#121110", fontSize: 24, letterSpacing: 3 }}>
          {SITE_NAME}
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: 34, fontSize: 88, fontWeight: 700, letterSpacing: -3, lineHeight: 1.02 }}>
          <div>All your work,</div>
          <div style={{ display: "flex" }}>
            in one&nbsp;
            <span style={{ display: "flex", padding: "0 8px", backgroundImage: "linear-gradient(transparent 55%, #ffe14d 55%, #ffe14d 92%, transparent 92%)" }}>neat stack.</span>
          </div>
        </div>
        <div style={{ marginTop: 30, fontSize: 30, color: "#5c5852" }}>Every morning, one brief: what needs you and what to do next.</div>
      </div>
    ),
    size,
  );
}
