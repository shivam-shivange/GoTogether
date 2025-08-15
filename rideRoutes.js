import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { validate } from "../middleware/validate.js";
import {
  createRide, listRides, requestRide, cancelRequest, decideRequest,
  updateRideTime, closeRide,
  createRideSchema, requestRideSchema, cancelRequestSchema, decideRequestSchema,
  updateTimeSchema, closeRideSchema
} from "../controllers/rideController.js";

const router = express.Router();

router.post("/", protect, validate(createRideSchema), createRide);
router.get("/", protect, listRides);

router.post("/request", protect, validate(requestRideSchema), requestRide);
router.post("/cancel-request", protect, validate(cancelRequestSchema), cancelRequest);

router.post("/decide", protect, validate(decideRequestSchema), decideRequest); // accept/reject by creator
router.post("/update-time", protect, validate(updateTimeSchema), updateRideTime);
router.post("/close", protect, validate(closeRideSchema), closeRide);

export default router;
