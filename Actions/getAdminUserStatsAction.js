import express from "express";
import UserController from "../controllers/userController.js";

const router = express.Router();
const userController = new UserController();

/**
 * Get user statistics for admin dashboard
 * GET /api/admin/user-stats
 */
router.get("/", async (req, res) => {
  try {
    // Check admin authorization (role 1)
    if (!req.session.user || req.session.user.user_role !== 1) {
      return res.status(403).json({
        success: false,
        message: "Admin access required",
      });
    }

    console.log("Admin fetching user statistics");

    const result = await userController.getUserStatsCtr();

    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error("User stats action error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while retrieving user statistics",
    });
  }
});

export default router;
