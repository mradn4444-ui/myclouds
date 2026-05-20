import { text, integer, sqliteTable } from "drizzle-orm/sqlite-core";
import { z } from "zod";
import { usersTable } from "./users";

export const categoriesTable = sqliteTable("categories", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  color: text("color"),
  icon: text("icon"),
  order: integer("order").default(0),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).defaultNow().notNull(),
});

export const insertCategorySchema = z.object({
  userId: z.string().min(1).optional(),
  name: z.string().min(1),
  color: z.string().optional().nullable(),
  icon: z.string().optional().nullable(),
  order: z.number().optional(),
});

export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Category = typeof categoriesTable.$inferSelect;
