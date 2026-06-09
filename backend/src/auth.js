"use strict";

const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { config } = require("./config");
const { pool } = require("./db");

const PASSWORD_ROUNDS = 12;

function createToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role, username: user.username },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn, issuer: "abw-online-os" },
  );
}

async function hashPassword(password) {
  return bcrypt.hash(password, PASSWORD_ROUNDS);
}

async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

function publicUser(row, includeSecurity = false) {
  const user = {
    id: row.id,
    nick: row.username,
    fullName: row.full_name,
    role: row.role,
    rank: row.rank,
    badge: row.badge,
    exp: Number(row.exp || 0),
    updated_at: new Date(row.updated_at).toISOString(),
  };
  if (includeSecurity) {
    user.disabled = Boolean(row.disabled);
    user.failedAttempts = Number(row.failed_attempts || 0);
    user.lockedUntil = row.locked_until ? new Date(row.locked_until).getTime() : 0;
  }
  return user;
}

async function authenticate(req, res, next) {
  const header = req.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return res.status(401).json({ error: "Brak tokenu dostepu" });

  try {
    const payload = jwt.verify(token, config.jwtSecret, {
      issuer: "abw-online-os",
    });
    const result = await pool.query("SELECT * FROM users WHERE id = $1", [payload.sub]);
    const user = result.rows[0];
    if (!user || user.disabled) {
      return res.status(401).json({ error: "Konto jest niedostepne" });
    }
    req.auth = { token, user };
    next();
  } catch (error) {
    return res.status(401).json({ error: "Token wygasl lub jest nieprawidlowy" });
  }
}

function requireAdmin(req, res, next) {
  if (req.auth.user.role !== "admin") {
    return res.status(403).json({ error: "Ta operacja wymaga roli administratora" });
  }
  next();
}

module.exports = {
  authenticate,
  createToken,
  hashPassword,
  publicUser,
  requireAdmin,
  verifyPassword,
};
