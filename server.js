import express from "express";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import session from "express-session";

import { ensureCartSession } from "./middleware/cartSession.js";

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

dotenv.config();

const app = express();

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(
  session({
    secret: process.env.SESSION_SECRET || "secretkeynotyetinenvfile",
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false },
  })
);

app.use(ensureCartSession);

app.use(express.static(path.join(dirname, "public")));
app.use("/JS", express.static(path.join(dirname, "JS")));
app.use("/uploads", express.static(path.join(dirname, "uploads")));

// Import existing action routers
import registerRouter from "./Actions/registerCustomerAction.js";
import loginRouter from "./Actions/loginCustomerAction.js";
import logoutRouter from "./Actions/logoutCustomerAction.js";
import addCategoryRouter from "./Actions/addCategoryAction.js";
import fetchCategoryRouter from "./Actions/fetchCategoryAction.js";
import updateCategoryRouter from "./Actions/updateCategoryAction.js";
import deleteCategoryRouter from "./Actions/deleteCategoryAction.js";
import addBrandRouter from "./Actions/addBrandAction.js";
import fetchBrandRouter from "./Actions/fetchBrandAction.js";
import updateBrandRouter from "./Actions/updateBrandAction.js";
import deleteBrandRouter from "./Actions/deleteBrandAction.js";

// Import admin product routers
import addProductRouter from "./Actions/addProductAction.js";
import fetchProductsRouter from "./Actions/fetchProductsAction.js";
import updateProductRouter from "./Actions/updateProductAction.js";
import deleteProductRouter from "./Actions/deleteProductAction.js";
import uploadProductImageRouter from "./Actions/uploadProductImageAction.js";
import fetchBrandsByCategoryRouter from "./Actions/fetchBrandsByCategoryAction.js";

// Import customer product router
import customerProductRouter from "./Actions/customerProductActions.js";

// Import cart action routers
import addToCartRouter from "./Actions/addToCartAction.js";
import removeFromCartRouter from "./Actions/removeFromCartAction.js";
import updateQuantityRouter from "./Actions/updateQuantityAction.js";
import emptyCartRouter from "./Actions/emptyCartAction.js";
import getCartRouter from "./Actions/getCartAction.js";

// Import order action routers
import processCheckoutRouter from "./Actions/processCheckoutAction.js";
import processPaymentRouter from "./Actions/processPaymentAction.js";
import getOrdersRouter from "./Actions/getOrdersAction.js";
import getOrderDetailsRouter from "./Actions/getOrderDetailsAction.js";

// Mount existing routers for customer authentication
app.use("/register", registerRouter);
app.use("/login", loginRouter);
app.use("/logout", logoutRouter);

// Category routes
app.use("/add-category", addCategoryRouter);
app.use("/fetch-categories", fetchCategoryRouter);
app.use("/update-category", updateCategoryRouter);
app.use("/delete-category", deleteCategoryRouter);

// Brand routes
app.use("/add-brand", addBrandRouter);
app.use("/fetch-brands", fetchBrandRouter);
app.use("/update-brand", updateBrandRouter);
app.use("/delete-brand", deleteBrandRouter);

// Admin product routes
app.use("/add-product", addProductRouter);
app.use("/fetch-products", fetchProductsRouter);
app.use("/update-product", updateProductRouter);
app.use("/delete-product", deleteProductRouter);
app.use("/upload-product-image", uploadProductImageRouter);
app.use("/fetch-brands-by-category", fetchBrandsByCategoryRouter);

// Customer product API routes
app.use("/api/products", customerProductRouter);

// Cart action routes
app.use("/add-to-cart", addToCartRouter);
app.use("/remove-from-cart", removeFromCartRouter);
app.use("/update-quantity", updateQuantityRouter);
app.use("/empty-cart", emptyCartRouter);
app.use("/get-cart", getCartRouter);

// Order action routes
app.use("/process-checkout", processCheckoutRouter);
app.use("/process-payment", processPaymentRouter);
app.use("/get-orders", getOrdersRouter);
app.use("/get-order-details", getOrderDetailsRouter);

// Serving admin HTML pages
app.use("/pages", express.static(path.join(dirname, "views")));
// Home page routes
app.get("/index.html", (req, res) => {
  res.sendFile(path.join(dirname, "index.html"));
});

app.get("/", (req, res) => {
  res.sendFile(path.join(dirname, "views", "customer", "home.html"));
});

// Customer-facing product pages
app.get("/all-products", (req, res) => {
  res.sendFile(path.join(dirname, "views", "customer", "all_products.html"));
});

// Cart page
app.get("/cart", (req, res) => {
  res.sendFile(path.join(dirname, "views", "customer", "cart.html"));
});

app.get("/product/:productId", (req, res) => {
  res.sendFile(path.join(dirname, "views", "customer", "single_product.html"));
});

app.get("/checkout", (req, res) => {
  res.sendFile(path.join(dirname, "views", "customer", "checkout.html"));
});

app.get("/orders", (req, res) => {
  res.sendFile(path.join(dirname, "views", "customer", "orders.html"));
});

// Admin pages
app.get("/admin", (req, res) => {
  res.sendFile(path.join(dirname, "index.html"));
});

app.get("/admin/category", (req, res) => {
  res.sendFile(path.join(dirname, "views", "admin", "category.html"));
});

app.get("/admin/brand", (req, res) => {
  res.sendFile(path.join(dirname, "views", "admin", "brand.html"));
});

app.get("/admin/product", (req, res) => {
  res.sendFile(path.join(dirname, "views", "admin", "product.html"));
});

// Legacy route (keeping for backward compatibility)
app.get("/category/:id", (req, res) => {
  res.sendFile(path.join(dirname, "views", "category-products.html"));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
