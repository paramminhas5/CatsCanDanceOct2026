/**
 * BookButton: the booking entry point any page can mount.
 *
 *   <BookButton artist={{ slug, name, photo_url, city }} />
 *
 * Opens the request drawer with that artist picked. With `fromQuery`, it also opens itself when the
 * URL has ?book=1, and takes ?date=YYYY-MM-DD and ?city= as the night brief (Tour links use this).
 */
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/router";
import RequestDrawer from "@/components/booking/RequestDrawer";
import { isIsoDay, type MiniArtist } from "@/lib/desk";

export default function BookButton({ artist, label, className, fromQuery = false }: {
  artist: MiniArtist; label?: string; className?: string; fromQuery?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [initial, setInitial] = useState<{ date?: string; city?: string }>({});

  useEffect(() => {
    if (!fromQuery || !router.isReady) return;
    const q = router.query;
    const date = typeof q.date === "string" && isIsoDay(q.date) ? q.date : undefined;
    const city = typeof q.city === "string" ? q.city.slice(0, 60) : undefined;
    if (date || city) setInitial({ date, city });
    if (q.book === "1") setOpen(true);
  }, [fromQuery, router.isReady, router.query]);

  const close = useCallback(() => {
    setOpen(false);
    if (fromQuery && router.query.book) {
      const { book, ...rest } = router.query; // eslint-disable-line @typescript-eslint/no-unused-vars
      router.replace({ pathname: router.pathname, query: rest }, undefined, { shallow: true, scroll: false });
    }
  }, [fromQuery, router]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={className ?? "inline-flex items-center gap-2 font-display text-lg px-6 py-3 border-4 border-ink bg-acid-yellow text-ink chunk-shadow hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-transform"}
      >
        {label ?? `Request to book ${artist.name}`}
      </button>
      <RequestDrawer open={open} onClose={close} artists={[artist]} initial={initial} />
    </>
  );
}
