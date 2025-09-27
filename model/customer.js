import pool from "../config/db.js";
import bcrypt from "bcrypt";

class Customer {
  static async addCustomer({
    fullname,
    email,
    password,
    country,
    city,
    contact,
    role = 2,
  }) {
    const hashedPassword = await bcrypt.hash(password, 10); // hash password
    console.log("Adding customer with values:", {
      fullname,
      email,
      country,
      city,
      contact,
      role,
    });
    const query = `INSERT INTO customer (customer_name, customer_email, customer_pass, customer_country, customer_city, customer_contact, user_role) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING customer_id, customer_name, customer_email`;

    const values = [
      fullname,
      email,
      hashedPassword,
      country,
      city,
      contact,
      role,
    ];

    const result = await pool.query(query, values);
    console.log("Query result:", result.rows[0]);
    return result.rows[0];
  }

  static async editCustomer(id, { name, email, country, city, contact }) {
    const query = `UPDATE customer
    SET customer_name=$1, customer_email=$2, customer_country=$3, customer_city=$4, customer_contact=$5 WHERE customer_id = $6 RETURNING *;`;

    const values = [name, email, country, city, contact, id];
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  // Delete Customer
  static async deleteCustomer(id) {
    const query = `DELETE FROM customer WHERE customer_id = $1 RETURNING *;`;
    const result = await pool.query(query, [id]);
    return result.rows[0]; // return deleted row for confirmation
  }

  static async checkEmailExists(email) {
    const query = `SELECT 1 FROM customer WHERE customer_email = $1;`;
    const result = await pool.query(query, [email]);
    return result.rowCount > 0;
  }

  static async getCustomerByEmailAndPassword(email, password) {
    const query = `SELECT * FROM customer WHERE customer_email = $1;`;
    const result = await pool.query(query, [email]);
    if (result.rowCount === 0) {
      return { success: false, message: "Customer not found" };
    }

    const customer = result.rows[0];
    const isCorrectPassword = await bcrypt.compare(
      password,
      customer.customer_pass
    );

    if (!isCorrectPassword) {
      return { success: false, message: "Incorrect Password!" };
    }

    delete customer.customer_pass;
    return { success: true, customer };
  }
}

export default Customer;
