BEGIN;

ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS birthday date;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified boolean DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS timezone text DEFAULT 'Europe/Moscow';
ALTER TABLE users ADD COLUMN IF NOT EXISTS notifications_enabled boolean DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS reminder_days text DEFAULT '0,1,7';
ALTER TABLE users ADD COLUMN IF NOT EXISTS reminder_hour integer DEFAULT 6;
ALTER TABLE users ADD COLUMN IF NOT EXISTS calendar_theme text DEFAULT '{"background":"#0a0a0a","dayText":"#f5f5f5","todayBorder":"#f5f5f5","birthdayBackground":"#00c950","birthdayText":"#0a0a0a"}';

UPDATE users SET is_verified = false WHERE is_verified IS NULL;
UPDATE users SET timezone = 'Europe/Moscow' WHERE timezone IS NULL;
UPDATE users SET notifications_enabled = true WHERE notifications_enabled IS NULL;
UPDATE users SET reminder_days = '0,1,7' WHERE reminder_days IS NULL;
UPDATE users SET reminder_hour = 6 WHERE reminder_hour IS NULL;
UPDATE users
SET calendar_theme = '{"background":"#0a0a0a","dayText":"#f5f5f5","todayBorder":"#f5f5f5","birthdayBackground":"#00c950","birthdayText":"#0a0a0a"}'
WHERE calendar_theme IS NULL;

UPDATE users
SET calendar_theme = '{"background":"#0a0a0a","dayText":"#f5f5f5","todayBorder":"#f5f5f5","birthdayBackground":"#00c950","birthdayText":"#0a0a0a"}'
WHERE calendar_theme IN (
  '{"background":"#0a0a0a","dayText":"#a1a1a1","todayBorder":"#f5f5f5","birthdayBackground":"#00c950","birthdayText":"#0a0a0a"}',
  '{"background":"#0a0a0a","dayText":"#a3a3a3","todayBorder":"#f5f5f5","birthdayBackground":"#00c950","birthdayText":"#0a0a0a"}'
);

ALTER TABLE users ALTER COLUMN is_verified SET NOT NULL;
ALTER TABLE users ALTER COLUMN timezone SET NOT NULL;
ALTER TABLE users ALTER COLUMN notifications_enabled SET NOT NULL;
ALTER TABLE users ALTER COLUMN reminder_days SET NOT NULL;
ALTER TABLE users ALTER COLUMN reminder_hour SET NOT NULL;
ALTER TABLE users ALTER COLUMN calendar_theme SET NOT NULL;

CREATE TABLE IF NOT EXISTS people (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name text,
  date date,
  birth_month integer,
  birth_day integer,
  birth_year integer,
  note text
);

ALTER TABLE people ADD COLUMN IF NOT EXISTS birth_month integer;
ALTER TABLE people ADD COLUMN IF NOT EXISTS birth_day integer;
ALTER TABLE people ADD COLUMN IF NOT EXISTS birth_year integer;
ALTER TABLE people ADD COLUMN IF NOT EXISTS note text;

UPDATE people
SET
  birth_month = EXTRACT(MONTH FROM date)::integer,
  birth_day = EXTRACT(DAY FROM date)::integer,
  birth_year = EXTRACT(YEAR FROM date)::integer
WHERE date IS NOT NULL
  AND (birth_month IS NULL OR birth_day IS NULL OR birth_year IS NULL);

CREATE TABLE IF NOT EXISTS email_verifications (
  id serial PRIMARY KEY,
  user_id integer NOT NULL REFERENCES users(id),
  token text NOT NULL,
  expires_at timestamp NOT NULL
);

CREATE TABLE IF NOT EXISTS login_tokens (
  id serial PRIMARY KEY,
  user_id integer NOT NULL REFERENCES users(id),
  token text NOT NULL,
  expires_at timestamp NOT NULL
);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id serial PRIMARY KEY,
  user_id integer NOT NULL REFERENCES users(id),
  token text NOT NULL,
  expires_at timestamp NOT NULL
);

