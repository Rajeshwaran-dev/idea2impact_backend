import express from "express";
import nodemailer from "nodemailer";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import Registration from "./models/Registration.js";

dotenv.config();
const app = express();

const allowedOrigins = [
  "https://idea2impact.vercel.app",
  "http://localhost:3000",
  "http://localhost:5126"
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json());

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/send-registration";

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log("\n✅ MongoDB connected successfully!");
    console.log("📊 Database:", mongoose.connection.name);
  })
  .catch((err) => {
    console.error("\n❌ MongoDB connection error:", err.message);
    console.error("⚠️  Server will continue, but registrations won't be saved to database.");
  });

// Debug: Log environment variables on startup
console.log("\n🔍 Environment Check:");
console.log("MONGODB_URI:", MONGODB_URI);
console.log("SMTP_HOST:", process.env.SMTP_HOST || "❌ NOT SET");
console.log("SMTP_USER:", process.env.SMTP_USER || "❌ NOT SET");
console.log("SMTP_PASS:", process.env.SMTP_PASS ? "✅ SET" : "❌ NOT SET");
console.log("");

// 🔥 Registration API (Save to DB + Send Email)
app.post("/send-registration", async (req, res) => {
  const {
    name,
    email,
    phone,
    college,
    year,
    department,
    teamSize,
    experience,
    skills,
    motivation,
  } = req.body;

  console.log("\n📧 New registration request received:");
  console.log("Name:", name);
  console.log("Email:", email);

  try {
    // 1️⃣ Save to MongoDB Database
    console.log("💾 Saving to database...");
    const registration = new Registration({
      name,
      email,
      phone,
      college,
      year,
      department,
      teamSize,
      experience,
      skills,
      motivation,
    });

    const savedRegistration = await registration.save();
    console.log("✅ Registration saved to database!");
    console.log("Database ID:", savedRegistration._id);

    // 2️⃣ Send Email Notification
    // Create transporter with debugging enabled
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT || 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      debug: true, // Enable debug logging
      logger: true // Log to console
    });

    // Verify connection before sending
    console.log("🔌 Verifying SMTP connection...");
    await transporter.verify();
    console.log("✅ SMTP connection verified!");

    // Send email
    console.log("📤 Sending email...");
    const info = await transporter.sendMail({
      from: `"Idea2Impact" <askevarajesh@gmail.com>`,
      to: "askevarajesh@gmail.com",
      subject: "New Hackathon Registration — Idea2Impact 2026",
      html: `
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
      `,
    });

    console.log("✅ Email sent successfully!");
    console.log("Message ID:", info.messageId);

    res.status(200).json({
      success: true,
      message: "Registration saved and email sent successfully",
      data: {
        registrationId: savedRegistration._id,
        emailMessageId: info.messageId,
      },
    });
  } catch (error) {
    console.error("\n❌ Email sending failed:");
    console.error("Error Code:", error.code);
    console.error("Error Message:", error.message);

    // Provide specific error messages
    let errorMessage = "Failed to send registration email.";

    if (error.responseCode === 535 || error.message.includes("535") || error.code === "EAUTH") {
      errorMessage = "SMTP Authentication failed. Please check your credentials.";
      console.error("\n🔴 SMTP Authentication Error Details:");
      console.log("Current SMTP_USER:", process.env.SMTP_USER);
      console.log("Current SMTP_HOST:", process.env.SMTP_HOST);
      console.log("Current SMTP_PORT:", process.env.SMTP_PORT);
      console.error("- Check if SMTP_USER is your SMTP Login (username/email)");
      console.error("- Verify if SMTP_PASS is a valid SMTP Key/Password");
      console.error("- Ensure your SMTP provider account is active");
    } else if (error.code === "ECONNREFUSED") {
      errorMessage = "Cannot connect to email server (Connection Refused).";
    } else if (error.code === "ETIMEDOUT") {
      errorMessage = "Email server connection timeout.";
    }

    res.status(500).json({
      success: false,
      error: errorMessage,
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    database: {
      connected: mongoose.connection.readyState === 1,
      name: mongoose.connection.name,
    },
    env: {
      smtp_configured: !!(
        process.env.SMTP_HOST &&
        process.env.SMTP_USER &&
        process.env.SMTP_PASS
      ),
      mongodb_configured: !!MONGODB_URI,
    },
  });
});

// Diagnostic endpoint: Test Email Connection
app.get("/test-email", async (req, res) => {
  console.log("\n🧪 Running SMTP diagnostic test...");

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    debug: true,
    logger: true
  });

  try {
    console.log("🔌 Verifying transporter...");
    await transporter.verify();
    console.log("✅ Success: Transporter is ready!");

    res.status(200).json({
      success: true,
      message: "SMTP Connection verified successfully!",
      config: {
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        user: process.env.SMTP_USER
      }
    });
  } catch (error) {
    console.error("❌ Diagnostic Failed:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      code: error.code,
      response: error.response
    });
  }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log("\n🚀 Server running on http://localhost:" + PORT);
  console.log("📋 Health check: http://localhost:" + PORT + "/health");
  console.log("\n⏳ Waiting for registration requests...\n");
});
