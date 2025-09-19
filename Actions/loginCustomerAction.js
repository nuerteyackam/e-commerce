import express from "express";
import { getCustomerCtr } from "../controllers/customerController.js";

const router = express.Router();

router.post("/", async (req, res) => {
  const { email, password } = req.body;
  try {
    const customer = await getCustomerCtr(email, password);

    req.session.user = {
      id: customer.customer_id,
      name: customer.customer_name,
      role: customer.user_role,
      email: customer.customer_email,
    };

    res.json({ success: true, message: "Login successful", customer });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

export default router;
