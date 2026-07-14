ALTER TABLE "users" ALTER COLUMN "calendar_theme" SET DEFAULT '{"dayText":"#a3a3a3","todayBorder":"#f5f5f5","birthdayBackground":"#00c950","birthdayText":"#0a0a0a"}';--> statement-breakpoint
UPDATE "users"
SET "calendar_theme" = (("calendar_theme"::jsonb - 'dayBorder' - 'birthdayBorder')::text)
WHERE "calendar_theme" LIKE '%dayBorder%' OR "calendar_theme" LIKE '%birthdayBorder%';
