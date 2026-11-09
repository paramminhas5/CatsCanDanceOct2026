/**
 * 30 second preview for the artist page player. Deezer's preview links are signed and expire, and
 * api.deezer.com sends no CORS header, so the browser asks here. The audio streams from Deezer.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d{1,15}$/.test(id)) return Response.json({ error: "bad id" }, { status: 400 });
  try {
    const r = await fetch(`https://api.deezer.com/track/${id}`, { signal: AbortSignal.timeout(4000), next: { revalidate: 600 } });
    const j = await r.json();
    if (!r.ok || j?.error || !j?.preview) return Response.json({ error: "no preview" }, { status: 404 });
    return Response.json({ preview: j.preview as string, title: j.title as string }, { headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=60" } });
  } catch {
    return Response.json({ error: "deezer unreachable" }, { status: 502 });
  }
}
