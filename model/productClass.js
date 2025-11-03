import pool from "../config/db.js";

class Product {
  // Add new product
  static async addProduct(productData) {
    try {
      const {
        product_cat,
        product_brand,
        product_title,
        product_price,
        product_desc,
        product_image,
        product_keywords,
        product_qty = 0,
      } = productData;

      const query = `
        INSERT INTO products (
          product_cat, 
          product_brand, 
          product_title, 
          product_price, 
          product_desc, 
          product_image, 
          product_keywords,
          product_qty,
          created_at
        ) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP) 
        RETURNING product_id, product_title, product_price, product_qty
      `;

      const result = await pool.query(query, [
        product_cat,
        product_brand,
        product_title,
        product_price,
        product_desc || null,
        product_image || null,
        product_keywords || null,
        product_qty,
      ]);

      return result.rows[0];
    } catch (error) {
      console.error("Database error:", error);
      throw error;
    }
  }

  // Get all products with category and brand info (FIXED - matches your brands table structure)
  static async getAllProducts() {
    try {
      const query = `
        SELECT 
          p.product_id,
          p.product_title,
          p.product_price,
          p.product_desc,
          p.product_image,
          p.product_keywords,
          p.product_qty,
          p.created_at,
          c.cat_id,
          c.cat_name,
          b.brand_id,
          b.brand_name,
          b.category_id as brand_category_id
        FROM products p
        JOIN categories c ON p.product_cat = c.cat_id
        JOIN brands b ON p.product_brand = b.brand_id
        ORDER BY c.cat_name, b.brand_name, p.product_title
      `;

      const result = await pool.query(query);
      return result.rows;
    } catch (error) {
      console.error("Database error:", error);
      throw error;
    }
  }

  // Get product by ID
  static async getProductById(productId) {
    try {
      const query = `
        SELECT 
          p.product_id,
          p.product_cat,
          p.product_brand,
          p.product_title,
          p.product_price,
          p.product_desc,
          p.product_image,
          p.product_keywords,
          p.product_qty,
          p.created_at,
          c.cat_name,
          b.brand_name
        FROM products p
        JOIN categories c ON p.product_cat = c.cat_id
        JOIN brands b ON p.product_brand = b.brand_id
        WHERE p.product_id = $1
      `;

      const result = await pool.query(query, [productId]);
      return result.rows[0];
    } catch (error) {
      console.error("Database error:", error);
      throw error;
    }
  }

  // Update product
  static async updateProduct(productId, productData) {
    try {
      const {
        product_cat,
        product_brand,
        product_title,
        product_price,
        product_desc,
        product_image,
        product_keywords,
        product_qty,
      } = productData;

      const query = `
        UPDATE products 
        SET 
          product_cat = $1,
          product_brand = $2,
          product_title = $3,
          product_price = $4,
          product_desc = $5,
          product_image = $6,
          product_keywords = $7,
          product_qty = $8
        WHERE product_id = $9
        RETURNING product_id, product_title, product_price, product_qty
      `;

      const result = await pool.query(query, [
        product_cat,
        product_brand,
        product_title,
        product_price,
        product_desc,
        product_image,
        product_keywords,
        product_qty,
        productId,
      ]);

      return result.rows[0];
    } catch (error) {
      console.error("Database error:", error);
      throw error;
    }
  }

  // Delete product
  static async deleteProduct(productId) {
    try {
      const query = `
        DELETE FROM products 
        WHERE product_id = $1
        RETURNING product_title
      `;

      const result = await pool.query(query, [productId]);
      return result.rowCount > 0;
    } catch (error) {
      console.error("Database error:", error);
      throw error;
    }
  }

  // Get products by category
  static async getProductsByCategory(categoryId) {
    try {
      const query = `
        SELECT 
          p.product_id,
          p.product_title,
          p.product_price,
          p.product_desc,
          p.product_image,
          p.product_keywords,
          p.product_qty,
          p.created_at,
          c.cat_name,
          b.brand_id,
          b.brand_name
        FROM products p
        JOIN categories c ON p.product_cat = c.cat_id
        JOIN brands b ON p.product_brand = b.brand_id
        WHERE p.product_cat = $1
        ORDER BY b.brand_name, p.product_title
      `;

      const result = await pool.query(query, [categoryId]);
      return result.rows;
    } catch (error) {
      console.error("Database error:", error);
      throw error;
    }
  }

  // Check stock availability
  static async checkStock(productId, requestedQty) {
    try {
      const query = `
        SELECT product_qty, product_title 
        FROM products 
        WHERE product_id = $1
      `;

      const result = await pool.query(query, [productId]);
      const product = result.rows[0];

      if (!product) {
        throw new Error("Product not found");
      }

      return {
        available: product.product_qty >= requestedQty,
        currentStock: product.product_qty,
        productTitle: product.product_title,
      };
    } catch (error) {
      console.error("Database error:", error);
      throw error;
    }
  }

