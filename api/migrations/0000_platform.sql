CREATE SCHEMA "platform";
--> statement-breakpoint
CREATE TABLE "platform"."audit_log" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"store_id" uuid,
	"actor" text NOT NULL,
	"entity" text NOT NULL,
	"entity_id" uuid NOT NULL,
	"action" text NOT NULL,
	"before" jsonb,
	"after" jsonb,
	"reason" text,
	"at" timestamp with time zone NOT NULL,
	"request_id" uuid
);
--> statement-breakpoint
CREATE TABLE "platform"."idempotency_keys" (
	"actor_id" text NOT NULL,
	"key" text NOT NULL,
	"request_hash" text NOT NULL,
	"response" jsonb,
	"expires_at" timestamp with time zone NOT NULL,
	CONSTRAINT "idempotency_keys_actor_id_key_pk" PRIMARY KEY("actor_id","key")
);
--> statement-breakpoint
CREATE TABLE "platform"."webhook_events" (
	"provider" text NOT NULL,
	"event_id" text NOT NULL,
	"received_at" timestamp with time zone NOT NULL,
	"processed_at" timestamp with time zone,
	"payload" jsonb NOT NULL,
	CONSTRAINT "webhook_events_provider_event_id_pk" PRIMARY KEY("provider","event_id")
);
