import {
  users,
  conversations,
  conversationParticipants,
  messages,
  messageReceipts,
  messageReactions,
  calls,
  callParticipants,
  type User,
  type UpsertUser,
  type Conversation,
  type InsertConversation,
  type ConversationParticipant,
  type InsertConversationParticipant,
  type Message,
  type InsertMessage,
  type MessageReaction,
  type Call,
  type InsertCall,
  type CallParticipant,
  type ConversationWithDetails,
  type MessageWithSender,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, sql, inArray, or, ne } from "drizzle-orm";
import bcryptjs from "bcryptjs";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(username: string, password: string): Promise<User>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUser(id: string, data: Partial<User>): Promise<User | undefined>;
  searchUsers(query: string, currentUserId: string): Promise<User[]>;
  getAllUsers(currentUserId: string): Promise<User[]>;
  updateUserStatus(id: string, status: string): Promise<void>;

  // Conversation operations
  getConversation(id: string): Promise<Conversation | undefined>;
  getConversationWithDetails(id: string, userId: string): Promise<ConversationWithDetails | undefined>;
  getUserConversations(userId: string): Promise<ConversationWithDetails[]>;
  createConversation(data: InsertConversation, participantIds: string[], creatorId: string): Promise<Conversation>;
  updateConversation(id: string, data: Partial<Conversation>): Promise<Conversation | undefined>;
  findDirectConversation(userId1: string, userId2: string): Promise<Conversation | undefined>;

  // Participant operations
  addParticipant(data: InsertConversationParticipant): Promise<ConversationParticipant>;
  removeParticipant(conversationId: string, userId: string): Promise<void>;
  updateParticipant(conversationId: string, userId: string, data: Partial<ConversationParticipant>): Promise<void>;
  getParticipants(conversationId: string): Promise<(ConversationParticipant & { user: User })[]>;
  updateTypingStatus(conversationId: string, userId: string, isTyping: boolean): Promise<void>;

  // Message operations
  getMessage(id: string): Promise<Message | undefined>;
  getConversationMessages(conversationId: string, limit?: number, offset?: number): Promise<MessageWithSender[]>;
  createMessage(data: InsertMessage): Promise<Message>;
  updateMessage(id: string, data: Partial<Message>): Promise<Message | undefined>;
  deleteMessage(id: string): Promise<void>;
  markMessagesAsRead(conversationId: string, userId: string): Promise<void>;
  getUnreadCount(conversationId: string, userId: string): Promise<number>;

  // Call operations
  getCall(id: string): Promise<Call | undefined>;
  createCall(data: InsertCall): Promise<Call>;
  updateCall(id: string, data: Partial<Call>): Promise<Call | undefined>;
  addCallParticipant(callId: string, userId: string): Promise<CallParticipant>;
  updateCallParticipant(callId: string, userId: string, data: Partial<CallParticipant>): Promise<void>;
  removeCallParticipant(callId: string, userId: string): Promise<void>;

  // Message reactions
  addReaction(messageId: string, userId: string, emoji: string): Promise<MessageReaction>;
  removeReaction(messageId: string, userId: string, emoji: string): Promise<void>;
  getMessageReactions(messageId: string): Promise<{ emoji: string; count: number; userReacted: boolean }[]>;

  // Admin / maintenance
  deleteUser(id: string): Promise<void>;
  getAllUsersAdmin(): Promise<User[]>;
  getAllConversations(): Promise<ConversationWithDetails[]>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(username: string, password: string): Promise<User> {
    const hashedPassword = await bcryptjs.hash(password, 10);
    const [user] = await db
      .insert(users)
      .values({
        username,
        password: hashedPassword,
      })
      .returning();
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          profileImageUrl: userData.profileImageUrl,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async updateUser(id: string, data: Partial<User>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async searchUsers(query: string, currentUserId: string): Promise<User[]> {
    const searchPattern = `%${query.toLowerCase()}%`;
    return db
      .select()
      .from(users)
      .where(
        and(
          ne(users.id, currentUserId),
          or(
            sql`LOWER(${users.firstName}) LIKE ${searchPattern}`,
            sql`LOWER(${users.lastName}) LIKE ${searchPattern}`,
            sql`LOWER(${users.email}) LIKE ${searchPattern}`,
            sql`LOWER(${users.username}) LIKE ${searchPattern}`
          )
        )
      )
      .limit(20);
  }

  async getAllUsers(currentUserId: string): Promise<User[]> {
    return db
      .select()
      .from(users)
      .where(ne(users.id, currentUserId))
      .limit(50);
  }

  async updateUserStatus(id: string, status: string): Promise<void> {
    await db
      .update(users)
      .set({ 
        status: status as any, 
        lastSeenAt: new Date(),
        updatedAt: new Date() 
      })
      .where(eq(users.id, id));
  }

  // Conversation operations
  async getConversation(id: string): Promise<Conversation | undefined> {
    const [conversation] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, id));
    return conversation;
  }

  async getConversationWithDetails(id: string, userId: string): Promise<ConversationWithDetails | undefined> {
    const conversation = await this.getConversation(id);
    if (!conversation) return undefined;

    const participants = await this.getParticipants(id);
    const lastMessage = conversation.lastMessageId 
      ? await this.getMessageWithSender(conversation.lastMessageId)
      : undefined;
    const unreadCount = await this.getUnreadCount(id, userId);

    return {
      ...conversation,
      participants,
      lastMessage,
      unreadCount,
    };
  }

  async getUserConversations(userId: string): Promise<ConversationWithDetails[]> {
    const userParticipations = await db
      .select({ conversationId: conversationParticipants.conversationId })
      .from(conversationParticipants)
      .where(eq(conversationParticipants.userId, userId));

    const conversationIds = userParticipations.map((p) => p.conversationId);
    if (conversationIds.length === 0) return [];

    const conversationList = await db
      .select()
      .from(conversations)
      .where(inArray(conversations.id, conversationIds))
      .orderBy(desc(conversations.lastActivityAt));

    const result: ConversationWithDetails[] = [];
    for (const conv of conversationList) {
      const details = await this.getConversationWithDetails(conv.id, userId);
      if (details) result.push(details);
    }

    return result;
  }

  async createConversation(
    data: InsertConversation,
    participantIds: string[],
    creatorId: string
  ): Promise<Conversation> {
    const [conversation] = await db
      .insert(conversations)
      .values({
        ...data,
        createdById: creatorId,
        lastActivityAt: new Date(),
      })
      .returning();

    // Add creator as owner
    await this.addParticipant({
      conversationId: conversation.id,
      userId: creatorId,
      role: data.type === "group" ? "owner" : "member",
    });

    // Add other participants
    for (const participantId of participantIds) {
      if (participantId !== creatorId) {
        await this.addParticipant({
          conversationId: conversation.id,
          userId: participantId,
          role: "member",
        });
      }
    }

    return conversation;
  }

  async updateConversation(id: string, data: Partial<Conversation>): Promise<Conversation | undefined> {
    const [conversation] = await db
      .update(conversations)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(conversations.id, id))
      .returning();
    return conversation;
  }

  async findDirectConversation(userId1: string, userId2: string): Promise<Conversation | undefined> {
    // Find a direct conversation between two users
    const user1Convs = await db
      .select({ conversationId: conversationParticipants.conversationId })
      .from(conversationParticipants)
      .where(eq(conversationParticipants.userId, userId1));

    const user2Convs = await db
      .select({ conversationId: conversationParticipants.conversationId })
      .from(conversationParticipants)
      .where(eq(conversationParticipants.userId, userId2));

    const commonIds = user1Convs
      .map((c) => c.conversationId)
      .filter((id) => user2Convs.some((c) => c.conversationId === id));

    for (const convId of commonIds) {
      const [conv] = await db
        .select()
        .from(conversations)
        .where(and(eq(conversations.id, convId), eq(conversations.type, "direct")));
      
      if (conv) {
        // Verify it only has these 2 participants
        const participants = await db
          .select()
          .from(conversationParticipants)
          .where(eq(conversationParticipants.conversationId, convId));
        
        if (participants.length === 2) {
          return conv;
        }
      }
    }

    return undefined;
  }

  // Participant operations
  async addParticipant(data: InsertConversationParticipant): Promise<ConversationParticipant> {
    const [participant] = await db
      .insert(conversationParticipants)
      .values(data)
      .returning();
    return participant;
  }

  async removeParticipant(conversationId: string, oderId: string): Promise<void> {
    await db
      .delete(conversationParticipants)
      .where(
        and(
          eq(conversationParticipants.conversationId, conversationId),
          eq(conversationParticipants.userId, oderId)
        )
      );
  }

  async updateParticipant(
    conversationId: string,
    userId: string,
    data: Partial<ConversationParticipant>
  ): Promise<void> {
    await db
      .update(conversationParticipants)
      .set(data)
      .where(
        and(
          eq(conversationParticipants.conversationId, conversationId),
          eq(conversationParticipants.userId, userId)
        )
      );
  }

  async getParticipants(conversationId: string): Promise<(ConversationParticipant & { user: User })[]> {
    const participants = await db
      .select()
      .from(conversationParticipants)
      .where(eq(conversationParticipants.conversationId, conversationId));

    const result: (ConversationParticipant & { user: User })[] = [];
    for (const p of participants) {
      const user = await this.getUser(p.userId);
      if (user) {
        result.push({ ...p, user });
      }
    }

    return result;
  }

  async updateTypingStatus(conversationId: string, userId: string, isTyping: boolean): Promise<void> {
    await db
      .update(conversationParticipants)
      .set({ 
        isTyping, 
        typingUpdatedAt: new Date() 
      })
      .where(
        and(
          eq(conversationParticipants.conversationId, conversationId),
          eq(conversationParticipants.userId, userId)
        )
      );
  }

  // Message operations
  async getMessage(id: string): Promise<Message | undefined> {
    const [message] = await db.select().from(messages).where(eq(messages.id, id));
    return message;
  }

  async getMessageWithSender(id: string): Promise<MessageWithSender | undefined> {
    const message = await this.getMessage(id);
    if (!message) return undefined;

    const sender = await this.getUser(message.senderId);
    if (!sender) return undefined;

    let replyTo: (Message & { sender: User }) | undefined;
    if (message.replyToId) {
      const replyMessage = await this.getMessage(message.replyToId);
      if (replyMessage) {
        const replySender = await this.getUser(replyMessage.senderId);
        if (replySender) {
          replyTo = { ...replyMessage, sender: replySender };
        }
      }
    }

    // Get reactions for this message
    const reactions = await this.getMessageReactions(id);

    return { ...message, sender, replyTo, reactions };
  }

  async getConversationMessages(
    conversationId: string,
    limit = 50,
    offset = 0
  ): Promise<MessageWithSender[]> {
    const messageList = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(desc(messages.createdAt))
      .limit(limit)
      .offset(offset);

    const result: MessageWithSender[] = [];
    for (const msg of messageList.reverse()) {
      const withSender = await this.getMessageWithSender(msg.id);
      if (withSender) result.push(withSender);
    }

    return result;
  }

  async createMessage(data: InsertMessage): Promise<Message> {
    const [message] = await db
      .insert(messages)
      .values(data)
      .returning();

    // Update conversation last activity
    await db
      .update(conversations)
      .set({
        lastMessageId: message.id,
        lastActivityAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(conversations.id, data.conversationId));

    return message;
  }

  async updateMessage(id: string, data: Partial<Message>): Promise<Message | undefined> {
    const [message] = await db
      .update(messages)
      .set({ ...data, editedAt: new Date() })
      .where(eq(messages.id, id))
      .returning();
    return message;
  }

  async deleteMessage(id: string): Promise<void> {
    await db
      .update(messages)
      .set({ deletedAt: new Date(), content: null })
      .where(eq(messages.id, id));
  }

  async markMessagesAsRead(conversationId: string, userId: string): Promise<void> {
    // Get latest message
    const [latestMessage] = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(desc(messages.createdAt))
      .limit(1);

    if (latestMessage) {
      await db
        .update(conversationParticipants)
        .set({
          lastReadMessageId: latestMessage.id,
          lastReadAt: new Date(),
        })
        .where(
          and(
            eq(conversationParticipants.conversationId, conversationId),
            eq(conversationParticipants.userId, userId)
          )
        );
    }
  }

  async getUnreadCount(conversationId: string, userId: string): Promise<number> {
    const [participant] = await db
      .select()
      .from(conversationParticipants)
      .where(
        and(
          eq(conversationParticipants.conversationId, conversationId),
          eq(conversationParticipants.userId, userId)
        )
      );

    if (!participant?.lastReadAt) {
      const result = await db
        .select({ count: sql<number>`count(*)` })
        .from(messages)
        .where(
          and(
            eq(messages.conversationId, conversationId),
            ne(messages.senderId, userId)
          )
        );
      return result[0]?.count || 0;
    }

    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(messages)
      .where(
        and(
          eq(messages.conversationId, conversationId),
          ne(messages.senderId, userId),
          sql`${messages.createdAt} > ${participant.lastReadAt}`
        )
      );

    return result[0]?.count || 0;
  }

  // Call operations
  async getCall(id: string): Promise<Call | undefined> {
    const [call] = await db.select().from(calls).where(eq(calls.id, id));
    return call;
  }

  async createCall(data: InsertCall): Promise<Call> {
    const [call] = await db.insert(calls).values(data).returning();
    return call;
  }

  async updateCall(id: string, data: Partial<Call>): Promise<Call | undefined> {
    const [call] = await db
      .update(calls)
      .set(data)
      .where(eq(calls.id, id))
      .returning();
    return call;
  }

  async addCallParticipant(callId: string, userId: string): Promise<CallParticipant> {
    const [participant] = await db
      .insert(callParticipants)
      .values({ callId, userId })
      .returning();
    return participant;
  }

  async updateCallParticipant(
    callId: string,
    userId: string,
    data: Partial<CallParticipant>
  ): Promise<void> {
    await db
      .update(callParticipants)
      .set(data)
      .where(
        and(
          eq(callParticipants.callId, callId),
          eq(callParticipants.userId, userId)
        )
      );
  }

  async removeCallParticipant(callId: string, userId: string): Promise<void> {
    await db
      .update(callParticipants)
      .set({ leftAt: new Date() })
      .where(
        and(
          eq(callParticipants.callId, callId),
          eq(callParticipants.userId, userId)
        )
      );
  }

  // Admin / maintenance methods
  async deleteUser(id: string): Promise<void> {
    // Hard-delete user and dependent rows where necessary. This handles
    // foreign-key constraints by updating dependent columns first, then
    // removing rows that reference the user, and finally deleting the user.
    await db.transaction(async (tx) => {
      // 1) Clear references from conversations where this user is the creator
      await tx.execute(sql`UPDATE conversations SET created_by_id = NULL WHERE created_by_id = ${id}`);

      // 2) Clear conversation.last_message_id if it points to messages that will be deleted
      await tx.execute(sql`UPDATE conversations SET last_message_id = NULL WHERE last_message_id IN (SELECT id FROM messages WHERE sender_id = ${id})`);

      // 3) Delete receipts associated with messages that will be removed OR receipts owned by the user
      await tx.execute(sql`DELETE FROM message_receipts WHERE message_id IN (SELECT id FROM messages WHERE sender_id = ${id}) OR user_id = ${id}`);

      // 4) Delete messages sent by the user
      await tx.delete(messages).where(eq(messages.senderId, id));

      // 5) Remove call participants and calls initiated by the user
      await tx.delete(callParticipants).where(eq(callParticipants.userId, id));
      await tx.delete(calls).where(eq(calls.initiatorId, id));

      // 6) Remove conversation participants entries for the user
      await tx.delete(conversationParticipants).where(eq(conversationParticipants.userId, id));

      // 7) Remove any conversations that now have no participants
      // Also remove direct conversations that ended up with fewer than 2 participants
      await tx.execute(sql`
        DELETE FROM conversations
        WHERE id NOT IN (SELECT conversation_id FROM conversation_participants)
        OR (
          type = 'direct' AND id IN (
            SELECT conversation_id FROM conversation_participants GROUP BY conversation_id HAVING COUNT(*) < 2
          )
        )
      `);

      // 8) Remove sessions referencing this user (passport session structure)
      // Attempt to delete sessions where the serialized session contains passport.user === id
      try {
        await tx.execute(sql`DELETE FROM sessions WHERE (sess -> 'passport' ->> 'user') = ${id}`);
      } catch (e) {
        // Fallback: best-effort delete by text match (less safe but avoids orphan sessions)
        await tx.execute(sql`DELETE FROM sessions WHERE sess::text LIKE ${sql.raw("'" + ('%"' + id + '"%') + "'")}`);
      }

      // 9) Finally remove the user record
      await tx.delete(users).where(eq(users.id, id));
    });
  }

  async getAllUsersAdmin(): Promise<User[]> {
    return db.select().from(users).limit(200);
  }

  async getAllConversations(): Promise<ConversationWithDetails[]> {
    const convs = await db.select().from(conversations).orderBy(desc(conversations.lastActivityAt)).limit(200);
    const result: ConversationWithDetails[] = [];
    for (const conv of convs) {
      const details = await this.getConversationWithDetails(conv.id, "");
      if (details) result.push(details);
    }
    return result;
  }

  // Message reactions
  async addReaction(messageId: string, userId: string, emoji: string): Promise<MessageReaction> {
    // Check if user already reacted with this emoji
    const existing = await db
      .select()
      .from(messageReactions)
      .where(
        and(
          eq(messageReactions.messageId, messageId),
          eq(messageReactions.userId, userId),
          eq(messageReactions.emoji, emoji)
        )
      );

    if (existing.length > 0) {
      return existing[0];
    }

    const [reaction] = await db
      .insert(messageReactions)
      .values({ messageId, userId, emoji })
      .returning();
    return reaction;
  }

  async removeReaction(messageId: string, userId: string, emoji: string): Promise<void> {
    await db
      .delete(messageReactions)
      .where(
        and(
          eq(messageReactions.messageId, messageId),
          eq(messageReactions.userId, userId),
          eq(messageReactions.emoji, emoji)
        )
      );
  }

  async getMessageReactions(messageId: string): Promise<{ emoji: string; count: number; userReacted: boolean }[]> {
    const reactions = await db
      .select({
        emoji: messageReactions.emoji,
        count: sql<number>`count(*)`.as("count"),
      })
      .from(messageReactions)
      .where(eq(messageReactions.messageId, messageId))
      .groupBy(messageReactions.emoji);

    return reactions.map((r) => ({
      emoji: r.emoji,
      count: Number(r.count) || 0,
      userReacted: false, // Will be set by caller if needed
    }));
  }
}

export const storage = new DatabaseStorage();
