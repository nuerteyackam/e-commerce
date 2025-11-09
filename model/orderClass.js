import pool from "../config/db.js";

class OrderClass {
  constructor() {
    this.ordersTable = "orders";
    this.orderDetailsTable = "orderdetails";
    this.paymentTable = "payment";
  }

  /**
   * Create a new order (before payment - no invoice number yet)
   * @param {number} customerId - Customer ID
   * @param {string} orderReference - Unique order reference
   * @param {number} orderTotal - Total amount
   * @returns {Object} Result with order ID
   */
  async createOrder(customerId, orderReference, orderTotal) {
    try {
      const query = `
        INSERT INTO ${this.ordersTable} 
        (customer_id, order_date, order_status, order_reference, order_total)
        VALUES ($1, CURRENT_DATE, $2, $3, $4)
        RETURNING order_id, order_reference
      `;

      const values = [customerId, "pending", orderReference, orderTotal];
      const result = await pool.query(query, values);

      if (result.rows.length > 0) {
        return {
          success: true,
          data: {
            orderId: result.rows[0].order_id,
            orderReference: result.rows[0].order_reference,
            total: orderTotal,
          },
          message: "Order created successfully",
        };
      } else {
        throw new Error("Failed to create order");
      }
    } catch (error) {
      console.error("Error creating order:", error);
      return {
        success: false,
        message: "Failed to create order",
        error: error.message,
      };
    }
  }

  /**
   * Add order details (product items)
   * @param {number} orderId - Order ID
   * @param {Array} cartItems - Array of cart items
   * @returns {Object} Result of adding order details
   */
  async addOrderDetails(orderId, cartItems) {
    try {
      const orderDetailsQuery = `
        INSERT INTO ${this.orderDetailsTable} 
        (order_id, product_id, qty, price)
        VALUES ($1, $2, $3, $4)
      `;

      const results = [];

      // Insert each cart item as an order detail
      for (const item of cartItems) {
        const values = [
          orderId,
          item.product_id,
          item.qty,
          parseFloat(item.product_price),
        ];

        const result = await pool.query(orderDetailsQuery, values);
        results.push(result);
      }

      return {
        success: true,
        data: {
          orderId: orderId,
          itemsAdded: results.length,
        },
        message: "Order details added successfully",
      };
    } catch (error) {
      console.error("Error adding order details:", error);
      return {
        success: false,
        message: "Failed to add order details",
        error: error.message,
      };
    }
  }

  /**
   * Record payment and generate invoice number (after payment)
   * @param {number} customerId - Customer ID
   * @param {number} orderId - Order ID
   * @param {number} amount - Payment amount
   * @param {string} currency - Currency code
   * @returns {Object} Result of payment recording
   */
  async recordPayment(customerId, orderId, amount, currency = "USD") {
    try {
      // Generate invoice number NOW (after payment)
      const invoiceNo = this.generateInvoiceNumber();

      // 1. Update order with invoice number and status
      const updateOrderQuery = `
        UPDATE ${this.ordersTable}
        SET invoice_no = $1, order_status = $2
        WHERE order_id = $3
        RETURNING order_reference
      `;
      const orderResult = await pool.query(updateOrderQuery, [
        invoiceNo,
        "confirmed",
        orderId,
      ]);

      // 2. Record payment
      const paymentQuery = `
        INSERT INTO ${this.paymentTable}
        (amt, customer_id, order_id, currency, payment_date, payment_status, payment_method)
        VALUES ($1, $2, $3, $4, CURRENT_DATE, $5, $6)
        RETURNING pay_id
      `;

      const values = [
        parseFloat(amount),
        customerId,
        orderId,
        currency,
        "completed",
        "simulated",
      ];

      const paymentResult = await pool.query(paymentQuery, values);

      if (paymentResult.rows.length > 0) {
        return {
          success: true,
          data: {
            paymentId: paymentResult.rows[0].pay_id,
            orderId: orderId,
            invoiceNo: invoiceNo,
            orderReference: orderResult.rows[0]?.order_reference,
            amount: amount,
            currency: currency,
          },
          message: "Payment recorded successfully",
        };
      } else {
        throw new Error("Failed to record payment");
      }
    } catch (error) {
      console.error("Error recording payment:", error);
      return {
        success: false,
        message: "Failed to record payment",
        error: error.message,
      };
    }
  }

