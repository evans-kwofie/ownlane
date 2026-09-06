import { ImageResponse } from "next/og";

export const alt = "Ownlane - Your brand. Your audience. Your business.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div style={{ background: "#ff4d00", color: "#000", display: "flex", flexDirection: "column", height: "100%", justifyContent: "space-between", padding: "64px", width: "100%" }}>
      <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: 4 }}>OWNLANE</div>
      <div style={{ display: "flex", flexDirection: "column", fontSize: 112, fontWeight: 900, letterSpacing: -8, lineHeight: 0.82 }}><div>THE HOME FOR</div><div>WHAT YOU MAKE.</div></div>
      <div style={{ display: "flex", fontSize: 28, justifyContent: "space-between" }}><span>Your brand. Your audience. Your business.</span><span>useownlane.com</span></div>
    </div>,
    size,
  );
}
