import express from "express";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import session from "express-session";

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

dotenv.config();

const app = express();

app.use(cors());
app.use(bodyParser.json());

app.use(
  session({
    secret: process.env.SESSION_SECRET || "secretkeynotyetinenvfile",
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false },
  })
);

app.use(express.static(path.join(dirname, "public")));
app.use("/JS", express.static(path.join(dirname, "JS")));

import registerRouter from "./Actions/registerCustomerAction.js";
import loginRouter from "./Actions/loginCustomerAction.js";
import logoutRouter from "./Actions/logoutCustomerAction.js";

// Mount routers for customer authentication actions/routes
app.use("/register", registerRouter);
app.use("/login", loginRouter);
app.use("/logout", logoutRouter);

// serving html pages
app.get("/register", (req, res) => {
  res.sendFile(path.join(dirname, "views", "register.html"));
});
app.get("/login", (req, res) => {
  res.sendFile(path.join(dirname, "views", "login.html"));
});
app.get("/index.html", (req, res) => {
  res.sendFile(path.join(dirname, "index.html"));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
