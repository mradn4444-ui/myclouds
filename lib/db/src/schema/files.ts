import { text, integer, sqliteTable } from "drizzle-orm/sqlite-core";
import { z } from "zod";
import { usersTable } from "./users";
import { itemsTable } from "./items";

export const filesTable = sqliteTable("files", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  itemId: text("item_id")
    .notNull()
    .references(() => itemsTable.id, { onDelete: "cascade" }),
  originalName: text("original_name").notNull(),
  storagePath: text("storage_path").notNull(), // local ou S3 path
  mimeType: text("mime_type").notNull(),
  fileSize: integer("file_size").notNull(),
  uploadedAt: integer("uploaded_at", { mode: "timestamp_ms" }).defaultNow().notNull(),
  fileHash: text("file_hash"), // pour dedup
});

export const insertFileSchema = z.object({
  userId: z.string().min(1),
  itemId: z.string().min(1),
  originalName: z.string().min(1),
  storagePath: z.string().min(1),
  mimeType: z.string().min(1),
  fileSize: z.number().positive(),
  fileHash: z.string().optional().nullable(),
});

export type InsertFile = z.infer<typeof insertFileSchema>;
export type File = typeof filesTable.$inferSelect;
