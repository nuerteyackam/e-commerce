import OrderClass from "../model/orderClass.js";
import CartClass from "../model/cartClass.js";
import { getProductByIdCtr } from "./productController.js";

class OrderController {
  constructor() {
    this.orderModel = new OrderClass();
    this.cartModel = new CartClass();
  }

  /**
   * Process checkout - Create order from cart
   * @param {string} sessionId - Session ID for guest users
   * @param {number} customerId - Customer ID for logged users
   * @returns {Object} Result of checkout process
   */
  async processCheckoutCtr(sessionId, customerId) {
    try {
      // Validate user
      if (!sessionId && !customerId) {
        throw new Error("Either session ID or customer ID is required");
      }

      if (!customerId) {
        throw new Error(
          "Only logged-in customers can checkout. Please login first."
        );
      }

      // Get cart items
      const cartResult = await this.cartModel.getCartItems(
        sessionId,
        customerId
      );

      if (!cartResult.success) {
        throw new Error(cartResult.message);
      }

      const cartItems = cartResult.data.items;

      if (!cartItems || cartItems.length === 0) {
        throw new Error("Your cart is empty");
      }

      // RE-VALIDATE PRODUCT DATA AND PRICES
      const validatedItems = await this.validateAndUpdateCartItems(cartItems);

      if (!validatedItems.success) {
        return validatedItems; // Return validation errors
      }

      const updatedCartItems = validatedItems.data.items;
      const actualTotal = validatedItems.data.total;

      // Validate stock for all cart items (using updated data)
      const stockValidation = await this.validateCartStock(updatedCartItems);
      if (!stockValidation.valid) {
        return {
          success: false,
          message: "Some items in your cart are out of stock",
          data: {
            outOfStockItems: stockValidation.outOfStockItems,
          },
        };
      }

      // Generate order reference
      const orderReference = this.orderModel.generateOrderReference();

      // Create order with ACTUAL current prices
      const orderResult = await this.orderModel.createOrder(
        customerId,
        orderReference,
        actualTotal
      );

      if (!orderResult.success) {
        throw new Error(orderResult.message);
      }

      const orderId = orderResult.data.orderId;

      // Add order details with CURRENT product data
      const orderDetailsResult = await this.orderModel.addOrderDetails(
        orderId,
        updatedCartItems
      );

      if (!orderDetailsResult.success) {
        throw new Error("Failed to add order details");
      }

      return {
        success: true,
        message: "Order created successfully. Please proceed to payment.",
        data: {
          orderId: orderId,
          orderReference: orderReference,
          total: actualTotal,
          items: updatedCartItems,
          itemCount: updatedCartItems.length,
          priceUpdated: validatedItems.data.priceChanged || false,
        },
      };
    } catch (error) {
      console.error("Process checkout controller error:", error);
      return {
        success: false,
        message: error.message || "Failed to process checkout",
      };
    }
  }

