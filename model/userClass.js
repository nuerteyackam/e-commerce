import pool from "../config/db.js";

class UserClass {
  constructor() {
    this.customerTable = "customer";
    this.ordersTable = "orders";
    this.orderDetailsTable = "orderdetails";
  }

  /**
   * Get all users for admin with detailed information
   * @param {number} limit - Maximum number of users
   * @param {string} search - Search term for filtering
   * @param {string} role - Filter by role
   * @returns {Object} All users with stats
   */
  async getAllUsersForAdmin(limit = 100, search = "", role = "") {
    try {
      let whereClause = "WHERE 1=1";
      const queryParams = [];
      let paramIndex = 1;

      // Add search filter
      if (search.trim()) {
        whereClause += ` AND (
          LOWER(c.customer_name) LIKE LOWER($${paramIndex}) OR 
          LOWER(c.customer_email) LIKE LOWER($${paramIndex + 1}) OR
          LOWER(c.customer_contact) LIKE LOWER($${paramIndex + 2}) OR
          c.customer_id::text LIKE $${paramIndex + 3}
        )`;
        const searchTerm = `%${search}%`;
        queryParams.push(searchTerm, searchTerm, searchTerm, `%${search}%`);
        paramIndex += 4;
      }

      // Add role filter
      if (role.trim()) {
        whereClause += ` AND c.user_role = $${paramIndex}`;
        queryParams.push(parseInt(role));
        paramIndex++;
      }

      // Add limit
      queryParams.push(limit);

      const query = `
        SELECT 
          c.customer_id,
          c.customer_name,
          c.customer_email,
          c.customer_contact,
          c.customer_country,
          c.customer_city,
          c.user_role,
          c.customer_pass,
          c.created_at,
          c.updated_at,
          COALESCE(order_stats.total_orders, 0) as total_orders,
          COALESCE(order_stats.total_spent, 0) as total_spent,
          COALESCE(order_stats.last_order_date, NULL) as last_order_date,
          CASE 
            WHEN c.updated_at > NOW() - INTERVAL '30 days' THEN 'active'
            ELSE 'inactive'
          END as status
        FROM ${this.customerTable} c
        LEFT JOIN (
          SELECT 
            customer_id,
            COUNT(*) as total_orders,
            SUM(order_total) as total_spent,
            MAX(order_date) as last_order_date
          FROM ${this.ordersTable}
          GROUP BY customer_id
        ) order_stats ON c.customer_id = order_stats.customer_id
        ${whereClause}
        ORDER BY c.created_at DESC, c.customer_id DESC
        LIMIT $${paramIndex}
      `;

      const result = await pool.query(query, queryParams);

      // Get basic statistics
      const statsQuery = `
        SELECT 
          COUNT(*) as total_users,
          COUNT(CASE WHEN user_role = 1 THEN 1 END) as total_admins,
          COUNT(CASE WHEN user_role = 2 THEN 1 END) as total_customers,
          COUNT(CASE WHEN created_at > NOW() - INTERVAL '30 days' THEN 1 END) as new_this_month,
          COUNT(CASE WHEN updated_at > NOW() - INTERVAL '7 days' THEN 1 END) as active_this_week
        FROM ${this.customerTable}
      `;

      const statsResult = await pool.query(statsQuery);

      return {
        success: true,
        data: {
          users: result.rows,
          totalUsers: result.rows.length,
          stats: statsResult.rows[0],
        },
        message: "Users retrieved successfully for admin",
      };
    } catch (error) {
      console.error("Database error in getAllUsersForAdmin:", error);
      return {
        success: false,
        message: "Failed to retrieve users for admin",
        error: error.message,
      };
    }
  }

