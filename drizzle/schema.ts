import { relations } from "drizzle-orm"
import {
  index,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core"

export const projectStatusEnum = pgEnum("project_status", ["DRAFT", "ARCHIVED"])

export const projects = pgTable(
  "projects",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ownerId: text("owner_id").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    status: projectStatusEnum("status").notNull().default("DRAFT"),
    canvasJsonPath: text("canvas_json_path"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("projects_owner_id_idx").on(table.ownerId),
    index("projects_created_at_idx").on(table.createdAt),
  ],
)

export const projectCollaborators = pgTable(
  "project_collaborators",
  {
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    collaboratorEmail: text("collaborator_email").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.projectId, table.collaboratorEmail] }),
    index("project_collaborators_collaborator_email_idx").on(
      table.collaboratorEmail,
    ),
    index("project_collaborators_project_id_created_at_idx").on(
      table.projectId,
      table.createdAt,
    ),
  ],
)

export const projectsRelations = relations(projects, ({ many }) => ({
  collaborators: many(projectCollaborators),
  specs: many(projectSpecs),
}))

export const projectCollaboratorsRelations = relations(
  projectCollaborators,
  ({ one }) => ({
    project: one(projects, {
      fields: [projectCollaborators.projectId],
      references: [projects.id],
    }),
  }),
)

export const taskRuns = pgTable(
  "task_runs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    runId: text("run_id").notNull(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    ownerId: text("owner_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("task_runs_run_id_unique").on(table.runId),
    index("task_runs_owner_id_project_id_idx").on(
      table.ownerId,
      table.projectId,
    ),
  ],
)

export const taskRunsRelations = relations(taskRuns, ({ one }) => ({
  project: one(projects, {
    fields: [taskRuns.projectId],
    references: [projects.id],
  }),
}))

export const projectSpecs = pgTable(
  "project_specs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    filePath: text("file_path").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("project_specs_project_id_idx").on(table.projectId),
    index("project_specs_project_id_created_at_idx").on(
      table.projectId,
      table.createdAt,
    ),
  ],
)

export const projectSpecsRelations = relations(projectSpecs, ({ one }) => ({
  project: one(projects, {
    fields: [projectSpecs.projectId],
    references: [projects.id],
  }),
}))

export type Project = typeof projects.$inferSelect
export type NewProject = typeof projects.$inferInsert
export type ProjectCollaborator = typeof projectCollaborators.$inferSelect
export type NewProjectCollaborator = typeof projectCollaborators.$inferInsert
export type TaskRun = typeof taskRuns.$inferSelect
export type NewTaskRun = typeof taskRuns.$inferInsert
export type ProjectSpec = typeof projectSpecs.$inferSelect
export type NewProjectSpec = typeof projectSpecs.$inferInsert
