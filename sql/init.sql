CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  image_url TEXT NOT NULL DEFAULT '',
  price NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_products_category_name
  ON products (category_id, name);

INSERT INTO categories (title)
VALUES ('Pizzas Artesanais'), ('Bebidas'), ('Sobremesas')
ON CONFLICT (title) DO NOTHING;

INSERT INTO products (category_id, name, description, image_url, price)
SELECT c.id, v.name, v.description, v.image_url, v.price
FROM categories c
JOIN (
  VALUES
    ('Pizzas Artesanais', 'Margherita D.O.P', 'Molho San Marzano, mozzarella fior di latte, manjericão e azeite extravirgem.', 'https://popmenucloud.com/cdn-cgi/image/width%3D1200%2Cheight%3D1200%2Cfit%3Dscale-down%2Cformat%3Dauto%2Cquality%3D60/exczvrou/4310d7e9-bff9-4f37-8228-27773d0ad664.jpg', 58.00::numeric),
    ('Pizzas Artesanais', 'Pepperoni Especial', 'Mussarela premium, pepperoni fatiado, cebola roxa e orégano fresco.', 'https://www.seara.com.br/wp-content/uploads/2025/09/pizza-de-pepperoni-caseira-portal-minha-receita.jpg', 62.00::numeric),
    ('Pizzas Artesanais', 'Quatro Formaggi', 'Combinação equilibrada de mussarela, gorgonzola, parmesão e provolone.', 'https://www.ogastronomo.com.br/upload/747855897-a-arte-e-a-historia-da-pizza-quatro-queijos-um-guia-completo.jpg', 65.00::numeric),
    ('Pizzas Artesanais', 'Portuguesa Real', 'Presunto cozido, ovos, cebola, azeitonas pretas e pimentões coloridos.', 'https://www.ogastronomo.com.br/upload/389528334-curiosidades-sobre-a-pizza-portuguesa.jpg', 60.00::numeric),
    ('Pizzas Artesanais', 'Calabresa Artesanal', 'Calabresa defumada artesanalmente, cebola branca e toque de alecrim.', 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTljp0vJsAaTHGJ3ZBQycHtVFw1QfvQ7I_3aA&s', 56.00::numeric),
    ('Bebidas', 'Soda Italiana', 'Refresco de limão siciliano ou frutas vermelhas.', 'https://images.cooknenjoy.com/uploads/2022/02/soda-italiana-2-1800x1352.jpg', 14.00::numeric),
    ('Bebidas', 'Cerveja Artesanal', 'IPA da casa, refrescante e intensamente aromática.', 'https://cervejariaantuerpia.com.br/wp-content/uploads/2020/09/como-surgiu-a-cerveja-artesanal.jpg', 22.00::numeric),
    ('Bebidas', 'Vinho Tinto (Taça)', 'Cabernet Sauvignon selecionado para a Fiamma.', 'https://zaffdesign.com.br/cdn/shop/files/Taca_Jeannine_Cho_Lee.webp?v=1770988190&width=2048', 28.00::numeric),
    ('Bebidas', 'Suco Natural', 'Laranja batida na hora. Frescor absoluto (500ml).', 'https://www.samsclub.com.br/blog/wp-content/uploads/2024/01/Vidro-do-suco-de-laranja-colocado-num-copo-sobre-madeira.jpg', 12.00::numeric),
    ('Bebidas', 'Água San Pellegrino', 'Água mineral gaseificada naturalmente de fonte italiana.', 'https://m.media-amazon.com/images/I/41cPocfcLZL._AC_UF894,1000_QL80_.jpg', 18.00::numeric),
    ('Sobremesas', 'Tiramisu Tradicional', 'O clássico com café espresso e legítimo mascarpone.', 'https://cloudfront-us-east-1.images.arcpublishing.com/estadao/Q3SE72ZUZRGKHOJHHW33TBLP4A.jpg', 25.00::numeric),
    ('Sobremesas', 'Cheesecake de Frutas', 'Base crocante com calda artesanal de frutas vermelhas.', 'https://s2-receitas.glbimg.com/54KiQVGas8DCIiwYqclaakNc1O4=/0x0:1366x768/600x0/smart/filters:gifv():strip_icc()/i.s3.glbimg.com/v1/AUTH_1f540e0b94d8437dbbc39d567a1dee68/internal_photos/bs/2025/3/r/h8urvgQPO8vv1nWSPy3A/cheesecake-de-frutas-vermelhas.jpg', 22.00::numeric),
    ('Sobremesas', 'Petit Gâteau', 'Bolinho quente de chocolate belga e sorvete artesanal.', 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTim7T_lACYpmPL7fhBLCw4Cwa0NM4797IlqA&s', 24.00::numeric),
    ('Sobremesas', 'Cannoli Siciliano', 'Massa crocante recheada com ricota e pistache.', 'https://www.giallozafferano.com.br/images/4-461/Cannoli-siciliani_1200x800.jpg', 18.00::numeric),
    ('Sobremesas', 'Gelato Italiano', 'Duas bolas de gelato artesanal à sua escolha.', 'https://media.gazetadopovo.com.br/2020/02/11154241/texto_01_img_02.jpg', 20.00::numeric)
) AS v(category_title, name, description, image_url, price)
ON c.title = v.category_title
ON CONFLICT (category_id, name)
DO UPDATE SET
  description = EXCLUDED.description,
  image_url = EXCLUDED.image_url,
  price = EXCLUDED.price;
