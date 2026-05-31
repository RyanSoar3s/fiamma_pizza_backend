import { pool } from './pool.js';

export async function ensureSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS categories (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL UNIQUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  
  `);
  

  await pool.query(`
    CREATE TABLE IF NOT EXISTS products (
      id SERIAL PRIMARY KEY,
      category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      image_url TEXT NOT NULL DEFAULT '',
      price NUMERIC(10,2) NOT NULL CHECK (price >= 0),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

  `);

  await pool.query(`
    ALTER TABLE products
    ADD COLUMN IF NOT EXISTS image_url TEXT NOT NULL DEFAULT '';
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS orders (
      id SERIAL PRIMARY KEY,
      external_reference TEXT NOT NULL UNIQUE,
      payer_email TEXT,
      items JSONB NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      preference_id TEXT,
      preference_init_point TEXT,
      preference_sandbox_init_point TEXT,
      preference_expires_at TIMESTAMPTZ,
      payment_id TEXT,
      payment_payload JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS preference_id TEXT,
    ADD COLUMN IF NOT EXISTS preference_init_point TEXT,
    ADD COLUMN IF NOT EXISTS preference_sandbox_init_point TEXT,
    ADD COLUMN IF NOT EXISTS preference_expires_at TIMESTAMPTZ;
  `);

}
