CREATE SCHEMA "notifications";
--> statement-breakpoint
CREATE TABLE "notifications"."sent_mail" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"store_id" uuid,
	"template" text NOT NULL,
	"language" text NOT NULL,
	"recipient" text NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"smtp_response" text,
	"queued_at" timestamp with time zone NOT NULL,
	"sent_at" timestamp with time zone,
	"failed_at" timestamp with time zone,
	CONSTRAINT "sent_mail_status_check" CHECK ("notifications"."sent_mail"."status" in ('queued', 'sent', 'failed')),
	CONSTRAINT "sent_mail_language_check" CHECK ("notifications"."sent_mail"."language" in ('en', 'de'))
);
