import { sql } from "drizzle-orm";
import { bigint, integer, text, pgTable } from "drizzle-orm/pg-core";
import { z } from "zod";
import { usersTable } from "./users";
import { categoriesTable } from "./categories";

const nowMs = sql`(floor(extract(epoch from now()) * 1000)::bigint)`;

export const foldersTable = pgTable("folders", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  categoryId: text("category_id")
    .notNull()
    .references(() => categoriesTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  parentFolderId: text("parent_folder_id"),
  order: integer("order").default(0),
  createdAt: bigint("created_at", { mode: "number" }).default(nowMs).notNull(),
});

export const insertFolderSchema = z.object({
  userId: z.string().min(1).optional(),
  categoryId: z.string().min(1),
  name: z.string().min(1),
  parentFolderId: z.string().optional().nullable(),
  order: z.number().optional(),
});

export type InsertFolder = z.infer<typeof insertFolderSchema>;
export type Folder = typeof foldersTable.$inferSelect;
