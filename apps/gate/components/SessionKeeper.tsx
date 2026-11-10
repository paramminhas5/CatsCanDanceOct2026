"use client";
/** "Remember me" off: sign out once the browser has been closed. Mount once per app with its browser client. */
import { useEffect } from "react";
import { sessionShouldEnd, forgetChoice } from "@ccd/auth";
import { supabase } from "@/lib/supabase/browser";

export default function SessionKeeper() {
  useEffect(() => { if (sessionShouldEnd()) { forgetChoice(); void supabase().auth.signOut().then(() => window.location.reload()); } }, []);
  return null;
}
