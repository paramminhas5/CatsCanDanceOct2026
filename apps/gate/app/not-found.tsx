import Link from "next/link";
import { HostApp } from "@/components/app/ui";

export default function NotFound() {
  return (
    <HostApp dock={false}>
      <div style={{ padding: "60px 20px 0", textAlign: "center" }}>
        <img src="/cats/yellow.webp" alt="" style={{ height: 130, margin: "0 auto", display: "block", animation: "bob 3s ease-in-out infinite" }} />
        <div className="m" style={{ marginTop: 18 }}>404</div>
        <h1 className="d" style={{ fontSize: 44, margin: "8px 0 0" }}>Not on the list.</h1>
        <p className="b" style={{ marginTop: 10 }}>This page is not here, or the link is old.</p>
        <Link href="/" className="pill lg on" style={{ marginTop: 18, display: "inline-flex" }}>Back to Host</Link>
      </div>
    </HostApp>
  );
}
