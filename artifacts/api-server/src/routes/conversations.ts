import { Router } from "express";
import { nanoid } from "nanoid";
import { and, db, desc, eq, isNull, conversationsTable, conversationMessagesTable } from "@workspace/db";
import { authMiddleware } from "../middlewares/auth.js";

const router = Router();

// Middleware to ensure user is authenticated
router.use(authMiddleware);

// Create new conversation
router.post("/", async (req, res) => {
  try {
    const userId = req.userId as string;
    const { title = "Nouvelle conversation", topic } = req.body;

    const conversation = {
      id: nanoid(),
      userId,
      title,
      topic: topic || null,
      summary: null,
      messageCount: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await db.insert(conversationsTable).values(conversation);

    res.json(conversation);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create conversation" });
  }
});

// Get all conversations for user
router.get("/", async (req, res) => {
  try {
    const userId = req.userId as string;

    const conversations = await db
      .select()
      .from(conversationsTable)
      .where(and(eq(conversationsTable.userId, userId), isNull(conversationsTable.archivedAt)))
      .orderBy(desc(conversationsTable.updatedAt));

    res.json(conversations);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch conversations" });
  }
});

// Get conversation by ID
router.get("/:id", async (req, res) => {
  try {
    const userId = req.userId as string;
    const id = String(req.params.id);

    const conversation = await db
      .select()
      .from(conversationsTable)
      .where(and(eq(conversationsTable.id, id), eq(conversationsTable.userId, userId)))
      .limit(1);

    if (!conversation.length) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    res.json(conversation[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch conversation" });
  }
});

// Get messages from conversation
router.get("/:id/messages", async (req, res) => {
  try {
    const userId = req.userId as string;
    const id = String(req.params.id);

    // Verify user owns this conversation
    const conversation = await db
      .select()
      .from(conversationsTable)
      .where(and(eq(conversationsTable.id, id), eq(conversationsTable.userId, userId)))
      .limit(1);

    if (!conversation.length) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    const messages = await db
      .select()
      .from(conversationMessagesTable)
      .where(and(eq(conversationMessagesTable.conversationId, id), eq(conversationMessagesTable.userId, userId)))
      .orderBy(conversationMessagesTable.createdAt);

    res.json(messages);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

// Add message to conversation
router.post("/:id/messages", async (req, res) => {
  try {
    const userId = req.userId as string;
    const id = String(req.params.id);
    const { role, content, tokens = 0, metadata } = req.body;

    // Verify user owns this conversation
    const conversation = await db
      .select()
      .from(conversationsTable)
      .where(and(eq(conversationsTable.id, id), eq(conversationsTable.userId, userId)))
      .limit(1);

    if (!conversation.length) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    const message = {
      id: nanoid(),
      conversationId: id,
      userId,
      role,
      content,
      tokens,
      metadata: metadata ? JSON.stringify(metadata) : null,
      createdAt: Date.now(),
    };

    await db.insert(conversationMessagesTable).values(message);

    // Update conversation: increment message count, update timestamp
    await db
      .update(conversationsTable)
      .set({
        messageCount: (conversation[0].messageCount || 0) + 1,
        updatedAt: Date.now(),
      })
      .where(and(eq(conversationsTable.id, id), eq(conversationsTable.userId, userId)));

    res.json(message);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to add message" });
  }
});

// Update conversation (title, topic, summary)
router.patch("/:id", async (req, res) => {
  try {
    const userId = req.userId as string;
    const id = String(req.params.id);
    const { title, topic, summary } = req.body;

    // Verify user owns this conversation
    const conversation = await db
      .select()
      .from(conversationsTable)
      .where(and(eq(conversationsTable.id, id), eq(conversationsTable.userId, userId)))
      .limit(1);

    if (!conversation.length) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    const updates: Record<string, any> = { updatedAt: Date.now() };
    if (title !== undefined) updates.title = title;
    if (topic !== undefined) updates.topic = topic;
    if (summary !== undefined) updates.summary = summary;

    await db.update(conversationsTable).set(updates).where(and(eq(conversationsTable.id, id), eq(conversationsTable.userId, userId)));

    const updated = await db
      .select()
      .from(conversationsTable)
      .where(and(eq(conversationsTable.id, id), eq(conversationsTable.userId, userId)))
      .limit(1);

    res.json(updated[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update conversation" });
  }
});

// Archive conversation
router.post("/:id/archive", async (req, res) => {
  try {
    const userId = req.userId as string;
    const id = String(req.params.id);

    const conversation = await db
      .select()
      .from(conversationsTable)
      .where(and(eq(conversationsTable.id, id), eq(conversationsTable.userId, userId)))
      .limit(1);

    if (!conversation.length) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    await db
      .update(conversationsTable)
      .set({ archivedAt: Date.now() })
      .where(and(eq(conversationsTable.id, id), eq(conversationsTable.userId, userId)));

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to archive conversation" });
  }
});

// Delete conversation permanently
router.delete("/:id", async (req, res) => {
  try {
    const userId = req.userId as string;
    const id = String(req.params.id);

    const conversation = await db
      .select()
      .from(conversationsTable)
      .where(and(eq(conversationsTable.id, id), eq(conversationsTable.userId, userId)))
      .limit(1);

    if (!conversation.length) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    // Delete all messages first (cascade will handle it, but explicit for clarity)
    await db
      .delete(conversationMessagesTable)
      .where(and(eq(conversationMessagesTable.conversationId, id), eq(conversationMessagesTable.userId, userId)));

    // Delete conversation
    await db.delete(conversationsTable).where(and(eq(conversationsTable.id, id), eq(conversationsTable.userId, userId)));

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete conversation" });
  }
});

export default router;
