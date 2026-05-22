import { sql } from "drizzle-orm";
import { bigint, integer, text, pgTable } from "drizzle-orm/pg-core";
import { z } from "zod";
import { usersTable } from "./users";

const nowMs = sql`(floor(extract(epoch from now()) * 1000)::bigint)`;

export const categoriesTable = pgTable("categories", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  color: text("color"),
  icon: text("icon"),
  order: integer("order").default(0),
  createdAt: bigint("created_at", { mode: "number" }).default(nowMs).notNull(),
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
