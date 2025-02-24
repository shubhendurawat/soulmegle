import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

// Create an Express app and HTTP server
const app = express();
const server = createServer(app);

// Initialize Socket.IO server with CORS settings
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || "http://localhost:5173",
    credentials: true,
  },
  pingTimeout: 60000, // How long to wait before considering the connection timed out
  pingInterval: 25000, // How often to send a ping packet to keep the connection alive
});

app.use(cors());
app.use(express.json());

// Object to keep track of connected users (for room management)
const connectedUsers = {};

// Listen for new socket connections
io.on("connection", (socket) => {
  console.log("🔗 New WebRTC connection:", socket.id);

  // Handle when a user joins a room
  socket.on("join-room", ({ userId, roomId }) => {
    if (!userId || !roomId) {
      console.error("Missing userId or roomId", { userId, roomId });
      return;
    }
    console.log(`User ${userId} joining room ${roomId}`);
    socket.join(roomId); // Put this socket in the specified room
    connectedUsers[userId] = { socketId: socket.id, roomId };

    // Notify all other users in the room that a new user has connected
    socket.to(roomId).emit("user-connected", userId);
    console.log(
      `User ${userId} added to connectedUsers. Current users in room ${roomId}:`,
      Object.keys(connectedUsers).filter((key) => connectedUsers[key].roomId === roomId)
    );
  });

  // Handle offer event for WebRTC connection
  socket.on("offer", (data) => {
    console.log(`Received offer for room ${data.roomId} from user ${data.userId}`);
    socket.to(data.roomId).emit("offer", data);
  });

  // Handle answer event for WebRTC connection
  socket.on("answer", (data) => {
    console.log(`Received answer for room ${data.roomId} from user ${data.userId}`);
    socket.to(data.roomId).emit("answer", data);
  });

  // Handle ICE candidate event for WebRTC connection
  socket.on("ice-candidate", (data) => {
    console.log(`Received ICE candidate for room ${data.roomId} from user ${data.userId}`);
    socket.to(data.roomId).emit("ice-candidate", data);
  });

  // NEW: Handle chat-message event for real-time chat functionality
  socket.on("chat-message", (data) => {
    console.log(`Received chat message in room ${data.roomId} from user ${data.userId}: ${data.message}`);
    // Broadcast the chat message to all other clients in the same room
    socket.to(data.roomId).emit("chat-message", data);
  });

  // Handle socket disconnects
  socket.on("disconnect", () => {
    console.log(`❌ Socket disconnected: ${socket.id}`);
    // Remove the disconnected user from connectedUsers
    Object.keys(connectedUsers).forEach((userId) => {
      if (connectedUsers[userId].socketId === socket.id) {
        console.log(`User ${userId} disconnected, removing from connectedUsers.`);
        const roomId = connectedUsers[userId]?.roomId;
        delete connectedUsers[userId];
        // Optionally log if the room is now empty
        if (roomId) {
          const usersInRoom = Object.values(connectedUsers).filter(user => user.roomId === roomId);
          if (usersInRoom.length === 0) {
            console.log(`Room ${roomId} is now empty.`);
          }
        }
      }
    });
  });
});

// A simple endpoint to verify the server is running
app.get("/", (req, res) => res.send("WebRTC Signaling Server is running"));

// Start the HTTP server on the specified port
const PORT = process.env.WS_PORT || 8082;
server.listen(PORT, () => console.log(`🚀 WebRTC Signaling Server running on http://localhost:${PORT}`));
