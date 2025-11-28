import express, { type Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertMessageSchema, insertConversationSchema } from "@shared/schema";
import multer from "multer";
import path from "path";
import fs from "fs";

// File upload configuration
const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({
  storage: multer.diskStorage({
    destination: uploadDir,
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      cb(null, uniqueSuffix + path.extname(file.originalname));
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

// WebSocket clients map
const clients = new Map<string, WebSocket>();

// Broadcast to specific users
function broadcastToUsers(userIds: string[], type: string, payload: any) {
  userIds.forEach((userId) => {
    const client = clients.get(userId);
    if (client && client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ type, payload }));
    }
  });
}

// Broadcast to conversation participants
async function broadcastToConversation(conversationId: string, type: string, payload: any, excludeUserId?: string) {
  const participants = await storage.getParticipants(conversationId);
  const userIds = participants
    .map((p) => p.userId)
    .filter((id) => id !== excludeUserId);
  broadcastToUsers(userIds, type, payload);
}

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  // Setup authentication
  await setupAuth(app);

  // Serve uploaded files
  app.use("/uploads", (req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    next();
  }, express.static(uploadDir));

  // Auth routes
  app.get("/api/auth/user", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.patch("/api/auth/user", isAuthenticated, upload.single("avatar"), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const updates: any = {};

      if (req.body.firstName !== undefined) updates.firstName = req.body.firstName;
      if (req.body.lastName !== undefined) updates.lastName = req.body.lastName;
      if (req.body.username !== undefined) updates.username = req.body.username;
      if (req.body.bio !== undefined) updates.bio = req.body.bio;
      if (req.body.statusMessage !== undefined) updates.statusMessage = req.body.statusMessage;
      if (req.body.status !== undefined) updates.status = req.body.status;
      if (req.body.notificationsEnabled !== undefined) updates.notificationsEnabled = req.body.notificationsEnabled === "true";
      if (req.body.soundEnabled !== undefined) updates.soundEnabled = req.body.soundEnabled === "true";

      if (req.file) {
        updates.profileImageUrl = `/uploads/${req.file.filename}`;
      }

      const user = await storage.updateUser(userId, updates);
      res.json(user);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  // User search
  app.get("/api/users", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const query = req.query.query as string || req.query["0"] as string || "";
      
      let users;
      if (query && query.length > 0) {
        users = await storage.searchUsers(query, userId);
      } else {
        users = await storage.getAllUsers(userId);
      }
      res.json(users);
    } catch (error) {
      console.error("Error searching users:", error);
      res.status(500).json({ message: "Failed to search users" });
    }
  });

  // Conversation routes
  app.get("/api/conversations", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const conversations = await storage.getUserConversations(userId);
      res.json(conversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ message: "Failed to fetch conversations" });
    }
  });

  app.get("/api/conversations/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const conversation = await storage.getConversationWithDetails(req.params.id, userId);
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      res.json(conversation);
    } catch (error) {
      console.error("Error fetching conversation:", error);
      res.status(500).json({ message: "Failed to fetch conversation" });
    }
  });

  app.post("/api/conversations", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { type, name, description, participantIds } = req.body;

      // For direct conversations, check if one already exists
      if (type === "direct" && participantIds.length === 1) {
        const existingConv = await storage.findDirectConversation(userId, participantIds[0]);
        if (existingConv) {
          const details = await storage.getConversationWithDetails(existingConv.id, userId);
          return res.json(details);
        }
      }

      const conversation = await storage.createConversation(
        { type, name, description },
        participantIds,
        userId
      );

      const details = await storage.getConversationWithDetails(conversation.id, userId);

      // Notify participants
      broadcastToUsers(participantIds, "new-conversation", { conversation: details });

      res.status(201).json(details);
    } catch (error) {
      console.error("Error creating conversation:", error);
      res.status(500).json({ message: "Failed to create conversation" });
    }
  });

  app.patch("/api/conversations/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { name, description, iconImageUrl } = req.body;
      const conversation = await storage.updateConversation(req.params.id, {
        name,
        description,
        iconImageUrl,
      });
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }

      // Notify participants
      await broadcastToConversation(req.params.id, "conversation-updated", { conversation });

      res.json(conversation);
    } catch (error) {
      console.error("Error updating conversation:", error);
      res.status(500).json({ message: "Failed to update conversation" });
    }
  });

  // Participant routes
  app.delete("/api/conversations/:conversationId/participants/:userId", isAuthenticated, async (req: any, res) => {
    try {
      await storage.removeParticipant(req.params.conversationId, req.params.userId);

      // Notify participants
      await broadcastToConversation(req.params.conversationId, "participant-left", {
        conversationId: req.params.conversationId,
        userId: req.params.userId,
      });

      res.status(204).send();
    } catch (error) {
      console.error("Error removing participant:", error);
      res.status(500).json({ message: "Failed to remove participant" });
    }
  });

  app.patch("/api/conversations/:conversationId/participants/:userId", isAuthenticated, async (req: any, res) => {
    try {
      await storage.updateParticipant(req.params.conversationId, req.params.userId, req.body);
      res.status(204).send();
    } catch (error) {
      console.error("Error updating participant:", error);
      res.status(500).json({ message: "Failed to update participant" });
    }
  });

  // Message routes
  app.get("/api/conversations/:id/messages", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      const messages = await storage.getConversationMessages(req.params.id, limit, offset);

      // Mark messages as read async (don't await - send response first)
      storage.markMessagesAsRead(req.params.id, userId).catch((err) => console.error("Mark read error:", err));

      res.json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  app.post("/api/conversations/:id/messages", isAuthenticated, upload.array("attachments", 5), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const conversationId = req.params.id;
      const { content, replyToId } = req.body;

      const attachments = (req.files as Express.Multer.File[])?.map((file) => ({
        url: `/uploads/${file.filename}`,
        type: file.mimetype,
        name: file.originalname,
        size: file.size,
      }));

      const message = await storage.createMessage({
        conversationId,
        senderId: userId,
        content,
        replyToId,
        attachments: attachments?.length ? attachments : undefined,
        messageType: attachments?.length ? "image" : "text",
      });

      const messageWithSender = await storage.getMessageWithSender(message.id);

      // Send response immediately
      res.status(201).json(messageWithSender);

      // Broadcast to conversation participants async (don't wait)
      broadcastToConversation(conversationId, "new-message", {
        conversationId,
        message: messageWithSender,
      }).catch((err) => console.error("Broadcast error:", err));
    } catch (error) {
      console.error("Error creating message:", error);
      res.status(500).json({ message: "Failed to send message" });
    }
  });

  app.patch("/api/messages/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const message = await storage.getMessage(req.params.id);

      if (!message) {
        return res.status(404).json({ message: "Message not found" });
      }

      if (message.senderId !== userId) {
        return res.status(403).json({ message: "Not authorized to edit this message" });
      }

      const updated = await storage.updateMessage(req.params.id, { content: req.body.content });

      // Broadcast update
      await broadcastToConversation(message.conversationId, "message-updated", {
        conversationId: message.conversationId,
        message: updated,
      });

      res.json(updated);
    } catch (error) {
      console.error("Error updating message:", error);
      res.status(500).json({ message: "Failed to update message" });
    }
  });

  app.delete("/api/messages/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const message = await storage.getMessage(req.params.id);

      if (!message) {
        return res.status(404).json({ message: "Message not found" });
      }

      if (message.senderId !== userId) {
        return res.status(403).json({ message: "Not authorized to delete this message" });
      }

      await storage.deleteMessage(req.params.id);

      // Broadcast deletion
      await broadcastToConversation(message.conversationId, "message-deleted", {
        conversationId: message.conversationId,
        messageId: req.params.id,
      });

      res.status(204).send();
    } catch (error) {
      console.error("Error deleting message:", error);
      res.status(500).json({ message: "Failed to delete message" });
    }
  });

  // Call routes
  app.post("/api/calls", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { conversationId, type } = req.body;

      const call = await storage.createCall({
        conversationId,
        initiatorId: userId,
        type,
        status: "initiated",
      });

      // Add initiator as participant
      await storage.addCallParticipant(call.id, userId);

      // Notify conversation participants
      await broadcastToConversation(conversationId, "incoming-call", {
        call,
        initiator: await storage.getUser(userId),
      }, userId);

      res.status(201).json(call);
    } catch (error) {
      console.error("Error creating call:", error);
      res.status(500).json({ message: "Failed to create call" });
    }
  });

  app.patch("/api/calls/:id", isAuthenticated, async (req: any, res) => {
    try {
      const call = await storage.updateCall(req.params.id, req.body);
      res.json(call);
    } catch (error) {
      console.error("Error updating call:", error);
      res.status(500).json({ message: "Failed to update call" });
    }
  });

  // WebSocket server for real-time communication
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

  wss.on("connection", (ws, req) => {
    let userId: string | null = null;

    ws.on("message", async (data) => {
      try {
        const message = JSON.parse(data.toString());
        const { type, payload } = message;

        switch (type) {
          case "user-online":
            userId = payload.userId;
            if (userId) {
              clients.set(userId, ws);
              await storage.updateUserStatus(userId, "online");
              
              // Notify contacts about online status
              const conversations = await storage.getUserConversations(userId);
              const contactIds = new Set<string>();
              conversations.forEach((conv) => {
                conv.participants.forEach((p) => {
                  if (p.userId !== userId) contactIds.add(p.userId);
                });
              });
              broadcastToUsers(Array.from(contactIds), "user-status-changed", {
                userId,
                status: "online",
              });
            }
            break;

          case "typing":
            if (userId && payload.conversationId) {
              await storage.updateTypingStatus(payload.conversationId, userId, payload.isTyping);
              await broadcastToConversation(payload.conversationId, "typing-status", {
                conversationId: payload.conversationId,
                userId,
                isTyping: payload.isTyping,
              }, userId);
            }
            break;

          case "start-call":
            if (userId && payload.conversationId) {
              const call = await storage.createCall({
                conversationId: payload.conversationId,
                initiatorId: userId,
                type: payload.type,
                status: "initiated",
              });
              
              await storage.addCallParticipant(call.id, userId);
              
              const initiator = await storage.getUser(userId);
              await broadcastToConversation(payload.conversationId, "incoming-call", {
                call,
                initiator,
              }, userId);
            }
            break;

          case "accept-call":
            if (userId && payload.callId) {
              const call = await storage.getCall(payload.callId);
              if (call) {
                await storage.addCallParticipant(call.id, userId);
                await storage.updateCall(call.id, { status: "active", startedAt: new Date() });
                
                // Notify call participants
                if (call.conversationId) {
                  await broadcastToConversation(call.conversationId, "call-accepted", {
                    callId: call.id,
                    userId,
                  });
                }
              }
            }
            break;

          case "decline-call":
            if (userId && payload.callId) {
              const call = await storage.getCall(payload.callId);
              if (call) {
                await storage.updateCall(call.id, { status: "declined" });
                
                if (call.conversationId) {
                  await broadcastToConversation(call.conversationId, "call-declined", {
                    callId: call.id,
                    userId,
                  });
                }
              }
            }
            break;

          case "end-call":
            if (userId && payload.callId) {
              const call = await storage.getCall(payload.callId);
              if (call) {
                const endedAt = new Date();
                const duration = call.startedAt 
                  ? Math.floor((endedAt.getTime() - new Date(call.startedAt).getTime()) / 1000)
                  : 0;
                
                await storage.updateCall(call.id, { 
                  status: "ended", 
                  endedAt,
                  duration,
                });
                
                if (call.conversationId) {
                  await broadcastToConversation(call.conversationId, "call-ended", {
                    callId: call.id,
                    endedBy: userId,
                    duration,
                  });
                }
              }
            }
            break;

          case "toggle-mute":
          case "toggle-video":
          case "toggle-screen-share":
            if (userId && payload.callId) {
              await storage.updateCallParticipant(payload.callId, userId, {
                isMuted: type === "toggle-mute" ? payload.isMuted : undefined,
                isVideoOff: type === "toggle-video" ? payload.isVideoOff : undefined,
                isScreenSharing: type === "toggle-screen-share" ? payload.isScreenSharing : undefined,
              });
              
              const call = await storage.getCall(payload.callId);
              if (call?.conversationId) {
                await broadcastToConversation(call.conversationId, "participant-media-changed", {
                  callId: payload.callId,
                  userId,
                  ...payload,
                }, userId);
              }
            }
            break;

          case "ice-candidate":
            if (userId && payload.targetUserId && payload.candidate) {
              broadcastToUsers([payload.targetUserId], "ice-candidate", {
                fromUserId: userId,
                candidate: payload.candidate,
              });
            }
            break;

          case "webrtc-offer":
            if (userId && payload.targetUserId && payload.offer) {
              broadcastToUsers([payload.targetUserId], "webrtc-offer", {
                fromUserId: userId,
                offer: payload.offer,
              });
            }
            break;

          case "webrtc-answer":
            if (userId && payload.targetUserId && payload.answer) {
              broadcastToUsers([payload.targetUserId], "webrtc-answer", {
                fromUserId: userId,
                answer: payload.answer,
              });
            }
            break;
        }
      } catch (error) {
        console.error("WebSocket message error:", error);
      }
    });

    ws.on("close", async () => {
      if (userId) {
        clients.delete(userId);
        await storage.updateUserStatus(userId, "offline");
        
        // Notify contacts about offline status
        const conversations = await storage.getUserConversations(userId);
        const contactIds = new Set<string>();
        conversations.forEach((conv) => {
          conv.participants.forEach((p) => {
            if (p.userId !== userId) contactIds.add(p.userId);
          });
        });
        broadcastToUsers(Array.from(contactIds), "user-status-changed", {
          userId,
          status: "offline",
        });
      }
    });

    ws.on("error", (error) => {
      console.error("WebSocket error:", error);
    });
  });

  return httpServer;
}
