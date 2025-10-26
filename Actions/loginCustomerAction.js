import express from "express";
import { getCustomerCtr } from "../controllers/customerController.js";

const router = express.Router();

router.post("/", async (req, res) => {
  const { email, password } = req.body;
  try {
    const customer = await getCustomerCtr(email, password);

    req.session.user = {
      customer_id: customer.customer_id,
      customer_name: customer.customer_name,
      user_role: customer.user_role,
      customer_email: customer.customer_email,
    };

    // Determine redirect based on user role
    let redirectUrl;
    if (customer.user_role === 1) {
      // Admin user - redirect to admin dashboard
      redirectUrl = "/admin";
    } else {
      // Regular user - redirect to customer home
      redirectUrl = "/";
    }

    res.json({
      success: true,
      message: "Login successful",
      customer,
      redirect: redirectUrl,
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// session check
router.get("/me", async (req, res) => {
  if (req.session.user) {
    res.json({ loggedIn: true, user: req.session.user });
  } else {
    res.json({ loggedIn: false });
  }
});

export default router;
