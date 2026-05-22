import { sql } from "drizzle-orm";
import { bigint, integer, pgTable, text } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

const nowMs = sql`(floor(extract(epoch from now()) * 1000)::bigint)`;

export const conversationsTable = pgTable("conversations", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  title: text("title").notNull().default("Nouvelle conversation"),
  summary: text("summary"),
  topic: text("topic"),
  messageCount: integer("message_count").default(0),
  createdAt: bigint("created_at", { mode: "number" }).default(nowMs).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).default(nowMs).notNull(),
  archivedAt: bigint("archived_at", { mode: "number" }),
});

export const conversationMessagesTable = pgTable("conversation_messages", {
  id: text("id").primaryKey(),
  conversationId: text("conversation_id")
    .notNull()
    .references(() => conversationsTable.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  role: text("role", { enum: ["user", "assistant"] }).notNull(),
  content: text("content").notNull(),
  tokens: integer("tokens").default(0),
  metadata: text("metadata"),
  createdAt: bigint("created_at", { mode: "number" }).default(nowMs).notNull(),
});

export type Conversation = typeof conversationsTable.$inferSelect;
export type InsertConversation = typeof conversationsTable.$inferInsert;
export type ConversationMessage = typeof conversationMessagesTable.$inferSelect;
export type InsertConversationMessage =
  typeof conversationMessagesTable.$inferInsert;
