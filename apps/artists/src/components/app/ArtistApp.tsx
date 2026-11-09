/**
 * The artist side as one phone-width app (boards F38-A-Today, Shows, Bookings, Fans, Page): the Artists
 * switch with the Artist tag, the lime ring on your initial, and the five-tab dock. Board classes from
 * @ccd/ui/board.css, so the screens match the final preview. Server-safe; the dock is the only client part.
 */
import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import { boardVars } from "@ccd/ui";
import ArtistDock from "./ArtistDock";

export const LIME = "#B6EF36";

export default function ArtistApp({ initial, children, dock = true }: { initial?: string | null; children: ReactNode; dock?: boolean }) {
  return (
    <div className="dk art-stage">
      <div className="v4 app art-app" style={{ ...boardVars(LIME), ["--amb" as string]: LIME } as CSSProperties}>
        <div className="art-amb" aria-hidden="true" />
        <div className="top4" style={{ position: "relative", zIndex: 2 }}>
          <Link href="/" className="sw"><i style={{ background: LIME, width: 30, height: 30, borderRadius: 15, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}><img src="/cats/lime.webp" alt="" style={{ height: 26, marginTop: 6 }} /></i>Artists</Link>
          <span className="pill" style={{ height: 26, fontSize: 12, color: LIME, background: "rgba(182,239,54,.1)", boxShadow: "inset 0 0 0 1px rgba(182,239,54,.3)" }}>Artist</span>
          <span style={{ flex: 1 }} />
          {initial && <span className="cav" style={{ width: 40, height: 40, fontSize: 16, color: "#0A0A0B", background: LIME, boxShadow: `0 0 0 2.5px #0A0A0B, 0 0 0 5px ${LIME}` }} aria-hidden="true">{initial}</span>}
        </div>
        <div className={`art-body${dock ? " has-dock" : ""}`}>{children}</div>
        {dock && <ArtistDock />}
      </div>
    </div>
  );
}
