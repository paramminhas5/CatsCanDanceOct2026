"use client";
/** The floating ask bar on "Book for a date" (board W39-AllBook): who is ticked, and one button. Works as a plain form submit too. */
import { useEffect, useState } from "react";

export default function AskBar({ formId, date }: { formId: string; date: string }) {
  const [names, setNames] = useState<string[]>([]);
  useEffect(() => {
    const form = document.getElementById(formId) as HTMLFormElement | null;
    if (!form) return;
    const read = () => {
      const boxes = [...form.querySelectorAll<HTMLInputElement>('input[name="a"]')];
      const on = boxes.filter((b) => b.checked);
      for (const b of boxes) b.disabled = (!b.checked && on.length >= 3) || b.dataset.busy === "1";
      setNames(on.map((b) => b.dataset.name ?? b.value));
    };
    read();
    form.addEventListener("change", read);
    return () => form.removeEventListener("change", read);
  }, [formId]);
  const grads = ["#7C4DFF, #FF2E93", "#00E5FF, #2962FF", "#FF6A00, #FF2E93"];
  return (
    <div className="aa-askbar" data-on={names.length > 0}>
      <span className="flex" aria-hidden="true">{names.map((n, i) => <span key={n} className="aa-av" style={{ background: `linear-gradient(135deg, ${grads[i % 3]})`, marginLeft: i ? -10 : 0 }}>{n[0]}</span>)}</span>
      <span className="min-w-0 flex-1">
        <b className="block text-[16px] font-semibold">{names.length ? `${names.length} in your ask${date ? ` for ${date}` : ""}` : `Your ask${date ? ` for ${date}` : ""}`}</b>
        <span className="k-b block truncate text-[13px]">{names.length ? `${names.join(", ")}. Each replies on their own.` : "Add up to three. Each replies on their own."}</span>
      </span>
      <button type="submit" form={formId} className="k-btn k-btn--key" disabled={!names.length}>Send the ask</button>
    </div>
  );
}
