-- PostgreSQL-compatible SQL schema for "shoppn"

CREATE TABLE customer (
    customer_id SERIAL PRIMARY KEY,
    customer_name VARCHAR(100) NOT NULL,
    customer_email VARCHAR(50) UNIQUE NOT NULL,
    customer_pass VARCHAR(150) NOT NULL,
    customer_country VARCHAR(30) NOT NULL,
    customer_city VARCHAR(30) NOT NULL,
    customer_contact VARCHAR(15) NOT NULL,
    customer_image VARCHAR(100),
    user_role INT NOT NULL DEFAULT 2,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table: categories 
CREATE TABLE categories (
    cat_id SERIAL PRIMARY KEY,
    cat_name VARCHAR(100) NOT NULL,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_categories_user FOREIGN KEY (created_by) REFERENCES customer (customer_id)
    ON DELETE CASCADE ON UPDATE CASCADE
);

-- Table: brands
CREATE TABLE brands (
    brand_id SERIAL PRIMARY KEY,
    brand_name VARCHAR(100) NOT NULL
);



-- Table: products
CREATE TABLE products (
    product_id SERIAL PRIMARY KEY,
    product_cat INT NOT NULL,
    product_brand INT NOT NULL,
    product_title VARCHAR(200) NOT NULL,
    product_price DECIMAL(10,2) NOT NULL,
    product_desc VARCHAR(500),
    product_image VARCHAR(100),
    product_keywords VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
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
    amt DECIMAL(10,2) NOT NULL,
    customer_id INT NOT NULL,
    order_id INT NOT NULL,
    currency TEXT NOT NULL,
    payment_date DATE NOT NULL,
    CONSTRAINT fk_payment_customer FOREIGN KEY (customer_id) REFERENCES customer (customer_id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_payment_order FOREIGN KEY (order_id) REFERENCES orders (order_id) ON DELETE CASCADE ON UPDATE CASCADE
);

-- Add new columns to existing brands table
ALTER TABLE brands ADD COLUMN IF NOT EXISTS created_by INT;
ALTER TABLE brands ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE brands ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE brands ADD COLUMN IF NOT EXISTS category_id INT;

DO $$ 
BEGIN
    -- Add category foreign key constraint
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_brands_category') THEN
        ALTER TABLE brands ADD CONSTRAINT fk_brands_category 
            FOREIGN KEY (category_id) REFERENCES categories (cat_id) 
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    
    -- Add user foreign key constraint
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_brands_user') THEN
        ALTER TABLE brands ADD CONSTRAINT fk_brands_user 
            FOREIGN KEY (created_by) REFERENCES customer (customer_id) 
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    
    -- Add unique constraint
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_brand_category') THEN
        ALTER TABLE brands ADD CONSTRAINT unique_brand_category 
            UNIQUE (brand_name, category_id);
    END IF;
END $$;

-- Make columns NOT NULL (safe since brands table is empty)
ALTER TABLE brands ALTER COLUMN created_by SET NOT NULL;
ALTER TABLE brands ALTER COLUMN category_id SET NOT NULL;

ALTER TABLE products ADD COLUMN IF NOT EXISTS product_qty INT DEFAULT 0;

-- Increase product_image column size to handle JSON
ALTER TABLE products ALTER COLUMN product_image TYPE TEXT;


-- Updated cart table schema
ALTER TABLE cart DROP COLUMN IF EXISTS ip_add;
ALTER TABLE cart ADD COLUMN session_id VARCHAR(255);
ALTER TABLE cart ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE cart ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_cart_session ON cart (session_id);
CREATE INDEX IF NOT EXISTS idx_cart_customer ON cart (c_id);

-- Add composite primary key or unique constraint
ALTER TABLE cart ADD CONSTRAINT unique_cart_item 
    UNIQUE (session_id, c_id, p_id);


ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_reference VARCHAR(50) UNIQUE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_total DECIMAL(10,2) NOT NULL DEFAULT 0;

-- Add missing columns to orderdetails table  
ALTER TABLE orderdetails ADD COLUMN IF NOT EXISTS price DECIMAL(10,2) NOT NULL DEFAULT 0;

-- Update payment table
ALTER TABLE payment ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) DEFAULT 'completed';
ALTER TABLE payment ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50) DEFAULT 'simulated';

ALTER TABLE orders ALTER COLUMN invoice_no DROP NOT NULL;

-- Add updated_at column to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Update existing products to have current timestamp
UPDATE products 
SET updated_at = CURRENT_TIMESTAMP 
WHERE updated_at IS NULL;

-- Paystack integration - add only missing columns to existing payment table
ALTER TABLE payment ADD COLUMN IF NOT EXISTS transaction_ref VARCHAR(255);
ALTER TABLE payment ADD COLUMN IF NOT EXISTS authorization_code VARCHAR(255);
ALTER TABLE payment ADD COLUMN IF NOT EXISTS payment_channel VARCHAR(100) DEFAULT 'card';

-- Update payment_date to TIMESTAMP for better precision
ALTER TABLE payment ALTER COLUMN payment_date TYPE TIMESTAMP;
ALTER TABLE payment ALTER COLUMN payment_date SET DEFAULT NOW();

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_payment_transaction_ref ON payment (transaction_ref);
CREATE INDEX IF NOT EXISTS idx_payment_order_id ON payment (order_id);

ALTER TABLE orders ALTER COLUMN invoice_no TYPE VARCHAR(100);

-- Create reviews table
CREATE TABLE IF NOT EXISTS product_reviews (
    review_id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES products(product_id) ON DELETE CASCADE,
    customer_id INTEGER NOT NULL REFERENCES customer(customer_id) ON DELETE CASCADE,
    order_id INTEGER REFERENCES orders(order_id), -- For verified purchase
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review_title VARCHAR(200),
    review_text TEXT,
    is_verified_purchase BOOLEAN DEFAULT FALSE,
    is_approved BOOLEAN DEFAULT TRUE, -- For moderation
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(product_id, customer_id, order_id) -- Prevent duplicate reviews per order
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_product_reviews_product_id ON product_reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_customer_id ON product_reviews(customer_id);




-- Add tracking columns to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_notes TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Update existing orders to have updated_at timestamps
UPDATE orders 
SET updated_at = order_date 
WHERE updated_at IS NULL;


ALTER TABLE customer ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;


UPDATE customer 
SET created_at = CURRENT_TIMESTAMP 
WHERE created_at IS NULL;

-- Add updated_at column to customer table
ALTER TABLE customer ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Update existing customers to have current timestamp for updated_at
UPDATE customer 
SET updated_at = created_at 
WHERE updated_at IS NULL;