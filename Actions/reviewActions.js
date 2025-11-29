import { Router } from "express";
import ReviewController from "../controllers/reviewController.js";

const router = Router();

// === Core Review Operations ===

// Add a new review (includes all validation checks internally)
router.post("/add", ReviewController.addReview);

// Get all reviews for a product (includes stats)
router.get("/product/:productId", ReviewController.getProductReviews);

// Get customer's specific review for a product
router.get("/customer/:productId", ReviewController.getCustomerReview);

// Update a review
router.put("/:reviewId", ReviewController.updateReview);

// Delete a review
router.delete("/:reviewId", ReviewController.deleteReview);

// === Admin & Analytics ===

// Get review statistics only
router.get("/stats/:productId", ReviewController.getReviewStats);

// Get recent reviews (for admin dashboard)
router.get("/recent", ReviewController.getRecentReviews);

export default router;
