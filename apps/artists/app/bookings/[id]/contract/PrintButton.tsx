"use client";
export default function PrintButton() {
  return <button type="button" onClick={() => window.print()} style={{ padding: "10px 18px", border: "2px solid #111", background: "#B6EF36", font: "600 14px system-ui", cursor: "pointer" }}>Print or save as PDF</button>;
}