  // Update stock after purchase
  static async updateStock(productId, quantity) {
    try {
      const query = `
        UPDATE products 
        SET product_qty = product_qty - $1
        WHERE product_id = $2 AND product_qty >= $1
        RETURNING product_qty, product_title
      `;

      const result = await pool.query(query, [quantity, productId]);

      if (result.rowCount === 0) {
        throw new Error("Insufficient stock or product not found");
      }

      return result.rows[0];
    } catch (error) {
      console.error("Database error:", error);
      throw error;
    }
  }

  // Check if product title exists in same category (for validation)
  static async checkProductExists(
    productTitle,
    categoryId,
    excludeProductId = null
  ) {
    try {
      let query = `
        SELECT COUNT(*) FROM products 
        WHERE product_title = $1 AND product_cat = $2
      `;
      let values = [productTitle, categoryId];

      if (excludeProductId) {
        query += ` AND product_id != $3`;
        values.push(excludeProductId);
      }

      const result = await pool.query(query, values);
      return result.rows[0].count > 0;
    } catch (error) {
      console.error("Database error:", error);
      throw error;
    }
  }

  // Get brands available for a specific category (for the dropdown)
  static async getBrandsForCategory(categoryId) {
    try {
      const query = `
        SELECT 
          brand_id, 
          brand_name
        FROM brands 
        WHERE category_id = $1
        ORDER BY brand_name
      `;

      const result = await pool.query(query, [categoryId]);
      return result.rows;
    } catch (error) {
      console.error("Database error:", error);
      throw error;
    }
  }



  // View all products with pagination
  static async viewAllProducts(page = 1, limit = 10) {
    try {
      const offset = (page - 1) * limit;

      const query = `
      SELECT 
        p.product_id,
        p.product_title,
        p.product_price,
        p.product_desc,
        p.product_image,
        p.product_keywords,
        p.product_qty,
        p.created_at,
        c.cat_id,
        c.cat_name,
        b.brand_id,
        b.brand_name
      FROM products p
      JOIN categories c ON p.product_cat = c.cat_id
      JOIN brands b ON p.product_brand = b.brand_id
      WHERE p.product_qty > 0
      ORDER BY p.created_at DESC
      LIMIT $1 OFFSET $2
    `;

      const countQuery = `
      SELECT COUNT(*) as total
      FROM products p
      WHERE p.product_qty > 0
    `;

      const [products, count] = await Promise.all([
        pool.query(query, [limit, offset]),
        pool.query(countQuery),
      ]);

      return {
        products: products.rows,
        total: parseInt(count.rows[0].total),
        page,
        limit,
        totalPages: Math.ceil(count.rows[0].total / limit),
      };
    } catch (error) {
      console.error("Database error:", error);
      throw error;
    }
  }

  // Search products by title/keywords
  static async searchProducts(searchQuery, page = 1, limit = 10) {
    try {
      const offset = (page - 1) * limit;
      const searchTerm = `%${searchQuery}%`;

      const query = `
      SELECT 
        p.product_id,
        p.product_title,
        p.product_price,
        p.product_desc,
        p.product_image,
        p.product_keywords,
        p.product_qty,
        c.cat_id,
        c.cat_name,
        b.brand_id,
        b.brand_name
      FROM products p
      JOIN categories c ON p.product_cat = c.cat_id
      JOIN brands b ON p.product_brand = b.brand_id
      WHERE p.product_qty > 0 
        AND (
          LOWER(p.product_title) LIKE LOWER($1) 
          OR LOWER(p.product_keywords) LIKE LOWER($1)
          OR LOWER(p.product_desc) LIKE LOWER($1)
        )
      ORDER BY p.created_at DESC
      LIMIT $2 OFFSET $3
    `;

      const countQuery = `
      SELECT COUNT(*) as total
      FROM products p
      WHERE p.product_qty > 0 
        AND (
          LOWER(p.product_title) LIKE LOWER($1) 
          OR LOWER(p.product_keywords) LIKE LOWER($1)
          OR LOWER(p.product_desc) LIKE LOWER($1)
        )
    `;

      const [products, count] = await Promise.all([
        pool.query(query, [searchTerm, limit, offset]),
        pool.query(countQuery, [searchTerm]),
      ]);

      return {
        products: products.rows,
        total: parseInt(count.rows[0].total),
        page,
        limit,
        totalPages: Math.ceil(count.rows[0].total / limit),
        searchQuery,
      };
    } catch (error) {
      console.error("Database error:", error);
      throw error;
    }
  }

  // Filter products by category
  static async filterProductsByCategory(categoryId, page = 1, limit = 10) {
    try {
      const offset = (page - 1) * limit;

      const query = `
      SELECT 
        p.product_id,
        p.product_title,
        p.product_price,
        p.product_desc,
        p.product_image,
        p.product_keywords,
        p.product_qty,
        c.cat_id,
        c.cat_name,
        b.brand_id,
        b.brand_name
      FROM products p
      JOIN categories c ON p.product_cat = c.cat_id
      JOIN brands b ON p.product_brand = b.brand_id
      WHERE p.product_qty > 0 AND p.product_cat = $1
      ORDER BY p.created_at DESC
      LIMIT $2 OFFSET $3
    `;

      const countQuery = `
      SELECT COUNT(*) as total
      FROM products p
      WHERE p.product_qty > 0 AND p.product_cat = $1
    `;

      const [products, count] = await Promise.all([
        pool.query(query, [categoryId, limit, offset]),
        pool.query(countQuery, [categoryId]),
      ]);

      return {
        products: products.rows,
        total: parseInt(count.rows[0].total),
        page,
        limit,
        totalPages: Math.ceil(count.rows[0].total / limit),
        categoryId,
      };
    } catch (error) {
      console.error("Database error:", error);
      throw error;
    }
  }

