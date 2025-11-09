import pool from "../config/db.js";
import crypto from "crypto";

class CartClass {
  constructor() {
    this.tableName = "cart";
  }

  /**
   * Generate a secure session ID for guest users
   * @returns {string} Secure session ID
   */
  generateSessionId() {
    return crypto.randomBytes(32).toString("hex");
  }

  /**
   * Add a product to the cart
   * @param {string} sessionId - Session ID for guest users
   * @param {number} customerId - Customer ID for logged users
   * @param {number} productId - Product ID to add
   * @param {number} quantity - Quantity to add
   */
  async addProduct(
    sessionId = null,
    customerId = null,
    productId,
    quantity = 1
  ) {
    try {
      // Validate input
      if (!sessionId && !customerId) {
        throw new Error("Either sessionId or customerId must be provided");
      }

      if (sessionId && customerId) {
        throw new Error("Cannot provide both sessionId and customerId");
      }

      // Check if product exists in cart
      const existingItem = await this.checkProductExists(
        sessionId,
        customerId,
        productId
      );

      if (existingItem) {
        // Update quantity
        return await this.updateQuantity(
          sessionId,
          customerId,
          productId,
          existingItem.qty + quantity
        );
      } else {
        // Add new item
        const query = `
          INSERT INTO ${this.tableName} (session_id, c_id, p_id, qty, created_at, updated_at)
          VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          RETURNING *
        `;

        const values = [sessionId, customerId, productId, quantity];
        const result = await pool.query(query, values);

        return {
          success: true,
          message: "Product added to cart successfully",
          data: result.rows[0],
        };
      }
    } catch (error) {
      console.error("Error adding product to cart:", error);
      return {
        success: false,
        message: "Failed to add product to cart",
        error: error.message,
      };
    }
  }

  /**
   * Get cart items for a user
   * @param {string} sessionId - Session ID for guest users
   * @param {number} customerId - Customer ID for logged users
   */
  async getCartItems(sessionId = null, customerId = null) {
    try {
      let query, values;

      if (customerId) {
        query = `
          SELECT 
            c.p_id as product_id,
            c.c_id as customer_id,
            c.session_id,
            c.qty,
            c.created_at,
            c.updated_at,
            p.product_title,
            p.product_price,
            p.product_qty as stock_qty,
            p.product_image,
            p.product_desc,
            cat.cat_name as category_name,
            b.brand_name,
            (c.qty * p.product_price) as item_total
          FROM ${this.tableName} c
          JOIN products p ON c.p_id = p.product_id
          JOIN categories cat ON p.product_cat = cat.cat_id
          JOIN brands b ON p.product_brand = b.brand_id
          WHERE c.c_id = $1
          ORDER BY c.created_at DESC
        `;
        values = [customerId];
      } else {
        query = `
          SELECT 
            c.p_id as product_id,
            c.c_id as customer_id,
            c.session_id,
            c.qty,
            c.created_at,
            c.updated_at,
            p.product_title,
            p.product_price,
            p.product_qty as stock_qty,
            p.product_image,
            p.product_desc,
            cat.cat_name as category_name,
            b.brand_name,
            (c.qty * p.product_price) as item_total
          FROM ${this.tableName} c
          JOIN products p ON c.p_id = p.product_id
          JOIN categories cat ON p.product_cat = cat.cat_id
          JOIN brands b ON p.product_brand = b.brand_id
          WHERE c.session_id = $1
          ORDER BY c.created_at DESC
        `;
        values = [sessionId];
      }

      const result = await pool.query(query, values);

      // Calculate totals
      const items = result.rows;
      const totalQuantity = items.reduce(
        (sum, item) => sum + parseInt(item.qty),
        0
      );
      const totalAmount = items.reduce(
        (sum, item) => sum + parseFloat(item.item_total),
        0
      );

      return {
        success: true,
        message: "Cart items retrieved successfully",
        data: {
          items: items,
          totals: {
            totalItems: items.length,
            totalQuantity: totalQuantity,
            totalAmount: parseFloat(totalAmount.toFixed(2)),
          },
        },
      };
    } catch (error) {
      console.error("Error retrieving cart items:", error);
      return {
        success: false,
        message: "Failed to retrieve cart items",
        error: error.message,
      };
    }
  }

