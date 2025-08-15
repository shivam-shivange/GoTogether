import mongoose from "mongoose";

/**
 * We store ciphertext only (for end-to-end readiness).
 * Frontend should encrypt message -> send {ciphertext, nonce}. Backend never sees plaintext.
 */
const messageSchema = new mongoose.Schema({
  senderId: { type: String, required: true },   // Postgres user UUID
  ciphertext: { type: String, required: true }, // base64/hex
  nonce: { type: String, required: true },      // for libsodium/NaCl
  sentAt: { type: Date, default: Date.now }
}, { _id: false });

const chatSchema = new mongoose.Schema({
  rideId: { type: mongoose.Schema.Types.ObjectId, ref: "Ride", required: true },
  participants: [{ type: String, required: true }], // user UUIDs
  messages: [messageSchema],

  // retention: auto-delete chat threads after 30 days
  expiresAt: { type: Date, index: { expireAfterSeconds: 0 } }
}, { timestamps: true });

export default mongoose.model("Chat", chatSchema);
