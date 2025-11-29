import express from "express";
import { getCustomerCtr } from "../controllers/customerController.js";
import CartClass from "../model/cartClass.js";

const router = express.Router();

router.post("/", async (req, res) => {
  const { email, password } = req.body;
  try {
    const customer = await getCustomerCtr(email, password);

    // Store guest cart session ID before login
    const guestCartSessionId = req.session.cartSessionId;

    req.session.user = {
      customer_id: customer.customer_id,
      customer_name: customer.customer_name,
      user_role: customer.user_role,
      customer_email: customer.customer_email,
    };

    if (guestCartSessionId) {
      console.log(
        `Transferring cart from session ${guestCartSessionId} to customer ${customer.customer_id}`
      );

      const cart = new CartClass();
      const transferResult = await cart.transferCartToUser(
        guestCartSessionId,
        customer.customer_id
      );
      if (transferResult.success) {
        console.log("Cart transfer successful");
        // Clear guest cart session ID after successful transfer
        delete req.session.cartSessionId;
      } else {
        console.error("Cart transfer failed:", transferResult.message);
      }
    }

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
    // Get cart count for logged in user
    const cart = new CartClass();
    const cartResult = await cart.getCartCount(
      null,
      req.session.user.customer_id
    );

    res.json({
      success: true,
      loggedIn: true,
      data: {
        id: req.session.user.customer_id,
        name: req.session.user.customer_name,
        email: req.session.user.customer_email,
        user_role: req.session.user.user_role,
      },
      cartCount: cartResult.success ? cartResult.data.totalQuantity : 0,
    });
  } else {
    // Get cart count for guest user
    let cartCount = 0;
    if (req.session.cartSessionId) {
      const cart = new CartClass();
      const cartResult = await cart.getCartCount(
        req.session.cartSessionId,
        null
      );
      cartCount = cartResult.success ? cartResult.data.totalQuantity : 0;
    }

    res.json({
      success: false,
      loggedIn: false,
      cartCount: cartCount,
      guestSessionId: req.session.cartSessionId, // For debugging
    });
  }
});

export default router;
