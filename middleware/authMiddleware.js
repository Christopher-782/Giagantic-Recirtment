// middleware/authMiddleware.js
const jwt = require("jsonwebtoken"); // ← ADD THIS LINE

module.exports = function (req, res, next) {
  console.log("Auth middleware called for:", req.path);

  const token = req.header("x-auth-token");
  if (!token) {
    return res.status(401).json({ msg: "No token, authorization denied" });
  }
  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "supersecretjwtkey",
    );
    req.user = decoded.user;
    console.log("Token valid, user:", req.user);
    next();
  } catch (err) {
    console.error("Token verification failed:", err.message);
    res.status(401).json({ msg: "Token is not valid" });
  }
};
