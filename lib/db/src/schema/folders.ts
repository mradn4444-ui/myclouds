import { text, integer, sqliteTable } from "drizzle-orm/sqlite-core";
import { z } from "zod";
import { usersTable } from "./users";
import { categoriesTable } from "./categories";

export const foldersTable = sqliteTable("folders", {
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
  createdAt: integer("created_at", { mode: "timestamp_ms" }).defaultNow().notNull(),
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
