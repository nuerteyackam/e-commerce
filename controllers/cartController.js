import CartClass from "../model/cartClass.js";

class CartController {
  constructor() {
    this.cartModel = new CartClass();
  }

  /**
   * Add product to cart controller
   * @param {string} sessionId - Session ID for guest users
   * @param {number} customerId - Customer ID for logged users
   * @param {number} productId - Product ID to add
   * @param {number} quantity - Quantity to add
   */
  async addToCartCtr(sessionId, customerId, productId, quantity = 1) {
    try {
      // Validate inputs
      if (!productId) {
        throw new Error("Product ID is required");
      }

      if (quantity <= 0) {
        throw new Error("Quantity must be greater than 0");
      }

      if (!sessionId && !customerId) {
        throw new Error("Either session ID or customer ID is required");
      }

      // Add to cart using the cart model
      const result = await this.cartModel.addProduct(
        sessionId,
        customerId,
        productId,
        quantity
      );

      if (!result.success) {
        throw new Error(result.message);
      }

      // Get updated cart count
      const cartCount = await this.cartModel.getCartCount(
        sessionId,
        customerId
      );

      return {
        success: true,
        message: "Item added to cart successfully",
        data: result.data,
        cartCount: cartCount.success ? cartCount.data.totalQuantity : 0,
      };
    } catch (error) {
      console.error("Add to cart controller error:", error);
      return {
        success: false,
        message: error.message || "Failed to add item to cart",
      };
    }
  }

  /**
   * Update cart item quantity controller
   * @param {string} sessionId - Session ID for guest users
   * @param {number} customerId - Customer ID for logged users
   * @param {number} productId - Product ID to update
   * @param {number} newQuantity - New quantity
   */
  async updateCartItemCtr(sessionId, customerId, productId, newQuantity) {
    try {
      if (!productId) {
        throw new Error("Product ID is required");
      }

      if (newQuantity < 0) {
        throw new Error("Quantity cannot be negative");
      }

      if (!sessionId && !customerId) {
        throw new Error("Either session ID or customer ID is required");
      }

      // Update quantity using cart model
      const result = await this.cartModel.updateQuantity(
        sessionId,
        customerId,
        productId,
        newQuantity
      );

      if (!result.success) {
        throw new Error(result.message);
      }

      // Get updated cart items and count
      const cartItems = await this.cartModel.getCartItems(
        sessionId,
        customerId
      );
      const cartCount = await this.cartModel.getCartCount(
        sessionId,
        customerId
      );

      return {
        success: true,
        message: "Cart updated successfully",
        data: {
          updatedItem: result.data,
          cartItems: cartItems.success ? cartItems.data.items : [],
          cartTotal: cartItems.success ? cartItems.data.totals.totalAmount : 0,
          cartCount: cartCount.success ? cartCount.data.totalQuantity : 0,
        },
      };
    } catch (error) {
      console.error("Update cart controller error:", error);
      return {
        success: false,
        message: error.message || "Failed to update cart",
      };
    }
  }

  /**
   * Remove item from cart controller
   * @param {string} sessionId - Session ID for guest users
   * @param {number} customerId - Customer ID for logged users
   * @param {number} productId - Product ID to remove
   */
  async removeFromCartCtr(sessionId, customerId, productId) {
    try {
      if (!productId) {
        throw new Error("Product ID is required");
      }

      if (!sessionId && !customerId) {
        throw new Error("Either session ID or customer ID is required");
      }

      // Remove item using cart model
      const result = await this.cartModel.removeProduct(
        sessionId,
        customerId,
        productId
      );

      if (!result.success) {
        throw new Error(result.message);
      }

      // Get updated cart count
      const cartCount = await this.cartModel.getCartCount(
        sessionId,
        customerId
      );

      return {
        success: true,
        message: "Item removed from cart successfully",
        data: result.data,
        cartCount: cartCount.success ? cartCount.data.totalQuantity : 0,
      };
    } catch (error) {
      console.error("Remove from cart controller error:", error);
      return {
        success: false,
        message: error.message || "Failed to remove item from cart",
      };
    }
  }

  /**
   * Get user cart controller
   * @param {string} sessionId - Session ID for guest users
   * @param {number} customerId - Customer ID for logged users
   */
  async getUserCartCtr(sessionId, customerId) {
    try {
      if (!sessionId && !customerId) {
        // Return empty cart for completely new users
        return {
          success: true,
          message: "Empty cart retrieved",
          data: {
            items: [],
            totals: {
              totalItems: 0,
              totalQuantity: 0,
              totalAmount: 0,
            },
            cartCount: 0,
          },
        };
      }

      // Get cart items using cart model
      const cartItems = await this.cartModel.getCartItems(
        sessionId,
        customerId
      );

      if (!cartItems.success) {
        throw new Error(cartItems.message);
      }

      // Get cart count
      const cartCount = await this.cartModel.getCartCount(
        sessionId,
        customerId
      );

      return {
        success: true,
        message: "Cart retrieved successfully",
        data: {
          items: cartItems.data.items,
          totals: cartItems.data.totals,
          cartCount: cartCount.success ? cartCount.data.totalQuantity : 0,
        },
      };
    } catch (error) {
      console.error("Get user cart controller error:", error);
      return {
        success: false,
        message: error.message || "Failed to retrieve cart",
      };
    }
  }

  /**
   * Empty cart controller
   * @param {string} sessionId - Session ID for guest users
   * @param {number} customerId - Customer ID for logged users
   */
  async emptyCartCtr(sessionId, customerId) {
    try {
      if (!sessionId && !customerId) {
        throw new Error("Either session ID or customer ID is required");
      }

      // Empty cart using cart model
      const result = await this.cartModel.emptyCart(sessionId, customerId);

      if (!result.success) {
        throw new Error(result.message);
      }

      return {
        success: true,
        message: "Cart emptied successfully",
        data: {
          removedItems: result.data.length,
          cartCount: 0,
        },
      };
    } catch (error) {
      console.error("Empty cart controller error:", error);
      return {
        success: false,
        message: error.message || "Failed to empty cart",
      };
    }
  }

  /**
   * Get cart count only (for navigation display)
   * @param {string} sessionId - Session ID for guest users
   * @param {number} customerId - Customer ID for logged users
   */
  async getCartCountCtr(sessionId, customerId) {
    try {
      if (!sessionId && !customerId) {
        return {
          success: true,
          data: { totalQuantity: 0, itemCount: 0 },
        };
      }

      const cartCount = await this.cartModel.getCartCount(
        sessionId,
        customerId
      );

      return {
        success: true,
        data: cartCount.success
          ? cartCount.data
          : { totalQuantity: 0, itemCount: 0 },
      };
    } catch (error) {
      console.error("Get cart count controller error:", error);
      return {
        success: false,
        message: "Failed to get cart count",
        data: { totalQuantity: 0, itemCount: 0 },
      };
    }
  }
}

// Export instance to be used by action files
export default new CartController();
