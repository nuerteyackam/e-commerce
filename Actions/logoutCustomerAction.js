import express from "express";

const router = express.Router();

router.post("/", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Error destroying session:", err);
      return res.status(500).json({ success: false, message: "Logout failed" });
    }
    res.clearCookie("connect.sid"); // clear the session cookie
    res.json({ success: true, message: "Logged out successfully" });
  });
});

export default router;
