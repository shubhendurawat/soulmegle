import { pineCone } from "../pinecone/index.js";
import { getExistingConnection, storeConnection } from "../models/connection-user.model.js";
import { v4 as uuidv4 } from "uuid";

const indexName = "user-interests-soulmegle";
const pineconeIndex = pineCone.Index(indexName);

const waitingUsers = {};

const findMatch = async (req, res) => {
  const { userId } = req.body;

  try {
    // Step 1: Check if this user is already in a room
    const existingConnection = await getExistingConnection(userId);
    if (existingConnection) {
      console.log(`✅ User ${userId} is already in Room ID: ${existingConnection.roomId}`);
      return res.json({
        success: true,
        roomId: existingConnection.roomId,
        matchedUserId: existingConnection.matchedUserId,
      });
    }

    // Step 2: Check if another user is waiting in our in‑memory waiting list
    const waitingUserId = Object.keys(waitingUsers).find((id) => id !== userId);
    if (waitingUserId) {
      const roomId = waitingUsers[waitingUserId]; // use the waiting user's room
      // Save connections for both users
      await storeConnection(userId, waitingUserId, roomId);
      await storeConnection(waitingUserId, userId, roomId);
      // Remove the waiting user from the waiting list
      delete waitingUsers[waitingUserId];
      console.log(`🔗 Paired user ${userId} with waiting user ${waitingUserId} in Room ID: ${roomId}`);
      return res.json({ success: true, roomId, matchedUserId: waitingUserId });
    }

    // Step 3: Use Pinecone matching if no waiting user exists
    const userData = await pineconeIndex.fetch([userId]);
    if (!userData.records[userId] || !userData.records[userId].metadata) {
      return res.status(404).json({ error: "User data not found" });
    }
    const userLat = parseFloat(userData.records[userId].metadata.latitude);
    const userLon = parseFloat(userData.records[userId].metadata.longitude);
    if (!userLat || !userLon) {
      return res.status(400).json({ error: "User location not available" });
    }

    const allUsers = await fetchAllUsersFromPinecone(userId);
    let nearestUsers = [];
    for (const user of allUsers) {
      if (!user.metadata || !user.metadata.latitude || !user.metadata.longitude) continue;
      if (user.id === userId) continue;
      const distance = haversineDistance(
        userLat,
        userLon,
        parseFloat(user.metadata.latitude),
        parseFloat(user.metadata.longitude)
      );
      nearestUsers.push({ ...user, distance });
    }
    if (nearestUsers.length > 0) {
      nearestUsers.sort((a, b) => a.distance - b.distance);
      const closestMatch = nearestUsers[0];
      if (!closestMatch || !closestMatch.id) {
        return res.status(500).json({ error: "Invalid match data received." });
      }
      // Check if the closest match is already in a room
      const matchedUserExistingConnection = await getExistingConnection(closestMatch.id);
      if (matchedUserExistingConnection) {
        console.log(`✅ Matched user ${closestMatch.id} already in Room ID: ${matchedUserExistingConnection.roomId}`);
        await storeConnection(userId, closestMatch.id, matchedUserExistingConnection.roomId);
        return res.json({
          success: true,
          roomId: matchedUserExistingConnection.roomId,
          matchedUserId: closestMatch.id,
        });
      }
      // Otherwise, create a new room for these two users
      const roomId = uuidv4();
      await storeConnection(userId, closestMatch.id, roomId);
      await storeConnection(closestMatch.id, userId, roomId);
      console.log(`🔗 Created new room: ${roomId} for users ${userId} and ${closestMatch.id}`);
      return res.json({
        success: true,
        roomId,
        matchedUserId: closestMatch.id,
      });
    }

    // If no match is found via Pinecone, mark this user as waiting
    const roomId = uuidv4();
    waitingUsers[userId] = roomId;
    console.log(`⏳ No match found via Pinecone; user ${userId} is waiting in Room ID: ${roomId}`);
    return res.json({ success: true, roomId, matchedUserId: null });
  } catch (error) {
    console.error("❌ Error in findMatch:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

const fetchAllUsersFromPinecone = async (userId) => {
  try {
    const userData = await pineconeIndex.fetch([userId]);

    if (!userData.records[userId] || !userData.records[userId].values) {
      console.error("User vector not found in Pinecone.");
      return [];
    }

    const userVector = userData.records[userId].values;
    const queryResult = await pineconeIndex.query({
      vector: userVector,
      topK: 100,
      includeMetadata: true,
    });

    return queryResult.matches
      .filter((user) => user.id !== userId)
      .map((user) => ({
        id: user.id,
        metadata: user.metadata,
      }));
  } catch (error) {
    console.error("Error fetching users from Pinecone:", error);
    return [];
  }
};

const haversineDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const toRad = (angle) => (angle * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export { findMatch };