CREATE TABLE IF NOT EXISTS shared_calendars (
  id serial PRIMARY KEY,
  owner_user_id integer REFERENCES users(id) ON DELETE SET NULL,
  slug text NOT NULL,
  name text NOT NULL,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS shared_calendars_slug_unique
ON shared_calendars(slug);

CREATE TABLE IF NOT EXISTS shared_calendar_members (
  id serial PRIMARY KEY,
  calendar_id integer NOT NULL REFERENCES shared_calendars(id) ON DELETE CASCADE,
  user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  timezone text NOT NULL DEFAULT 'Europe/Moscow',
  notifications_enabled boolean NOT NULL DEFAULT true,
  reminder_days text NOT NULL DEFAULT '0,1,7',
  reminder_hour integer NOT NULL DEFAULT 6,
  joined_at timestamp NOT NULL DEFAULT now()
);

ALTER TABLE shared_calendar_members ADD COLUMN IF NOT EXISTS timezone text DEFAULT 'Europe/Moscow';
ALTER TABLE shared_calendar_members ADD COLUMN IF NOT EXISTS notifications_enabled boolean DEFAULT true;
ALTER TABLE shared_calendar_members ADD COLUMN IF NOT EXISTS reminder_days text DEFAULT '0,1,7';
ALTER TABLE shared_calendar_members ADD COLUMN IF NOT EXISTS reminder_hour integer DEFAULT 6;
ALTER TABLE shared_calendar_members ADD COLUMN IF NOT EXISTS joined_at timestamp DEFAULT now();

UPDATE shared_calendar_members SET timezone = 'Europe/Moscow' WHERE timezone IS NULL;
UPDATE shared_calendar_members SET notifications_enabled = true WHERE notifications_enabled IS NULL;
UPDATE shared_calendar_members SET reminder_days = '0,1,7' WHERE reminder_days IS NULL;
UPDATE shared_calendar_members SET reminder_hour = 6 WHERE reminder_hour IS NULL;
UPDATE shared_calendar_members SET joined_at = now() WHERE joined_at IS NULL;

ALTER TABLE shared_calendar_members ALTER COLUMN timezone SET NOT NULL;
ALTER TABLE shared_calendar_members ALTER COLUMN notifications_enabled SET NOT NULL;
ALTER TABLE shared_calendar_members ALTER COLUMN reminder_days SET NOT NULL;
ALTER TABLE shared_calendar_members ALTER COLUMN reminder_hour SET NOT NULL;
ALTER TABLE shared_calendar_members ALTER COLUMN joined_at SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS shared_calendar_members_calendar_user_unique
ON shared_calendar_members(calendar_id, user_id);

CREATE TABLE IF NOT EXISTS shared_calendar_birthdays (
  id serial PRIMARY KEY,
  calendar_id integer NOT NULL REFERENCES shared_calendars(id) ON DELETE CASCADE,
  user_id integer REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL,
  date date,
  birth_month integer NOT NULL,
  birth_day integer NOT NULL,
  birth_year integer,
  note text,
  edited_by_user_id integer REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

ALTER TABLE shared_calendar_birthdays ADD COLUMN IF NOT EXISTS birth_month integer;
ALTER TABLE shared_calendar_birthdays ADD COLUMN IF NOT EXISTS birth_day integer;
ALTER TABLE shared_calendar_birthdays ADD COLUMN IF NOT EXISTS birth_year integer;
ALTER TABLE shared_calendar_birthdays ADD COLUMN IF NOT EXISTS note text;
ALTER TABLE shared_calendar_birthdays ADD COLUMN IF NOT EXISTS edited_by_user_id integer REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE shared_calendar_birthdays ADD COLUMN IF NOT EXISTS created_at timestamp DEFAULT now();
ALTER TABLE shared_calendar_birthdays ADD COLUMN IF NOT EXISTS updated_at timestamp DEFAULT now();

UPDATE shared_calendar_birthdays
SET
  birth_month = EXTRACT(MONTH FROM date)::integer,
  birth_day = EXTRACT(DAY FROM date)::integer,
  birth_year = EXTRACT(YEAR FROM date)::integer
WHERE date IS NOT NULL
  AND (birth_month IS NULL OR birth_day IS NULL OR birth_year IS NULL);

UPDATE shared_calendar_birthdays SET created_at = now() WHERE created_at IS NULL;
UPDATE shared_calendar_birthdays SET updated_at = now() WHERE updated_at IS NULL;

ALTER TABLE shared_calendar_birthdays ALTER COLUMN created_at SET NOT NULL;
ALTER TABLE shared_calendar_birthdays ALTER COLUMN updated_at SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS shared_calendar_birthdays_calendar_user_unique
ON shared_calendar_birthdays(calendar_id, user_id);

CREATE TABLE IF NOT EXISTS notification_logs (
  id serial PRIMARY KEY,
  user_id integer NOT NULL,
  person_id integer NOT NULL,
  kind text NOT NULL,
  run_date date NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS notif_uniq
ON notification_logs(user_id, person_id, kind, run_date);

CREATE TABLE IF NOT EXISTS shared_notification_logs (
  id serial PRIMARY KEY,
  calendar_id integer NOT NULL,
  user_id integer NOT NULL,
  birthday_id integer NOT NULL,
  kind text NOT NULL,
  run_date date NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS shared_notif_uniq
ON shared_notification_logs(calendar_id, user_id, birthday_id, kind, run_date);

COMMIT;
