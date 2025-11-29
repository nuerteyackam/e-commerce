import pool from "../config/db.js";

class Review {
  // Add a new review
  static async addReview(reviewData) {
    try {
      const {
        product_id,
        customer_id,
        order_id = null,
        rating,
        review_title,
        review_text,
        is_verified_purchase = false,
      } = reviewData;

      // Check if user already reviewed this product
      const existingReview = await this.checkExistingReview(
        product_id,
        customer_id
      );
      if (existingReview) {
        throw new Error("You have already reviewed this product");
      }

      const query = `
        INSERT INTO product_reviews (
          product_id, 
          customer_id, 
          order_id, 
          rating, 
          review_title, 
          review_text, 
          is_verified_purchase,
          created_at
        ) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP) 
        RETURNING review_id, product_id, rating, created_at
      `;

      const result = await pool.query(query, [
        product_id,
        customer_id,
        order_id,
        rating,
        review_title,
        review_text,
        is_verified_purchase,
      ]);

      return result.rows[0];
    } catch (error) {
      console.error("Database error in addReview:", error);
      throw error;
    }
  }

  // Get all reviews for a product
  static async getProductReviews(productId) {
    try {
      const query = `
        SELECT 
          r.review_id,
          r.product_id,
          r.rating,
          r.review_title,
          r.review_text,
          r.is_verified_purchase,
          r.created_at,
          c.customer_name,
          c.customer_email
        FROM product_reviews r
        JOIN customer c ON r.customer_id = c.customer_id
        WHERE r.product_id = $1 AND r.is_approved = true
        ORDER BY r.created_at DESC
      `;

      const result = await pool.query(query, [productId]);
      return result.rows;
    } catch (error) {
      console.error("Database error in getProductReviews:", error);
      throw error;
    }
  }

  // Get review statistics for a product
  static async getReviewStats(productId) {
    try {
      const query = `
        SELECT 
          COUNT(*) as total_reviews,
          AVG(rating)::NUMERIC(3,2) as average_rating,
          COUNT(CASE WHEN rating = 5 THEN 1 END) as five_star,
          COUNT(CASE WHEN rating = 4 THEN 1 END) as four_star,
          COUNT(CASE WHEN rating = 3 THEN 1 END) as three_star,
          COUNT(CASE WHEN rating = 2 THEN 1 END) as two_star,
          COUNT(CASE WHEN rating = 1 THEN 1 END) as one_star,
          COUNT(CASE WHEN is_verified_purchase = true THEN 1 END) as verified_purchases
        FROM product_reviews 
        WHERE product_id = $1 AND is_approved = true
      `;

      const result = await pool.query(query, [productId]);
      return result.rows[0];
    } catch (error) {
      console.error("Database error in getReviewStats:", error);
      throw error;
    }
  }

  // Check if customer already reviewed a product
  static async checkExistingReview(productId, customerId) {
    try {
      const query = `
        SELECT review_id 
        FROM product_reviews 
        WHERE product_id = $1 AND customer_id = $2
      `;

      const result = await pool.query(query, [productId, customerId]);
      return result.rows.length > 0;
    } catch (error) {
      console.error("Database error in checkExistingReview:", error);
      throw error;
    }
  }

  // Check if customer purchased the product
  static async checkVerifiedPurchase(productId, customerId) {
    try {
      const query = `
        SELECT DISTINCT o.order_id
        FROM orders o
        JOIN orderdetails od ON o.order_id = od.order_id
        WHERE o.customer_id = $1 AND od.product_id = $2 AND o.order_status = 'confirmed'
      `;

      const result = await pool.query(query, [customerId, productId]);
      return {
        isVerified: result.rows.length > 0,
        orderId: result.rows.length > 0 ? result.rows[0].order_id : null,
      };
    } catch (error) {
      console.error("Database error in checkVerifiedPurchase:", error);
      return { isVerified: false, orderId: null };
    }
  }

  // Update a review
  static async updateReview(reviewId, customerId, updateData) {
    try {
      const { rating, review_title, review_text } = updateData;

      const query = `
        UPDATE product_reviews 
        SET 
          rating = $1,
          review_title = $2,
          review_text = $3,
          updated_at = CURRENT_TIMESTAMP
        WHERE review_id = $4 AND customer_id = $5
        RETURNING review_id, rating, updated_at
      `;

      const result = await pool.query(query, [
        rating,
        review_title,
        review_text,
        reviewId,
        customerId,
      ]);

      return result.rows[0];
    } catch (error) {
      console.error("Database error in updateReview:", error);
      throw error;
    }
  }

  // Delete a review
  static async deleteReview(reviewId, customerId) {
    try {
      const query = `
        DELETE FROM product_reviews 
        WHERE review_id = $1 AND customer_id = $2
        RETURNING review_id
      `;

      const result = await pool.query(query, [reviewId, customerId]);
      return result.rowCount > 0;
    } catch (error) {
      console.error("Database error in deleteReview:", error);
      throw error;
    }
  }

  // Get customer's review for a product
  static async getCustomerReview(productId, customerId) {
    try {
      const query = `
        SELECT 
          review_id,
          rating,
          review_title,
          review_text,
          is_verified_purchase,
          created_at,
          updated_at
        FROM product_reviews 
        WHERE product_id = $1 AND customer_id = $2
      `;

      const result = await pool.query(query, [productId, customerId]);
      return result.rows[0];
    } catch (error) {
      console.error("Database error in getCustomerReview:", error);
      throw error;
    }
  }

  // Get recent reviews (for homepage or dashboard)
  static async getRecentReviews(limit = 5) {
    try {
      const query = `
        SELECT 
          r.review_id,
          r.rating,
          r.review_title,
          r.review_text,
          r.is_verified_purchase,
          r.created_at,
          c.customer_name,
          p.product_title,
          p.product_id
        FROM product_reviews r
        JOIN customer c ON r.customer_id = c.customer_id
        JOIN products p ON r.product_id = p.product_id
        WHERE r.is_approved = true
        ORDER BY r.created_at DESC
        LIMIT $1
      `;

      const result = await pool.query(query, [limit]);
      return result.rows;
    } catch (error) {
      console.error("Database error in getRecentReviews:", error);
      throw error;
    }
  }
}

export default Review;
