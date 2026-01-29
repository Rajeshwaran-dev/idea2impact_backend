import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/send-registration";

console.log("🔍 Connecting to MongoDB...");
console.log("URI:", MONGODB_URI);

mongoose
    .connect(MONGODB_URI)
    .then(async () => {
        console.log("✅ Connected to MongoDB!\n");

        // Get the Registration model
        const Registration = mongoose.model("Registration", new mongoose.Schema({}, { strict: false }));

        // Count total registrations
        const count = await Registration.countDocuments();
        console.log(`📊 Total Registrations: ${count}\n`);

        if (count > 0) {
            console.log("📋 Recent Registrations:");
            console.log("=".repeat(80));

            // Get the 5 most recent registrations
            const registrations = await Registration.find()
                .sort({ createdAt: -1 })
                .limit(5)
                .lean();

            registrations.forEach((reg, index) => {
                console.log(`\n${index + 1}. ${reg.name}`);
                console.log(`   Email: ${reg.email}`);
                console.log(`   Phone: ${reg.phone}`);
                console.log(`   College: ${reg.college}`);
                console.log(`   Year: ${reg.year}`);
                console.log(`   Department: ${reg.department}`);
                console.log(`   Team Size: ${reg.teamSize}`);
                console.log(`   Registered: ${reg.createdAt}`);
                console.log(`   Database ID: ${reg._id}`);
            });

            console.log("\n" + "=".repeat(80));
        } else {
            console.log("ℹ️  No registrations found in database yet.");
            console.log("   Submit a registration through the frontend to test!");
        }

        mongoose.connection.close();
        console.log("\n✅ Database connection closed.");
    })
    .catch((err) => {
        console.error("❌ MongoDB connection error:", err.message);
        process.exit(1);
    });
