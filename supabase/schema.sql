-- ============================================================================
-- Bench & Bar — database schema (Section 7)
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
  preferred_airline text,
  preferred_hotel_brand text,
  preferred_cruise_line text,
  created_at timestamptz default now()
);

-- Travel preferences (added after launch) — idempotent for existing databases.
alter table profiles add column if not exists preferred_airline text;
alter table profiles add column if not exists preferred_hotel_brand text;
alter table profiles add column if not exists preferred_cruise_line text;

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

-- Social graph: who follows whom.
create table if not exists follows (
  follower_id uuid not null references profiles(id) on delete cascade,
  following_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);

create index if not exists idx_follows_follower on follows(follower_id);
create index if not exists idx_follows_following on follows(following_id);

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

-- SECURITY DEFINER is required: this runs from a trigger as the requesting
-- user, and hotel_aggregates has RLS with no client write policy. Without
-- definer rights the aggregate upsert is denied and the review write aborts.
create or replace function recompute_hotel_aggregates(target_hotel uuid)
returns void language sql security definer set search_path = public as $$
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
alter table follows enable row level security;

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

-- Authenticated users may insert hotels they view (Places-backed, dedup by
-- google_place_id) — but NOT update them. Clients write a hotel once via
-- ON CONFLICT DO NOTHING; there is deliberately no update policy, so a signed-
-- in user can't rewrite another hotel's name/image/coords. Refreshing stale
-- Places data is a service-role job.
drop policy if exists hotels_insert_auth on hotels;
create policy hotels_insert_auth on hotels
  for insert to authenticated with check (true);

drop policy if exists hotels_update_auth on hotels;

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
-- Abuse guards: one report per user per target, and a cap on open reports per
-- reporter so a single account can't mass-hide the catalog. resolve_report()
-- (service-role only) is the admin path to unhide or remove.

alter table reports add column if not exists resolved boolean not null default false;

create unique index if not exists uq_report_reporter_review
  on reports(reporter_id, review_id) where review_id is not null;
create unique index if not exists uq_report_reporter_photo
  on reports(reporter_id, photo_id) where photo_id is not null;

create or replace function enforce_report_limits()
returns trigger language plpgsql security definer set search_path = public as $$
declare open_count int;
begin
  select count(*) into open_count
  from reports where reporter_id = new.reporter_id and resolved = false;
  if open_count >= 10 then
    raise exception 'Too many open reports — please wait for moderation review.';
  end if;
  return new;
end; $$;

drop trigger if exists trg_reports_limit on reports;
create trigger trg_reports_limit
before insert on reports
for each row execute function enforce_report_limits();

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

-- Admin resolution (run with the service role / SQL editor):
--   action 'unhide'  -> restore the content, close matching reports
--   action 'remove'  -> delete the content (review cascade cleans children;
--                       Storage objects for removed photos still need cleanup
--                       via the dashboard or an edge function)
create or replace function resolve_report(target_report uuid, action text)
returns void language plpgsql security definer set search_path = public as $$
declare r reports;
begin
  select * into r from reports where id = target_report;
  if r.id is null then raise exception 'Report % not found', target_report; end if;

  if action = 'unhide' then
    if r.review_id is not null then update reviews set is_hidden = false where id = r.review_id; end if;
    if r.photo_id is not null then update review_photos set is_hidden = false where id = r.photo_id; end if;
  elsif action = 'remove' then
    if r.review_id is not null then delete from reviews where id = r.review_id; end if;
    if r.photo_id is not null then delete from review_photos where id = r.photo_id; end if;
  else
    raise exception 'Unknown action %, expected unhide|remove', action;
  end if;

  update reports set resolved = true
  where (r.review_id is not null and review_id = r.review_id)
     or (r.photo_id is not null and photo_id = r.photo_id);
end; $$;

-- Functions default to EXECUTE for PUBLIC — lock this one to admins.
revoke execute on function resolve_report(uuid, text) from public, anon, authenticated;
grant execute on function resolve_report(uuid, text) to service_role;

-- ---- Account deletion (App Store guideline 5.1.1(v)) ------------------------
-- Deletes the caller's auth user; FK cascades remove the profile, reviews,
-- tags, photos, votes, follows, and reports. Uploaded Storage objects are not
-- auto-removed (clean up via dashboard/edge function). If your project's
-- postgres role lacks delete rights on auth.users, move this into an edge
-- function using the service-role admin API.
create or replace function delete_account()
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then
    raise exception 'Not signed in.';
  end if;
  delete from auth.users where id = auth.uid();
end; $$;

revoke execute on function delete_account() from public, anon;
grant execute on function delete_account() to authenticated;

-- ---- Enforce the 3-photos-per-review limit server-side ----------------------
create or replace function enforce_photo_limit()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from review_photos where review_id = new.review_id) >= 3 then
    raise exception 'Photo limit reached (3 per review).';
  end if;
  return new;
end; $$;

drop trigger if exists trg_photo_limit on review_photos;
create trigger trg_photo_limit
before insert on review_photos
for each row execute function enforce_photo_limit();

-- follows: public read (counts/feeds); users manage only their own follows.
drop policy if exists follows_read on follows;
create policy follows_read on follows
  for select to anon, authenticated using (true);

drop policy if exists follows_insert_own on follows;
create policy follows_insert_own on follows
  for insert to authenticated with check (auth.uid() = follower_id);

drop policy if exists follows_delete_own on follows;
create policy follows_delete_own on follows
  for delete to authenticated using (auth.uid() = follower_id);

-- ---- Leaderboard: top reviewers (aggregates public content only) -----------
-- Security definer so guests can read the board without per-table grants; it
-- only exposes public-review-derived counts + public profile display fields.

create or replace function get_top_reviewers(limit_count int default 25)
returns table (
  user_id uuid,
  display_name text,
  avatar_url text,
  review_count bigint,
  helpful_count bigint
)
language sql security definer set search_path = public as $$
  select r.user_id, p.display_name, p.avatar_url,
         count(distinct r.id) as review_count,
         count(distinct hv.id) as helpful_count
  from reviews r
  join profiles p on p.id = r.user_id
  left join helpful_votes hv on hv.review_id = r.id
  where r.is_private_log = false and r.is_hidden = false
  group by r.user_id, p.display_name, p.avatar_url
  order by review_count desc, helpful_count desc
  limit limit_count;
$$;

grant execute on function get_top_reviewers(int) to anon, authenticated;

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
