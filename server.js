import express from "express";
import nodemailer from "nodemailer";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import Registration from "./models/Registration.js";

// Initialize environment variables
dotenv.config();

const app = express();

// --- CORS CONFIGURATION ---
const allowedOrigins = [
  "https://idea2impact.vercel.app",
  "https://idea-2-impact-buildathon.vercel.app", // Fallback if domain differs
  "http://localhost:3000",
  "http://localhost:5173", // Vite default
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl)
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        console.warn(`⚠️ CORS blocked for origin: ${origin}`);
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

app.use(express.json());

// --- MONGODB CONNECTION ---
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("❌ CRITICAL: MONGODB_URI is not defined in environment variables.");
} else {
  mongoose
    .connect(MONGODB_URI)
    .then(() => console.log("✅ MongoDB connected successfully"))
    .catch((err) => console.error("❌ MongoDB connection error:", err.message));
}

// --- REGISTRATION ENDPOINT ---
app.post("/send-registration", async (req, res) => {
  const { name, email, phone, college, year, department, teamSize, experience, skills, motivation } = req.body;

  console.log(`📩 New registration attempt: ${email}`);

  try {
    // 1. Save to Database
    const registration = new Registration({
      name, email, phone, college, year, department, teamSize, experience, skills, motivation
    });
    const savedRegistration = await registration.save();
    console.log(process.env.SMTP_USER,process.env.SMTP_PASS,process.env.SMTP_HOST,process.env.SMTP_PORT,"===============")

    // 2. SMTP Configuration (Strictly from environment)
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: true, // true for 465, false for 587
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      connectionTimeout: 10000, // 10s timeout to prevent Render 502/504
    });

    // 3. Send Notification Email to ADMIN
    const mailOptions = {
      from: `"Idea2Impact" <${process.env.SENDER_EMAIL || process.env.SMTP_USER}>`,
      to: email,
      subject: "New Hackathon Registration — Idea2Impact 2026",
      html: `
        <div style="font-family: sans-serif; line-height: 1.5;">
          <h2>New Registration Received 🚀</h2>
          <p><b>Name:</b> ${name}</p>
          <p><b>Email:</b> ${email}</p>
          <p><b>Phone:</b> ${phone}</p>
          <p><b>College:</b> ${college}</p>
          <p><b>Year:</b> ${year}</p>
          <p><b>Department:</b> ${department}</p>
          <p><b>Team Size:</b> ${teamSize}</p>
          <p><b>Experience:</b> ${experience || "Not specified"}</p>
          <p><b>Skills:</b> ${skills || "Not specified"}</p>
          <p><b>Motivation:</b> ${motivation || "Not specified"}</p>
          <hr>
          <p><small>Database ID: ${savedRegistration._id}</small></p>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent: ${info.messageId}`);

    return res.status(200).json({
      success: true,
      message: "Registration successful",
      id: savedRegistration._id
    });

  } catch (error) {
    console.error("❌ Registration error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error during registration",
      details: error.message
    });
  }
});

// --- HEALTH CHECK ---
app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK", uptime: process.uptime() });
});

// --- START SERVER ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT} [NODE_ENV=${process.env.NODE_ENV}]`);
});
