/** An album's tracklist for the focus drawer: id, title and length of each track. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d{1,15}$/.test(id)) return Response.json({ error: "bad id" }, { status: 400 });
  try {
    const r = await fetch(`https://api.deezer.com/album/${id}/tracks?limit=50`, { signal: AbortSignal.timeout(4000), next: { revalidate: 86400 } });
    const j = await r.json();
    if (!r.ok || j?.error || !Array.isArray(j?.data)) return Response.json({ error: "not found" }, { status: 404 });
    const tracks = (j.data as { id: number; title: string; duration?: number }[]).map((t) => ({ id: String(t.id), t: t.title, d: t.duration ?? null }));
    return Response.json({ tracks }, { headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=3600" } });
  } catch {
    return Response.json({ error: "deezer unreachable" }, { status: 502 });
  }
}
