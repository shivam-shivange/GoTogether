import mongoose from "mongoose";

const rideSchema = new mongoose.Schema({
  creatorId: { type: String, required: true },        // Postgres user UUID
  creatorCollegeId: { type: String, required: true }, // Postgres college UUID
  availableSeats: { type: Number, required: true, min: 1 },
  preferredGender: { type: String, enum: ["Any", "Male", "Female"], default: "Any" },
  luggageSpace: { type: Boolean, default: false },
  destination: { type: String, required: true },      // from your approved list on FE
  dateTime: { type: Date, required: true },

  allowChat: { type: Boolean, default: true },

  requests: [{ type: String }],       // user UUIDs who requested
  confirmedUsers: [{ type: String }], // user UUIDs confirmed

  status: { type: String, enum: ["OPEN", "FULL", "CLOSED"], default: "OPEN" },

  // retention: keep non-confirmed rides for 7 days after dateTime, confirmed for 30 days
  expiresAt: { type: Date, index: { expireAfterSeconds: 0 } }
}, { timestamps: true });

export default mongoose.model("Ride", rideSchema);
