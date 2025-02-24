import React, { useContext, useState, useEffect } from "react";
import { ChatContext } from "../context/ChatContext.jsx";

const Chat = ({ socket, roomId, userId }) => {
  const { messages, addMessage } = useContext(ChatContext);
  const [input, setInput] = useState("");

  // Create an Audio instance for the notification sound.
  const notificationAudio = new Audio("/assets/notification.mp3");

  useEffect(() => {
    if (socket) {
      // Listen for incoming chat messages.
      socket.on("chat-message", (data) => {
        addMessage(data);
        // Play notification sound if the message is not from the current user.
        if (data.userId !== userId) {
          notificationAudio
            .play()
            .catch((error) => console.error("Audio play failed:", error));
        }
      });
    }
    return () => {
      if (socket) socket.off("chat-message");
    };
  }, [socket, addMessage, userId, notificationAudio]);

  // Function to send a message.
  const sendMessage = () => {
    if (input.trim() === "") return;
    const messageData = {
      roomId,
      userId,
      message: input,
      timestamp: new Date(),
    };
    socket.emit("chat-message", messageData);
    addMessage(messageData);
    setInput("");
  };

  return (
    <div className="w-full max-w-sm p-4 bg-white shadow-md rounded-lg">
      <h2 className="text-xl font-bold mb-2 text-gray-800">Chat</h2>
      <div className="h-60 overflow-y-auto border border-gray-300 p-2 mb-2 rounded space-y-2">
        {messages.length === 0 ? (
          <p className="text-gray-500 italic text-center">No messages yet...</p>
        ) : (
          messages.map((msg, index) => (
            <div 
              key={index} 
              className={`flex ${msg.userId === userId ? "justify-start" : "justify-end"}`}
            >
              <div className={`p-2 rounded-lg max-w-xs break-words ${
                msg.userId === userId 
                  ? "bg-gray-200 text-gray-800" 
                  : "bg-amber-500 text-[#212121]"
              }`}>
                <p>{msg.message}</p>
                <p className="text-xs text-gray-500 text-right">
                  {new Date(msg.timestamp).toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
      <div className="flex">
        <input
          type="text"
          placeholder="Type your message..."
          className="flex-grow border border-amber-500 text-black rounded-l px-2 py-1 focus:outline-none text-sm"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") sendMessage();
          }}
        />
        <button
          onClick={sendMessage}
          className="bg-blue-500 text-white px-3 py-1 rounded-r hover:bg-blue-600 transition text-sm"
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default Chat;
