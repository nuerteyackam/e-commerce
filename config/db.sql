-- PostgreSQL-compatible SQL schema for "shoppin"

-- Drop schema if needed (be careful, it deletes everything!)
-- DROP SCHEMA public CASCADE;
-- CREATE SCHEMA public;

-- Table: brands
CREATE TABLE brands (
    brand_id SERIAL PRIMARY KEY,
    brand_name VARCHAR(100) NOT NULL
);

-- Table: categories
CREATE TABLE categories (
    cat_id SERIAL PRIMARY KEY,
    cat_name VARCHAR(100) NOT NULL
);

-- Table: customer
CREATE TABLE customer (
    customer_id SERIAL PRIMARY KEY,
    customer_name VARCHAR(100) NOT NULL,
    customer_email VARCHAR(50) UNIQUE NOT NULL,
    customer_pass VARCHAR(150) NOT NULL,
    customer_country VARCHAR(30) NOT NULL,
    customer_city VARCHAR(30) NOT NULL,
    customer_contact VARCHAR(15) NOT NULL,
    customer_image VARCHAR(100),
    user_role INT NOT NULL
);

-- Table: products
CREATE TABLE products (
    product_id SERIAL PRIMARY KEY,
    product_cat INT NOT NULL,
    product_brand INT NOT NULL,
    product_title VARCHAR(200) NOT NULL,
    product_price DOUBLE PRECISION NOT NULL,
    product_desc VARCHAR(500),
    product_image VARCHAR(100),
    product_keywords VARCHAR(100),
    CONSTRAINT fk_products_cat FOREIGN KEY (product_cat) REFERENCES categories (cat_id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_products_brand FOREIGN KEY (product_brand) REFERENCES brands (brand_id) ON DELETE CASCADE ON UPDATE CASCADE
);

-- Table: cart
CREATE TABLE cart (
    p_id INT NOT NULL,
    ip_add VARCHAR(50) NOT NULL,
    c_id INT,
    qty INT NOT NULL,
    CONSTRAINT fk_cart_product FOREIGN KEY (p_id) REFERENCES products (product_id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_cart_customer FOREIGN KEY (c_id) REFERENCES customer (customer_id) ON DELETE CASCADE ON UPDATE CASCADE
);

-- Table: orders
CREATE TABLE orders (
    order_id SERIAL PRIMARY KEY,
    customer_id INT NOT NULL,
    invoice_no INT NOT NULL,
    order_date DATE NOT NULL,
    order_status VARCHAR(100) NOT NULL,
    CONSTRAINT fk_orders_customer FOREIGN KEY (customer_id) REFERENCES customer (customer_id) ON DELETE CASCADE ON UPDATE CASCADE
);

-- Table: orderdetails
CREATE TABLE orderdetails (
    order_id INT NOT NULL,
    product_id INT NOT NULL,
    qty INT NOT NULL,
    CONSTRAINT fk_orderdetails_order FOREIGN KEY (order_id) REFERENCES orders (order_id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_orderdetails_product FOREIGN KEY (product_id) REFERENCES products (product_id) ON DELETE CASCADE ON UPDATE CASCADE
);

-- Table: payment
CREATE TABLE payment (
    pay_id SERIAL PRIMARY KEY,
    amt DOUBLE PRECISION NOT NULL,
    customer_id INT NOT NULL,
    order_id INT NOT NULL,
    currency TEXT NOT NULL,
    payment_date DATE NOT NULL,
    CONSTRAINT fk_payment_customer FOREIGN KEY (customer_id) REFERENCES customer (customer_id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_payment_order FOREIGN KEY (order_id) REFERENCES orders (order_id) ON DELETE CASCADE ON UPDATE CASCADE
);
