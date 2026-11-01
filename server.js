const express = require('express');
const cors = require('cors');
const path = require('node:path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { db } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-ecommerce-jwt-key-2026';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// JWT Auth Middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
}

// Optional Auth Middleware (for guest or user check)
function optionalAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (token) {
    jwt.verify(token, JWT_SECRET, (err, user) => {
      if (!err) {
        req.user = user;
      }
      next();
    });
  } else {
    next();
  }
}

// ==========================================
// AUTHENTICATION ROUTES
// ==========================================

// Register
app.post('/api/auth/register', (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Please provide name, email, and password' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Check if user exists
    const checkStmt = db.prepare('SELECT id FROM users WHERE email = ?');
    const existing = checkStmt.get(email.toLowerCase().trim());
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    // Hash password & create user
    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(password, salt);
    const avatar = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}&backgroundColor=4f46e5`;

    const insertStmt = db.prepare(`
      INSERT INTO users (name, email, password, role, avatar)
      VALUES (?, ?, ?, 'customer', ?)
    `);

    const result = insertStmt.run(name.trim(), email.toLowerCase().trim(), hashedPassword, avatar);
    const userId = Number(result.lastInsertRowid);

    const token = jwt.sign(
      { id: userId, email: email.toLowerCase().trim(), name: name.trim(), role: 'customer' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'Registration successful',
      token,
      user: {
        id: userId,
        name: name.trim(),
        email: email.toLowerCase().trim(),
        role: 'customer',
        avatar
      }
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Server error during registration' });
  }
});

// Login
app.post('/api/auth/login', (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
    const user = stmt.get(email.toLowerCase().trim());

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isMatch = bcrypt.compareSync(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error during login' });
  }
});

// Get current user profile
app.get('/api/auth/me', authenticateToken, (req, res) => {
  try {
    const stmt = db.prepare('SELECT id, name, email, role, avatar, created_at FROM users WHERE id = ?');
    const user = stmt.get(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve user profile' });
  }
});

// ==========================================
// PRODUCTS API
// ==========================================

// Get all products with filtering, search, sorting
app.get('/api/products', (req, res) => {
  try {
    const { category, search, minPrice, maxPrice, sortBy, featured } = req.query;

    let query = 'SELECT * FROM products WHERE 1=1';
    const params = [];

    if (category && category !== 'All') {
      query += ' AND category = ?';
      params.push(category);
    }

    if (search && search.trim() !== '') {
      query += ' AND (name LIKE ? OR description LIKE ?)';
      params.push(`%${search.trim()}%`, `%${search.trim()}%`);
    }

    if (minPrice) {
      query += ' AND price >= ?';
      params.push(parseFloat(minPrice));
    }

    if (maxPrice) {
      query += ' AND price <= ?';
      params.push(parseFloat(maxPrice));
    }

    if (featured === '1' || featured === 'true') {
      query += ' AND featured = 1';
    }

    // Sorting
    switch (sortBy) {
      case 'price-asc':
        query += ' ORDER BY price ASC';
        break;
      case 'price-desc':
        query += ' ORDER BY price DESC';
        break;
      case 'rating':
        query += ' ORDER BY rating DESC';
        break;
      case 'newest':
        query += ' ORDER BY id DESC';
        break;
      default:
        query += ' ORDER BY featured DESC, rating DESC';
        break;
    }

    const stmt = db.prepare(query);
    const rows = stmt.all(...params);

    // Format products
    const products = rows.map(p => ({
      ...p,
      features: p.features ? JSON.parse(p.features) : [],
      specs: p.specs ? JSON.parse(p.specs) : {},
      gallery: p.gallery ? JSON.parse(p.gallery) : [p.image]
    }));

    // Get categories with counts
    const catStmt = db.prepare('SELECT category, COUNT(*) as count FROM products GROUP BY category');
    const categories = catStmt.all();

    res.json({
      count: products.length,
      categories,
      products
    });
  } catch (err) {
    console.error('Error fetching products:', err);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// Get single product by ID or Slug
app.get('/api/products/:identifier', (req, res) => {
  try {
    const { identifier } = req.params;
    const isNumeric = /^\d+$/.test(identifier);

    let stmt;
    if (isNumeric) {
      stmt = db.prepare('SELECT * FROM products WHERE id = ?');
    } else {
      stmt = db.prepare('SELECT * FROM products WHERE slug = ?');
    }

    const product = stmt.get(identifier);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Parse JSON fields
    product.features = product.features ? JSON.parse(product.features) : [];
    product.specs = product.specs ? JSON.parse(product.specs) : {};
    product.gallery = product.gallery ? JSON.parse(product.gallery) : [product.image];

    // Fetch reviews
    const reviewsStmt = db.prepare('SELECT * FROM reviews WHERE product_id = ? ORDER BY created_at DESC');
    const reviews = reviewsStmt.all(product.id);
    product.reviews = reviews;

    // Fetch related products in same category
    const relatedStmt = db.prepare('SELECT id, name, slug, price, original_price, rating, image, badge FROM products WHERE category = ? AND id != ? LIMIT 4');
    const related = relatedStmt.all(product.category, product.id);
    product.related = related;

    res.json(product);
  } catch (err) {
    console.error('Error fetching product details:', err);
    res.status(500).json({ error: 'Failed to fetch product details' });
  }
});

// Post review for a product
app.post('/api/products/:id/reviews', (req, res) => {
  try {
    const productId = req.params.id;
    const { user_name, rating, title, comment } = req.body;

    if (!user_name || !rating || !comment) {
      return res.status(400).json({ error: 'Name, rating, and comment are required' });
    }

    const insertStmt = db.prepare(`
      INSERT INTO reviews (product_id, user_name, rating, title, comment, verified)
      VALUES (?, ?, ?, ?, ?, 1)
    `);
    insertStmt.run(productId, user_name.trim(), parseInt(rating, 10), title ? title.trim() : '', comment.trim());

    // Update aggregate product rating & review count
    const aggStmt = db.prepare('SELECT AVG(rating) as avg_rating, COUNT(*) as count FROM reviews WHERE product_id = ?');
    const agg = aggStmt.get(productId);

    const updateProduct = db.prepare('UPDATE products SET rating = ?, reviews_count = ? WHERE id = ?');
    updateProduct.run(Math.round(agg.avg_rating * 10) / 10, agg.count, productId);

    res.status(201).json({ message: 'Review submitted successfully', rating: agg.avg_rating, reviews_count: agg.count });
  } catch (err) {
    console.error('Error submitting review:', err);
    res.status(500).json({ error: 'Failed to submit review' });
  }
});

// ==========================================
// CART & PROMO CODE API
// ==========================================

const PROMO_CODES = {
  'WELCOME10': { type: 'percent', value: 10, desc: '10% Off First Order' },
  'SAVE20': { type: 'fixed', value: 20, minSubtotal: 100, desc: '$20 Off orders over $100' },
  'FREESHIP': { type: 'shipping', value: 0, desc: 'Free Express Shipping' }
};

app.post('/api/promo/apply', (req, res) => {
  const { code, subtotal } = req.body;
  if (!code) {
    return res.status(400).json({ error: 'Promo code required' });
  }

  const promo = PROMO_CODES[code.toUpperCase().trim()];
  if (!promo) {
    return res.status(404).json({ error: 'Invalid promo code' });
  }

  if (promo.minSubtotal && subtotal < promo.minSubtotal) {
    return res.status(400).json({ error: `Promo requires a minimum subtotal of $${promo.minSubtotal}` });
  }

  res.json({
    valid: true,
    code: code.toUpperCase().trim(),
    promo
  });
});

// ==========================================
// ORDER PROCESSING API
// ==========================================

// Create Order (Checkout)
app.post('/api/orders', optionalAuth, (req, res) => {
  try {
    const {
      customer_name,
      customer_email,
      customer_phone,
      shipping_address,
      shipping_city,
      shipping_postal_code,
      shipping_country,
      shipping_method,
      payment_method,
      items,
      promo_code
    } = req.body;

    if (!customer_name || !customer_email || !shipping_address || !items || !items.length) {
      return res.status(400).json({ error: 'Please provide all required checkout fields and at least one item' });
    }

    // Calculate real subtotal from database prices to avoid tampering
    let calculatedSubtotal = 0;
    const validatedItems = [];

    for (const item of items) {
      const prodStmt = db.prepare('SELECT id, name, price, stock, image FROM products WHERE id = ?');
      const prod = prodStmt.get(item.id);

      if (!prod) {
        return res.status(400).json({ error: `Product ID ${item.id} not found` });
      }

      if (prod.stock < item.quantity) {
        return res.status(400).json({ error: `Insufficient stock for "${prod.name}". Only ${prod.stock} left in stock.` });
      }

      const itemTotal = prod.price * item.quantity;
      calculatedSubtotal += itemTotal;

      validatedItems.push({
        id: prod.id,
        name: prod.name,
        price: prod.price,
        quantity: item.quantity,
        image: prod.image,
        total: itemTotal
      });
    }

    // Shipping calculations
    let shippingFee = shipping_method === 'express' ? 14.99 : (calculatedSubtotal >= 75 ? 0 : 5.99);

    // Promo calculation
    let discount = 0;
    if (promo_code && PROMO_CODES[promo_code.toUpperCase().trim()]) {
      const p = PROMO_CODES[promo_code.toUpperCase().trim()];
      if (p.type === 'percent') {
        discount = (calculatedSubtotal * p.value) / 100;
      } else if (p.type === 'fixed' && calculatedSubtotal >= (p.minSubtotal || 0)) {
        discount = p.value;
      } else if (p.type === 'shipping') {
        shippingFee = 0;
      }
    }

    const tax = Math.round(calculatedSubtotal * 0.08 * 100) / 100; // 8% mock tax
    const finalTotal = Math.max(0, calculatedSubtotal - discount + shippingFee + tax);

    // Generate unique Order Number (e.g. ORD-984210)
    const randomSuffix = Math.floor(100000 + Math.random() * 900000);
    const orderNumber = `ORD-${randomSuffix}`;

    const userId = req.user ? req.user.id : null;

    // Insert Order
    const insertOrderStmt = db.prepare(`
      INSERT INTO orders (
        order_number, user_id, customer_name, customer_email, customer_phone,
        shipping_address, shipping_city, shipping_postal_code, shipping_country,
        shipping_method, payment_method, subtotal, discount, shipping_fee, tax,
        total, status, items_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Confirmed', ?)
    `);

    const result = insertOrderStmt.run(
      orderNumber,
      userId,
      customer_name.trim(),
      customer_email.trim().toLowerCase(),
      customer_phone ? customer_phone.trim() : '',
      shipping_address.trim(),
      shipping_city.trim(),
      shipping_postal_code.trim(),
      shipping_country || 'United States',
      shipping_method || 'Standard',
      payment_method || 'Credit Card',
      calculatedSubtotal,
      discount,
      shippingFee,
      tax,
      finalTotal,
      JSON.stringify(validatedItems)
    );

    // Decrement product inventory
    const updateStockStmt = db.prepare('UPDATE products SET stock = stock - ? WHERE id = ?');
    for (const item of validatedItems) {
      updateStockStmt.run(item.quantity, item.id);
    }

    const orderRecord = {
      id: Number(result.lastInsertRowid),
      order_number: orderNumber,
      customer_name,
      customer_email,
      shipping_address: `${shipping_address}, ${shipping_city} ${shipping_postal_code}`,
      shipping_method,
      payment_method,
      subtotal: calculatedSubtotal,
      discount,
      shipping_fee: shippingFee,
      tax,
      total: finalTotal,
      status: 'Confirmed',
      items: validatedItems,
      created_at: new Date().toISOString()
    };

    res.status(201).json({
      message: 'Order created successfully',
      order: orderRecord
    });
  } catch (err) {
    console.error('Order creation error:', err);
    res.status(500).json({ error: 'Failed to process order. Please try again.' });
  }
});

// Get Order by Order Number (Receipt / Tracking)
app.get('/api/orders/:orderNumber', (req, res) => {
  try {
    const { orderNumber } = req.params;
    const stmt = db.prepare('SELECT * FROM orders WHERE order_number = ?');
    const order = stmt.get(orderNumber);

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    order.items = JSON.parse(order.items_json);
    delete order.items_json;

    res.json(order);
  } catch (err) {
    res.status(500).json({ error: 'Error fetching order' });
  }
});

// Get User's Order History
app.get('/api/orders/user/my-orders', authenticateToken, (req, res) => {
  try {
    const stmt = db.prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC');
    const orders = stmt.all(req.user.id);

    const formatted = orders.map(o => ({
      ...o,
      items: JSON.parse(o.items_json)
    }));

    res.json({ orders: formatted });
  } catch (err) {
    console.error('Error fetching user orders:', err);
    res.status(500).json({ error: 'Failed to fetch order history' });
  }
});

// Fallback for Single Page frontend navigation (Express 5 compatible)
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api/')) {
    return res.sendFile(path.join(__dirname, 'public', 'index.html'));
  }
  next();
});

// Start Server
app.listen(PORT, () => {
  console.log(`✨ E-Commerce Server running smoothly on http://localhost:${PORT}`);
});
