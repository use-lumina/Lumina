ALTER TABLE "replay_sets" ADD COLUMN "started_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "replay_sets" ADD COLUMN "completed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "replay_sets" ADD COLUMN "error_message" text;