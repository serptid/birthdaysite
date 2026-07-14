ALTER TABLE "users" ADD COLUMN "notifications_enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "reminder_days" text DEFAULT '0,1,7' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "reminder_hour" integer DEFAULT 6 NOT NULL;--> statement-breakpoint
ALTER TABLE "people" ADD COLUMN "birth_month" integer;--> statement-breakpoint
ALTER TABLE "people" ADD COLUMN "birth_day" integer;--> statement-breakpoint
ALTER TABLE "people" ADD COLUMN "birth_year" integer;--> statement-breakpoint
UPDATE "people"
SET
  "birth_month" = EXTRACT(MONTH FROM "date")::integer,
  "birth_day" = EXTRACT(DAY FROM "date")::integer
WHERE "date" IS NOT NULL;
