const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, 'ecommerce.db');
const db = new DatabaseSync(dbPath);

// Enable WAL mode for high performance and foreign keys
db.exec('PRAGMA foreign_keys = ON;');

// Initialize tables
function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'customer',
      avatar TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      category TEXT NOT NULL,
      price REAL NOT NULL,
      original_price REAL,
      description TEXT NOT NULL,
      features TEXT, -- JSON array of strings
      specs TEXT,    -- JSON key-value object
      rating REAL DEFAULT 4.8,
      reviews_count INTEGER DEFAULT 0,
      stock INTEGER DEFAULT 25,
      image TEXT NOT NULL,
      gallery TEXT,  -- JSON array of image URLs
      badge TEXT,    -- 'Best Seller', 'Sale', 'New', 'Staff Pick'
      featured INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_number TEXT UNIQUE NOT NULL,
      user_id INTEGER,
      customer_name TEXT NOT NULL,
      customer_email TEXT NOT NULL,
      customer_phone TEXT,
      shipping_address TEXT NOT NULL,
      shipping_city TEXT NOT NULL,
      shipping_postal_code TEXT NOT NULL,
      shipping_country TEXT NOT NULL,
      shipping_method TEXT NOT NULL,
      payment_method TEXT NOT NULL,
      subtotal REAL NOT NULL,
      discount REAL DEFAULT 0,
      shipping_fee REAL DEFAULT 0,
      tax REAL DEFAULT 0,
      total REAL NOT NULL,
      status TEXT DEFAULT 'Confirmed',
      items_json TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      user_name TEXT NOT NULL,
      rating INTEGER NOT NULL,
      title TEXT,
      comment TEXT NOT NULL,
      verified INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(product_id) REFERENCES products(id) ON DELETE CASCADE
    );
  `);

  seedDataIfEmpty();
}

function seedDataIfEmpty() {
  const userCountStmt = db.prepare('SELECT COUNT(*) as count FROM users');
  const userCount = userCountStmt.get().count;

  if (userCount === 0) {
    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync('password123', salt);
    const adminPassword = bcrypt.hashSync('admin123', salt);

    const insertUser = db.prepare(`
      INSERT INTO users (name, email, password, role, avatar)
      VALUES (?, ?, ?, ?, ?)
    `);

    insertUser.run(
      'Alex Morgan',
      'demo@ecommerce.com',
      hashedPassword,
      'customer',
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'
    );

    insertUser.run(
      'Admin Storekeeper',
      'admin@ecommerce.com',
      adminPassword,
      'admin',
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80'
    );
    console.log('Seeded demo users: demo@ecommerce.com / password123');
  }

  const prodCountStmt = db.prepare('SELECT COUNT(*) as count FROM products');
  const prodCount = prodCountStmt.get().count;

  if (prodCount === 0) {
    const seedProducts = [
      {
        name: 'Aura Pro Studio ANC Headphones',
        slug: 'aura-pro-studio-anc-headphones',
        category: 'Audio',
        price: 349.99,
        original_price: 399.99,
        description: 'Immerse yourself in acoustic perfection. Featuring custom 40mm beryllium drivers, hybrid active noise cancellation, and 45 hours of continuous battery life.',
        features: JSON.stringify([
          'Hybrid Active Noise Cancellation with Transparency mode',
          'Acoustically tuned 40mm beryllium drivers',
          'Up to 45 hours playtime with quick USB-C charging',
          'Plush memory foam earcups wrapped in supple vegan leather',
          'Multipoint Bluetooth 5.3 connection'
        ]),
        specs: JSON.stringify({
          'Driver Size': '40mm Beryllium',
          'Battery Life': '45 Hours (ANC On)',
          'Connectivity': 'Bluetooth 5.3, 3.5mm Aux, USB-C Audio',
          'Weight': '258g',
          'Warranty': '2 Years'
        }),
        rating: 4.9,
        reviews_count: 142,
        stock: 18,
        image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80',
        gallery: JSON.stringify([
          'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80',
          'https://images.unsplash.com/photo-1583394838336-acd977736f90?auto=format&fit=crop&w=800&q=80',
          'https://images.unsplash.com/photo-1484704849700-f032a568e944?auto=format&fit=crop&w=800&q=80'
        ]),
        badge: 'Best Seller',
        featured: 1
      },
      {
        name: 'Chronos Horizon Titanium Smartwatch',
        slug: 'chronos-horizon-titanium-smartwatch',
        category: 'Wearables',
        price: 279.00,
        original_price: 329.00,
        description: 'Precision aerospace-grade titanium chassis with sapphire crystal AMOLED display. Tracks heart rate variability, SpO2, sleep stages, and over 120 sports modes with surgical accuracy.',
        features: JSON.stringify([
          'Aerospace grade Grade-5 Titanium casing',
          '1.43-inch Always-On Retina AMOLED (1000 nits)',
          'Dual-frequency GPS with offline terrain maps',
          '14-day battery life on a single magnetic charge',
          '5ATM water resistance rating suitable for diving'
        ]),
        specs: JSON.stringify({
          'Case Material': 'Grade-5 Titanium',
          'Display': '1.43" AMOLED 466x466',
          'Sensors': 'Optical HR, SpO2, ECG, Barometer',
          'Water Resistance': '5ATM / 50m',
          'Battery': 'Up to 14 days'
        }),
        rating: 4.8,
        reviews_count: 89,
        stock: 24,
        image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80',
        gallery: JSON.stringify([
          'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80',
          'https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&w=800&q=80'
        ]),
        badge: 'Trending',
        featured: 1
      },
      {
        name: 'Vortex Mechanical Keyboard Pro',
        slug: 'vortex-mechanical-keyboard-pro',
        category: 'Gadgets',
        price: 159.50,
        original_price: 189.99,
        description: 'Gasket-mounted hot-swappable mechanical keyboard with CNC-milled aluminum frame, factory-lubed custom tactile switches, and south-facing per-key RGB illumination.',
        features: JSON.stringify([
          'Anodized CNC Aluminum chassis with brass weight',
          'Hot-swappable 5-pin PCB with gasket-mount dampening',
          'PBT doubleshot dye-sub keycaps with crisp profile',
          'Tri-mode connectivity: 2.4GHz, Bluetooth 5.1, USB-C',
          'Configurable via VIA/QMK web app'
        ]),
        specs: JSON.stringify({
          'Layout': '75% Compact (82 Keys)',
          'Switches': 'Gateron Oil King Factory Lubed',
          'Battery': '4000mAh rechargeable',
          'Connectivity': 'Tri-mode Wireless + Type-C'
        }),
        rating: 4.9,
        reviews_count: 67,
        stock: 12,
        image: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=800&q=80',
        gallery: JSON.stringify([
          'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=800&q=80',
          'https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?auto=format&fit=crop&w=800&q=80'
        ]),
        badge: 'Staff Pick',
        featured: 1
      },
      {
        name: 'Lumix Alpha Prime Camera Lens',
        slug: 'lumix-alpha-prime-camera-lens',
        category: 'Photography',
        price: 899.00,
        original_price: 999.00,
        description: 'Ultra-fast f/1.2 portrait prime lens designed for high-resolution full-frame mirrorless systems. Produces dreamy creamy bokeh and surgical edge-to-edge sharpness.',
        features: JSON.stringify([
          'Stunning f/1.2 maximum aperture for low light masterclass',
          'Dual linear XD autofocus motors for silent video focusing',
          'Fluorine weather-sealed front and rear glass elements',
          '11-blade circular aperture diaphragm for round bokeh balls'
        ]),
        specs: JSON.stringify({
          'Focal Length': '50mm Standard Prime',
          'Aperture': 'f/1.2 - f/16',
          'Mount': 'Universal E-Mount / L-Mount',
          'Filter Thread': '72mm',
          'Weight': '680g'
        }),
        rating: 4.95,
        reviews_count: 43,
        stock: 7,
        image: 'https://images.unsplash.com/photo-1617005082133-548c4dd27f35?auto=format&fit=crop&w=800&q=80',
        gallery: JSON.stringify([
          'https://images.unsplash.com/photo-1617005082133-548c4dd27f35?auto=format&fit=crop&w=800&q=80',
          'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=800&q=80'
        ]),
        badge: 'New',
        featured: 1
      },
      {
        name: 'AeroPulse Wireless Earbuds Gen 2',
        slug: 'aeropulse-wireless-earbuds-gen-2',
        category: 'Audio',
        price: 129.99,
        original_price: 169.99,
        description: 'Featherlight true wireless earbuds delivering rich dynamic bass, spatial audio head tracking, and crystal clear call clarity with dual beamforming microphones.',
        features: JSON.stringify([
          'Spatial Audio with dynamic head position tracking',
          'Adaptive EQ automatically tunes music to your ear shape',
          'Wireless Qi fast charging case providing 36 hours total playtime',
          'IPX4 sweat and water resistance rating'
        ]),
        specs: JSON.stringify({
          'Playback': '8 hours per charge / 36 hours with case',
          'Bluetooth': 'Version 5.3 Low Energy',
          'Charging': 'USB-C + Qi Wireless',
          'Weight': '4.2g per earbud'
        }),
        rating: 4.7,
        reviews_count: 114,
        stock: 35,
        image: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=800&q=80',
        gallery: JSON.stringify([
          'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=800&q=80',
          'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?auto=format&fit=crop&w=800&q=80'
        ]),
        badge: 'Sale',
        featured: 0
      },
      {
        name: 'NeoGrip Precision Wireless Mouse',
        slug: 'neogrip-precision-wireless-mouse',
        category: 'Gadgets',
        price: 89.95,
        original_price: 109.95,
        description: 'Sculpted ergonomic silhouette engineered for all-day comfort. Features an electro-magnetic MagSpeed scroll wheel and an 8,000 DPI sensor tracking smoothly on any surface including glass.',
        features: JSON.stringify([
          'MagSpeed electromagnetic scroll wheel (1,000 lines per second)',
          'Darkfield 8000 DPI high-precision sensor',
          'Quiet clicks with 90% noise reduction',
          'Connect to 3 devices simultaneously and switch with one button'
        ]),
        specs: JSON.stringify({
          'DPI Range': '200 to 8000 DPI',
          'Battery': '500mAh (70 days per charge)',
          'Buttons': '7 programmable buttons',
          'Weight': '141g'
        }),
        rating: 4.8,
        reviews_count: 76,
        stock: 22,
        image: 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?auto=format&fit=crop&w=800&q=80',
        gallery: JSON.stringify([
          'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?auto=format&fit=crop&w=800&q=80'
        ]),
        badge: 'Popular',
        featured: 0
      },
      {
        name: 'Minimalist Matte Leather Backpack',
        slug: 'minimalist-matte-leather-backpack',
        category: 'Lifestyle',
        price: 195.00,
        original_price: 240.00,
        description: 'Handcrafted waterproof full-grain Italian leather daypack. Thoughtfully partitioned for a 16-inch laptop, tablet, passport pocket, and expandable magnetic top latch.',
        features: JSON.stringify([
          'Full-grain vegetable-tanned Italian leather with water-repellent finish',
          'Padded 16-inch laptop sleeve and hidden anti-theft passport pocket',
          'Fidlock German magnetic quick-release buckle',
          'Ergonomic breathable air-mesh back panel padding'
        ]),
        specs: JSON.stringify({
          'Capacity': '22 Liters',
          'Laptop Fit': 'Up to 16" MacBook Pro',
          'Dimensions': '44 x 30 x 14 cm',
          'Material': 'Full-Grain Leather + YKK Aquaguard Zips'
        }),
        rating: 4.85,
        reviews_count: 52,
        stock: 9,
        image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=800&q=80',
        gallery: JSON.stringify([
          'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=800&q=80'
        ]),
        badge: 'Luxury',
        featured: 0
      },
      {
        name: 'MagCharge 3-in-1 Foldable Dock',
        slug: 'magcharge-3-in-1-foldable-dock',
        category: 'Gadgets',
        price: 79.99,
        original_price: 99.99,
        description: 'Aircraft-grade anodized aluminum 3-in-1 wireless charging station. Powers your smartphone, smartwatch, and wireless earbuds simultaneously from a single sleek foldable stand.',
        features: JSON.stringify([
          'Official 15W MagSafe fast-charging alignment',
          'Compact foldable origami hinge for effortless travel packing',
          'Dedicated Apple Watch & AirPods Qi-certified charging pads',
          'Intelligent temperature monitoring and foreign object detection'
        ]),
        specs: JSON.stringify({
          'Total Output': '25W Max fast charging',
          'Materials': 'Anodized Aluminum + Silicone pad',
          'Input': 'USB-C PD 30W (Cable included)',
          'Weight': '195g'
        }),
        rating: 4.75,
        reviews_count: 98,
        stock: 40,
        image: 'https://images.unsplash.com/photo-1586953208448-b95a79798f07?auto=format&fit=crop&w=800&q=80',
        gallery: JSON.stringify([
          'https://images.unsplash.com/photo-1586953208448-b95a79798f07?auto=format&fit=crop&w=800&q=80'
        ]),
        badge: 'Sale',
        featured: 0
      }
    ];

    const insertProd = db.prepare(`
      INSERT INTO products (
        name, slug, category, price, original_price, description,
        features, specs, rating, reviews_count, stock, image, gallery, badge, featured
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const p of seedProducts) {
      insertProd.run(
        p.name, p.slug, p.category, p.price, p.original_price, p.description,
        p.features, p.specs, p.rating, p.reviews_count, p.stock, p.image, p.gallery, p.badge, p.featured
      );
    }
    console.log(`Seeded ${seedProducts.length} initial products!`);

    // Add sample reviews
    const insertReview = db.prepare(`
      INSERT INTO reviews (product_id, user_name, rating, title, comment, verified)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    insertReview.run(1, 'Jordan Taylor', 5, 'Unbelievable Soundstage & Build', 'The beryllium drivers produce pristine highs and deep, articulate bass without overwhelming the mids. Best ANC headphones I have ever worn.', 1);
    insertReview.run(1, 'Marcus Vance', 5, 'Worth Every Cent', 'Battery lasted an entire week of daily work commutes and Zoom calls. The comfort level is 10/10.', 1);
    insertReview.run(2, 'Sarah Lin', 5, 'Flawless Watch', 'The titanium finish is stunning in person. Sapphire glass has zero scratches despite trail running and gym workouts.', 1);
    insertReview.run(3, 'David K.', 5, 'Typing Nirvana', 'The tactile switch response is so satisfying. The aluminum chassis is heavy and stays firmly planted on my desk.', 1);
  }
}

// Initialize tables on startup
initDatabase();

module.exports = {
  db,
  initDatabase
};
