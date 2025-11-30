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
      console.log("🔍 DEBUG: Order controller starting");
      console.log("🔍 DEBUG: sessionId =", sessionId);
      console.log("🔍 DEBUG: customerId =", customerId);

      // Validate user
      if (!sessionId && !customerId) {
        console.log("DEBUG: Neither sessionId nor customerId provided");
        throw new Error("Either session ID or customer ID is required");
      }

      if (!customerId) {
        console.log("DEBUG: No customerId provided");
        throw new Error(
          "Only logged-in customers can checkout. Please login first."
        );
      }

      console.log(
        "🔍 DEBUG: Calling cartModel.getCartItems with sessionId:",
        sessionId,
        "customerId:",
        customerId
      );

      // Get cart items
      const cartResult = await this.cartModel.getCartItems(
        sessionId,
        customerId
      );

      console.log("🔍 DEBUG: Cart model result:", cartResult);
      console.log("🔍 DEBUG: Cart success:", cartResult.success);
      console.log("🔍 DEBUG: Cart message:", cartResult.message);
      console.log("🔍 DEBUG: Cart data:", cartResult.data);

      if (!cartResult.success) {
        console.log("❌ DEBUG: Cart model failed:", cartResult.message);
        throw new Error(cartResult.message);
      }

      const cartItems = cartResult.data.items;
      console.log("🔍 DEBUG: Cart items:", cartItems);
      console.log(
        "🔍 DEBUG: Cart items length:",
        cartItems ? cartItems.length : "undefined"
      );

      if (!cartItems || cartItems.length === 0) {
        console.log("❌ DEBUG: Cart items array is empty or undefined");
        throw new Error("Your cart is empty");
      }

      console.log(
        "✅ DEBUG: Found",
        cartItems.length,
        "items in cart, proceeding with validation..."
      );

      // RE-VALIDATE PRODUCT DATA AND PRICES
      const validatedItems = await this.validateAndUpdateCartItems(cartItems);

      console.log("🔍 DEBUG: Validation result:", validatedItems);

      if (!validatedItems.success) {
        console.log(
          "❌ DEBUG: Item validation failed:",
          validatedItems.message
        );
        return validatedItems; // Return validation errors
      }

      const updatedCartItems = validatedItems.data.items;
      const actualTotal = validatedItems.data.total;

      console.log(
        "🔍 DEBUG: Validated cart items:",
        updatedCartItems.length,
        "items"
      );
      console.log("🔍 DEBUG: Actual total:", actualTotal);

      // Validate stock for all cart items (using updated data)
      const stockValidation = await this.validateCartStock(updatedCartItems);
      console.log("🔍 DEBUG: Stock validation result:", stockValidation);

      if (!stockValidation.valid) {
        console.log(
          "❌ DEBUG: Stock validation failed:",
          stockValidation.outOfStockItems
        );
        return {
          success: false,
          message: "Some items in your cart are out of stock",
          data: {
            outOfStockItems: stockValidation.outOfStockItems,
          },
        };
      }

      console.log("✅ DEBUG: Stock validation passed, creating order...");

      // Generate order reference
      const orderReference = this.orderModel.generateOrderReference();
      console.log("🔍 DEBUG: Generated order reference:", orderReference);

      // Create order with ACTUAL current prices
      const orderResult = await this.orderModel.createOrder(
        customerId,
        orderReference,
        actualTotal
      );

      console.log("🔍 DEBUG: Order creation result:", orderResult);

      if (!orderResult.success) {
        console.log("❌ DEBUG: Order creation failed:", orderResult.message);
        throw new Error(orderResult.message);
      }

      const orderId = orderResult.data.orderId;
      console.log("🔍 DEBUG: Created order with ID:", orderId);

      // Add order details with CURRENT product data
      const orderDetailsResult = await this.orderModel.addOrderDetails(
        orderId,
        updatedCartItems
      );

      console.log("🔍 DEBUG: Order details result:", orderDetailsResult);

      if (!orderDetailsResult.success) {
        console.log("❌ DEBUG: Order details creation failed");
        throw new Error("Failed to add order details");
      }

      console.log("✅ DEBUG: Order created successfully!");

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
      console.error("❌ Process checkout controller error:", error);
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

  /**
   * Get customer orders with tracking (pure function)
   * @param {number} customerId - Customer ID
   * @param {number} limit - Maximum number of orders
   * @returns {Object} Orders with tracking data
   */
  async getCustomerOrdersWithTrackingCtr(customerId, limit = 50) {
    try {
      if (!customerId) {
        throw new Error("Customer ID is required");
      }

      console.log(`=== GET CUSTOMER ORDERS WITH TRACKING ===`);
      console.log(`Customer ID: ${customerId}, Limit: ${limit}`);

      const result = await this.orderModel.getCustomerOrdersWithTracking(
        customerId,
        limit
      );

      if (result.success) {
        console.log(`Found ${result.data.orders.length} orders with tracking`);
        return {
          success: true,
          data: {
            orders: result.data.orders,
            totalOrders: result.data.totalOrders,
          },
          message: result.message,
        };
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error("Error in getCustomerOrdersWithTrackingCtr:", error);
      return {
        success: false,
        message: error.message || "Failed to retrieve orders with tracking",
      };
    }
  }

  /**
   * Get order details with tracking timeline (pure function)
   * @param {number} orderId - Order ID
   * @param {number} customerId - Customer ID for security
   * @returns {Object} Order details with timeline
   */
  async getOrderDetailsWithTrackingCtr(orderId, customerId) {
    try {
      if (!orderId || !customerId) {
        throw new Error("Order ID and customer ID are required");
      }

      console.log(`=== GET ORDER DETAILS WITH TRACKING ===`);
      console.log(`Order ID: ${orderId}, Customer ID: ${customerId}`);

      const orderResult = await this.orderModel.getOrderWithTracking(
        parseInt(orderId),
        customerId
      );

      if (!orderResult.success) {
        throw new Error(orderResult.message);
      }

      // Generate timeline
      const timeline = this.orderModel.getOrderStatusTimeline(
        orderResult.data.order.order_status,
        orderResult.data.order.order_date,
        orderResult.data.order.updated_at
      );

      console.log(
        `Order ${orderId} status: ${orderResult.data.order.order_status}`
      );

      return {
        success: true,
        data: {
          order: orderResult.data.order,
          items: orderResult.data.items,
          itemCount: orderResult.data.itemCount,
          timeline: timeline.data || [],
        },
        message: "Order details with tracking retrieved successfully",
      };
    } catch (error) {
      console.error("Error in getOrderDetailsWithTrackingCtr:", error);
      return {
        success: false,
        message:
          error.message || "Failed to retrieve order details with tracking",
      };
    }
  }

  /**
   * Get order tracking information (pure function)
   * @param {number} orderId - Order ID
   * @param {number} customerId - Customer ID for security
   * @returns {Object} Order tracking data
   */
  async getOrderTrackingCtr(orderId, customerId) {
    try {
      if (!orderId || !customerId) {
        throw new Error("Order ID and customer ID are required");
      }

      console.log(`=== GET ORDER TRACKING ===`);
      console.log(`Order ID: ${orderId}, Customer ID: ${customerId}`);

      const orderResult = await this.orderModel.getOrderWithTracking(
        parseInt(orderId),
        customerId
      );

      if (!orderResult.success) {
        throw new Error(orderResult.message);
      }

      // Generate timeline
      const timeline = this.orderModel.getOrderStatusTimeline(
        orderResult.data.order.order_status,
        orderResult.data.order.order_date,
        orderResult.data.order.updated_at
      );

      return {
        success: true,
        data: {
          order: orderResult.data.order,
          timeline: timeline.data || [],
          trackingNotes: orderResult.data.order.tracking_notes,
        },
        message: "Order tracking retrieved successfully",
      };
    } catch (error) {
      console.error("Error in getOrderTrackingCtr:", error);
      return {
        success: false,
        message: error.message || "Failed to retrieve order tracking",
      };
    }
  }

  /**
   * Get order receipt data (pure function)
   * @param {number} orderId - Order ID
   * @param {number} customerId - Customer ID for security
   * @returns {Object} Order receipt data
   */
  async downloadReceiptCtr(orderId, customerId) {
    try {
      if (!orderId || !customerId) {
        throw new Error("Order ID and customer ID are required");
      }

      console.log(`=== DOWNLOAD RECEIPT ===`);
      console.log(`Order ID: ${orderId}, Customer ID: ${customerId}`);

      const receiptData = await this.orderModel.getOrderReceiptData(
        parseInt(orderId),
        customerId
      );

      if (!receiptData.success) {
        throw new Error(receiptData.message);
      }

      return {
        success: true,
        data: receiptData.data,
        message: "Receipt data retrieved successfully",
      };
    } catch (error) {
      console.error("Error in downloadReceiptCtr:", error);
      return {
        success: false,
        message: error.message || "Failed to generate receipt",
      };
    }
  }

  /**
   * Update order status (pure function - Admin only)
   * @param {number} orderId - Order ID
   * @param {string} status - New order status
   * @param {string} notes - Tracking notes
   * @param {string} userRole - User role for authorization
   * @returns {Object} Update result
   */
  async updateOrderStatusCtr(orderId, status, notes, userRole) {
    try {
      if (userRole !== 1) {
        throw new Error("Admin access required");
      }

      if (!orderId || !status) {
        throw new Error("Order ID and status are required");
      }

      console.log(`=== UPDATE ORDER STATUS (ADMIN) ===`);
      console.log(`Order ID: ${orderId}, New Status: ${status}`);

      const result = await this.orderModel.updateOrderTracking(
        parseInt(orderId),
        status,
        notes
      );

      if (result.success) {
        console.log(`Order ${orderId} status updated to: ${status}`);
      }

      return result;
    } catch (error) {
      console.error("Error in updateOrderStatusCtr:", error);
      return {
        success: false,
        message: error.message || "Failed to update order status",
      };
    }
  }

  /**
   * Get all orders for admin (pure function)
   * @param {number} limit - Maximum number of orders
   * @returns {Object} All orders with customer details
   */
  async getAllOrdersForAdminCtr(limit = 100) {
    try {
      console.log(`=== GET ALL ORDERS FOR ADMIN ===`);
      console.log(`Limit: ${limit}`);

      const result = await this.orderModel.getAllOrdersForAdmin(limit);

      if (result.success) {
        console.log(`Found ${result.data.orders.length} orders for admin`);
        return {
          success: true,
          data: {
            orders: result.data.orders,
            totalOrders: result.data.totalOrders,
          },
          message: result.message,
        };
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error("Error in getAllOrdersForAdminCtr:", error);
      return {
        success: false,
        message: error.message || "Failed to retrieve orders for admin",
      };
    }
  }

  /**
   * Get order details for admin (pure function)
   * @param {number} orderId - Order ID
   * @returns {Object} Detailed order info for admin
   */
  async getAdminOrderDetailsCtr(orderId) {
    try {
      if (!orderId) {
        throw new Error("Order ID is required");
      }

      console.log(`=== GET ADMIN ORDER DETAILS ===`);
      console.log(`Order ID: ${orderId}`);

      const orderResult = await this.orderModel.getAdminOrderDetails(
        parseInt(orderId)
      );

      if (!orderResult.success) {
        throw new Error(orderResult.message);
      }

      // Generate timeline
      const timeline = this.orderModel.getOrderStatusTimeline(
        orderResult.data.order.order_status,
        orderResult.data.order.order_date,
        orderResult.data.order.updated_at
      );

      console.log(
        `Admin viewing order ${orderId} - status: ${orderResult.data.order.order_status}`
      );

      return {
        success: true,
        data: {
          order: orderResult.data.order,
          items: orderResult.data.items,
          itemCount: orderResult.data.itemCount,
          timeline: timeline.data || [],
        },
        message: "Admin order details retrieved successfully",
      };
    } catch (error) {
      console.error("Error in getAdminOrderDetailsCtr:", error);
      return {
        success: false,
        message: error.message || "Failed to retrieve admin order details",
      };
    }
  }

  /**
   * Get order statistics for admin dashboard 
   * @returns {Object} Order statistics by status
   */
  async getOrderStatsCtr() {
    try {
      console.log(`=== GET ORDER STATISTICS ===`);

      const result = await this.orderModel.getOrderStatistics();

      if (result.success) {
        console.log("Order statistics retrieved:", result.data.stats);
        return {
          success: true,
          data: {
            stats: result.data.stats,
          },
          message: "Order statistics retrieved successfully",
        };
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error("Error in getOrderStatsCtr:", error);
      return {
        success: false,
        message: error.message || "Failed to retrieve order statistics",
      };
    }
  }
}

export default new OrderController();
