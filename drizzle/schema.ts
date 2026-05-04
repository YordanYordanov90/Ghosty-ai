import { relations } from "drizzle-orm"
import {
  index,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
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

export type Project = typeof projects.$inferSelect
export type NewProject = typeof projects.$inferInsert
export type ProjectCollaborator = typeof projectCollaborators.$inferSelect
export type NewProjectCollaborator = typeof projectCollaborators.$inferInsert
