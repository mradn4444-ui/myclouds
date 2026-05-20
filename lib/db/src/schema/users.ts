import { integer, text, sqliteTable } from "drizzle-orm/sqlite-core";
import { z } from "zod";

export const usersTable = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").unique().notNull(),
  passwordHash: text("password_hash").notNull(),
  nom: text("nom"),
  prenom: text("prenom"),
  pseudo: text("pseudo"),
  age: text("age"),
  aiStyle: text("ai_style"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).defaultNow().notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).defaultNow().notNull(),
});

export const insertUserSchema = z.object({
  email: z.string().email(),
  passwordHash: z.string().min(1),
  nom: z.string().optional().nullable(),
  prenom: z.string().optional().nullable(),
  pseudo: z.string().optional().nullable(),
  age: z.string().optional().nullable(),
  aiStyle: z.string().optional().nullable(),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
