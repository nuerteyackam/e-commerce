import express from "express";
import UserController from "../controllers/userController.js";

const router = express.Router();
const userController = new UserController();

/**
 * Get detailed user information for admin
 * GET /api/admin/users/:userId
 */
router.get("/:userId", async (req, res) => {
  try {
    // Check admin authorization (role 1)
    if (!req.session.user || req.session.user.user_role !== 1) {
      return res.status(403).json({
        success: false,
        message: "Admin access required",
      });
    }

    const { userId } = req.params;

    // Validate userId
    if (!userId || isNaN(parseInt(userId))) {
      return res.status(400).json({
        success: false,
        message: "Valid user ID is required",
      });
    }

    console.log(`Admin fetching details for user: ${userId}`);

    const result = await userController.getAdminUserDetailsCtr(
      parseInt(userId)
    );

    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(404).json(result);
    }
  } catch (error) {
    console.error("Admin user details action error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while retrieving admin user details",
    });
  }
});

export default router;
