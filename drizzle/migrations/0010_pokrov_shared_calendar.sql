CREATE TABLE "shared_calendars" (
	"id" serial PRIMARY KEY NOT NULL,
	"owner_user_id" integer,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shared_calendar_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"calendar_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"timezone" text DEFAULT 'Europe/Moscow' NOT NULL,
	"notifications_enabled" boolean DEFAULT true NOT NULL,
	"reminder_hour" integer DEFAULT 6 NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shared_calendar_birthdays" (
	"id" serial PRIMARY KEY NOT NULL,
	"calendar_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"name" text NOT NULL,
	"date" date,
	"birth_month" integer NOT NULL,
	"birth_day" integer NOT NULL,
	"birth_year" integer,
	"note" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shared_notification_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"calendar_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"birthday_id" integer NOT NULL,
	"kind" text NOT NULL,
	"run_date" date NOT NULL
);
--> statement-breakpoint
ALTER TABLE "shared_calendars" ADD CONSTRAINT "shared_calendars_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "shared_calendar_members" ADD CONSTRAINT "shared_calendar_members_calendar_id_shared_calendars_id_fk" FOREIGN KEY ("calendar_id") REFERENCES "public"."shared_calendars"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "shared_calendar_members" ADD CONSTRAINT "shared_calendar_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "shared_calendar_birthdays" ADD CONSTRAINT "shared_calendar_birthdays_calendar_id_shared_calendars_id_fk" FOREIGN KEY ("calendar_id") REFERENCES "public"."shared_calendars"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "shared_calendar_birthdays" ADD CONSTRAINT "shared_calendar_birthdays_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "shared_calendars_slug_unique" ON "shared_calendars" USING btree ("slug");
--> statement-breakpoint
CREATE UNIQUE INDEX "shared_calendar_members_calendar_user_unique" ON "shared_calendar_members" USING btree ("calendar_id","user_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "shared_calendar_birthdays_calendar_user_unique" ON "shared_calendar_birthdays" USING btree ("calendar_id","user_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "shared_notif_uniq" ON "shared_notification_logs" USING btree ("calendar_id","user_id","birthday_id","kind","run_date");
