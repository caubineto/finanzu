ALTER TABLE "account" RENAME TO "accounts";--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "plaid_id" text;