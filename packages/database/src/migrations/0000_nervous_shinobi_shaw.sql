CREATE TABLE IF NOT EXISTS "alerts" (
	"alert_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trace_id" varchar(255) NOT NULL,
	"span_id" varchar(255) NOT NULL,
	"customer_id" varchar(255) NOT NULL,
	"alert_type" varchar(50) NOT NULL,
	"severity" varchar(10) NOT NULL,
	"current_cost" double precision,
	"baseline_cost" double precision,
	"cost_increase_percent" double precision,
	"hash_similarity" double precision,
	"semantic_score" double precision,
	"scoring_method" varchar(20),
	"semantic_cached" boolean DEFAULT false,
	"service_name" varchar(255) NOT NULL,
	"endpoint" varchar(500) NOT NULL,
	"model" varchar(255),
	"reasoning" text,
	"timestamp" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"status" varchar(20) DEFAULT 'pending',
	"acknowledged_at" timestamp with time zone,
	"resolved_at" timestamp with time zone,
	CONSTRAINT "alerts_alert_type_check" CHECK ("alerts"."alert_type" IN ('cost_spike', 'quality_drop', 'latency_spike', 'cost_and_quality')),
	CONSTRAINT "alerts_severity_check" CHECK ("alerts"."severity" IN ('LOW', 'MEDIUM', 'HIGH')),
	CONSTRAINT "alerts_scoring_method_check" CHECK ("alerts"."scoring_method" IN ('hash_only', 'semantic', 'both')),
	CONSTRAINT "alerts_status_check" CHECK ("alerts"."status" IN ('pending', 'sent', 'acknowledged', 'resolved'))
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "api_keys" (
	"api_key" varchar(255) PRIMARY KEY NOT NULL,
	"customer_id" varchar(255) NOT NULL,
	"customer_name" varchar(255),
	"environment" varchar(10) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"last_used_at" timestamp with time zone,
	"is_active" boolean DEFAULT true,
	CONSTRAINT "api_keys_environment_check" CHECK ("api_keys"."environment" IN ('live', 'test'))
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cost_baselines" (
	"id" serial PRIMARY KEY NOT NULL,
	"service_name" varchar(255) NOT NULL,
	"endpoint" varchar(500) NOT NULL,
	"window_size" varchar(10) NOT NULL,
	"p50_cost" double precision NOT NULL,
	"p95_cost" double precision NOT NULL,
	"p99_cost" double precision NOT NULL,
	"sample_count" integer NOT NULL,
	"last_updated" timestamp with time zone DEFAULT now(),
	CONSTRAINT "cost_baselines_service_endpoint_window_unique" UNIQUE("service_name","endpoint","window_size"),
	CONSTRAINT "cost_baselines_window_size_check" CHECK ("cost_baselines"."window_size" IN ('1h', '24h', '7d'))
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "replay_results" (
	"result_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"replay_id" uuid NOT NULL,
	"trace_id" varchar(255) NOT NULL,
	"span_id" varchar(255) NOT NULL,
	"original_response" text NOT NULL,
	"replay_response" text NOT NULL,
	"original_cost" numeric(10, 6) NOT NULL,
	"replay_cost" numeric(10, 6) NOT NULL,
	"original_latency" integer NOT NULL,
	"replay_latency" integer NOT NULL,
	"hash_similarity" numeric(5, 4),
	"semantic_score" numeric(5, 4),
	"diff_summary" jsonb,
	"replay_prompt" text,
	"replay_model" text,
	"replay_system_prompt" text,
	"executed_at" timestamp with time zone DEFAULT now(),
	"status" text DEFAULT 'completed' NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "replay_sets" (
	"replay_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"trace_ids" text[] NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"created_by" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"total_traces" integer NOT NULL,
	"completed_traces" integer DEFAULT 0,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "traces" (
	"trace_id" varchar(255) NOT NULL,
	"span_id" varchar(255) NOT NULL,
	"parent_span_id" varchar(255),
	"customer_id" varchar(255) NOT NULL,
	"timestamp" timestamp with time zone NOT NULL,
	"service_name" varchar(255) NOT NULL,
	"endpoint" varchar(500) NOT NULL,
	"environment" varchar(10) DEFAULT 'live' NOT NULL,
	"model" varchar(255) NOT NULL,
	"provider" varchar(50),
	"prompt" text,
	"response" text,
	"tokens" integer NOT NULL,
	"prompt_tokens" integer,
	"completion_tokens" integer,
	"latency_ms" double precision NOT NULL,
	"cost_usd" double precision DEFAULT 0,
	"metadata" jsonb,
	"tags" text[],
	"status" varchar(20) NOT NULL,
	"error_message" text,
	"semantic_score" double precision,
	"hash_similarity" double precision,
	"semantic_scored_at" timestamp with time zone,
	"semantic_cached" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "traces_trace_id_span_id_pk" PRIMARY KEY("trace_id","span_id"),
	CONSTRAINT "traces_environment_check" CHECK ("traces"."environment" IN ('live', 'test')),
	CONSTRAINT "traces_provider_check" CHECK ("traces"."provider" IN ('openai', 'anthropic', 'cohere', 'other')),
	CONSTRAINT "traces_status_check" CHECK ("traces"."status" IN ('success', 'error'))
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"user_id" varchar(255) PRIMARY KEY NOT NULL,
	"customer_id" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"name" varchar(255),
	"is_temporary_password" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "alerts" ADD CONSTRAINT "alerts_trace_fk" FOREIGN KEY ("trace_id","span_id") REFERENCES "public"."traces"("trace_id","span_id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "replay_results" ADD CONSTRAINT "replay_results_replay_set_fk" FOREIGN KEY ("replay_id") REFERENCES "public"."replay_sets"("replay_id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "replay_results" ADD CONSTRAINT "replay_results_trace_fk" FOREIGN KEY ("trace_id","span_id") REFERENCES "public"."traces"("trace_id","span_id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_alerts_customer_timestamp" ON "alerts" USING btree ("customer_id","timestamp" DESC);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_alerts_customer_status" ON "alerts" USING btree ("customer_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_alerts_customer_type" ON "alerts" USING btree ("customer_id","alert_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_alerts_severity" ON "alerts" USING btree ("severity") WHERE "alerts"."status" = 'pending';--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_alerts_trace" ON "alerts" USING btree ("trace_id","span_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_alerts_service" ON "alerts" USING btree ("service_name","endpoint");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_api_keys_customer_id" ON "api_keys" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_api_keys_active" ON "api_keys" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_baseline_service_endpoint" ON "cost_baselines" USING btree ("service_name","endpoint");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_replay_results_replay_id" ON "replay_results" USING btree ("replay_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_replay_results_trace_id" ON "replay_results" USING btree ("trace_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_replay_sets_status" ON "replay_sets" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_customer_timestamp" ON "traces" USING btree ("customer_id","timestamp" DESC);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_customer_environment" ON "traces" USING btree ("customer_id","environment");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_customer_status" ON "traces" USING btree ("customer_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_customer_service" ON "traces" USING btree ("customer_id","service_name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_model" ON "traces" USING btree ("model");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_provider" ON "traces" USING btree ("provider");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_traces_semantic_score" ON "traces" USING btree ("semantic_score") WHERE "traces"."semantic_score" IS NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_users_customer_id" ON "users" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_users_email" ON "users" USING btree ("email");