-- 059 Promoter image upload (5 Nov 2026). Promoter teams can upload their logo, cover and night posters
-- into the public artist-media bucket under promoters/<promoter slug>/. Reads are already public on that bucket.
create policy "promoter media upload own folder" on storage.objects for insert to authenticated
  with check (bucket_id = 'artist-media' and (storage.foldername(name))[1] = 'promoters'
    and (storage.foldername(name))[2] in (select p.slug from public.promoters p where public.promoter_role(p.id) is not null));
