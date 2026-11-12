"use client";
import { useEffect } from "react";
import { logOpenFromRef } from "@/lib/share";

/** Counts a visit from a shared link as an open for that card. Renders nothing. */
export default function OpenFromRef() {
  useEffect(() => { logOpenFromRef(); }, []);
  return null;
}
