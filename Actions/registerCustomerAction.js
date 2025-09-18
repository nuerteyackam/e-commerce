import express from "express";
import { registerCustomerCtr } from "../controllers/customerController.js";

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const customer = await registerCustomerCtr(req.body);
    res.json({ success: true, message: "Registration successful", customer });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

export default router;
