-- Insert 10 sample categories
INSERT INTO public.categories (name, description) VALUES
('Electronics', 'Electronic devices and accessories'),
('Clothing', 'Apparel and fashion items'),
('Food & Beverages', 'Food items and drinks'),
('Home & Garden', 'Home improvement and gardening supplies'),
('Sports & Outdoors', 'Sports equipment and outdoor gear'),
('Books & Media', 'Books, magazines, and media products'),
('Health & Beauty', 'Personal care and beauty products'),
('Toys & Games', 'Toys, games, and entertainment'),
('Automotive', 'Car parts and automotive accessories'),
('Office Supplies', 'Office equipment and stationery');

-- Insert 20 products for Electronics category
INSERT INTO public.products (name, sku, price, category_id, current_stock) 
SELECT 
  product_name,
  'ELE-' || LPAD((ROW_NUMBER() OVER())::text, 4, '0'),
  price,
  (SELECT id FROM public.categories WHERE name = 'Electronics'),
  FLOOR(RANDOM() * 100 + 10)::integer
FROM (VALUES
  ('Wireless Headphones', 99.99),
  ('Smartphone Case', 24.99),
  ('USB Cable', 12.99),
  ('Bluetooth Speaker', 79.99),
  ('Power Bank', 34.99),
  ('Laptop Charger', 49.99),
  ('Phone Screen Protector', 9.99),
  ('Wireless Mouse', 29.99),
  ('Keyboard', 69.99),
  ('Webcam', 89.99),
  ('Monitor Stand', 39.99),
  ('HDMI Cable', 19.99),
  ('External Hard Drive', 119.99),
  ('Smart Watch', 199.99),
  ('Tablet Stand', 29.99),
  ('Wireless Charger', 44.99),
  ('Earbuds', 59.99),
  ('Phone Holder', 14.99),
  ('Surge Protector', 24.99),
  ('LED Desk Lamp', 49.99)
) AS products(product_name, price);

-- Insert 20 products for Clothing category
INSERT INTO public.products (name, sku, price, category_id, current_stock) 
SELECT 
  product_name,
  'CLO-' || LPAD((ROW_NUMBER() OVER())::text, 4, '0'),
  price,
  (SELECT id FROM public.categories WHERE name = 'Clothing'),
  FLOOR(RANDOM() * 100 + 10)::integer
FROM (VALUES
  ('Cotton T-Shirt', 19.99),
  ('Denim Jeans', 49.99),
  ('Hoodie Sweatshirt', 39.99),
  ('Casual Sneakers', 79.99),
  ('Baseball Cap', 24.99),
  ('Leather Belt', 29.99),
  ('Winter Jacket', 89.99),
  ('Polo Shirt', 34.99),
  ('Cargo Shorts', 32.99),
  ('Dress Shirt', 44.99),
  ('Yoga Pants', 29.99),
  ('Running Shorts', 24.99),
  ('Flannel Shirt', 39.99),
  ('Wool Sweater', 59.99),
  ('Track Pants', 34.99),
  ('Summer Dress', 49.99),
  ('Denim Jacket', 69.99),
  ('Casual Loafers', 64.99),
  ('Graphic Tee', 22.99),
  ('Chino Pants', 42.99)
) AS products(product_name, price);

-- Insert 20 products for Food & Beverages category
INSERT INTO public.products (name, sku, price, category_id, current_stock) 
SELECT 
  product_name,
  'FOD-' || LPAD((ROW_NUMBER() OVER())::text, 4, '0'),
  price,
  (SELECT id FROM public.categories WHERE name = 'Food & Beverages'),
  FLOOR(RANDOM() * 100 + 10)::integer
FROM (VALUES
  ('Organic Coffee Beans', 16.99),
  ('Green Tea Bags', 8.99),
  ('Protein Bars', 24.99),
  ('Almond Butter', 12.99),
  ('Honey Jar', 9.99),
  ('Olive Oil', 14.99),
  ('Granola Cereal', 7.99),
  ('Dark Chocolate', 5.99),
  ('Energy Drinks', 18.99),
  ('Sparkling Water', 6.99),
  ('Fruit Smoothie Mix', 11.99),
  ('Herbal Tea', 10.99),
  ('Coconut Oil', 13.99),
  ('Trail Mix', 8.99),
  ('Vitamin Water', 4.99),
  ('Protein Powder', 34.99),
  ('Nut Butter', 11.99),
  ('Dried Fruits', 9.99),
  ('Sports Drink', 3.99),
  ('Meal Replacement Bar', 15.99)
) AS products(product_name, price);