  /**
   * Validate cart items against current product data
   * @param {Array} cartItems - Cart items to validate
   * @returns {Object} Validated cart items with current prices
   */
  async validateAndUpdateCartItems(cartItems) {
    try {
      const validatedItems = [];
      let totalAmount = 0;
      let priceChanged = false;
      const priceChanges = [];

      for (const cartItem of cartItems) {
        try {
          const currentProduct = await getProductByIdCtr(cartItem.product_id);

          // Check if price changed
          const cartPrice = parseFloat(cartItem.product_price);
          const currentPrice = parseFloat(currentProduct.product_price);

          if (cartPrice !== currentPrice) {
            priceChanged = true;
            priceChanges.push({
              product_id: cartItem.product_id,
              product_title: cartItem.product_title,
              old_price: cartPrice,
              new_price: currentPrice,
              difference: currentPrice - cartPrice,
            });
          }

          // Create validated cart item with current data
          const validatedItem = {
            ...cartItem,
            product_price: currentPrice.toString(),
            product_title: currentProduct.product_title,
            stock_qty: currentProduct.product_qty,
            qty: cartItem.qty,
          };

          validatedItems.push(validatedItem);
          totalAmount += currentPrice * cartItem.qty;
        } catch (productError) {
          return {
            success: false,
            message: `Product ${cartItem.product_title} is no longer available`,
            data: { unavailableProduct: cartItem.product_id },
          };
        }
      }

      // If prices changed significantly (>5% total change), notify user
      if (priceChanged) {
        const originalTotal = cartItems.reduce(
          (sum, item) => sum + parseFloat(item.product_price) * item.qty,
          0
        );
        const totalDifference = totalAmount - originalTotal;
        const percentageChange =
          Math.abs(totalDifference / originalTotal) * 100;

        if (percentageChange > 5) {
          return {
            success: false,
            message:
              "Product prices have changed significantly. Please review your cart.",
            data: {
              priceChanges,
              oldTotal: originalTotal,
              newTotal: totalAmount,
              totalDifference: totalDifference,
            },
          };
        }
      }

      return {
        success: true,
        data: {
          items: validatedItems,
          total: totalAmount,
          priceChanged: priceChanged,
          priceChanges: priceChanges,
        },
        message: priceChanged
          ? "Prices updated to current values"
          : "Cart validated",
      };
    } catch (error) {
      console.error("Error validating cart items:", error);
      return {
        success: false,
        message: "Failed to validate cart items",
        error: error.message,
      };
    }
  }

  /**
   * Process simulated payment
   * @param {number} orderId - Order ID
   * @param {number} customerId - Customer ID
   * @param {number} amount - Payment amount
   * @param {string} currency - Currency code
   * @returns {Object} Result of payment processing
   */

  /**
   * Get customer order history
   * @param {number} customerId - Customer ID
   * @returns {Object} Customer's order history
   */
  async getCustomerOrdersCtr(customerId) {
    try {
      if (!customerId) {
        throw new Error("Customer ID is required");
      }

      const ordersResult = await this.orderModel.getCustomerOrders(customerId);

      if (!ordersResult.success) {
        throw new Error(ordersResult.message);
      }

      return {
        success: true,
        message: "Order history retrieved successfully",
        data: {
          orders: ordersResult.data.orders,
          totalOrders: ordersResult.data.totalOrders,
        },
      };
    } catch (error) {
      console.error("Get customer orders controller error:", error);
      return {
        success: false,
        message: error.message || "Failed to retrieve order history",
      };
    }
  }

  /**
   * Get order details with products
   * @param {number} orderId - Order ID
   * @param {number} customerId - Customer ID (for security)
   * @returns {Object} Order details with product information
   */
  async getOrderDetailsCtr(orderId, customerId) {
    try {
      if (!orderId || !customerId) {
        throw new Error("Order ID and customer ID are required");
      }

      // Verify the order belongs to the customer
      const ownershipResult = await this.orderModel.verifyOrderOwnership(
        orderId,
        customerId
      );
      if (!ownershipResult.success) {
        throw new Error("Order not found or access denied");
      }

      // Get order info from customer orders
      const customerOrdersResult = await this.orderModel.getCustomerOrders(
        customerId
      );
      if (!customerOrdersResult.success) {
        throw new Error("Failed to retrieve order information");
      }

      const orderInfo = customerOrdersResult.data.orders.find(
        (order) => order.order_id == orderId
      );
      if (!orderInfo) {
        throw new Error("Order not found");
      }

      // Get order details
      const orderDetailsResult = await this.orderModel.getOrderDetails(orderId);
      if (!orderDetailsResult.success) {
        throw new Error(orderDetailsResult.message);
      }

      return {
        success: true,
        message: "Order details retrieved successfully",
        data: {
          order: orderInfo,
          items: orderDetailsResult.data.items,
          itemCount: orderDetailsResult.data.itemCount,
        },
      };
    } catch (error) {
      console.error("Get order details controller error:", error);
      return {
        success: false,
        message: error.message || "Failed to retrieve order details",
      };
    }
  }

