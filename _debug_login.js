const { Client } = require("pg");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

async function main() {
  // Test DB connection
  const c = new Client({
    connectionString:
      "postgresql://neondb_owner:npg_xy9DkbXt0VNE@ep-calm-truth-asaun4so.c-4.eu-central-1.aws.neon.tech/neondb?sslmode=require",
  });
  await c.connect();
  console.log("DB connected");

  // Find user
  const r = await c.query("SELECT * FROM users WHERE email = 'khaled@test.com'");
  console.log("User found:", r.rows[0]?.email, r.rows[0]?.role);

  // Test password
  const valid = bcrypt.compareSync("123456", r.rows[0].password_hash);
  console.log("Password valid:", valid);

  // Test JWT
  const payload = {
    sub: r.rows[0].id,
    email: r.rows[0].email,
    role: r.rows[0].role,
    fullName: r.rows[0].full_name,
  };
  const secret = "dev-only-insecure-secret";
  const token = jwt.sign(payload, secret, { expiresIn: 60 * 60 * 24 * 7 });
  console.log("JWT works:", token.slice(0, 30) + "...");

  await c.end();
  console.log("All checks passed");
}
main().catch((e) => {
  console.error("ERROR:", e);
  process.exit(1);
});
