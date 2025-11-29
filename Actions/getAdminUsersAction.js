import express from "express";
import UserController from "../controllers/userController.js";

const router = express.Router();
const userController = new UserController();

/**
 * Get all users for admin with filtering and search
 * GET /api/admin/users
 * Query parameters:
 *   - limit: number - Maximum number of users to return (default: 100)
 *   - search: string - Search term for filtering users
 *   - role: string - Filter by user role (1 = admin, 2 = customer)
 */
router.get("/", async (req, res) => {
  try {
    // Check admin authorization (role 1 in your database)
    if (!req.session.user || req.session.user.user_role !== 1) {
      return res.status(403).json({
        success: false,
        message: "Admin access required",
      });
    }

    const limit = parseInt(req.query.limit) || 100;
    const search = req.query.search || "";
    const role = req.query.role || "";

    console.log(
      `Admin fetching users - limit: ${limit}, search: "${search}", role: "${role}"`
    );

    const result = await userController.getAllUsersForAdminCtr(
      limit,
      search,
      role
    );

    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error("Admin users action error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while retrieving admin users",
    });
  }
});

export default router;
