import pool from "../config/db.js";

class Category {
  // Add a new category
  static async addCategory({ cat_name, created_by }) {
    try {
      const query = `INSERT INTO categories (cat_name, created_by) 
                     VALUES ($1, $2) 
                     RETURNING cat_id, cat_name, created_by`;
      const values = [cat_name, created_by];
      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (err) {
      console.error("Database error:", err);
      throw err;
    }
  }

  // Get categories by user
  static async getCategoriesByUser(userId) {
    try {
      const query = `SELECT * FROM categories WHERE created_by = $1 ORDER BY cat_name`;
      const result = await pool.query(query, [userId]);
      return result.rows;
    } catch (err) {
      console.error("Database error:", err);
      throw err;
    }
  }

  // Get ALL categories (for customer browsing)
  static async getAllCategories() {
    try {
      const query = `SELECT * FROM categories ORDER BY cat_name`;
      const result = await pool.query(query);
      return result.rows;
    } catch (err) {
      console.error("Database error:", err);
      throw err;
    }
  }

  // Update category
  static async updateCategory(catId, userId, { cat_name }) {
    try {
      const query = `UPDATE categories 
                     SET cat_name = $1 
                     WHERE cat_id = $2 AND created_by = $3 
                     RETURNING *`;
      const values = [cat_name, catId, userId];
      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (err) {
      console.error("Database error:", err);
      throw err;
    }
  }

  // Delete category
  static async deleteCategory(catId, userId) {
    try {
      const query = `DELETE FROM categories 
                     WHERE cat_id = $1 AND created_by = $2 
                     RETURNING *`;
      const result = await pool.query(query, [catId, userId]);
      return result.rows[0];
    } catch (err) {
      console.error("Database error:", err);
      throw err;
    }
  }

  // Check if category name exists for user
  static async checkCategoryExists(catName, userId) {
    try {
      const query = `SELECT cat_id FROM categories 
                     WHERE cat_name = $1 AND created_by = $2`;
      const result = await pool.query(query, [catName, userId]);
      return result.rowCount > 0;
    } catch (err) {
      console.error("Database error:", err);
      throw err;
    }
  }
}

export default Category;
