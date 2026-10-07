import { ImageResponse } from "next/og";
import { SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE } from "@/lib/site";

export const alt = `${SITE_NAME} - ${SITE_TAGLINE}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** The preview card shown when someone shares a STACK link. Text only, so it never goes stale. */
export default function Image() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: 96, background: "#0b0b0f", color: "#ffffff" }}>
        <div style={{ fontSize: 40, fontWeight: 700, letterSpacing: 6, color: "#a29ef0" }}>{SITE_NAME}</div>
        <div style={{ fontSize: 76, fontWeight: 700, marginTop: 24, lineHeight: 1.05 }}>{SITE_TAGLINE}</div>
        <div style={{ fontSize: 30, marginTop: 32, color: "#c9c9d4", lineHeight: 1.4, maxWidth: 940 }}>{SITE_DESCRIPTION}</div>
      </div>
    ),
    size,
  );
}
