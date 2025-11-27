import { createContext, useContext, useEffect, useState, useRef, type ReactNode } from "react";
import type { User, Message, ConversationWithDetails, CallWithDetails } from "@shared/schema";

interface SocketContextType {
  socket: WebSocket | null;
  isConnected: boolean;
  sendMessage: (type: string, payload: any) => void;
  onMessage: (handler: (type: string, payload: any) => void) => () => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export function SocketProvider({ children }: { children: ReactNode }) {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const messageHandlers = useRef<Set<(type: string, payload: any) => void>>(new Set());
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const connect = () => {
      try {
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const wsUrl = `${protocol}//${window.location.host}/ws`;
        const ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          setIsConnected(true);
          setSocket(ws);
          socketRef.current = ws;
        };

        ws.onclose = () => {
          setIsConnected(false);
          setSocket(null);
          socketRef.current = null;
          reconnectTimeoutRef.current = setTimeout(connect, 3000);
        };

        ws.onerror = (error) => {
          console.error("WebSocket error:", error);
        };

        ws.onmessage = (event) => {
          try {
            const { type, payload } = JSON.parse(event.data);
            messageHandlers.current.forEach((handler) => handler(type, payload));
          } catch (e) {
            console.error("Failed to parse WebSocket message:", e);
          }
        };

        socketRef.current = ws;
      } catch (err) {
        console.error("Failed to create WebSocket:", err);
        reconnectTimeoutRef.current = setTimeout(connect, 3000);
      }
    };

    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, []);

  const sendMessage = (type: string, payload: any) => {
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type, payload }));
    }
  };

  const onMessage = (handler: (type: string, payload: any) => void) => {
    messageHandlers.current.add(handler);
    return () => {
      messageHandlers.current.delete(handler);
    };
  };

  return (
    <SocketContext.Provider value={{ socket, isConnected, sendMessage, onMessage }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error("useSocket must be used within a SocketProvider");
  }
  return context;
}