-- Insert 20 products for Home & Garden category
INSERT INTO public.products (name, sku, price, category_id, current_stock) 
SELECT 
  product_name,
  'HOM-' || LPAD((ROW_NUMBER() OVER())::text, 4, '0'),
  price,
  (SELECT id FROM public.categories WHERE name = 'Home & Garden'),
  FLOOR(RANDOM() * 100 + 10)::integer
FROM (VALUES
  ('Garden Hose', 29.99),
  ('Potting Soil', 12.99),
  ('Plant Fertilizer', 8.99),
  ('Watering Can', 19.99),
  ('Garden Gloves', 9.99),
  ('Flower Pots', 15.99),
  ('Lawn Sprinkler', 34.99),
  ('Pruning Shears', 24.99),
  ('Garden Tools Set', 49.99),
  ('Outdoor Cushions', 39.99),
  ('Solar Lights', 22.99),
  ('Bird Feeder', 16.99),
  ('Garden Statue', 44.99),
  ('Mulch Bag', 6.99),
  ('Plant Stakes', 7.99),
  ('Garden Bench', 89.99),
  ('Outdoor Thermometer', 14.99),
  ('Wind Chimes', 18.99),
  ('Garden Hoe', 21.99),
  ('Compost Bin', 79.99)
) AS products(product_name, price);

-- Insert 20 products for Sports & Outdoors category
INSERT INTO public.products (name, sku, price, category_id, current_stock) 
SELECT 
  product_name,
  'SPO-' || LPAD((ROW_NUMBER() OVER())::text, 4, '0'),
  price,
  (SELECT id FROM public.categories WHERE name = 'Sports & Outdoors'),
  FLOOR(RANDOM() * 100 + 10)::integer
FROM (VALUES
  ('Basketball', 24.99),
  ('Soccer Ball', 19.99),
  ('Tennis Racket', 89.99),
  ('Yoga Mat', 29.99),
  ('Dumbbells Set', 69.99),
  ('Running Shoes', 119.99),
  ('Water Bottle', 14.99),
  ('Gym Bag', 34.99),
  ('Exercise Resistance Bands', 19.99),
  ('Hiking Backpack', 79.99),
  ('Camping Tent', 149.99),
  ('Sleeping Bag', 59.99),
  ('Fishing Rod', 94.99),
  ('Bicycle Helmet', 49.99),
  ('Skateboard', 84.99),
  ('Golf Balls', 29.99),
  ('Swimming Goggles', 16.99),
  ('Jump Rope', 12.99),
  ('Foam Roller', 24.99),
  ('Protein Shaker', 9.99)
) AS products(product_name, price);

-- Insert 20 products for Books & Media category
INSERT INTO public.products (name, sku, price, category_id, current_stock) 
SELECT 
  product_name,
  'BOO-' || LPAD((ROW_NUMBER() OVER())::text, 4, '0'),
  price,
  (SELECT id FROM public.categories WHERE name = 'Books & Media'),
  FLOOR(RANDOM() * 100 + 10)::integer
FROM (VALUES
  ('Business Strategy Book', 24.99),
  ('Cookbook Collection', 29.99),
  ('Science Fiction Novel', 14.99),
  ('Self-Help Guide', 19.99),
  ('Programming Manual', 49.99),
  ('Art History Book', 34.99),
  ('Travel Guide', 22.99),
  ('Biography', 18.99),
  ('Mystery Novel', 16.99),
  ('Fitness Magazine', 5.99),
  ('Photography Book', 39.99),
  ('Children Story Book', 12.99),
  ('Language Learning Book', 27.99),
  ('Music Theory Guide', 32.99),
  ('History Textbook', 44.99),
  ('Poetry Collection', 15.99),
  ('Comic Book Series', 9.99),
  ('DIY Manual', 21.99),
  ('Philosophy Book', 26.99),
  ('Educational Workbook', 17.99)
) AS products(product_name, price);

-- Insert 20 products for Health & Beauty category
INSERT INTO public.products (name, sku, price, category_id, current_stock) 
SELECT 
  product_name,
  'HEA-' || LPAD((ROW_NUMBER() OVER())::text, 4, '0'),
  price,
  (SELECT id FROM public.categories WHERE name = 'Health & Beauty'),
  FLOOR(RANDOM() * 100 + 10)::integer
