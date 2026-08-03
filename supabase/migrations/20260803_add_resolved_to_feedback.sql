-- The admin feedback dashboard (src/pages/admin/feedback.astro) reads and
-- writes a `resolved` column that was never added when the table was created.
alter table public.user_feedback
  add column if not exists resolved boolean not null default false;
