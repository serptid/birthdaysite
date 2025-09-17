CREATE TABLE "notification_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"person_id" integer NOT NULL,
	"kind" text NOT NULL,
	"run_date" date NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "notif_uniq" ON "notification_logs" USING btree ("user_id","person_id","kind","run_date");