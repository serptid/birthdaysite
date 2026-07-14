ALTER TABLE "shared_calendar_members"
ADD COLUMN IF NOT EXISTS "reminder_days" text DEFAULT '0,1,7' NOT NULL;
