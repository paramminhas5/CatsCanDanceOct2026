import type { NextApiRequest, NextApiResponse } from "next";
import { resendTickets } from "@/lib/mailer";

// "Email me my tickets". Always gives the same answer for any email, so it never reveals who has booked.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  const email = String(req.body?.email ?? "").trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || email.length > 200) return res.status(400).json({ error: "Enter a valid email." });
  const r = await resendTickets(email);
  if (!r.ok) {
    return res.status(503).json({
      error: r.reason === "email-off"
        ? "We can't send email yet. Write to hello@catscandance.com and we'll sort your tickets."
        : "Ticket lookup is not switched on yet. Write to hello@catscandance.com and we'll sort your tickets.",
    });
  }
  return res.status(200).json({ ok: true });
}
