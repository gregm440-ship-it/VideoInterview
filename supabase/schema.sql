-- ============================================================================
-- Rep & Sip — database schema (Section 7)
-- Run in the Supabase SQL editor (or `supabase db push`) on a fresh project.
-- Order: tables -> aggregate trigger -> profile auto-create -> RLS -> storage.
-- ============================================================================

-- ---- Tables ----------------------------------------------------------------

-- Profiles (Supabase manages auth.users)
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  home_city text,
  traveler_type text,
  created_at timestamptz default now()
);

create table if not exists hotels (
  id uuid primary key default gen_random_uuid(),
  google_place_id text unique not null,
  name text not null,
  brand text,
  address text,
  city text,
  country text,
  lat double precision,
  lng double precision,
  price_tier int,
  image_url text,
  created_at timestamptz default now()
);

create table if not exists reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  hotel_id uuid not null references hotels(id) on delete cascade,
  gym_rating int check (gym_rating between 1 and 5),
  bar_rating int check (bar_rating between 1 and 5),
  overall_rating int check (overall_rating between 1 and 5),
  note text,
  is_private_log boolean not null default false,
  is_hidden boolean not null default false,   -- moderation safety valve (8.2)
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists review_tags (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references reviews(id) on delete cascade,
  tag_key text not null,
  tag_type text not null check (tag_type in ('gym','bar'))
);

create table if not exists review_photos (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references reviews(id) on delete cascade,
  hotel_id uuid not null references hotels(id) on delete cascade,
  url text not null,
  type text not null check (type in ('gym','bar')),
  is_hidden boolean not null default false,   -- moderation safety valve (8.2)
  created_at timestamptz default now()
);

-- Minimal moderation: a report hides content pending review
create table if not exists reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references profiles(id) on delete cascade,
  review_id uuid references reviews(id) on delete cascade,
  photo_id uuid references review_photos(id) on delete cascade,
  reason text,
  created_at timestamptz default now()
);