  /**
   * Transfer cart from session to customer when user logs in
   * @param {string} sessionId - Guest session ID
   * @param {number} customerId - Customer ID after login
   */
  async transferCartToUser(sessionId, customerId) {
    try {
      // Get existing customer cart
      const customerCart = await this.getCartItems(null, customerId);
      const customerItems = customerCart.success ? customerCart.data.items : [];

      // Get session cart
      const sessionCart = await this.getCartItems(sessionId, null);
      const sessionItems = sessionCart.success ? sessionCart.data.items : [];

      if (sessionItems.length === 0) {
        return {
          success: true,
          message: "No session cart to transfer",
        };
      }

      // Merge carts
      for (const sessionItem of sessionItems) {
        const existingItem = customerItems.find(
          (item) => item.product_id === sessionItem.product_id
        );

        if (existingItem) {
          // Update quantity
          await this.updateQuantity(
            null,
            customerId,
            sessionItem.product_id,
            existingItem.qty + sessionItem.qty
          );
        } else {
          // Transfer item to customer
          const query = `
            UPDATE ${this.tableName} 
            SET c_id = $1, session_id = NULL, updated_at = CURRENT_TIMESTAMP
            WHERE session_id = $2 AND p_id = $3
          `;
          await pool.query(query, [
            customerId,
            sessionId,
            sessionItem.product_id,
          ]);
        }
      }

      // Clear remaining session items
      await this.emptyCart(sessionId, null);

      return {
        success: true,
        message: "Cart transferred successfully",
      };
    } catch (error) {
      console.error("Error transferring cart:", error);
      return {
        success: false,
        message: "Failed to transfer cart",
        error: error.message,
      };
    }
  }

  /**
   * Update quantity of cart item
   */
  async updateQuantity(
    sessionId = null,
    customerId = null,
    productId,
    newQuantity
  ) {
    try {
      if (newQuantity <= 0) {
        return await this.removeProduct(sessionId, customerId, productId);
      }

      let query, values;

      if (customerId) {
        query = `
          UPDATE ${this.tableName} 
          SET qty = $1, updated_at = CURRENT_TIMESTAMP
          WHERE c_id = $2 AND p_id = $3
          RETURNING *
        `;
        values = [newQuantity, customerId, productId];
      } else {
        query = `
          UPDATE ${this.tableName} 
          SET qty = $1, updated_at = CURRENT_TIMESTAMP
          WHERE session_id = $2 AND p_id = $3
          RETURNING *
        `;
        values = [newQuantity, sessionId, productId];
      }

      const result = await pool.query(query, values);

      return {
        success: true,
        message: "Quantity updated successfully",
        data: result.rows[0],
      };
    } catch (error) {
      console.error("Error updating quantity:", error);
      return {
        success: false,
        message: "Failed to update quantity",
        error: error.message,
      };
    }
  }

  /**
   * Remove product from cart
   */
  async removeProduct(sessionId = null, customerId = null, productId) {
    try {
      let query, values;

      if (customerId) {
        query = `DELETE FROM ${this.tableName} WHERE c_id = $1 AND p_id = $2 RETURNING *`;
        values = [customerId, productId];
      } else {
        query = `DELETE FROM ${this.tableName} WHERE session_id = $1 AND p_id = $2 RETURNING *`;
        values = [sessionId, productId];
      }

      const result = await pool.query(query, values);

      return {
        success: true,
        message: "Product removed successfully",
        data: result.rows[0],
      };
    } catch (error) {
      console.error("Error removing product:", error);
      return {
        success: false,
        message: "Failed to remove product",
        error: error.message,
      };
    }
  }

  /**
   * Empty entire cart
   */
  async emptyCart(sessionId = null, customerId = null) {
    try {
      let query, values;

      if (customerId) {
        query = `DELETE FROM ${this.tableName} WHERE c_id = $1 RETURNING *`;
        values = [customerId];
      } else {
        query = `DELETE FROM ${this.tableName} WHERE session_id = $1 RETURNING *`;
        values = [sessionId];
      }

      const result = await pool.query(query, values);

      return {
        success: true,
        message: `Cart emptied. Removed ${result.rows.length} items.`,
        data: result.rows,
      };
    } catch (error) {
      console.error("Error emptying cart:", error);
      return {
        success: false,
        message: "Failed to empty cart",
        error: error.message,
      };
    }
  }

