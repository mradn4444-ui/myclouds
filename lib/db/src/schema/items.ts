import { sql } from "drizzle-orm";
import { bigint, integer, real, text, pgTable } from "drizzle-orm/pg-core";
import { z } from "zod";
import { usersTable } from "./users";
import { categoriesTable } from "./categories";
import { foldersTable } from "./folders";

const nowMs = sql`(floor(extract(epoch from now()) * 1000)::bigint)`;

export const itemsTable = pgTable("items", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  categoryId: text("category_id").references(() => categoriesTable.id, {
    onDelete: "set null",
  }),
  folderId: text("folder_id").references(() => foldersTable.id, {
    onDelete: "set null",
  }),
  type: text("type").notNull(), // 'file' | 'note' | 'browser'
  title: text("title").notNull(),
  content: text("content"), // for notes
  fileUrl: text("file_url"), // for files
  mimeType: text("mime_type"),
  fileSize: integer("file_size"), // en bytes
  url: text("url"), // for browser items
  x: real("x").default(0),
  y: real("y").default(0),
  width: real("width").default(400),
  height: real("height").default(300),
  aiSummary: text("ai_summary"),
  tags: text("tags"), // JSON stringified array
  createdAt: bigint("created_at", { mode: "number" }).default(nowMs).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).default(nowMs).notNull(),
});

export const insertItemSchema = z.object({
  userId: z.string().min(1).optional(),
  categoryId: z.string().optional().nullable(),
  folderId: z.string().optional().nullable(),
  type: z.enum(["file", "note", "browser"]),
  title: z.string().min(1),
  content: z.string().optional().nullable(),
  fileUrl: z.string().optional().nullable(),
  mimeType: z.string().optional().nullable(),
  fileSize: z.number().optional().nullable(),
  url: z.string().optional().nullable(),
  x: z.number().optional(),
  y: z.number().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  aiSummary: z.string().optional().nullable(),
  tags: z.string().optional().nullable(),
});

export type InsertItem = z.infer<typeof insertItemSchema>;
export type Item = typeof itemsTable.$inferSelect;
