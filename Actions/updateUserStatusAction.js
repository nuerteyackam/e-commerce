import express from "express";
import UserController from "../controllers/userController.js";

const router = express.Router();
const userController = new UserController();

/**
 * Update user status (Admin only)
 * PUT /api/admin/users/:userId/status
 */
router.put("/:userId/status", async (req, res) => {
  try {
    // Check admin authorization
    if (!req.session.user || req.session.user.user_role !== 1) {
      return res.status(403).json({
        success: false,
        message: "Admin access required",
      });
    }

    const { userId } = req.params;
    const { status } = req.body;

    // Validate userId
    if (!userId || isNaN(parseInt(userId))) {
      return res.status(400).json({
        success: false,
        message: "Valid user ID is required",
      });
    }

    // Validate status
    if (!status) {
      return res.status(400).json({
        success: false,
        message: "User status is required",
      });
    }

    // Validate status value
    const validStatuses = ["active", "inactive"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid user status. Valid statuses: " + validStatuses.join(", "),
      });
    }

    const userRole = req.session.user.user_role;

    console.log(`Admin updating user ${userId} status to: ${status}`);

    const result = await userController.updateUserStatusCtr(
      parseInt(userId),
      status,
      userRole
    );

    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error("Update user status action error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while updating user status",
    });
  }
});

/**
 * Update user role (Admin only)
 * PUT /api/admin/users/:userId/role
 */
router.put("/:userId/role", async (req, res) => {
  try {
    // Check admin authorization
    if (!req.session.user || req.session.user.user_role !== 1) {
      return res.status(403).json({
        success: false,
        message: "Admin access required",
      });
    }

    const { userId } = req.params;
    const { role } = req.body;

    // Validate userId
    if (!userId || isNaN(parseInt(userId))) {
      return res.status(400).json({
        success: false,
        message: "Valid user ID is required",
      });
    }

    // Validate role
    if (role === undefined || role === null) {
      return res.status(400).json({
        success: false,
        message: "User role is required",
      });
    }

    // Validate role value
    const validRoles = [1, 2]; // 1 = admin, 2 = customer
    if (!validRoles.includes(parseInt(role))) {
      return res.status(400).json({
        success: false,
        message: "Invalid user role. Valid roles: 1 (Admin), 2 (Customer)",
      });
    }

    const userRole = req.session.user.user_role;

    console.log(`Admin updating user ${userId} role to: ${role}`);

    const result = await userController.updateUserRoleCtr(
      parseInt(userId),
      parseInt(role),
      userRole
    );

    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error("Update user role action error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while updating user role",
    });
  }
});

export default router;
