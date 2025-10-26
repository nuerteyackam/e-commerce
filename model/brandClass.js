import pool from "../config/db.js";

class Brand {
  // Method to handle multiple category selection for one brand
  static async addBrandToMultipleCategories(brandName, categoryIds, createdBy) {
    try {
      const createdBrands = [];

      //check if any brand+category combinations already exist
      for (const categoryId of categoryIds) {
        const existsCheck = await pool.query(
          "SELECT COUNT(*) FROM brands WHERE brand_name = $1 AND category_id = $2",
          [brandName, categoryId]
        );

        if (existsCheck.rows[0].count > 0) {
          throw new Error(`${brandName} already exists in this category`);
        }
      }

      // If no conflicts, create all brand records
      for (const categoryId of categoryIds) {
        const insertResult = await pool.query(
          `INSERT INTO brands (brand_name, category_id, created_by, created_at, updated_at) 
           VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) 
           RETURNING brand_id, brand_name, category_id`,
          [brandName, categoryId, createdBy]
        );

        createdBrands.push(insertResult.rows[0]);
      }

      return createdBrands;
    } catch (error) {
      console.error("Database error:", error);
      throw error;
    }
  }

  // Get brands by user
  static async getBrandsByUser(userId) {
    try {
      const query = `
        SELECT 
          b.brand_id, 
          b.brand_name, 
          b.category_id,
          c.cat_name,
          b.created_at,
          b.updated_at
        FROM brands b
        JOIN categories c ON b.category_id = c.cat_id
        WHERE b.created_by = $1
        ORDER BY b.brand_name, c.cat_name
      `;
      const result = await pool.query(query, [userId]);
      return result.rows;
    } catch (error) {
      console.error("Database error:", error);
      throw error;
    }
  }
  // Get ALL brands (for customer browsing)
  static async getAllBrands() {
    try {
      const query = `SELECT * FROM brands ORDER BY brand_name`;
      const result = await pool.query(query);
      return result.rows;
    } catch (err) {
      console.error("Database error:", err);
      throw err;
    }
  }

  // Check if brand+category combination exists
  static async checkBrandCategoryExists(
    brandName,
    categoryId,
    excludeBrandId = null
  ) {
    try {
      let query = `
        SELECT COUNT(*) FROM brands 
        WHERE brand_name = $1 AND category_id = $2
      `;
      let values = [brandName, categoryId];

      if (excludeBrandId) {
        query += ` AND brand_id != $3`;
        values.push(excludeBrandId);
      }

      const result = await pool.query(query, values);
      return result.rows[0].count > 0;
    } catch (error) {
      console.error("Database error:", error);
      throw error;
    }
  }

  // Update brand name
  static async updateBrand(brandId, brandName, userId) {
    try {
      // First get the current brand to check its category
      const getCurrentBrand = await pool.query(
        "SELECT category_id FROM brands WHERE brand_id = $1 AND created_by = $2",
        [brandId, userId]
      );

      if (getCurrentBrand.rows.length === 0) {
        throw new Error("Brand not found");
      }

      const categoryId = getCurrentBrand.rows[0].category_id;

      // Check if new name + existing category combination already exists
      const exists = await this.checkBrandCategoryExists(
        brandName,
        categoryId,
        brandId
      );
      if (exists) {
        throw new Error("Brand and category combination already exists");
      }

      const query = `
        UPDATE brands 
        SET brand_name = $1, updated_at = CURRENT_TIMESTAMP 
        WHERE brand_id = $2 AND created_by = $3
        RETURNING brand_id, brand_name, category_id
      `;
      const result = await pool.query(query, [brandName, brandId, userId]);
      return result.rows[0];
    } catch (error) {
      console.error("Database error:", error);
      throw error;
    }
  }

  // Delete single brand by ID
  static async deleteBrand(brandId, userId) {
    try {
      const query = `
        DELETE FROM brands 
        WHERE brand_id = $1 AND created_by = $2
        RETURNING brand_name, category_id
      `;
      const result = await pool.query(query, [brandId, userId]);
      return result.rowCount > 0;
    } catch (error) {
      console.error("Database error:", error);
      throw error;
    }
  }
}

export default Brand;