create table if not exists helpful_votes (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references reviews(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz default now(),
  unique (review_id, user_id)
);

create table if not exists hotel_aggregates (
  hotel_id uuid primary key references hotels(id) on delete cascade,
  avg_gym numeric(3,2) default 0,
  avg_bar numeric(3,2) default 0,
  avg_overall numeric(3,2) default 0,
  review_count int default 0,
  updated_at timestamptz default now()
);

-- Helpful indexes for the common access paths.
create index if not exists idx_reviews_hotel on reviews(hotel_id);
create index if not exists idx_reviews_user on reviews(user_id);
create index if not exists idx_review_tags_review on review_tags(review_id);
create index if not exists idx_review_photos_hotel on review_photos(hotel_id);
create index if not exists idx_helpful_votes_review on helpful_votes(review_id);

-- ---- Aggregate trigger (public reviews only) -------------------------------

create or replace function recompute_hotel_aggregates(target_hotel uuid)
returns void language sql as $$
  insert into hotel_aggregates (hotel_id, avg_gym, avg_bar, avg_overall, review_count, updated_at)
  select target_hotel,
         coalesce(avg(gym_rating),0),
         coalesce(avg(bar_rating),0),
         coalesce(avg(overall_rating),0),
         count(*), now()
  from reviews
  where hotel_id = target_hotel and is_private_log = false and is_hidden = false
  on conflict (hotel_id) do update set
    avg_gym = excluded.avg_gym,
    avg_bar = excluded.avg_bar,
    avg_overall = excluded.avg_overall,
    review_count = excluded.review_count,
    updated_at = now();
$$;

create or replace function reviews_aggregate_trigger()
returns trigger language plpgsql as $$
begin
  if (tg_op = 'DELETE') then
    perform recompute_hotel_aggregates(old.hotel_id); return old;
  else
    perform recompute_hotel_aggregates(new.hotel_id); return new;
  end if;
end; $$;

drop trigger if exists trg_reviews_aggregate on reviews;
create trigger trg_reviews_aggregate
after insert or update or delete on reviews
for each row execute function reviews_aggregate_trigger();

-- Keep reviews.updated_at fresh on edits.
create or replace function touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end; $$;

drop trigger if exists trg_reviews_touch on reviews;
create trigger trg_reviews_touch
before update on reviews
for each row execute function touch_updated_at();

-- ---- Auto-create a profile row when a user signs up ------------------------

create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function handle_new_user();

-- ---- Row-Level Security -----------------------------------------------------

alter table profiles enable row level security;
alter table hotels enable row level security;
alter table hotel_aggregates enable row level security;
alter table reviews enable row level security;
alter table review_tags enable row level security;
alter table review_photos enable row level security;
alter table reports enable row level security;
alter table helpful_votes enable row level security;

-- profiles: anyone authenticated reads; users write only their own row.
drop policy if exists profiles_read on profiles;
create policy profiles_read on profiles
  for select to authenticated using (true);

drop policy if exists profiles_insert_own on profiles;
create policy profiles_insert_own on profiles
  for insert to authenticated with check (auth.uid() = id);

drop policy if exists profiles_update_own on profiles;
create policy profiles_update_own on profiles
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

-- hotels / hotel_aggregates: public read; writes via service role / app only.
drop policy if exists hotels_public_read on hotels;
create policy hotels_public_read on hotels
  for select to anon, authenticated using (true);

-- Authenticated users may upsert hotels they view (Places-backed, dedup by
-- google_place_id). This keeps Phase 1's "upsert every viewed hotel" working
-- without a service role on the client. Tighten to service-role if abused.
drop policy if exists hotels_insert_auth on hotels;
create policy hotels_insert_auth on hotels
  for insert to authenticated with check (true);

drop policy if exists hotels_update_auth on hotels;
create policy hotels_update_auth on hotels
  for update to authenticated using (true) with check (true);

drop policy if exists aggregates_public_read on hotel_aggregates;
create policy aggregates_public_read on hotel_aggregates
  for select to anon, authenticated using (true);

-- reviews: public read where visible; authors fully manage their own rows.
drop policy if exists reviews_public_read on reviews;
create policy reviews_public_read on reviews
  for select to anon, authenticated
  using (is_private_log = false and is_hidden = false);

drop policy if exists reviews_owner_read on reviews;
create policy reviews_owner_read on reviews
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists reviews_owner_insert on reviews;
create policy reviews_owner_insert on reviews
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists reviews_owner_update on reviews;
create policy reviews_owner_update on reviews
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists reviews_owner_delete on reviews;
create policy reviews_owner_delete on reviews
  for delete to authenticated using (auth.uid() = user_id);

-- review_tags: readable when the parent review is visible; author writes own.
drop policy if exists review_tags_read on review_tags;
create policy review_tags_read on review_tags
  for select to anon, authenticated using (
    exists (
      select 1 from reviews r
      where r.id = review_tags.review_id
        and (
          (r.is_private_log = false and r.is_hidden = false)
          or r.user_id = auth.uid()
        )
    )
  );

drop policy if exists review_tags_owner_write on review_tags;
create policy review_tags_owner_write on review_tags
  for all to authenticated using (
    exists (select 1 from reviews r where r.id = review_tags.review_id and r.user_id = auth.uid())
  ) with check (
    exists (select 1 from reviews r where r.id = review_tags.review_id and r.user_id = auth.uid())
  );

-- review_photos: readable when visible & not hidden; author writes own.
drop policy if exists review_photos_read on review_photos;
create policy review_photos_read on review_photos
  for select to anon, authenticated using (
    is_hidden = false and exists (
      select 1 from reviews r
      where r.id = review_photos.review_id
        and r.is_private_log = false and r.is_hidden = false
    )
    or exists (
      select 1 from reviews r
      where r.id = review_photos.review_id and r.user_id = auth.uid()
    )
  );

drop policy if exists review_photos_owner_write on review_photos;
create policy review_photos_owner_write on review_photos
  for all to authenticated using (
    exists (select 1 from reviews r where r.id = review_photos.review_id and r.user_id = auth.uid())
  ) with check (
    exists (select 1 from reviews r where r.id = review_photos.review_id and r.user_id = auth.uid())
  );

-- reports: any authenticated user can file one (their own).
drop policy if exists reports_insert_own on reports;
create policy reports_insert_own on reports
  for insert to authenticated with check (auth.uid() = reporter_id);

-- helpful_votes: authenticated users insert/read/delete their own vote.
drop policy if exists helpful_votes_read on helpful_votes;
create policy helpful_votes_read on helpful_votes
  for select to anon, authenticated using (true);

drop policy if exists helpful_votes_insert_own on helpful_votes;
create policy helpful_votes_insert_own on helpful_votes
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists helpful_votes_delete_own on helpful_votes;
create policy helpful_votes_delete_own on helpful_votes
  for delete to authenticated using (auth.uid() = user_id);

-- ---- Moderation safety valve: a report hides its target (Section 8.2) ------
-- Runs as definer so any reporter can hide content pending review, without
-- granting them update rights on other people's rows.

create or replace function apply_report_hide()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.review_id is not null then
    update reviews set is_hidden = true where id = new.review_id;
  end if;
  if new.photo_id is not null then
    update review_photos set is_hidden = true where id = new.photo_id;
  end if;
  return new;
end; $$;

drop trigger if exists trg_reports_hide on reports;
create trigger trg_reports_hide
after insert on reports
for each row execute function apply_report_hide();

-- ---- Storage: review-photos bucket (public read) ---------------------------

insert into storage.buckets (id, name, public)
values ('review-photos', 'review-photos', true)
on conflict (id) do nothing;

-- Public read of objects in the bucket.
drop policy if exists "review_photos_public_read" on storage.objects;
create policy "review_photos_public_read" on storage.objects
  for select to anon, authenticated using (bucket_id = 'review-photos');

-- Authenticated users may upload, but only into their own user-id folder
-- (path convention: <auth.uid()>/<reviewId>/<file>).
drop policy if exists "review_photos_owner_upload" on storage.objects;
create policy "review_photos_owner_upload" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'review-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "review_photos_owner_delete" on storage.objects;
create policy "review_photos_owner_delete" on storage.objects
  for delete to authenticated using (
    bucket_id = 'review-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
