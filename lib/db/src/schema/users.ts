import { sql } from "drizzle-orm";
import { bigint, text, pgTable } from "drizzle-orm/pg-core";
import { z } from "zod";

const nowMs = sql`(floor(extract(epoch from now()) * 1000)::bigint)`;

export const usersTable = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email").unique().notNull(),
  passwordHash: text("password_hash").notNull(),
  nom: text("nom"),
  prenom: text("prenom"),
  pseudo: text("pseudo"),
  age: text("age"),
  aiStyle: text("ai_style"),
  workspaceBase: text("workspace_base"),
  workspaceAccent: text("workspace_accent"),
  workspaceGlow: text("workspace_glow"),
  workspaceMotion: text("workspace_motion"),
  createdAt: bigint("created_at", { mode: "number" }).default(nowMs).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).default(nowMs).notNull(),
});

export const insertUserSchema = z.object({
  email: z.string().email(),
  passwordHash: z.string().min(1),
  nom: z.string().optional().nullable(),
  prenom: z.string().optional().nullable(),
  pseudo: z.string().optional().nullable(),
  age: z.string().optional().nullable(),
  aiStyle: z.string().optional().nullable(),
  workspaceBase: z.string().optional().nullable(),
  workspaceAccent: z.string().optional().nullable(),
  workspaceGlow: z.string().optional().nullable(),
  workspaceMotion: z.string().optional().nullable(),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
