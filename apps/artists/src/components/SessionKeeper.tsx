"use client";
/** "Remember me" off: sign out once the browser has been closed. Mount once per app with its browser client. */
import { useEffect } from "react";
import { sessionShouldEnd, forgetChoice } from "@ccd/auth";
import { supabaseBrowser } from "@ccd/db/browser";

export default function SessionKeeper() {
  useEffect(() => { if (sessionShouldEnd()) { forgetChoice(); void supabaseBrowser().auth.signOut().then(() => window.location.reload()); } }, []);
  return null;
}
