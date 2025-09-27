import express from "express";
import { getCategoriesCtr } from "../controllers/categoryController.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    // Check if user is logged in
    if (!req.session.user) {
      return res
        .status(401)
        .json({ success: false, message: "Please log in first" });
    }

    // Check if user is admin (user_role = 1)
    if (req.session.user.user_role !== 1) {
      return res
        .status(403)
        .json({ success: false, message: "Admin access required" });
    }

    const userId = req.session.user.customer_id;
    const categories = await getCategoriesCtr(userId);

    res.json({
      success: true,
      message: "Categories fetched successfully",
      categories,
    });
  } catch (err) {
    console.error("Fetch categories error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
