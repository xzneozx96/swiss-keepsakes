CREATE SCHEMA "identity";
--> statement-breakpoint
CREATE TABLE "identity"."platform_admins" (
	"user_id" uuid PRIMARY KEY NOT NULL
);
--> statement-breakpoint
CREATE TABLE "identity"."store_memberships" (
	"user_id" uuid NOT NULL,
	"store_id" uuid NOT NULL,
	"role" text NOT NULL,
	"accepted_at" timestamp with time zone NOT NULL,
	CONSTRAINT "store_memberships_user_id_store_id_pk" PRIMARY KEY("user_id","store_id"),
	CONSTRAINT "store_memberships_role_check" CHECK ("identity"."store_memberships"."role" in ('owner', 'manager'))
);
