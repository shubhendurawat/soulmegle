import React, { useState, useRef } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMicrophone, faStop } from "@fortawesome/free-solid-svg-icons";

const MicrophoneButton = ({ onSpeechResult, isLoading }) => {
  const [recording, setRecording] = useState(false);
  const mediaRecorder = useRef(null);
  const audioChunks = useRef([]);
  const streamRef = useRef(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      mediaRecorder.current = new MediaRecorder(stream);

      audioChunks.current = [];

      mediaRecorder.current.ondataavailable = (event) => {
        audioChunks.current.push(event.data);
      };

      mediaRecorder.current.onstop = async () => {
        const audioBlob = new Blob(audioChunks.current, { type: "audio/wav" });
        audioChunks.current = [];

        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;

        onSpeechResult(audioBlob); // Send audio blob to parent component
      };

      mediaRecorder.current.start();
      setRecording(true);
    } catch (error) {
      console.error("Error accessing microphone:", error);
      alert("Microphone access denied or unavailable.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.current && recording) {
      mediaRecorder.current.stop();
      setRecording(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-[50vh]">
      <button
        onClick={recording ? stopRecording : startRecording}
        disabled={isLoading} // Disable button while loading
        className={`w-24 h-24 p-6 rounded-full shadow-lg transition-all duration-300 ${
          recording ? "bg-red-500 animate-pulse" : "bg-black hover:bg-amber-500 text-white"
        } ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`} // Dim button when disabled
      >
        <FontAwesomeIcon icon={recording ? faStop : faMicrophone} size="3x" />
      </button>
    </div>
  );
};

export default MicrophoneButton;