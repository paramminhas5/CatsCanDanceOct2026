/**
 * An image field for promoters: upload a file (shrunk on the phone first) or paste a link.
 * Files go to the public artist-media bucket under promoters/<promoter slug>/ (migration 059).
 */
import { useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

const MAX_PX = 2000;

function shrink(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const r = Math.min(MAX_PX / img.width, MAX_PX / img.height, 1);
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * r); c.height = Math.round(img.height * r);
      c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      c.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not read that image."))), "image/jpeg", 0.88);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Could not read that image.")); };
    img.src = url;
  });
}

export default function ImageField({ promoter, kind, value, onChange, label, hint, inputClass }: {
  promoter: string; kind: "logo" | "cover" | "poster"; value: string; onChange: (url: string) => void;
  label: string; hint?: string; inputClass: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const pick = async (file: File | undefined) => {
    if (!file) return;
    setMsg(""); setBusy(true);
    try {
      if (!/^image\//.test(file.type)) throw new Error("Pick a JPG, PNG or WebP image.");
      const blob = await shrink(file);
      const path = `promoters/${promoter}/${kind}-${Date.now()}.jpg`;
      const up = await supabase.storage.from("artist-media").upload(path, blob, { contentType: "image/jpeg", upsert: false });
      if (up.error) throw new Error("Upload opens once CCD approves you. Paste an image link for now.");
      onChange(supabase.storage.from("artist-media").getPublicUrl(path).data.publicUrl);
      setMsg("Uploaded. Save to keep it.");
    } catch (e: any) { setMsg(e.message ?? "Upload failed."); }
    setBusy(false);
    if (ref.current) ref.current.value = "";
  };
  return (
    <div>
      <p className="text-sm font-bold mb-1">{label}</p>
      <div className="flex gap-2 items-stretch">
        {value && /^https:\/\//.test(value) && <img src={value} alt="" className="w-14 h-14 object-cover border-4 border-ink bg-cream shrink-0" />}
        <input className={inputClass} value={value} onChange={(e) => onChange(e.target.value)} placeholder="Image link (https://…)" autoCapitalize="none" />
        <button type="button" disabled={busy} onClick={() => ref.current?.click()} className="shrink-0 px-3 border-4 border-ink bg-acid-yellow font-display text-sm">
          {busy ? "…" : "Upload"}
        </button>
        <input ref={ref} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
      </div>
      {(msg || hint) && <p className="text-xs text-ink/70 mt-1">{msg || hint}</p>}
    </div>
  );
}
