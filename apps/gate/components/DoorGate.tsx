"use client";
/** The door needs a signed-in person on the door team. Asks for sign-in on its own screen so the installed app never loops. */
import type { ReactNode } from "react";
import { useMember } from "@/lib/member";
import SignIn from "@/components/SignIn";
import { HostApp } from "@/components/app/ui";

/** `framed` puts the sign-in screen in the Host frame, for the full-screen door page that has none of its own. */
export default function DoorGate({ next, children, framed = false, demo }: { next: string; children: ReactNode; framed?: boolean; demo?: ReactNode }) {
  const shell = (c: ReactNode) => (framed ? <HostApp dock={false}>{c}</HostApp> : c);
  const { loading, signedIn } = useMember();
  if (loading) return shell(<p className="b" style={{ padding: "40px 20px" }} aria-busy="true">Opening the door</p>);
  if (!signedIn) {
    return shell(
      <div style={{ padding: demo ? "8px 0 0" : "24px 20px 0" }}>
        {demo}
        <div style={{ padding: demo ? "8px 20px 0" : 0 }}>
        <h1 className="d" style={{ fontSize: demo ? 26 : 34, margin: 0 }}>{demo ? "Running a real door?" : "Sign in to run the door"}</h1>
        <p className="b" style={{ marginTop: 10 }}>Use the email the host added to the door team.</p>
        <div style={{ marginTop: 16 }}><SignIn next={next} /></div>
        </div>
      </div>,
    );
  }
  return <>{children}</>;
}
