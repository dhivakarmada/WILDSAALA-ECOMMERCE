/**
 * Developer Signature & Watermark
 * Name: Mada Dhivakar
 * Contact: dhivakarmada@gmail.com
 * Project: Wild Saala E-Commerce Platform
 */
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'wildsaala.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    // Users Table
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        email TEXT UNIQUE,
        phone TEXT,
        password TEXT,
        status TEXT DEFAULT 'Active',
        join_date TEXT
    )`);

    // Products Table - Enterprise Grade
    db.run(`CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        price INTEGER, -- Selling Price
        compare_price INTEGER, -- MRP
        cost_price INTEGER, -- For Profit Analysis
        category TEXT,
        collection TEXT,
        status TEXT DEFAULT 'Published', -- Draft, Published, Hidden
        image_url TEXT, -- Main Thumbnail
        description TEXT,
        size_chart TEXT,
        fabric_details TEXT,
        care_instructions TEXT,
        tags TEXT,
        slug TEXT UNIQUE,
        meta_title TEXT,
        meta_description TEXT,
        scheduled_date TEXT,
        section TEXT,
        display_order INTEGER,
        inventory INTEGER DEFAULT 100, -- Global inventory (deprecated in favor of variants)
        coupons TEXT,
        meta TEXT
    )`);

    // Product Variants Table
    db.run(`CREATE TABLE IF NOT EXISTS product_variants (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER,
        sku TEXT UNIQUE,
        color TEXT,
        size TEXT,
        price INTEGER, -- Variant specific price override
        stock INTEGER DEFAULT 0,
        is_backorder_allowed INTEGER DEFAULT 0,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    )`);

    // Product Media Table
    db.run(`CREATE TABLE IF NOT EXISTS product_media (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER,
        url TEXT,
        type TEXT DEFAULT 'image', -- image, video
        color TEXT,
        display_order INTEGER,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    )`);

    // Add color column if table exists from previous migrations
    db.run("ALTER TABLE product_media ADD COLUMN color TEXT", (err) => {
        // Ignore duplicate column errors
    });

    // Lookbook Table - Enhanced for Image/Video
    db.run(`CREATE TABLE IF NOT EXISTS lookbook (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT DEFAULT 'video',
        url TEXT,
        caption TEXT,
        link TEXT,
        is_wear_wild INTEGER DEFAULT 0,
        display_order INTEGER
    )`);

    // Add link and is_wear_wild columns if table exists from previous migrations
    db.run("ALTER TABLE lookbook ADD COLUMN link TEXT", (err) => {});
    db.run("ALTER TABLE lookbook ADD COLUMN is_wear_wild INTEGER DEFAULT 0", (err) => {});

    // Orders Table - Enhanced
    db.run(`CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_name TEXT,
        customer_email TEXT,
        customer_phone TEXT,
        shipping_address TEXT,
        total_amount INTEGER,
        discount_amount INTEGER DEFAULT 0,
        coupon_code TEXT,
        status TEXT DEFAULT 'Processing',
        items TEXT,
        tracking_id TEXT,
        carrier TEXT,
        internal_notes TEXT,
        payment_method TEXT DEFAULT 'Prepaid',
        payment_status TEXT DEFAULT 'Paid',
        order_date DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Coupons Table - Advanced 2.0
    db.run(`CREATE TABLE IF NOT EXISTS coupons (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT UNIQUE,
        discount_type TEXT, -- Percentage, Fixed
        discount_value INTEGER,
        applicability TEXT DEFAULT 'all', -- all, selected, single, category
        product_ids TEXT, -- Comma separated IDs
        category_limit TEXT, -- e.g. "street-soul"
        min_purchase INTEGER DEFAULT 0,
        valid_until TEXT,
        max_uses INTEGER DEFAULT 1000,
        per_user_limit INTEGER DEFAULT 1,
        restrict_payment TEXT, -- "prepaid", "none"
        free_shipping INTEGER DEFAULT 0, -- 0 or 1
        stackable INTEGER DEFAULT 0, -- 0 or 1
        combo_ids TEXT, -- e.g. "1,2,5" (All must be present)
        min_qty INTEGER DEFAULT 0, -- e.g. Buy 3
        usage_count INTEGER DEFAULT 0,
        status TEXT DEFAULT 'Active'
    )`);

    // Returns Table
    db.run(`CREATE TABLE IF NOT EXISTS returns (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER,
        reason TEXT,
        type TEXT, -- Return or Exchange
        status TEXT DEFAULT 'Pending',
        request_date DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Limited Drop Table
    db.run(`CREATE TABLE IF NOT EXISTS limited_drop (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        heading TEXT,
        description TEXT,
        image_url TEXT,
        release_date TEXT,
        release_time TEXT
    )`);

    // Notified Members Table
    db.run(`CREATE TABLE IF NOT EXISTS notified_members (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        phone TEXT,
        email TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Reviews Table
    db.run(`CREATE TABLE IF NOT EXISTS reviews (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        content TEXT,
        author_name TEXT,
        author_location TEXT,
        author_product TEXT,
        avatar_color TEXT
    )`);

    // Classic Drops (homepage chips + curated product mappings)
    db.run(`CREATE TABLE IF NOT EXISTS classic_drops_categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        image_url TEXT,
        media_type TEXT DEFAULT 'image',
        display_order INTEGER DEFAULT 0
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS classic_drops_products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        display_order INTEGER DEFAULT 0,
        FOREIGN KEY (category_id) REFERENCES classic_drops_categories(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    )`);

    // Settings Table
    db.run(`CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
    )`);

    // Seed Settings (Keep this for core functionality)
    db.get("SELECT count(*) as count FROM settings", (err, row) => {
        if (row && row.count === 0) {
            db.run("INSERT INTO settings (key, value) VALUES (?, ?)", ['maintenance_mode', 'off']);
            db.run("INSERT INTO settings (key, value) VALUES (?, ?)", ['store_name', 'WILD SAALA']);
            db.run("INSERT INTO settings (key, value) VALUES (?, ?)", ['contact_email', 'support@wildsaala.com']);
        }
    });

    // Seed Limited Drop (Ensure first record exists to prevent crashes)
    db.get("SELECT count(*) as count FROM limited_drop", (err, row) => {
        if (row && row.count === 0) {
            db.run(`INSERT INTO limited_drop (id, heading, description, image_url, release_date, release_time) VALUES (?, ?, ?, ?, ?, ?)`,
                [
                    1,
                    'MIDNIGHT COUTURE DROP',
                    'The ultimate street armor. Heavyweight cotton, raw edges, oversized cuts.',
                    'https://placehold.co/600x800/111/39FF14?text=Wild+Saala+Limited+Drop',
                    '2026-06-01',
                    '20:00'
                ]
            );
        }
    });

    // Seed Lookbook with default Wear Wild cards if empty
    db.get("SELECT count(*) as count FROM lookbook", (err, row) => {
        if (row && row.count === 0) {
            db.run(`INSERT INTO lookbook (type, url, caption, link, is_wear_wild, display_order) VALUES (?, ?, ?, ?, ?, ?)`,
                ['video', 'https://assets.codepen.io/3364143/skate.mp4', 'Street Style Unleashed', '#', 1, 1]
            );
            db.run(`INSERT INTO lookbook (type, url, caption, link, is_wear_wild, display_order) VALUES (?, ?, ?, ?, ?, ?)`,
                ['video', 'https://assets.codepen.io/3364143/skate.mp4', 'Urban Jungle', '#', 1, 2]
            );
            db.run(`INSERT INTO lookbook (type, url, caption, link, is_wear_wild, display_order) VALUES (?, ?, ?, ?, ?, ?)`,
                ['video', 'https://assets.codepen.io/3364143/skate.mp4', 'Night Rebel', '#', 1, 3]
            );
        }
    });
});


module.exports = db;
