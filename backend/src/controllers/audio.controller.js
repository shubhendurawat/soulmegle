import fs from "fs";
import axios from "axios";
import { pineCone } from "../pinecone/index.js";
import { pipeline } from "@xenova/transformers"; // For Hugging Face embeddings

const ASSEMBLYAI_API_KEY = "f8e82ac0774840309a209fad6e93ed97";

const indexName = "user-interests-soulmegle";
const pineconeIndex = pineCone.Index(indexName);

// Upload file to AssemblyAI
const uploadToAssemblyAI = async (filePath) => {
    try {
        const response = await axios.post(
            "https://api.assemblyai.com/v2/upload",
            fs.createReadStream(filePath),
            { headers: { authorization: ASSEMBLYAI_API_KEY } }
        );
        return response.data.upload_url;
    } catch (error) {
        console.error("Error uploading file to AssemblyAI:", error);
        throw error;
    }
};

// Transcribe audio file
const transcribeAudio = async (audioUrl) => {
    try {
        const response = await axios.post(
            "https://api.assemblyai.com/v2/transcript",
            { audio_url: audioUrl },
            { headers: { authorization: ASSEMBLYAI_API_KEY, "Content-Type": "application/json" } }
        );

        return response.data.id; // Return transcript ID
    } catch (error) {
        console.error("Error starting transcription:", error);
        throw error;
    }
};

// Check transcription status
const checkTranscriptionStatus = async (transcriptId) => {
    try {
        const response = await axios.get(`https://api.assemblyai.com/v2/transcript/${transcriptId}`, {
            headers: { authorization: ASSEMBLYAI_API_KEY }
        });

        return response.data;
    } catch (error) {
        console.error("Error fetching transcript:", error);
        throw error;
    }
};

// Generate embeddings using Hugging Face Sentence Transformers
const generateEmbedding = async (text) => {
    try {
        // Load the model
        const extractor = await pipeline("feature-extraction", "Xenova/all-mpnet-base-v2");
        const output = await extractor(text, { pooling: "mean", normalize: true });
        return output.tolist(); // Convert tensor to array
    } catch (error) {
        console.error("Error generating embedding:", error);
        throw error;
    }
};

// Store embeddings in Pinecone
const storeInPinecone = async (userId, embedding, text, latitude, longitude) => {
    try {
        await pineconeIndex.upsert([{
            id: userId,
            values: embedding,
            metadata: {
                transcribed_text: text,
                latitude: latitude,
                longitude: longitude,
            }
        }]);
        console.log("Embedding stored successfully", userId);
    } catch (error) {
        console.error("Error storing in Pinecone:", error);
        throw error;
    }
};

// Controller function to handle audio upload & transcription
const handleAudioUpload = async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
    }

    try {
        const filePath = req.file.path;
        const audioUrl = await uploadToAssemblyAI(filePath);
        const transcriptId = await transcribeAudio(audioUrl);

        const checkInterval = setInterval(async () => {
            const transcript = await checkTranscriptionStatus(transcriptId);

            if (transcript.status === "completed") {
                clearInterval(checkInterval);

                // 1. Get the transcribed text
                const text = transcript.text;

                // 2. Generate embedding using Hugging Face
                const embedding = await generateEmbedding(text);
                console.log(embedding);

                // 3. Get latitude and longitude from the request body
                const { latitude, longitude } = req.body;
                console.log(req.body);

                if (!latitude || !longitude) {
                    throw new Error("Latitude and longitude are required");
                }

                // 4. Store in Pinecone (using user ID from auth)
                const userId = req.user._id; // Assuming you have user authentication
                await storeInPinecone(userId, embedding, text, latitude, longitude);

                // Cleanup
                fs.unlink(filePath, (err) => {
                    if (err) console.error("Error deleting file:", err);
                });

                return res.json({
                    success: true,
                    message: "Audio processed and embedding stored",
                    text: text,
                });

            } else if (transcript.status === "failed") {
                clearInterval(checkInterval);
                return res.status(500).json({ error: "Transcription failed" });
            }
        }, 5000);

    } catch (error) {
        return res.status(500).json({
            error: "Internal server error",
            details: error.message,
        });
    }
};

export { handleAudioUpload };