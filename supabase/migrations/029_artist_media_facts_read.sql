-- 029: public read for gallery media and approved facts. Writes stay behind ops RPCs.
drop policy if exists "public read artist media" on public.artist_media;
create policy "public read artist media" on public.artist_media for select to anon, authenticated using (true);
drop policy if exists "public read approved facts" on public.artist_facts;
create policy "public read approved facts" on public.artist_facts for select to anon, authenticated using (status = 'approved');