  /**
   * Update order status
   * @param {number} orderId - Order ID
   * @param {string} status - New status
   * @returns {Object} Result of status update
   */
  async updateOrderStatus(orderId, status) {
    try {
      const query = `
        UPDATE ${this.ordersTable}
        SET order_status = $1
        WHERE order_id = $2
        RETURNING order_id, order_status
      `;

      const result = await pool.query(query, [status, orderId]);

      return {
        success: true,
        data: { orderId, status },
        message: "Order status updated successfully",
      };
    } catch (error) {
      console.error("Error updating order status:", error);
      return {
        success: false,
        message: "Failed to update order status",
        error: error.message,
      };
    }
  }

  /**
   * Get past orders for a customer
   * @param {number} customerId - Customer ID
   * @returns {Object} Customer's order history
   */
  async getCustomerOrders(customerId) {
    try {
      const query = `
        SELECT 
          o.order_id,
          o.order_reference,
          o.invoice_no,
          o.order_date,
          o.order_status,
          o.order_total,
          p.pay_id,
          p.amt as payment_amount,
          p.currency,
          p.payment_date,
          p.payment_status,
          p.payment_method
        FROM ${this.ordersTable} o
        LEFT JOIN ${this.paymentTable} p ON o.order_id = p.order_id
        WHERE o.customer_id = $1
        ORDER BY o.order_date DESC, o.order_id DESC
      `;

      const result = await pool.query(query, [customerId]);

      return {
        success: true,
        data: {
          orders: result.rows,
          totalOrders: result.rows.length,
        },
        message: "Customer orders retrieved successfully",
      };
    } catch (error) {
      console.error("Error getting customer orders:", error);
      return {
        success: false,
        message: "Failed to retrieve customer orders",
        error: error.message,
      };
    }
  }

  /**
   * Get order details with products
   * @param {number} orderId - Order ID
   * @returns {Object} Order details with product information
   */
  async getOrderDetails(orderId) {
    try {
      const query = `
        SELECT 
          od.order_id,
          od.product_id,
          od.qty,
          od.price,
          p.product_title,
          p.product_image,
          c.cat_name,
          b.brand_name,
          (od.qty * od.price) as item_total
        FROM ${this.orderDetailsTable} od
        JOIN products p ON od.product_id = p.product_id
        JOIN categories c ON p.product_cat = c.cat_id
        JOIN brands b ON p.product_brand = b.brand_id
        WHERE od.order_id = $1
        ORDER BY p.product_title
      `;

      const result = await pool.query(query, [orderId]);

      return {
        success: true,
        data: {
          orderId: orderId,
          items: result.rows,
          itemCount: result.rows.length,
        },
        message: "Order details retrieved successfully",
      };
    } catch (error) {
      console.error("Error getting order details:", error);
      return {
        success: false,
        message: "Failed to retrieve order details",
        error: error.message,
      };
    }
  }

