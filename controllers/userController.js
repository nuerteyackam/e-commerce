import UserClass from "../model/userClass.js";

class UserController {
  constructor() {
    this.userModel = new UserClass();
  }

  /**
   * Get all users for admin management
   * @param {number} limit - Maximum number of users to return
   * @param {string} search - Search term for filtering users
   * @param {string} role - Filter by user role (optional)
   * @returns {Object} All users with details
   */
  async getAllUsersForAdminCtr(limit = 100, search = "", role = "") {
    try {
      console.log(`=== GET ALL USERS FOR ADMIN ===`);
      console.log(`Limit: ${limit}, Search: "${search}", Role: "${role}"`);

      const result = await this.userModel.getAllUsersForAdmin(
        limit,
        search,
        role
      );

      if (result.success) {
        console.log(`Found ${result.data.users.length} users for admin`);
        return {
          success: true,
          data: {
            users: result.data.users,
            totalUsers: result.data.totalUsers,
            stats: result.data.stats,
          },
          message: result.message,
        };
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error("Error in getAllUsersForAdminCtr:", error);
      return {
        success: false,
        message: error.message || "Failed to retrieve users for admin",
      };
    }
  }

  /**
   * Get detailed user information for admin
   * @param {number} userId - User ID
   * @returns {Object} Detailed user info with order history
   */
  async getAdminUserDetailsCtr(userId) {
    try {
      if (!userId) {
        throw new Error("User ID is required");
      }

      console.log(`=== GET ADMIN USER DETAILS ===`);
      console.log(`User ID: ${userId}`);

      const userResult = await this.userModel.getAdminUserDetails(
        parseInt(userId)
      );

      if (!userResult.success) {
        throw new Error(userResult.message);
      }

      console.log(
        `Admin viewing user ${userId} - ${
          userResult.data.user.customer_name ||
          userResult.data.user.customer_email
        }`
      );

      return {
        success: true,
        data: {
          user: userResult.data.user,
          orders: userResult.data.orders,
          orderStats: userResult.data.orderStats,
          recentActivity: userResult.data.recentActivity,
        },
        message: "Admin user details retrieved successfully",
      };
    } catch (error) {
      console.error("Error in getAdminUserDetailsCtr:", error);
      return {
        success: false,
        message: error.message || "Failed to retrieve admin user details",
      };
    }
  }

  /**
   * Get user statistics for admin dashboard
   * @returns {Object} User statistics and analytics
   */
  async getUserStatsCtr() {
    try {
      console.log(`=== GET USER STATISTICS ===`);

      const result = await this.userModel.getUserStatistics();

      if (result.success) {
        console.log("User statistics retrieved:", result.data.stats);
        return {
          success: true,
          data: {
            stats: result.data.stats,
            recentUsers: result.data.recentUsers,
          },
          message: "User statistics retrieved successfully",
        };
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error("Error in getUserStatsCtr:", error);
      return {
        success: false,
        message: error.message || "Failed to retrieve user statistics",
      };
    }
  }

  /**
   * Update user status (Admin only)
   * @param {number} userId - User ID
   * @param {string} status - New user status (active/inactive)
   * @param {string} userRole - Admin role for authorization
   * @returns {Object} Update result
   */
  async updateUserStatusCtr(userId, status, userRole) {
    try {
      if (userRole !== 1) {
        // Admin role is 1 in your database
        throw new Error("Admin access required");
      }

      if (!userId || !status) {
        throw new Error("User ID and status are required");
      }

      console.log(`=== UPDATE USER STATUS (ADMIN) ===`);
      console.log(`User ID: ${userId}, New Status: ${status}`);

      const result = await this.userModel.updateUserStatus(
        parseInt(userId),
        status
      );

      if (result.success) {
        console.log(`User ${userId} status updated to: ${status}`);
      }

      return result;
    } catch (error) {
      console.error("Error in updateUserStatusCtr:", error);
      return {
        success: false,
        message: error.message || "Failed to update user status",
      };
    }
  }

  /**
   * Update user role (Admin only)
   * @param {number} userId - User ID
   * @param {number} newRole - New user role (1 = admin, 2 = customer)
   * @param {string} userRole - Admin role for authorization
   * @returns {Object} Update result
   */
  async updateUserRoleCtr(userId, newRole, userRole) {
    try {
      if (userRole !== 1) {
        // Admin role is 1
        throw new Error("Admin access required");
      }

      if (!userId || newRole === undefined) {
        throw new Error("User ID and role are required");
      }

      console.log(`=== UPDATE USER ROLE (ADMIN) ===`);
      console.log(`User ID: ${userId}, New Role: ${newRole}`);

      const result = await this.userModel.updateUserRole(
        parseInt(userId),
        parseInt(newRole)
      );

      if (result.success) {
        console.log(`User ${userId} role updated to: ${newRole}`);
      }

      return result;
    } catch (error) {
      console.error("Error in updateUserRoleCtr:", error);
      return {
        success: false,
        message: error.message || "Failed to update user role",
      };
    }
  }
}

export default UserController;
