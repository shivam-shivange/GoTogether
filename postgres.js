import pkg from "pg";
const { Pool } = pkg;

export const pg = new Pool({
  host: process.env.PGHOST,
  port: process.env.PGPORT,
  database: process.env.PGDATABASE,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD
});

pg.on("connect", () => console.log("✅ PostgreSQL connected"));
pg.on("error", (err) => console.error("❌ PostgreSQL error:", err));
