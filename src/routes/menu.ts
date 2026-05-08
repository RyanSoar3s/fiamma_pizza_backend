import { Router } from 'express';
import { pool } from '../database/pool.js';

export const menuRouter = Router();

menuRouter.get('/menu', async (_req, res) => {
  const query = `
    SELECT
      c.title,
      p.name,
      p.description,
      p.image_url,
      p.price
    FROM categories c
    LEFT JOIN products p ON p.category_id = c.id
    ORDER BY c.title, p.name;
  
  `;

  const result = await pool.query(query);

  const grouped = result.rows.reduce<Array<{
    title: string;
    items: Array<{ name: string; desc: string; imageUrl: string; price: number }>;

  }>>((acc, row) => {
    let category = acc.find((entry) => entry.title === row.title);

    if (!category) {
      category = { title: row.title, items: [] };
      acc.push(category);

    }

    if (row.name) {
      category.items.push({
        name: row.name,
        desc: row.description,
        imageUrl: row.image_url,
        price: Number(row.price)

      });
    
    }

    return acc;
    
  }, []);

  return res.json(grouped);

});