FROM (VALUES
  ('Face Moisturizer', 24.99),
  ('Shampoo & Conditioner', 16.99),
  ('Vitamin C Serum', 34.99),
  ('Sunscreen SPF 50', 19.99),
  ('Body Lotion', 14.99),
  ('Facial Cleanser', 18.99),
  ('Hair Styling Gel', 12.99),
  ('Lip Balm Set', 9.99),
  ('Essential Oils', 29.99),
  ('Multivitamins', 22.99),
  ('Teeth Whitening Kit', 39.99),
  ('Hand Sanitizer', 6.99),
  ('Face Masks', 15.99),
  ('Nail Polish Set', 19.99),
  ('Perfume', 49.99),
  ('Hair Brush', 16.99),
  ('Makeup Remover', 11.99),
  ('Body Wash', 13.99),
  ('Anti-Aging Cream', 44.99),
  ('Deodorant', 8.99)
) AS products(product_name, price);

-- Insert 20 products for Toys & Games category
INSERT INTO public.products (name, sku, price, category_id, current_stock) 
SELECT 
  product_name,
  'TOY-' || LPAD((ROW_NUMBER() OVER())::text, 4, '0'),
  price,
  (SELECT id FROM public.categories WHERE name = 'Toys & Games'),
  FLOOR(RANDOM() * 100 + 10)::integer
FROM (VALUES
  ('Building Blocks Set', 34.99),
  ('Board Game Classic', 24.99),
  ('Remote Control Car', 49.99),
  ('Puzzle 1000 Pieces', 19.99),
  ('Action Figure', 16.99),
  ('Doll House', 79.99),
  ('Card Game Deck', 9.99),
  ('Educational Toy', 29.99),
  ('Art Supply Kit', 22.99),
  ('Musical Instrument Toy', 39.99),
  ('Outdoor Play Set', 89.99),
  ('Video Game Controller', 59.99),
  ('Stuffed Animal', 14.99),
  ('Science Experiment Kit', 44.99),
  ('Model Airplane', 32.99),
  ('Chess Set', 27.99),
  ('Coloring Books', 7.99),
  ('Building Tools Toy Set', 26.99),
  ('Electronic Learning Toy', 54.99),
  ('Craft Kit', 18.99)
) AS products(product_name, price);

-- Insert 20 products for Automotive category
INSERT INTO public.products (name, sku, price, category_id, current_stock) 
SELECT 
  product_name,
  'AUT-' || LPAD((ROW_NUMBER() OVER())::text, 4, '0'),
  price,
  (SELECT id FROM public.categories WHERE name = 'Automotive'),
  FLOOR(RANDOM() * 100 + 10)::integer
FROM (VALUES
  ('Car Phone Mount', 19.99),
  ('Dashboard Camera', 89.99),
  ('Car Air Freshener', 4.99),
  ('Tire Pressure Gauge', 14.99),
  ('Jumper Cables', 29.99),
  ('Car Charger', 12.99),
  ('Floor Mats', 34.99),
  ('Car Wash Kit', 24.99),
  ('Emergency Kit', 49.99),
  ('Seat Covers', 39.99),
  ('Windshield Wipers', 22.99),
  ('Motor Oil', 26.99),
  ('Car Vacuum', 59.99),
  ('GPS Navigation', 119.99),
  ('Brake Pads', 79.99),
  ('Car Polish', 16.99),
  ('Tire Shine Spray', 8.99),
  ('Car Sunshade', 18.99),
  ('Tool Kit', 44.99),
  ('Car Bluetooth Adapter', 32.99)
) AS products(product_name, price);

-- Insert 20 products for Office Supplies category
INSERT INTO public.products (name, sku, price, category_id, current_stock) 
SELECT 
  product_name,
  'OFF-' || LPAD((ROW_NUMBER() OVER())::text, 4, '0'),
  price,
  (SELECT id FROM public.categories WHERE name = 'Office Supplies'),
  FLOOR(RANDOM() * 100 + 10)::integer
FROM (VALUES
  ('Ballpoint Pens', 8.99),
  ('Notebook Set', 12.99),
  ('Desk Organizer', 24.99),
  ('Printer Paper', 19.99),
  ('Sticky Notes', 6.99),
  ('File Folders', 14.99),
  ('Calculator', 16.99),
  ('Stapler', 11.99),
  ('Highlighter Set', 9.99),
  ('Binder Clips', 4.99),
  ('Paper Shredder', 79.99),
  ('Desk Calendar', 15.99),
  ('Whiteboard Markers', 13.99),
  ('Envelope Pack', 7.99),
  ('Hole Punch', 18.99),
  ('Scissors', 12.99),
  ('Rubber Stamps', 22.99),
  ('Label Maker', 49.99),
  ('Paper Clips', 3.99),
  ('Desk Pad', 21.99)
) AS products(product_name, price);