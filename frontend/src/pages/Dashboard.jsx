import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import MicrophoneButton from "../components/MicroPhoneButton";
import axios from "axios";
import { ScaleLoader } from "react-spinners";
import io from "socket.io-client";

const Dashboard = () => {
  const [user, setUser] = useState(null);
  const [transcript, setTranscript] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isTranscriptionComplete, setIsTranscriptionComplete] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const token = localStorage.getItem("accessToken");
        if (!token) {
          navigate("/login");
          return;
        }
        const response = await axios.get("http://localhost:8081/api/v1/auth/dashboard", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.data?.data) {
          setUser(response.data.data);
          localStorage.setItem("user", JSON.stringify(response.data.data));
        } else {
          throw new Error("No user data in response");
        }
      } catch (error) {
        console.error("Error fetching user:", error);
        navigate("/login");
      }
    };
    fetchUser();
  }, [navigate]);

  const handleSpeechResult = async (audioBlob) => {
    setIsLoading(true);
    setIsTranscriptionComplete(false);
    try {
      // Obtain geolocation within a 10-second timeout
      const position = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error("Geolocation permission timed out")), 10000);
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            clearTimeout(timeout);
            resolve(pos);
          },
          (error) => {
            clearTimeout(timeout);
            reject(error);
          }
        );
      });
      const latitude = position.coords.latitude;
      const longitude = position.coords.longitude;
      const formData = new FormData();
      formData.append("audio", audioBlob, "recording.wav");
      formData.append("latitude", latitude);
      formData.append("longitude", longitude);
      const token = localStorage.getItem("accessToken");

      // Increase timeout to 60000ms (60 seconds)
      const response = await axios.post("http://localhost:8081/api/v1/audio/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${token}`,
        },
        timeout: 60000,
      });
      setTranscript(response.data.text);
      setIsTranscriptionComplete(true);
    } catch (error) {
      console.error("Error in speech processing:", error);
      // Optionally, you can display a user-friendly message here
    } finally {
      setIsLoading(false);
    }
  };

  const handleFindMatch = async () => {
    try {
      const token = localStorage.getItem("accessToken");
      const storedUser = JSON.parse(localStorage.getItem("user"));
      if (!storedUser || !storedUser._id) {
        console.error("User ID is missing");
        return;
      }
      const response = await axios.post(
        "http://localhost:8081/api/v1/video-chat/findmatch",
        { userId: storedUser._id },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.data.success) {
        const { roomId, matchedUserId } = response.data;
        localStorage.setItem("roomId", roomId);
        localStorage.setItem("matchedUserId", matchedUserId);
        // Pass both the local userId and matchedUserId in the URL
        navigate(`/video-chat?roomId=${roomId}&userId=${storedUser._id}&matchedUserId=${matchedUserId}`);
      } else {
        console.error("Match finding failed:", response.data.error);
      }
    } catch (error) {
      console.error("Error finding match:", error);
    }
  };

  // Optional: Listen for a "matched" event if emitted from the socket server
  useEffect(() => {
    const socket = io("ws://localhost:8082");
    socket.on("matched", (data) => {
      console.log("Matched with user:", data.matchedUserId);
      navigate(`/video-chat?roomId=${data.roomId}&userId=${JSON.parse(localStorage.getItem("user"))._id}&matchedUserId=${data.matchedUserId}`);
    });
    return () => {
      socket.disconnect();
    };
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar user={user} />
      <div className="flex flex-col items-center justify-center mt-10">
        {user ? <h1 className="text-4xl font-bold">Hi, {user.name} 👋</h1> : <p>Loading...</p>}
        <p className="pt-2">Tell us about your interest by clicking on the microphone button below</p>
        <MicrophoneButton onSpeechResult={handleSpeechResult} isLoading={isLoading} />
        <div className="mt-8 flex flex-col items-center justify-center w-full">
          {isLoading ? (
            <>
              <ScaleLoader color="#F59E0B" size={100} />
              <p className="mt-4 text-gray-600 text-lg">Transcribing your audio...</p>
            </>
          ) : transcript ? (
            <div className="mt-4 p-6 text-center">
              <p className="text-gray-800 text-xl">{transcript}</p>
              {isTranscriptionComplete && (
                <button
                  onClick={handleFindMatch}
                  className="mt-4 px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                >
                  Find Match for Video Call
                </button>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
