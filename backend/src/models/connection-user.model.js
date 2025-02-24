import mongoose, { Schema } from "mongoose";

const connectionSchema = new Schema(
  {
    user1: { type: Schema.Types.ObjectId, ref: "User", required: true },
    user2: { type: Schema.Types.ObjectId, ref: "User", required: true },
    roomId: { type: String, required: true },
    expiresAt: { type: Date, default: () => Date.now() + 3600 * 1000 }, // 1-hr expiration
  },
  { timestamps: true }
);

const Connection = mongoose.model("Connection", connectionSchema);

// Store a new connection between two users with the same roomId
const storeConnection = async (userId1, userId2, roomId) => {
  try {
    const connection = new Connection({ user1: userId1, user2: userId2, roomId });
    await connection.save();
    console.log(`✅ Stored connection for Room ID: ${roomId} between ${userId1} and ${userId2}`);
    return { roomId };
  } catch (error) {
    console.error("❌ Error storing connection:", error);
    throw error;
  }
};

// Get an existing connection for a given user
const getExistingConnection = async (userId) => {
  try {
    const connection = await Connection.findOne({
      $or: [{ user1: userId }, { user2: userId }],
    });
    if (connection) {
      const matchedUserId =
        connection.user1.toString() === userId
          ? connection.user2.toString()
          : connection.user1.toString();
      return { roomId: connection.roomId, matchedUserId };
    }
    return null;
  } catch (error) {
    console.error("❌ Error checking for existing connection:", error);
    throw error;
  }
};

export { Connection, storeConnection, getExistingConnection };
