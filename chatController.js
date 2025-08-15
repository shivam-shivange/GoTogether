import Joi from "joi";
import Chat from "../models/Chat.js";
import Ride from "../models/Ride.js";

export const sendMessageSchema = Joi.object({
  rideId: Joi.string().required(),
  ciphertext: Joi.string().required(),
  nonce: Joi.string().required()
});

export const listMessagesSchema = Joi.object({
  rideId: Joi.string().required()
});

// ensure a chat thread exists for the ride & participants
const ensureChat = async (rideId, participants, retentionDays = 30) => {
  let chat = await Chat.findOne({ rideId });
  if (!chat) {
    chat = await Chat.create({
      rideId,
      participants,
      messages: [],
      expiresAt: new Date(Date.now() + retentionDays * 24 * 3600 * 1000)
    });
  } else {
    // refresh expiry on new activity
    chat.expiresAt = new Date(Date.now() + retentionDays * 24 * 3600 * 1000);
  }
  return chat;
};

export const sendMessage = async (req, res) => {
  const { rideId, ciphertext, nonce } = req.body;

  const ride = await Ride.findById(rideId);
  if (!ride) return res.status(404).json({ message: "Ride not found" });
  if (!ride.allowChat) return res.status(403).json({ message: "Chat disabled by creator" });

  // Only ride creator or anyone who requested/confirmed can chat
  const canChat = [ride.creatorId, ...ride.requests, ...ride.confirmedUsers].includes(req.user.id);
  if (!canChat) return res.status(403).json({ message: "You are not part of this ride" });

  const participants = Array.from(new Set([ride.creatorId, ...ride.requests, ...ride.confirmedUsers]));
  const chat = await ensureChat(ride._id, participants);

  chat.messages.push({ senderId: req.user.id, ciphertext, nonce, sentAt: new Date() });
  await chat.save();

  // socket broadcast done in server.js via io.to(room).emit('chat:new', ...)
  res.status(201).json({ message: "Sent" });
};

export const listMessages = async (req, res) => {
  const { rideId } = req.query;

  const ride = await Ride.findById(rideId).lean();
  if (!ride) return res.status(404).json({ message: "Ride not found" });

  const canRead = [ride.creatorId, ...ride.requests, ...ride.confirmedUsers].includes(req.user.id);
  if (!canRead) return res.status(403).json({ message: "You are not part of this ride" });

  const chat = await Chat.findOne({ rideId }).lean();
  res.json(chat ? chat.messages : []);
};
