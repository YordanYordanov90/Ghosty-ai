CREATE TYPE "public"."project_status" AS ENUM('DRAFT', 'ARCHIVED');--> statement-breakpoint
CREATE TABLE "project_collaborators" (
	"project_id" uuid NOT NULL,
	"collaborator_email" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "project_collaborators_project_id_collaborator_email_pk" PRIMARY KEY("project_id","collaborator_email")
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"status" "project_status" DEFAULT 'DRAFT' NOT NULL,
	"canvas_json_path" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "project_collaborators" ADD CONSTRAINT "project_collaborators_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "project_collaborators_collaborator_email_idx" ON "project_collaborators" USING btree ("collaborator_email");--> statement-breakpoint
CREATE INDEX "project_collaborators_project_id_created_at_idx" ON "project_collaborators" USING btree ("project_id","created_at");--> statement-breakpoint
CREATE INDEX "projects_owner_id_idx" ON "projects" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "projects_created_at_idx" ON "projects" USING btree ("created_at");