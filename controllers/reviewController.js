import Review from "../model/reviewClass.js";

class ReviewController {
  // Add a new review
  static async addReview(req, res) {
    try {
      const { product_id, rating, review_title, review_text } = req.body;
      const customer_id = req.session.user?.customer_id;

      // Validation
      if (!customer_id) {
        return res.status(401).json({
          success: false,
          message: "Please log in to leave a review",
        });
      }

      if (!product_id || !rating || !review_title) {
        return res.status(400).json({
          success: false,
          message: "Product ID, rating, and review title are required",
        });
      }

      if (rating < 1 || rating > 5) {
        return res.status(400).json({
          success: false,
          message: "Rating must be between 1 and 5 stars",
        });
      }

      // Check if customer has purchased this product
      const verifiedPurchase = await Review.checkVerifiedPurchase(
        product_id,
        customer_id
      );

      const reviewData = {
        product_id,
        customer_id,
        order_id: verifiedPurchase.orderId,
        rating: parseInt(rating),
        review_title: review_title.trim(),
        review_text: review_text?.trim() || null,
        is_verified_purchase: verifiedPurchase.isVerified,
      };

      const newReview = await Review.addReview(reviewData);

      res.json({
        success: true,
        message: "Review added successfully",
        data: newReview,
      });
    } catch (error) {
      console.error("Error in addReview:", error);

      if (error.message.includes("already reviewed")) {
        return res.status(409).json({
          success: false,
          message: "You have already reviewed this product",
        });
      }

      res.status(500).json({
        success: false,
        message: "Failed to add review",
        error: error.message,
      });
    }
  }

  // Get reviews for a product
  static async getProductReviews(req, res) {
    try {
      const { productId } = req.params;

      if (!productId) {
        return res.status(400).json({
          success: false,
          message: "Product ID is required",
        });
      }

      const [reviews, stats] = await Promise.all([
        Review.getProductReviews(productId),
        Review.getReviewStats(productId),
      ]);

      res.json({
        success: true,
        message: "Reviews retrieved successfully",
        data: {
          reviews,
          stats,
        },
      });
    } catch (error) {
      console.error("Error in getProductReviews:", error);
      res.status(500).json({
        success: false,
        message: "Failed to retrieve reviews",
        error: error.message,
      });
    }
  }

  // Get customer's review for a product
  static async getCustomerReview(req, res) {
    try {
      const { productId } = req.params;
      const customer_id = req.session.user?.customer_id;

      if (!customer_id) {
        return res.status(401).json({
          success: false,
          message: "Please log in first",
        });
      }

      const review = await Review.getCustomerReview(productId, customer_id);

      res.json({
        success: true,
        message: review ? "Review found" : "No review found",
        data: review || null,
      });
    } catch (error) {
      console.error("Error in getCustomerReview:", error);
      res.status(500).json({
        success: false,
        message: "Failed to retrieve customer review",
        error: error.message,
      });
    }
  }

  // Update a review
  static async updateReview(req, res) {
    try {
      const { reviewId } = req.params;
      const { rating, review_title, review_text } = req.body;
      const customer_id = req.session.user?.customer_id;

      if (!customer_id) {
        return res.status(401).json({
          success: false,
          message: "Please log in first",
        });
      }

      if (!rating || !review_title) {
        return res.status(400).json({
          success: false,
          message: "Rating and review title are required",
        });
      }

      const updateData = {
        rating: parseInt(rating),
        review_title: review_title.trim(),
        review_text: review_text?.trim() || null,
      };

      const updatedReview = await Review.updateReview(
        reviewId,
        customer_id,
        updateData
      );

      if (!updatedReview) {
        return res.status(404).json({
          success: false,
          message: "Review not found or you don't have permission to update it",
        });
      }

      res.json({
        success: true,
        message: "Review updated successfully",
        data: updatedReview,
      });
    } catch (error) {
      console.error("Error in updateReview:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update review",
        error: error.message,
      });
    }
  }

  // Delete a review
  static async deleteReview(req, res) {
    try {
      const { reviewId } = req.params;
      const customer_id = req.session.user?.customer_id;

      if (!customer_id) {
        return res.status(401).json({
          success: false,
          message: "Please log in first",
        });
      }

      const deleted = await Review.deleteReview(reviewId, customer_id);

      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: "Review not found or you don't have permission to delete it",
        });
      }

      res.json({
        success: true,
        message: "Review deleted successfully",
      });
    } catch (error) {
      console.error("Error in deleteReview:", error);
      res.status(500).json({
        success: false,
        message: "Failed to delete review",
        error: error.message,
      });
    }
  }

  // Get recent reviews (for admin dashboard)
  static async getRecentReviews(req, res) {
    try {
      const limit = parseInt(req.query.limit) || 5;
      const reviews = await Review.getRecentReviews(limit);

      res.json({
        success: true,
        message: "Recent reviews retrieved successfully",
        data: reviews,
      });
    } catch (error) {
      console.error("Error in getRecentReviews:", error);
      res.status(500).json({
        success: false,
        message: "Failed to retrieve recent reviews",
        error: error.message,
      });
    }
  }

  // Get review statistics only
  static async getReviewStats(req, res) {
    try {
      const { productId } = req.params;

      if (!productId) {
        return res.status(400).json({
          success: false,
          message: "Product ID is required",
        });
      }

      const stats = await Review.getReviewStats(productId);

      res.json({
        success: true,
        message: "Review statistics retrieved successfully",
        data: stats,
      });
    } catch (error) {
      console.error("Error in getReviewStats:", error);
      res.status(500).json({
        success: false,
        message: "Failed to retrieve review statistics",
        error: error.message,
      });
    }
  }
}

export default ReviewController;
