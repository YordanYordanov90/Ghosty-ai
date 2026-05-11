CREATE TABLE "project_specs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"file_path" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "project_specs" ADD CONSTRAINT "project_specs_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "project_specs_project_id_idx" ON "project_specs" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "project_specs_project_id_created_at_idx" ON "project_specs" USING btree ("project_id","created_at");