CREATE TABLE "identity"."store_invitations" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"store_id" uuid NOT NULL,
	"email" text NOT NULL,
	"role" text NOT NULL,
	"token_hash" text,
	"expires_at" timestamp with time zone NOT NULL,
	"accepted_by" uuid,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "store_invitations_token_hash_unique" UNIQUE("token_hash"),
	CONSTRAINT "store_invitations_role_check" CHECK ("identity"."store_invitations"."role" in ('owner', 'manager')),
	CONSTRAINT "store_invitations_email_check" CHECK ("identity"."store_invitations"."email" = lower(btrim("identity"."store_invitations"."email")) and "identity"."store_invitations"."email" <> '')
);
--> statement-breakpoint
CREATE TABLE "identity"."stores" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"status" text DEFAULT 'invited' NOT NULL,
	"stripe_account_id" text,
	"stripe_charges_enabled" boolean DEFAULT false NOT NULL,
	"stripe_payouts_enabled" boolean DEFAULT false NOT NULL,
	"twint_capability" text,
	"default_language" text DEFAULT 'en' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "stores_slug_unique" UNIQUE("slug"),
	CONSTRAINT "stores_status_check" CHECK ("identity"."stores"."status" in ('invited', 'onboarding', 'live', 'suspended')),
	CONSTRAINT "stores_default_language_check" CHECK ("identity"."stores"."default_language" in ('en', 'de')),
	CONSTRAINT "stores_name_check" CHECK (btrim("identity"."stores"."name") <> ''),
	CONSTRAINT "stores_slug_check" CHECK ("identity"."stores"."slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);
--> statement-breakpoint
ALTER TABLE "identity"."store_invitations" ADD CONSTRAINT "store_invitations_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "identity"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "store_invitations_store_id_idx" ON "identity"."store_invitations" USING btree ("store_id");--> statement-breakpoint
CREATE UNIQUE INDEX "store_invitations_one_open_owner_idx" ON "identity"."store_invitations" USING btree ("store_id") WHERE "identity"."store_invitations"."role" = 'owner' and "identity"."store_invitations"."accepted_by" is null and "identity"."store_invitations"."revoked_at" is null;--> statement-breakpoint
ALTER TABLE "identity"."store_memberships" ADD CONSTRAINT "store_memberships_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "identity"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "store_memberships_store_id_idx" ON "identity"."store_memberships" USING btree ("store_id");