  /**
   * Get detailed user information for admin
   * @param {number} userId - User ID
   * @returns {Object} Complete user details with order history
   */
  async getAdminUserDetails(userId) {
    try {
      // Get user basic info
      const userQuery = `
        SELECT 
          c.*,
          CASE 
            WHEN c.updated_at > NOW() - INTERVAL '30 days' THEN 'active'
            ELSE 'inactive'
          END as status
        FROM ${this.customerTable} c
        WHERE c.customer_id = $1
      `;

      const userResult = await pool.query(userQuery, [userId]);

      if (userResult.rows.length === 0) {
        return {
          success: false,
          message: "User not found",
        };
      }

      // Get user's orders
      const ordersQuery = `
        SELECT 
          o.order_id,
          o.order_reference,
          o.order_date,
          o.order_status,
          o.order_total,
          COUNT(od.order_id) as item_count
        FROM ${this.ordersTable} o
        LEFT JOIN ${this.orderDetailsTable} od ON o.order_id = od.order_id
        WHERE o.customer_id = $1
        GROUP BY o.order_id, o.order_reference, o.order_date, o.order_status, o.order_total
        ORDER BY o.order_date DESC
        LIMIT 10
      `;

      const ordersResult = await pool.query(ordersQuery, [userId]);

      // Get order statistics
      const orderStatsQuery = `
        SELECT 
          COUNT(*) as total_orders,
          COALESCE(SUM(order_total), 0) as total_spent,
          COALESCE(AVG(order_total), 0) as average_order_value,
          MAX(order_date) as last_order_date,
          COUNT(CASE WHEN order_status = 'delivered' THEN 1 END) as delivered_orders,
          COUNT(CASE WHEN order_status = 'pending' THEN 1 END) as pending_orders
        FROM ${this.ordersTable}
        WHERE customer_id = $1
      `;

      const orderStatsResult = await pool.query(orderStatsQuery, [userId]);

      return {
        success: true,
        data: {
          user: userResult.rows[0],
          orders: ordersResult.rows,
          orderStats: orderStatsResult.rows[0],
          recentActivity: {
            lastLogin: userResult.rows[0].updated_at,
            accountAge: userResult.rows[0].created_at,
          },
        },
        message: "Admin user details retrieved successfully",
      };
    } catch (error) {
      console.error("Database error in getAdminUserDetails:", error);
      return {
        success: false,
        message: "Failed to retrieve admin user details",
        error: error.message,
      };
    }
  }

  /**
   * Get user statistics for admin dashboard
   * @returns {Object} User statistics and recent users
   */
  async getUserStatistics() {
    try {
      // Get comprehensive user statistics
      const statsQuery = `
        SELECT 
          COUNT(*) as total_users,
          COUNT(CASE WHEN user_role = 1 THEN 1 END) as total_admins,
          COUNT(CASE WHEN user_role = 2 THEN 1 END) as total_customers,
          COUNT(CASE WHEN created_at > NOW() - INTERVAL '30 days' THEN 1 END) as new_this_month,
          COUNT(CASE WHEN created_at > NOW() - INTERVAL '7 days' THEN 1 END) as new_this_week,
          COUNT(CASE WHEN updated_at > NOW() - INTERVAL '7 days' THEN 1 END) as active_this_week,
          COUNT(CASE WHEN updated_at > NOW() - INTERVAL '30 days' THEN 1 END) as active_this_month
        FROM ${this.customerTable}
      `;

      const statsResult = await pool.query(statsQuery);

      // Get recent users
      const recentUsersQuery = `
        SELECT 
          customer_id,
          customer_name,
          customer_email,
          user_role,
          created_at
        FROM ${this.customerTable}
        ORDER BY created_at DESC
        LIMIT 5
      `;

      const recentUsersResult = await pool.query(recentUsersQuery);

      return {
        success: true,
        data: {
          stats: statsResult.rows[0],
          recentUsers: recentUsersResult.rows,
        },
        message: "User statistics retrieved successfully",
      };
    } catch (error) {
      console.error("Database error in getUserStatistics:", error);
      return {
        success: false,
        message: "Failed to retrieve user statistics",
        error: error.message,
      };
    }
  }

  /**
   * Update user status (active/inactive)
   * @param {number} userId - User ID
   * @param {string} status - New status
   * @returns {Object} Update result
   */
  async updateUserStatus(userId, status) {
    try {
      const updateTime =
        status === "active" ? "NOW()" : "NOW() - INTERVAL '60 days'";

      const query = `
        UPDATE ${this.customerTable}
        SET updated_at = ${updateTime}
        WHERE customer_id = $1
        RETURNING customer_id, customer_name, customer_email
      `;

      const result = await pool.query(query, [userId]);

      if (result.rows.length === 0) {
        return {
          success: false,
          message: "User not found",
        };
      }

      return {
        success: true,
        data: result.rows[0],
        message: `User status updated to ${status} successfully`,
      };
    } catch (error) {
      console.error("Database error in updateUserStatus:", error);
      return {
        success: false,
        message: "Failed to update user status",
        error: error.message,
      };
    }
  }

  /**
   * Update user role
   * @param {number} userId - User ID
   * @param {number} newRole - New role (1 = admin, 2 = customer)
   * @returns {Object} Update result
   */
  async updateUserRole(userId, newRole) {
    try {
      const query = `
        UPDATE ${this.customerTable}
        SET user_role = $1, updated_at = NOW()
        WHERE customer_id = $2
        RETURNING customer_id, customer_name, customer_email, user_role
      `;

      const result = await pool.query(query, [newRole, userId]);

      if (result.rows.length === 0) {
        return {
          success: false,
          message: "User not found",
        };
      }

      const roleName = newRole === 1 ? "Admin" : "Customer";

      return {
        success: true,
        data: result.rows[0],
        message: `User role updated to ${roleName} successfully`,
      };
    } catch (error) {
      console.error("Database error in updateUserRole:", error);
      return {
        success: false,
        message: "Failed to update user role",
        error: error.message,
      };
    }
  }
}

export default UserClass;