  /**
   * Check if product exists in cart
   */
  async checkProductExists(sessionId = null, customerId = null, productId) {
    try {
      let query, values;

      if (customerId) {
        query = `SELECT * FROM ${this.tableName} WHERE c_id = $1 AND p_id = $2`;
        values = [customerId, productId];
      } else {
        query = `SELECT * FROM ${this.tableName} WHERE session_id = $1 AND p_id = $2`;
        values = [sessionId, productId];
      }

      const result = await pool.query(query, values);
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      console.error("Error checking product exists:", error);
      return null;
    }
  }

  /**
   * Get cart count
   */
  async getCartCount(sessionId = null, customerId = null) {
    try {
      let query, values;

      if (customerId) {
        query = `
          SELECT 
            COUNT(*) as item_count,
            COALESCE(SUM(qty), 0) as total_quantity
          FROM ${this.tableName} WHERE c_id = $1
        `;
        values = [customerId];
      } else {
        query = `
          SELECT 
            COUNT(*) as item_count,
            COALESCE(SUM(qty), 0) as total_quantity
          FROM ${this.tableName} WHERE session_id = $1
        `;
        values = [sessionId];
      }

      const result = await pool.query(query, values);
      const row = result.rows[0];

      return {
        success: true,
        data: {
          itemCount: parseInt(row.item_count),
          totalQuantity: parseInt(row.total_quantity),
        },
      };
    } catch (error) {
      console.error("Error getting cart count:", error);
      return {
        success: false,
        message: "Failed to get cart count",
        error: error.message,
      };
    }
  }

  /**
   * Get cart items for checkout validation (with current prices and stock)
   * @param {string} sessionId - Session ID for guest users
   * @param {number} customerId - Customer ID for logged users
   */
  async getCartForCheckout(sessionId = null, customerId = null) {
    try {
      let query, values;

      if (customerId) {
        query = `
          SELECT 
            c.p_id as product_id,
            c.c_id as customer_id,
            c.qty,
            p.product_title,
            p.product_price,
            p.product_qty as stock_qty,
            p.product_image,
            cat.cat_name as category_name,
            b.brand_name,
            (c.qty * p.product_price) as item_total
          FROM ${this.tableName} c
          JOIN products p ON c.p_id = p.product_id
          JOIN categories cat ON p.product_cat = cat.cat_id
          JOIN brands b ON p.product_brand = b.brand_id
          WHERE c.c_id = $1 AND p.product_qty >= c.qty
          ORDER BY c.created_at DESC
        `;
        values = [customerId];
      } else {
        query = `
          SELECT 
            c.p_id as product_id,
            c.c_id as customer_id,
            c.qty,
            p.product_title,
            p.product_price,
            p.product_qty as stock_qty,
            p.product_image,
            cat.cat_name as category_name,
            b.brand_name,
            (c.qty * p.product_price) as item_total
          FROM ${this.tableName} c
          JOIN products p ON c.p_id = p.product_id
          JOIN categories cat ON p.product_cat = cat.cat_id
          JOIN brands b ON p.product_brand = b.brand_id
          WHERE c.session_id = $1 AND p.product_qty >= c.qty
          ORDER BY c.created_at DESC
        `;
        values = [sessionId];
      }

      const result = await pool.query(query, values);

      // Calculate totals
      const items = result.rows;
      const totalQuantity = items.reduce(
        (sum, item) => sum + parseInt(item.qty),
        0
      );
      const totalAmount = items.reduce(
        (sum, item) => sum + parseFloat(item.item_total),
        0
      );

      return {
        success: true,
        message: "Cart items for checkout retrieved successfully",
        data: {
          items: items,
          totals: {
            totalItems: items.length,
            totalQuantity: totalQuantity,
            totalAmount: parseFloat(totalAmount.toFixed(2)),
          },
        },
      };
    } catch (error) {
      console.error("Error retrieving cart for checkout:", error);
      return {
        success: false,
        message: "Failed to retrieve cart for checkout",
        error: error.message,
      };
    }
  }
}

export default CartClass;
