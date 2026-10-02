require("dotenv").config();

const express = require("express");
const cors = require("cors");
const multer = require("multer");
const Groq = require("groq-sdk");
const cloudinary = require("cloudinary").v2;

const app = express();

const PORT = process.env.PORT || 10000;

// -------------------------
// Basic middleware
// -------------------------

app.use(cors());
app.use(express.json({ limit: "10mb" }));

// -------------------------
// Multer
// -------------------------

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024
  }
});

// -------------------------
// Groq
// -------------------------

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

// -------------------------
// Cloudinary
// -------------------------

if (process.env.CLOUDINARY_URL) {
  cloudinary.config({
    secure: true
  });
}

// -------------------------
// Home
// -------------------------

app.get("/", (req, res) => {
  res.json({
    success: true,
    app: "EST AI",
    message: "EST AI backend is running."
  });
});

// -------------------------
// Health check
// -------------------------

app.get("/health", (req, res) => {
  res.json({
    success: true,
    status: "healthy",
    app: "EST AI"
  });
});

// -------------------------
// AI Chat
// -------------------------

app.post("/api/chat", async (req, res) => {
  try {
    const { messages } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        success: false,
        error: "messages array is required"
      });
    }

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: messages,
      temperature: 0.7,
      max_completion_tokens: 2048
    });

    const reply =
      completion.choices?.[0]?.message?.content ||
      "Sorry, I could not generate a response.";

    res.json({
      success: true,
      reply: reply
    });

  } catch (error) {
    console.error("Groq error:", error);

    res.status(500).json({
      success: false,
      error: "AI request failed."
    });
  }
});

// -------------------------
// File Upload
// -------------------------

app.post("/api/upload", upload.single("file"), async (req, res) => {
  try {
    if (!process.env.CLOUDINARY_URL) {
      return res.status(500).json({
        success: false,
        error: "Cloudinary is not configured."
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "No file uploaded."
      });
    }

    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: "auto",
          folder: "est-ai"
        },
        (error, result) => {
          if (error) {
            reject(error);
          } else {
            resolve(result);
          }
        }
      );

      uploadStream.end(req.file.buffer);
    });

    res.json({
      success: true,
      file: {
        name: req.file.originalname,
        type: req.file.mimetype,
        size: req.file.size,
        url: result.secure_url,
        publicId: result.public_id,
        resourceType: result.resource_type
      }
    });

  } catch (error) {
    console.error("Cloudinary upload error:", error);

    res.status(500).json({
      success: false,
      error: "File upload failed."
    });
  }
});

// -------------------------
// 404
// -------------------------

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Route not found."
  });
});

// -------------------------
// Error handler
// -------------------------

app.use((error, req, res, next) => {
  console.error("Server error:", error);

  res.status(500).json({
    success: false,
    error: "Internal server error."
  });
});

// -------------------------
// Start server
// -------------------------

app.listen(PORT, () => {
  console.log(`EST AI backend running on port ${PORT}`);
});
