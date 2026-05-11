CREATE TABLE "task_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" text NOT NULL,
	"project_id" uuid NOT NULL,
	"owner_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "task_runs" ADD CONSTRAINT "task_runs_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "task_runs_run_id_unique" ON "task_runs" USING btree ("run_id");--> statement-breakpoint
CREATE INDEX "task_runs_owner_id_project_id_idx" ON "task_runs" USING btree ("owner_id","project_id");