  /**
   * Generate unique order reference (customer-facing)
   * @returns {string} Unique order reference
   */
  generateOrderReference() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 6);
    return `ORD-${timestamp}-${random}`.toUpperCase();
  }

  /**
   * Generate invoice number (accounting/legal document)
   * @returns {number} Sequential invoice number
   */
  generateInvoiceNumber() {
    const year = new Date().getFullYear();
    const timestamp = Date.now();
    // Create a number using year + last 6 digits of timestamp
    return parseInt(`${year}${timestamp.toString().slice(-6)}`);
  }

  /**
   * Verify order belongs to customer (security check)
   * @param {number} orderId - Order ID
   * @param {number} customerId - Customer ID
   * @returns {Object} Verification result
   */
  async verifyOrderOwnership(orderId, customerId) {
    try {
      const query = `
        SELECT order_id, order_reference, customer_id
        FROM ${this.ordersTable}
        WHERE order_id = $1 AND customer_id = $2
      `;

      const result = await pool.query(query, [orderId, customerId]);

      return {
        success: result.rows.length > 0,
        data: result.rows[0] || null,
        message:
          result.rows.length > 0
            ? "Order verified"
            : "Order not found or access denied",
      };
    } catch (error) {
      console.error("Error verifying order ownership:", error);
      return {
        success: false,
        message: "Failed to verify order ownership",
        error: error.message,
      };
    }
  }

  /**
   * Validate stock availability for order items
   * @param {Array} orderItems - Array of order items to validate
   * @returns {Object} Validation result
   */
  async validateStockAvailability(orderItems) {
    try {
      console.log("Validating stock for", orderItems.length, "items...");

      for (const item of orderItems) {
        const stockQuery = `
          SELECT product_qty, product_title 
          FROM products 
          WHERE product_id = $1
        `;

        const result = await pool.query(stockQuery, [item.product_id]);

        if (result.rows.length === 0) {
          return {
            success: false,
            message: `Product not found: ${
              item.product_title || "Unknown Product"
            }`,
          };
        }

        const currentStock = result.rows[0].product_qty;
        const requestedQty = parseInt(item.qty);

        if (currentStock < requestedQty) {
          return {
            success: false,
            message: `Insufficient stock for "${result.rows[0].product_title}". Available: ${currentStock}, Requested: ${requestedQty}`,
          };
        }

        console.log(
          `Stock OK for "${result.rows[0].product_title}": ${requestedQty} requested, ${currentStock} available`
        );
      }

      return {
        success: true,
        message: "All items have sufficient stock",
      };
    } catch (error) {
      console.error("Error validating stock:", error);
      return {
        success: false,
        message: "Error validating stock availability",
        error: error.message,
      };
    }
  }

  /**
   * Reduce product stock after successful payment
   * @param {Array} orderItems - Array of order items
   * @returns {Object} Result of stock reduction
   */
  async reduceProductStock(orderItems) {
    try {
      console.log(
        "Starting stock reduction for",
        orderItems.length,
        "items..."
      );

      const stockUpdates = [];

      for (const item of orderItems) {
        const updateQuery = `
          UPDATE products 
          SET product_qty = product_qty - $1,
              updated_at = CURRENT_TIMESTAMP
          WHERE product_id = $2 AND product_qty >= $1
          RETURNING product_qty, product_title, product_id
        `;

        const requestedQty = parseInt(item.qty);
        const productId = parseInt(item.product_id);

        const result = await pool.query(updateQuery, [requestedQty, productId]);

        if (result.rows.length === 0) {
          throw new Error(
            `Failed to reduce stock for product ID ${productId}. Insufficient stock or product not found.`
          );
        }

        const updatedProduct = result.rows[0];
        stockUpdates.push({
          productId: updatedProduct.product_id,
          productTitle: updatedProduct.product_title,
          quantityReduced: requestedQty,
          remainingStock: updatedProduct.product_qty,
        });

        console.log(
          `Stock reduced for "${updatedProduct.product_title}": -${requestedQty} (remaining: ${updatedProduct.product_qty})`
        );
      }

      return {
        success: true,
        message: "Product stock reduced successfully",
        data: {
          updatedProducts: stockUpdates,
          totalItemsProcessed: stockUpdates.length,
        },
      };
    } catch (error) {
      console.error("Error reducing product stock:", error);
      return {
        success: false,
        message: error.message || "Failed to reduce product stock",
        error: error.message,
      };
    }
  }

  /**
   * Get order items with product details for stock operations
   * @param {number} orderId - Order ID
   * @returns {Object} Order items with product information
   */
  async getOrderItemsWithProductDetails(orderId) {
    try {
      const query = `
        SELECT 
          od.order_id,
          od.product_id,
          od.qty,
          od.price,
          p.product_title,
          p.product_qty as current_stock,
          p.product_image,
          c.cat_name as category_name,
          b.brand_name
        FROM ${this.orderDetailsTable} od
        JOIN products p ON od.product_id = p.product_id
        JOIN categories c ON p.product_cat = c.cat_id
        JOIN brands b ON p.product_brand = b.brand_id
        WHERE od.order_id = $1
        ORDER BY p.product_title
      `;

      const result = await pool.query(query, [orderId]);

      return {
        success: true,
        data: {
          orderId: orderId,
          items: result.rows,
          itemCount: result.rows.length,
        },
        message: "Order items retrieved successfully",
      };
    } catch (error) {
      console.error("Error getting order items with product details:", error);
      return {
        success: false,
        message: "Failed to retrieve order items",
        error: error.message,
      };
    }
  }

  /**
   * Process complete order fulfillment (validate stock + reduce stock)
   * @param {number} orderId - Order ID
   * @returns {Object} Result of order fulfillment
   */
  async processOrderFulfillment(orderId) {
    try {
      console.log("Processing order fulfillment for order:", orderId);

      // 1. Get order items with current product details
      const orderItemsResult = await this.getOrderItemsWithProductDetails(
        orderId
      );
      if (!orderItemsResult.success) {
        throw new Error("Failed to retrieve order items");
      }

      const orderItems = orderItemsResult.data.items;

      // 2. Validate stock availability
      const stockValidation = await this.validateStockAvailability(orderItems);
      if (!stockValidation.success) {
        return {
          success: false,
          message: `Stock validation failed: ${stockValidation.message}`,
          data: { validationFailed: true },
        };
      }

      // 3. Reduce product stock
      const stockReduction = await this.reduceProductStock(orderItems);
      if (!stockReduction.success) {
        return {
          success: false,
          message: `Stock reduction failed: ${stockReduction.message}`,
          data: { reductionFailed: true },
        };
      }

      return {
        success: true,
        message: "Order fulfillment completed successfully",
        data: {
          orderId: orderId,
          itemsProcessed: stockReduction.data.totalItemsProcessed,
          stockUpdates: stockReduction.data.updatedProducts,
        },
      };
    } catch (error) {
      console.error(" Error processing order fulfillment:", error);
      return {
        success: false,
        message: error.message || "Failed to process order fulfillment",
        error: error.message,
      };
    }
  }

  /**
   * Restore product stock (for order cancellation)
   * @param {number} orderId - Order ID to restore stock for
   * @returns {Object} Result of stock restoration
   */
  async restoreProductStock(orderId) {
    try {
      console.log("Restoring stock for cancelled order:", orderId);

      const orderItemsResult = await this.getOrderItemsWithProductDetails(
        orderId
      );
      if (!orderItemsResult.success) {
        throw new Error("Failed to retrieve order items");
      }

      const orderItems = orderItemsResult.data.items;
      const restoredItems = [];

      for (const item of orderItems) {
        const restoreQuery = `
          UPDATE products 
          SET product_qty = product_qty + $1,
              updated_at = CURRENT_TIMESTAMP
          WHERE product_id = $2
          RETURNING product_qty, product_title
        `;

        const result = await pool.query(restoreQuery, [
          parseInt(item.qty),
          parseInt(item.product_id),
        ]);

        if (result.rows.length > 0) {
          restoredItems.push({
            productId: item.product_id,
            productTitle: result.rows[0].product_title,
            quantityRestored: parseInt(item.qty),
            newStock: result.rows[0].product_qty,
          });

          console.log(
            `Stock restored for "${result.rows[0].product_title}": +${item.qty} (new total: ${result.rows[0].product_qty})`
          );
        }
      }

      return {
        success: true,
        message: "Product stock restored successfully",
        data: {
          orderId: orderId,
          restoredItems: restoredItems,
        },
      };
    } catch (error) {
      console.error("Error restoring product stock:", error);
      return {
        success: false,
        message: "Failed to restore product stock",
        error: error.message,
      };
    }
  }
}

export default OrderClass;
