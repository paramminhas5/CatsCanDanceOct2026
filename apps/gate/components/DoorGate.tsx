"use client";
/** The door needs a signed-in person on the door team. Asks for sign-in on its own screen so the installed app never loops. */
import type { ReactNode } from "react";
import { useMember } from "@/lib/member";
import SignIn from "@/components/SignIn";

export default function DoorGate({ next, children }: { next: string; children: ReactNode }) {
  const { loading, signedIn } = useMember();
  if (loading) return <p className="k-b p-8" aria-busy="true">Opening the door</p>;
  if (!signedIn) {
    return (
      <div className="mx-auto grid max-w-[460px] gap-5 p-8">
        <h1 className="k-d text-[40px]">Sign in to run the door</h1>
        <p className="k-b">Use the email the host added to the door team.</p>
        <SignIn next={next} />
      </div>
    );
  }
  return <>{children}</>;
}