  // Filter products by brand
  static async filterProductsByBrand(brandId, page = 1, limit = 10) {
    try {
      const offset = (page - 1) * limit;

      const query = `
      SELECT 
        p.product_id,
        p.product_title,
        p.product_price,
        p.product_desc,
        p.product_image,
        p.product_keywords,
        p.product_qty,
        c.cat_id,
        c.cat_name,
        b.brand_id,
        b.brand_name
      FROM products p
      JOIN categories c ON p.product_cat = c.cat_id
      JOIN brands b ON p.product_brand = b.brand_id
      WHERE p.product_qty > 0 AND p.product_brand = $1
      ORDER BY p.created_at DESC
      LIMIT $2 OFFSET $3
    `;

      const countQuery = `
      SELECT COUNT(*) as total
      FROM products p
      WHERE p.product_qty > 0 AND p.product_brand = $1
    `;

      const [products, count] = await Promise.all([
        pool.query(query, [brandId, limit, offset]),
        pool.query(countQuery, [brandId]),
      ]);

      return {
        products: products.rows,
        total: parseInt(count.rows[0].total),
        page,
        limit,
        totalPages: Math.ceil(count.rows[0].total / limit),
        brandId,
      };
    } catch (error) {
      console.error("Database error:", error);
      throw error;
    }
  }

  // View single product (enhanced)
  static async viewSingleProduct(productId) {
    try {
      const query = `
      SELECT 
        p.product_id,
        p.product_cat,
        p.product_brand,
        p.product_title,
        p.product_price,
        p.product_desc,
        p.product_image,
        p.product_keywords,
        p.product_qty,
        p.created_at,
        c.cat_name,
        b.brand_name
      FROM products p
      JOIN categories c ON p.product_cat = c.cat_id
      JOIN brands b ON p.product_brand = b.brand_id
      WHERE p.product_id = $1
    `;

      const result = await pool.query(query, [productId]);

      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0];
    } catch (error) {
      console.error("Database error:", error);
      throw error;
    }
  }

  // Advanced search with filters
  static async advancedSearch(
    searchQuery,
    categoryId = null,
    brandId = null,
    page = 1,
    limit = 10
  ) {
    try {
      const offset = (page - 1) * limit;
      let whereConditions = ["p.product_qty > 0"];
      let queryParams = [];
      let paramCounter = 1;

      // Add search term condition
      if (searchQuery && searchQuery.trim()) {
        const searchTerm = `%${searchQuery.trim()}%`;
        whereConditions.push(`(
        LOWER(p.product_title) LIKE LOWER($${paramCounter}) 
        OR LOWER(p.product_keywords) LIKE LOWER($${paramCounter})
        OR LOWER(p.product_desc) LIKE LOWER($${paramCounter})
      )`);
        queryParams.push(searchTerm);
        paramCounter++;
      }

      // Add category filter
      if (categoryId) {
        whereConditions.push(`p.product_cat = $${paramCounter}`);
        queryParams.push(categoryId);
        paramCounter++;
      }

      // Add brand filter
      if (brandId) {
        whereConditions.push(`p.product_brand = $${paramCounter}`);
        queryParams.push(brandId);
        paramCounter++;
      }

      const whereClause = whereConditions.join(" AND ");

      const query = `
      SELECT 
        p.product_id,
        p.product_title,
        p.product_price,
        p.product_desc,
        p.product_image,
        p.product_keywords,
        p.product_qty,
        c.cat_id,
        c.cat_name,
        b.brand_id,
        b.brand_name
      FROM products p
      JOIN categories c ON p.product_cat = c.cat_id
      JOIN brands b ON p.product_brand = b.brand_id
      WHERE ${whereClause}
      ORDER BY p.created_at DESC
      LIMIT $${paramCounter} OFFSET $${paramCounter + 1}
    `;

      const countQuery = `
      SELECT COUNT(*) as total
      FROM products p
      JOIN categories c ON p.product_cat = c.cat_id
      JOIN brands b ON p.product_brand = b.brand_id
      WHERE ${whereClause}
    `;

      queryParams.push(limit, offset);

      const [products, count] = await Promise.all([
        pool.query(query, queryParams),
        pool.query(countQuery, queryParams.slice(0, -2)), // Remove limit and offset for count
      ]);

      return {
        products: products.rows,
        total: parseInt(count.rows[0].total),
        page,
        limit,
        totalPages: Math.ceil(count.rows[0].total / limit),
        searchQuery,
        categoryId,
        brandId,
      };
    } catch (error) {
      console.error("Database error:", error);
      throw error;
    }
  }
}

export default Product;
