import Link from "next/link";

export default function NotFound() {
  return (
    <main className="wrap" style={{ padding: "80px 16px" }}>
      <h1 style={{ fontSize: "clamp(40px,8vw,96px)" }}>Lost the beat.</h1>
      <p style={{ fontSize: 20 }}>That page isn&apos;t here.</p>
      <div className="btns"><Link className="btn" href="/">Back home</Link></div>
    </main>
  );
}
