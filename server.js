import express from "express";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

dotenv.config();

const app = express();

app.use(cors());
app.use(bodyParser.json());

app.use(express.static(path.join(dirname, "public")));
app.use("/JS", express.static(path.join(dirname, "JS")));

import registerRouter from "./Actions/registerCustomerAction.js";
app.use("/register", registerRouter);

app.get("/register", (req, res) => {
  res.sendFile(path.join(dirname, "views", "register.html"));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
