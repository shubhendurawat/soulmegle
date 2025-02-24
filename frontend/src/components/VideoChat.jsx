import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import io from "socket.io-client";
import Chat from "./Chat"; // Ensure Chat.jsx exists in the same folder

const VideoChat = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);
  const roomId = params.get("roomId");
  const userId = params.get("userId");
  const matchedUserId = params.get("matchedUserId");

  const [socket, setSocket] = useState(null);
  const [peerConnection, setPeerConnection] = useState(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  // Initialize the Socket.IO connection
  useEffect(() => {
    const newSocket = io("ws://localhost:8082", {
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });
    setSocket(newSocket);
    return () => {
      newSocket.disconnect();
    };
  }, []);

  // Set up WebRTC peer connection and signaling
  useEffect(() => {
    if (!socket || !roomId || !userId) return;

    console.log("Joining room:", roomId, "as user:", userId);

    const peer = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });
    setPeerConnection(peer);

    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then((stream) => {
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        stream.getTracks().forEach((track) => peer.addTrack(track, stream));
      })
      .catch((error) => console.error("Error accessing media devices:", error));

    peer.ontrack = (event) => {
      if (remoteVideoRef.current) {
        console.log("Remote track received", event.streams[0]);
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    peer.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("ice-candidate", { roomId, userId, candidate: event.candidate });
      }
    };

    socket.emit("join-room", { roomId, userId });

    socket.on("offer", async ({ offer, userId: fromUserId }) => {
      console.log("Received offer from:", fromUserId);
      await peer.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);
      socket.emit("answer", { roomId, userId, answer });
    });

    socket.on("answer", async ({ answer, userId: fromUserId }) => {
      console.log("Received answer from:", fromUserId);
      await peer.setRemoteDescription(new RTCSessionDescription(answer));
    });

    socket.on("ice-candidate", ({ candidate, userId: fromUserId }) => {
      console.log("Received ICE candidate from:", fromUserId);
      peer.addIceCandidate(new RTCIceCandidate(candidate));
    });

    socket.on("user-connected", async (newUserId) => {
      console.log("User connected:", newUserId);
      if (newUserId !== userId) {
        try {
          const offer = await peer.createOffer();
          await peer.setLocalDescription(offer);
          console.log("Sending offer to new user");
          socket.emit("offer", { roomId, userId, offer });
        } catch (error) {
          console.error("Error creating offer:", error);
        }
      }
    });

    return () => {
      peer.close();
    };
  }, [socket, roomId, userId]);

  // Handler to end the call, close connections and navigate away
  const endCall = () => {
    if (peerConnection) peerConnection.close();
    if (socket) socket.disconnect();
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen bg-[#212121] p-4 text-white">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-3xl font-bold">Video Chat Room</h1>
        <button 
          onClick={endCall}
          className="px-4 py-2 bg-amber-500 text-[#212121] rounded hover:bg-amber-600 transition"
        >
          End Call
        </button>
      </div>

      {/* Main Content */}
      <div className="flex flex-col md:flex-row gap-4">
        {/* Video Section */}
        <div className="flex-1 space-y-4">
          <div className="relative">
            <video 
              ref={localVideoRef} 
              autoPlay 
              playsInline 
              className="w-full md:w-11/12 border rounded shadow-lg" 
              style={{ maxHeight: "300px", objectFit: "cover" }}
            />
            <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 px-2 py-1 text-xs">
              You
            </div>
          </div>
          <div className="relative">
            <video 
              ref={remoteVideoRef} 
              autoPlay 
              playsInline 
              className="w-full md:w-11/12 border rounded shadow-lg" 
              style={{ maxHeight: "300px", objectFit: "cover" }}
            />
            <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 px-2 py-1 text-xs">
              Remote
            </div>
          </div>
        </div>

        {/* Chat Section */}
        <div className="w-full md:w-1/3">
          <Chat socket={socket} roomId={roomId} userId={userId} />
        </div>
      </div>
    </div>
  );
};

export default VideoChat;
