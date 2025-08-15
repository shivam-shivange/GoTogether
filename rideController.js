import Joi from "joi";
import Ride from "../models/Ride.js";

export const createRideSchema = Joi.object({
  availableSeats: Joi.number().integer().min(1).max(10).required(),
  preferredGender: Joi.string().valid("Any", "Male", "Female").default("Any"),
  luggageSpace: Joi.boolean().default(false),
  destination: Joi.string().min(2).max(120).required(),
  dateTime: Joi.date().iso().required(),
  allowChat: Joi.boolean().default(true)
});

export const createRide = async (req, res) => {
  const { availableSeats, preferredGender, luggageSpace, destination, dateTime, allowChat } = req.body;

  const ride = await Ride.create({
    creatorId: req.user.id,
    creatorCollegeId: req.user.collegeId,
    availableSeats,
    preferredGender,
    luggageSpace,
    destination,
    dateTime: new Date(dateTime),
    allowChat,
    status: "OPEN",
    // retention: if nobody confirms -> delete 7 days after scheduled time
    expiresAt: new Date(new Date(dateTime).getTime() + 7 * 24 * 3600 * 1000)
  });

  res.status(201).json(ride);
};

export const listRides = async (req, res) => {
  // same-college visibility
  const rides = await Ride.find({
    creatorCollegeId: req.user.collegeId,
    status: { $in: ["OPEN", "FULL"] },
    dateTime: { $gte: new Date(Date.now() - 12 * 3600 * 1000) } // recent/present/future
  })
    .sort({ dateTime: 1 })
    .lean();

  res.json(rides);
};

export const requestRideSchema = Joi.object({
  rideId: Joi.string().required()
});

export const requestRide = async (req, res) => {
  const { rideId } = req.body;
  const ride = await Ride.findById(rideId);
  if (!ride) return res.status(404).json({ message: "Ride not found" });
  if (ride.creatorCollegeId !== req.user.collegeId) return res.status(403).json({ message: "Cross-college access denied" });
  if (ride.status === "CLOSED") return res.status(400).json({ message: "Ride is closed" });
  if (ride.requests.includes(req.user.id) || ride.confirmedUsers.includes(req.user.id))
    return res.status(400).json({ message: "Already requested/confirmed" });

  ride.requests.push(req.user.id);
  await ride.save();
  res.json({ message: "Request sent", ride });
};

export const cancelRequestSchema = Joi.object({
  rideId: Joi.string().required()
});

export const cancelRequest = async (req, res) => {
  const { rideId } = req.body;
  const ride = await Ride.findById(rideId);
  if (!ride) return res.status(404).json({ message: "Ride not found" });
  if (!ride.requests.includes(req.user.id))
    return res.status(400).json({ message: "No pending request to cancel" });

  ride.requests = ride.requests.filter(u => u !== req.user.id);
  await ride.save();
  res.json({ message: "Request cancelled", ride });
};

export const decideRequestSchema = Joi.object({
  rideId: Joi.string().required(),
  userId: Joi.string().required(),         // requester UUID (from Postgres)
  decision: Joi.string().valid("accept", "reject").required()
});

export const decideRequest = async (req, res) => {
  const { rideId, userId, decision } = req.body;
  const ride = await Ride.findById(rideId);
  if (!ride) return res.status(404).json({ message: "Ride not found" });
  if (ride.creatorId !== req.user.id) return res.status(403).json({ message: "Only creator can decide" });
  if (!ride.requests.includes(userId)) return res.status(400).json({ message: "User did not request" });

  if (decision === "reject") {
    ride.requests = ride.requests.filter(u => u !== userId);
  } else {
    if (ride.availableSeats <= 0) return res.status(400).json({ message: "No seats left" });
    ride.confirmedUsers.push(userId);
    ride.requests = ride.requests.filter(u => u !== userId);
    ride.availableSeats -= 1;
    if (ride.availableSeats === 0) ride.status = "FULL";

    // retention update for confirmed rides: keep for 30 days after scheduled time
    ride.expiresAt = new Date(new Date(ride.dateTime).getTime() + 30 * 24 * 3600 * 1000);
  }

  await ride.save();
  res.json({ message: decision === "accept" ? "User confirmed" : "User rejected", ride });
};

export const updateTimeSchema = Joi.object({
  rideId: Joi.string().required(),
  dateTime: Joi.date().iso().required()
});

export const updateRideTime = async (req, res) => {
  const { rideId, dateTime } = req.body;
  const ride = await Ride.findById(rideId);
  if (!ride) return res.status(404).json({ message: "Ride not found" });
  if (ride.creatorId !== req.user.id) return res.status(403).json({ message: "Only creator can update time" });

  ride.dateTime = new Date(dateTime);
  // update expiry according to new time
  const baseRetention = ride.confirmedUsers.length ? 30 : 7;
  ride.expiresAt = new Date(new Date(ride.dateTime).getTime() + baseRetention * 24 * 3600 * 1000);

  await ride.save();
  res.json({ message: "Ride time updated", ride });
};

export const closeRideSchema = Joi.object({
  rideId: Joi.string().required()
});

export const closeRide = async (req, res) => {
  const { rideId } = req.body;
  const ride = await Ride.findById(rideId);
  if (!ride) return res.status(404).json({ message: "Ride not found" });
  if (ride.creatorId !== req.user.id) return res.status(403).json({ message: "Only creator can close" });

  ride.status = "CLOSED";
  await ride.save();
  res.json({ message: "Ride closed", ride });
};
