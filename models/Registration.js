import mongoose from "mongoose";

const registrationSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        email: {
            type: String,
            required: true, 
            trim: true,
            lowercase: true,
        },
        phone: {
            type: String,
            required: true,
            trim: true,
        },
        college: {
            type: String,
            required: true,
            trim: true,
        },
        year: {
            type: String,
            required: true,
        },
        department: {
            type: String,
            required: true,
            trim: true,
        },
        teamSize: {
            type: String,
            required: true,
        },
        experience: {
            type: String,
            trim: true,
        },
        skills: {
            type: String,
            trim: true,
        },
        motivation: {
            type: String,
            trim: true,
        },
    },
    {
        timestamps: true, // Automatically adds createdAt and updatedAt fields
    }
);

const Registration = mongoose.model("Registration", registrationSchema);

export default Registration;
