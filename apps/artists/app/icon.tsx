import { ImageResponse } from "next/og";
import { NAME } from "@/lib/site";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

/** The favicon: the acid rounded square with the ink marquee letter. */
export default function Icon() {
  const letter = NAME.trim().charAt(0).toUpperCase() || "H";
  return new ImageResponse(
    (
      <div style={{ width: 64, height: 64, display: "flex", alignItems: "center", justifyContent: "center", background: "#b6ef36", borderRadius: 16, color: "#0a0a0c", fontSize: 44, fontWeight: 800, fontFamily: "system-ui, sans-serif", letterSpacing: -2 }}>
        {letter}
      </div>
    ),
    size,
  );
}
