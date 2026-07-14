ALTER TABLE "shared_calendar_birthdays" ADD COLUMN "edited_by_user_id" integer;
--> statement-breakpoint
ALTER TABLE "shared_calendar_birthdays" ADD CONSTRAINT "shared_calendar_birthdays_edited_by_user_id_users_id_fk" FOREIGN KEY ("edited_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
UPDATE "shared_calendar_birthdays"
SET "edited_by_user_id" = "user_id"
WHERE "edited_by_user_id" IS NULL;