  /**
   * Validate cart stock before checkout
   * @param {Array} cartItems - Array of cart items
   * @returns {Object} Stock validation result
   */
  async validateCartStock(cartItems) {
    try {
      const outOfStockItems = [];

      for (const item of cartItems) {
        if (item.qty > item.stock_qty) {
          outOfStockItems.push({
            product_id: item.product_id,
            product_title: item.product_title,
            requested_qty: item.qty,
            available_qty: item.stock_qty,
            difference: item.qty - item.stock_qty,
          });
        }
      }

      return {
        valid: outOfStockItems.length === 0,
        outOfStockItems: outOfStockItems,
        totalOutOfStock: outOfStockItems.length,
      };
    } catch (error) {
      console.error("Error validating cart stock:", error);
      return {
        valid: false,
        error: error.message,
      };
    }
  }

  // Remove the reduceProductStock method from controller and update processPaymentCtr:

  /**
   * Process simulated payment
   * @param {number} orderId - Order ID
   * @param {number} customerId - Customer ID
   * @param {number} amount - Payment amount
   * @param {string} currency - Currency code
   * @returns {Object} Result of payment processing
   */
  async processPaymentCtr(orderId, customerId, amount, currency = "USD") {
    try {
      // Validate inputs
      if (!orderId || !customerId || !amount) {
        throw new Error("Order ID, customer ID, and amount are required");
      }

      if (amount <= 0) {
        throw new Error("Payment amount must be greater than zero");
      }

      // Verify order belongs to customer
      const ownershipResult = await this.orderModel.verifyOrderOwnership(
        orderId,
        customerId
      );
      if (!ownershipResult.success) {
        throw new Error("Order not found or access denied");
      }

      // Final stock validation before payment (using model method)
      console.log("Final stock validation before payment...");
      const orderItemsResult =
        await this.orderModel.getOrderItemsWithProductDetails(orderId);
      if (!orderItemsResult.success) {
        throw new Error("Failed to retrieve order items");
      }

      const stockValidation = await this.orderModel.validateStockAvailability(
        orderItemsResult.data.items
      );
      if (!stockValidation.success) {
        throw new Error(`Stock validation failed: ${stockValidation.message}`);
      }

      // Simulate payment processing delay
      console.log("Processing payment...");
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Randomly simulate payment failures for realism (10% failure rate)
      if (Math.random() < 0.1) {
        throw new Error("Payment processing failed. Please try again.");
      }

      const paymentResult = await this.orderModel.recordPayment(
        customerId,
        orderId,
        amount,
        currency
      );

      if (!paymentResult.success) {
        throw new Error(paymentResult.message);
      }

      // PROCESS ORDER FULFILLMENT (validate + reduce stock)
      console.log("Processing order fulfillment...");
      const fulfillmentResult = await this.orderModel.processOrderFulfillment(
        orderId
      );

      if (!fulfillmentResult.success) {
        console.error(" Order fulfillment failed:", fulfillmentResult.message);
        // Payment succeeded but fulfillment failed - this is a critical issue
        // In a real system, you might need to implement compensation logic
      } else {
        console.log("Order fulfillment completed successfully");
      }

      // Clear cart after successful payment
      const clearCartResult = await this.cartModel.emptyCart(null, customerId);

      if (!clearCartResult.success) {
        console.warn(
          "Order completed but failed to clear cart:",
          clearCartResult.message
        );
      }

      return {
        success: true,
        message: "Payment processed successfully!",
        data: {
          paymentId: paymentResult.data.paymentId,
          orderId: paymentResult.data.orderId,
          orderReference: paymentResult.data.orderReference,
          invoiceNo: paymentResult.data.invoiceNo,
          amount: paymentResult.data.amount,
          currency: currency,
          cartCleared: clearCartResult.success,
          fulfillmentCompleted: fulfillmentResult.success,
          stockUpdates: fulfillmentResult.success
            ? fulfillmentResult.data.stockUpdates
            : null,
        },
      };
    } catch (error) {
      console.error("Process payment controller error:", error);
      return {
        success: false,
        message: error.message || "Payment processing failed",
      };
    }
  }
}

export default new OrderController();
