/**
 * Developer Signature & Watermark
 * Name: Mada Dhivakar
 * Contact: dhivakarmada@gmail.com
 * Project: Wild Saala E-Commerce Platform
 */
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const db = require('./db');
const path = require('path');

const app = express();
const PORT = 3000;

const ADMIN_CREDENTIALS = {
    email: 'admin@gmail.com',
    password: 'Admin@123'
};

app.use(cors());
app.use(bodyParser.json());

// --- Maintenance Mode Middleware ---
app.use((req, res, next) => {
    // 1. Absolute exclusions (Admin, API Auth, Settings)
    const absoluteExclusions = ['/admin', '/api/auth/admin-login', '/api/settings'];
    if (absoluteExclusions.some(path => req.path.startsWith(path))) {
        return next();
    }

    // 2. Static Assets
    const isStaticAsset = /\.(css|js|jpg|jpeg|png|gif|svg|woff|woff2|ttf|eot|mp4)$/.test(req.path);
    if (isStaticAsset) {
        return next();
    }

    db.get("SELECT value FROM settings WHERE key = ?", ['maintenance_mode'], (err, row) => {
        if (err) {
            console.error("Maintenance Check Error:", err);
            return next();
        }
        
        const isMaintenanceOn = row && row.value === 'on';
        const isMaintenancePath = req.path === '/maintenance' || req.path === '/maintenance.html';

        if (isMaintenanceOn) {
            // If on the maintenance page already, allow it
            if (isMaintenancePath) return next();
            
            // Block API requests
            if (req.path.startsWith('/api/')) {
                return res.status(503).json({ error: "Store is under maintenance" });
            }
            
            // Redirect public traffic
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            return res.redirect('/maintenance');
        } else {
            // If maintenance is OFF but user tries to access /maintenance, redirect to home
            if (isMaintenancePath) {
                res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
                return res.redirect('/');
            }
            next();
        }
    });
});

// --- API ROUTES ---

// --- Classic Drops Advanced Endpoints ---

// Categories for Classic Drops
app.get('/api/classic-drops/categories', (req, res) => {
    db.all("SELECT * FROM classic_drops_categories ORDER BY display_order ASC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/classic-drops/categories', (req, res) => {
    const { id, name, image_url, media_type, display_order } = req.body;
    if (id) {
        db.run(`UPDATE classic_drops_categories SET name=?, image_url=?, media_type=?, display_order=? WHERE id=?`, 
            [name, image_url, media_type || 'image', display_order, id], (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
        });
    } else {
        db.run(`INSERT INTO classic_drops_categories (name, image_url, media_type, display_order) VALUES (?, ?, ?, ?)`, 
            [name, image_url, media_type || 'image', display_order || 0], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID });
        });
    }
});

app.delete('/api/classic-drops/categories/:id', (req, res) => {
    db.run(`DELETE FROM classic_drops_categories WHERE id = ?`, [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// Products for a specific Category Chip in Classic Drops
app.get('/api/classic-drops/products/:categoryId', (req, res) => {
    const categoryId = req.params.categoryId;
    const query = `
        SELECT p.*, cdp.display_order as cdp_order, cdp.id as mapping_id
        FROM products p
        JOIN classic_drops_products cdp ON p.id = cdp.product_id
        WHERE cdp.category_id = ?
        ORDER BY cdp.display_order ASC
    `;
    db.all(query, [categoryId], (err, products) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!products || products.length === 0) return res.json([]);
        attachVariantsAndMedia(products, res);
    });
});

// Add Product to a Category Chip
app.post('/api/classic-drops/products', (req, res) => {
    const { category_id, product_id, display_order } = req.body;
    db.run(`INSERT INTO classic_drops_products (category_id, product_id, display_order) VALUES (?, ?, ?)`, 
        [category_id, product_id, display_order || 0], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: this.lastID });
    });
});

// Remove Product from a Category Chip
app.delete('/api/classic-drops/products/:mappingId', (req, res) => {
    db.run(`DELETE FROM classic_drops_products WHERE id = ?`, [req.params.mappingId], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// Bulk Update Order for Products in a Chip
app.post('/api/classic-drops/products/reorder', (req, res) => {
    const { category_id, order } = req.body; // order is array of {mapping_id, display_order}
    db.serialize(() => {
        const stmt = db.prepare(`UPDATE classic_drops_products SET display_order = ? WHERE id = ?`);
        order.forEach(item => {
            stmt.run([item.display_order, item.mapping_id]);
        });
        stmt.finalize();
        res.json({ success: true });
    });
});

function attachVariantsAndMedia(products, res) {
    db.all("SELECT * FROM product_variants", [], (err, allVariants) => {
        if (err) return res.status(500).json({ error: err.message });
        db.all("SELECT * FROM product_media ORDER BY display_order ASC", [], (err, allMedia) => {
            if (err) return res.status(500).json({ error: err.message });
            const list = Array.isArray(products) ? products : [products];
            const results = list.map(p => ({
                ...p,
                variants: allVariants.filter(v => v.product_id === p.id),
                media: allMedia.filter(m => m.product_id === p.id)
            }));
            res.json(Array.isArray(products) ? results : results[0]);
        });
    });
}

// Single product (storefront)
app.get('/api/products/:id', (req, res) => {
    const productIdOrSlug = req.params.id;
    const isId = /^\d+$/.test(productIdOrSlug);
    
    const query = isId ? "SELECT * FROM products WHERE id = ?" : "SELECT * FROM products WHERE slug = ?";
    db.get(query, [productIdOrSlug], (err, product) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!product) return res.status(404).json({ error: 'Product not found' });
        const status = (product.status || '').toLowerCase();
        if (!['published', 'sold out'].includes(status)) {
            return res.status(404).json({ error: 'Product not available' });
        }
        attachVariantsAndMedia(product, res);
    });
});

// Products - Enterprise Features
app.get('/api/products', (req, res) => {
    const section = req.query.section;
    const store = req.query.store === '1' || req.query.store === 'true';
    let query = "SELECT * FROM products WHERE 1=1";
    let params = [];
    if (store) {
        query += " AND lower(coalesce(status, '')) IN ('published', 'sold out')";
    }
    if (section) {
        query += " AND section = ?";
        params.push(section);
    }
    query += " ORDER BY coalesce(display_order, 0) ASC, id ASC";
    
    db.all(query, params, (err, products) => {
        if (err) return res.status(500).json({ error: err.message });
        attachVariantsAndMedia(products, res);
    });
});

app.post('/api/products', (req, res) => {
    const { 
        name, price, compare_price, cost_price, category, collection, status, 
        image_url, description, size_chart, fabric_details, care_instructions, 
        tags, slug, meta_title, meta_description, scheduled_date, section, 
        display_order, variants, media 
    } = req.body;

    db.serialize(() => {
        let finalSlug = slug;
        if (!finalSlug || finalSlug.trim() === '') {
            finalSlug = name ? name.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '') : 'product-' + Date.now();
        }

        db.run(`INSERT INTO products (name, price, compare_price, cost_price, category, collection, status, image_url, description, size_chart, fabric_details, care_instructions, tags, slug, meta_title, meta_description, scheduled_date, section, display_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [name, price, compare_price, cost_price, category, collection, status || 'Published', image_url, description, size_chart, fabric_details, care_instructions, tags, finalSlug, meta_title, meta_description, scheduled_date, section || 'shop', display_order || 0],
            function(err) {
                if (err) return res.status(500).json({ error: err.message });
                const productId = this.lastID;

                // Insert Variants
                if (variants && variants.length > 0) {
                    const vStmt = db.prepare(`INSERT INTO product_variants (product_id, sku, color, size, price, stock, is_backorder_allowed) VALUES (?, ?, ?, ?, ?, ?, ?)`);
                    variants.forEach(v => {
                        let finalSku = v.sku;
                        if (!finalSku || finalSku.trim() === '') {
                            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
                            let rnd = '';
                            for(let i=0;i<5;i++) rnd += chars.charAt(Math.floor(Math.random() * chars.length));
                            finalSku = `WS-${finalSlug.substring(0,3).toUpperCase()}-${v.size||'M'}-${(v.color||'BLK').substring(0,3).toUpperCase()}-${rnd}`.replace(/-+/g,'-');
                        }
                        vStmt.run([productId, finalSku, v.color, v.size, v.price, v.stock, v.is_backorder_allowed || 0]);
                    });
                    vStmt.finalize();
                }

                // Insert Media
                if (media && media.length > 0) {
                    const mStmt = db.prepare(`INSERT INTO product_media (product_id, url, type, color, display_order) VALUES (?, ?, ?, ?, ?)`);
                    media.forEach((m, idx) => mStmt.run([productId, m.url, m.type || 'image', m.color || '', m.display_order || idx]));
                    mStmt.finalize();
                }

                res.json({ id: productId });
            }
        );
    });
});

app.put('/api/products/:id', (req, res) => {
    const productId = req.params.id;
    const { 
        name, price, compare_price, cost_price, category, collection, status, 
        image_url, description, size_chart, fabric_details, care_instructions, 
        tags, slug, meta_title, meta_description, scheduled_date, section, 
        display_order, variants, media 
    } = req.body;

    db.serialize(() => {
        let finalSlug = slug;
        if (!finalSlug || finalSlug.trim() === '') {
            finalSlug = name ? name.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '') : 'product-' + Date.now();
        }

        db.run(`UPDATE products SET name=?, price=?, compare_price=?, cost_price=?, category=?, collection=?, status=?, image_url=?, description=?, size_chart=?, fabric_details=?, care_instructions=?, tags=?, slug=?, meta_title=?, meta_description=?, scheduled_date=?, section=?, display_order=? WHERE id=?`,
            [name, price, compare_price, cost_price, category, collection, status, image_url, description, size_chart, fabric_details, care_instructions, tags, finalSlug, meta_title, meta_description, scheduled_date, section, display_order, productId],
            function(err) {
                if (err) return res.status(500).json({ error: err.message });

                // Update Variants: Simple way - Delete and Re-insert
                db.run(`DELETE FROM product_variants WHERE product_id = ?`, [productId], () => {
                    if (variants && variants.length > 0) {
                        const vStmt = db.prepare(`INSERT INTO product_variants (product_id, sku, color, size, price, stock, is_backorder_allowed) VALUES (?, ?, ?, ?, ?, ?, ?)`);
                        variants.forEach(v => {
                            let finalSku = v.sku;
                            if (!finalSku || finalSku.trim() === '') {
                                const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
                                let rnd = '';
                                for(let i=0;i<5;i++) rnd += chars.charAt(Math.floor(Math.random() * chars.length));
                                finalSku = `WS-${finalSlug.substring(0,3).toUpperCase()}-${v.size||'M'}-${(v.color||'BLK').substring(0,3).toUpperCase()}-${rnd}`.replace(/-+/g,'-');
                            }
                            vStmt.run([productId, finalSku, v.color, v.size, v.price, v.stock, v.is_backorder_allowed || 0]);
                        });
                        vStmt.finalize();
                    }
                });

                // Update Media
                db.run(`DELETE FROM product_media WHERE product_id = ?`, [productId], () => {
                    if (media && media.length > 0) {
                        const mStmt = db.prepare(`INSERT INTO product_media (product_id, url, type, color, display_order) VALUES (?, ?, ?, ?, ?)`);
                        media.forEach((m, idx) => mStmt.run([productId, m.url, m.type || 'image', m.color || '', m.display_order || idx]));
                        mStmt.finalize();
                    }
                });

                res.json({ updated: this.changes });
            }
        );
    });
});

app.post('/api/products/duplicate/:id', (req, res) => {
    const sourceId = req.params.id;
    db.get("SELECT * FROM products WHERE id = ?", [sourceId], (err, product) => {
        if (err || !product) return res.status(404).json({ error: "Source not found" });
        
        // Fetch Variants and Media
        db.all("SELECT * FROM product_variants WHERE product_id = ?", [sourceId], (err, variants) => {
            db.all("SELECT * FROM product_media WHERE product_id = ?", [sourceId], (err, media) => {
                const source = { 
                    ...product, 
                    name: `${product.name} (Copy)`, 
                    slug: `${product.slug}-copy-${Date.now()}`,
                    variants: variants.map(v => { delete v.id; delete v.product_id; return v; }),
                    media: media.map(m => { delete m.id; delete m.product_id; return m; })
                };
                delete source.id;
                res.json({ source });
            });
        });
    });
});

app.post('/api/products/bulk-update', (req, res) => {
    const { ids, updates } = req.body; // ids: [1,2,3], updates: { price: 999, category: 'new' }
    if (!ids || ids.length === 0) return res.status(400).json({ error: "No IDs provided" });

    const fields = Object.keys(updates).map(k => `${k} = ?`).join(', ');
    const values = Object.values(updates);
    
    db.run(`UPDATE products SET ${fields} WHERE id IN (${ids.map(() => '?').join(',')})`,
        [...values, ...ids],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ updatedCount: this.changes });
        }
    );
});



// Categories
app.get('/api/categories', (req, res) => {
    db.all("SELECT * FROM categories ORDER BY sort_order ASC, name ASC", (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/categories', (req, res) => {
    const { name, slug, description, image_url, parent_id, sort_order, meta_title, meta_description, filters } = req.body;
    db.run(`INSERT INTO categories (name, slug, description, image_url, parent_id, sort_order, meta_title, meta_description, filters) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [name, slug, description, image_url, parent_id, sort_order || 0, meta_title, meta_description, filters],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID });
        }
    );
});

app.put('/api/categories/:id', (req, res) => {
    const { name, slug, description, image_url, parent_id, sort_order, meta_title, meta_description, filters } = req.body;
    db.run(`UPDATE categories SET name=?, slug=?, description=?, image_url=?, parent_id=?, sort_order=?, meta_title=?, meta_description=?, filters=? WHERE id=?`,
        [name, slug, description, image_url, parent_id, sort_order, meta_title, meta_description, filters, req.params.id],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ updated: this.changes });
        }
    );
});

app.delete('/api/categories/:id', (req, res) => {
    db.run("DELETE FROM categories WHERE id = ?", [req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ deleted: this.changes });
    });
});

// Collections
app.get('/api/collections', (req, res) => {
    db.all("SELECT * FROM collections ORDER BY sort_order ASC", (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.get('/api/collections/:slug', (req, res) => {
    db.get("SELECT * FROM collections WHERE slug = ?", [req.params.slug], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: "Collection not found" });
        res.json(row);
    });
});

app.post('/api/collections', (req, res) => {
    const { name, slug, description, image_url, type, rules, meta_title, meta_description, sort_order, is_featured } = req.body;
    db.run(`INSERT INTO collections (name, slug, description, image_url, type, rules, meta_title, meta_description, sort_order, is_featured) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [name, slug, description, image_url, type || 'manual', rules, meta_title, meta_description, sort_order || 0, is_featured || 0],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID });
        }
    );
});

app.put('/api/collections/:id', (req, res) => {
    const { name, slug, description, image_url, type, rules, meta_title, meta_description, sort_order, is_featured } = req.body;
    db.run(`UPDATE collections SET name=?, slug=?, description=?, image_url=?, type=?, rules=?, meta_title=?, meta_description=?, sort_order=?, is_featured=? WHERE id=?`,
        [name, slug, description, image_url, type, rules, meta_title, meta_description, sort_order, is_featured, req.params.id],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ updated: this.changes });
        }
    );
});

app.delete('/api/collections/:id', (req, res) => {
    db.run("DELETE FROM collections WHERE id = ?", [req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ deleted: this.changes });
    });
});

// Collection Products (Manual)
app.post('/api/collections/:id/products', (req, res) => {
    const { product_id } = req.body;
    db.run("INSERT OR IGNORE INTO collection_products (collection_id, product_id) VALUES (?, ?)",
        [req.params.id, product_id],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
        }
    );
});

app.delete('/api/collections/:id/products/:productId', (req, res) => {
    db.run("DELETE FROM collection_products WHERE collection_id = ? AND product_id = ?",
        [req.params.id, req.params.productId],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
        }
    );
});

// Get Products by Collection (Manual or Automated)
app.get('/api/collections/:slug/products', (req, res) => {
    db.get("SELECT * FROM collections WHERE slug = ?", [req.params.slug], (err, collection) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!collection) return res.status(404).json({ error: "Collection not found" });

        if (collection.type === 'manual') {
            db.all(`SELECT p.* FROM products p 
                    JOIN collection_products cp ON p.id = cp.product_id 
                    WHERE cp.collection_id = ?`, [collection.id], (err, products) => {
                if (err) return res.status(500).json({ error: err.message });
                res.json(products);
            });
        } else {
            // Automated Rules Logic
            try {
                const rules = JSON.parse(collection.rules || '[]');
                if (rules.length === 0) return res.json([]);

                let query = "SELECT * FROM products WHERE 1=1";
                let params = [];
                rules.forEach(rule => {
                    if (rule.field === 'price') {
                        const op = rule.operator === 'less_than' ? '<' : rule.operator === 'greater_than' ? '>' : '=';
                        query += ` AND price ${op} ?`;
                        params.push(rule.value);
                    } else if (rule.field === 'tag') {
                        query += ` AND tags LIKE ?`;
                        params.push(`%${rule.value}%`);
                    } else {
                        query += ` AND ${rule.field} = ?`;
                        params.push(rule.value);
                    }
                });
                db.all(query, params, (err, products) => {
                    if (err) return res.status(500).json({ error: err.message });
                    res.json(products);
                });
            } catch (e) {
                res.status(500).json({ error: "Invalid rules JSON" });
            }
        }
    });
});

// Lookbook
app.get('/api/lookbook', (req, res) => {
    const wearWildOnly = req.query.wear_wild === '1';
    let query = "SELECT * FROM lookbook";
    let params = [];
    if (wearWildOnly) {
        query += " WHERE is_wear_wild = 1";
    }
    query += " ORDER BY display_order ASC";

    db.all(query, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/lookbook', (req, res) => {
    const { type, url, caption, link, is_wear_wild, display_order } = req.body;
    db.run(
        `INSERT INTO lookbook (type, url, caption, link, is_wear_wild, display_order) VALUES (?, ?, ?, ?, ?, ?)`,
        [type || 'image', url, caption, link || '#', is_wear_wild ? parseInt(is_wear_wild) : 0, display_order ? parseInt(display_order) : 0],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID });
        }
    );
});

app.put('/api/lookbook/:id', (req, res) => {
    const { type, url, caption, link, is_wear_wild, display_order } = req.body;
    db.run(
        `UPDATE lookbook SET type=?, url=?, caption=?, link=?, is_wear_wild=?, display_order=? WHERE id=?`,
        [type, url, caption, link, is_wear_wild ? parseInt(is_wear_wild) : 0, display_order ? parseInt(display_order) : 0, req.params.id],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ updated: this.changes });
        }
    );
});

app.delete('/api/lookbook/:id', (req, res) => {
    db.get("SELECT is_wear_wild FROM lookbook WHERE id = ?", [req.params.id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (row && row.is_wear_wild === 1) {
            return res.status(400).json({ error: "Cannot delete homepage Wear Wild cards to prevent breaking layout." });
        }
        db.run("DELETE FROM lookbook WHERE id = ?", [req.params.id], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ deleted: this.changes });
        });
    });
});

// Limited Drop
app.get('/api/limited-drop', (req, res) => {
    db.get("SELECT * FROM limited_drop LIMIT 1", (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) {
            return res.json({
                id: 1,
                heading: "MIDNIGHT COUTURE DROP",
                description: "The ultimate street armor. Heavyweight cotton, raw edges, oversized cuts.",
                image_url: "https://placehold.co/600x800/111/39FF14?text=Wild+Saala+Limited+Drop",
                release_date: "2026-06-01",
                release_time: "20:00"
            });
        }
        res.json(row);
    });
});

app.put('/api/limited-drop', (req, res) => {
    const { heading, description, image_url, media_type, release_date, release_time } = req.body;
    db.run(`UPDATE limited_drop SET heading=?, description=?, image_url=?, media_type=?, release_date=?, release_time=? WHERE id=1`,
        [heading, description, image_url, media_type || 'image', release_date, release_time],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ updated: this.changes });
        }
    );
});

// Notified Members
app.get('/api/notified', (req, res) => {
    db.all("SELECT * FROM notified_members ORDER BY timestamp DESC", (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/notify', (req, res) => {
    const { name, phone, email } = req.body;
    db.run(`INSERT INTO notified_members (name, phone, email) VALUES (?, ?, ?)`,
        [name, phone, email],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID });
        }
    );
});

// Orders
app.get('/api/orders', (req, res) => {
    const email = req.query.email;
    let query = "SELECT * FROM orders ORDER BY order_date DESC";
    let params = [];
    if (email) {
        query = "SELECT * FROM orders WHERE customer_email = ? ORDER BY order_date DESC";
        params = [email];
    }
    db.all(query, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/orders', (req, res) => {
    const { 
        customer_name, customer_email, customer_phone, shipping_address, 
        total_amount, discount_amount, coupon_code, status, items 
    } = req.body;
    db.run(`INSERT INTO orders (customer_name, customer_email, customer_phone, shipping_address, total_amount, discount_amount, coupon_code, status, items) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [customer_name, customer_email, customer_phone, shipping_address, total_amount, discount_amount || 0, coupon_code || null, status || 'Processing', items],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID });
        }
    );
});

app.put('/api/orders/:id/status', (req, res) => {
    const { status } = req.body;
    db.run(`UPDATE orders SET status=? WHERE id=?`, [status, req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ updated: this.changes });
    });
});

app.put('/api/orders/:id/tracking', (req, res) => {
    const { carrier, tracking_id } = req.body;
    db.run(`UPDATE orders SET carrier=?, tracking_id=? WHERE id=?`, [carrier, tracking_id, req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ updated: this.changes });
    });
});

app.put('/api/orders/:id/notes', (req, res) => {
    const { notes } = req.body;
    db.run(`UPDATE orders SET internal_notes=? WHERE id=?`, [notes, req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ updated: this.changes });
    });
});


// Coupons
app.get('/api/coupons', (req, res) => {
    db.all("SELECT * FROM coupons", (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/coupons', (req, res) => {
    const { 
        code, discount_type, discount_value, applicability, 
        product_ids, category_limit, min_purchase, valid_until, 
        max_uses, per_user_limit, restrict_payment, free_shipping, 
        stackable, combo_ids, min_qty 
    } = req.body;
    db.run(`INSERT INTO coupons (code, discount_type, discount_value, applicability, product_ids, category_limit, min_purchase, valid_until, max_uses, per_user_limit, restrict_payment, free_shipping, stackable, combo_ids, min_qty) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            code, discount_type, discount_value, applicability || 'all', 
            product_ids || null, category_limit || null, min_purchase || 0, 
            valid_until, max_uses || 1000, per_user_limit || 1, 
            restrict_payment || 'none', free_shipping || 0, stackable || 0,
            combo_ids || null, min_qty || 0
        ],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID });
        }
    );
});

// Returns
app.get('/api/returns', (req, res) => {
    db.all("SELECT r.*, o.customer_name FROM returns r JOIN orders o ON r.order_id = o.id ORDER BY request_date DESC", (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.put('/api/returns/:id', (req, res) => {
    const { status } = req.body;
    db.run(`UPDATE returns SET status=? WHERE id=?`, [status, req.params.id], function(err) {
        res.json({ updated: this.changes });
    });
});

app.delete('/api/products/:id', (req, res) => {
    db.run(`DELETE FROM products WHERE id = ?`, [req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ deleted: this.changes });
    });
});

app.delete('/api/coupons/:id', (req, res) => {
    db.run(`DELETE FROM coupons WHERE id = ?`, [req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ deleted: this.changes });
    });
});

// Users
app.get('/api/users', (req, res) => {
    db.all("SELECT id, name, email, phone, status, join_date FROM users", (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/auth/admin-login', (req, res) => {
    const email = (req.body.email || "").trim();
    const password = (req.body.password || "").trim();
    
    if (email === ADMIN_CREDENTIALS.email && password === ADMIN_CREDENTIALS.password) {
        console.log(`✅ Admin Authenticated: ${email}`);
        res.json({ success: true, token: 'admin-session-token', user: 'Admin Saala' });
    } else {
        console.log(`❌ Admin Authentication Failed: ${email}`);
        res.status(401).json({ success: false, error: "Invalid credentials" });
    }
});

app.post('/api/auth/register', (req, res) => {
    const { name, email, phone, password } = req.body;
    const join_date = new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
    db.run(`INSERT INTO users (name, email, phone, password, join_date) VALUES (?, ?, ?, ?, ?)`,
        [name, email, phone, password, join_date],
        function(err) {
            if (err) return res.status(400).json({ error: "Email already exists or invalid data" });
            res.json({ id: this.lastID, name, email });
        }
    );
});

app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    db.get("SELECT * FROM users WHERE email = ? AND password = ?", [email, password], (err, row) => {
        if (err || !row) return res.status(401).json({ error: "Invalid credentials" });
        res.json({ id: row.id, name: row.name, email: row.email });
    });
});

// Admin Route
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

app.get('/maintenance', (req, res) => {
    res.sendFile(path.join(__dirname, 'maintenance.html'));
});

// Settings API
app.get('/api/settings', (req, res) => {
    db.all("SELECT * FROM settings", (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        const settings = {};
        rows.forEach(r => settings[r.key] = r.value);
        res.json(settings);
    });
});

app.post('/api/settings', (req, res) => {
    const settings = req.body;
    db.serialize(() => {
        db.run("BEGIN TRANSACTION");
        const stmt = db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)");
        Object.entries(settings).forEach(([key, value]) => {
            stmt.run([key, value ? value.toString() : '']);
        });
        stmt.finalize();
        db.run("COMMIT", (err) => {
            if (err) return res.status(500).json({ success: false, error: err.message });
            res.json({ success: true });
        });
    });
});


// Dynamic Category/Collection Route Handler
app.get('/:slug.html', (req, res, next) => {
    const slug = req.params.slug;
    
    // Check if the physical file exists in the directory
    const fs = require('fs');
    const filePath = path.join(__dirname, slug + '.html');
    if (fs.existsSync(filePath)) {
        return next();
    }
    
    // Check if slug is a category or collection in SQLite
    db.get("SELECT slug FROM categories WHERE slug = ? UNION SELECT slug FROM collections WHERE slug = ?", [slug, slug], (err, row) => {
        if (err) {
            console.error("Dynamic Routing Error:", err);
            return next();
        }
        if (row) {
            return res.sendFile(path.join(__dirname, 'shop.html'));
        }
        next();
    });
});

// Static Files (Catch-all)
app.use(express.static(__dirname));

app.listen(PORT, () => {
    console.log(`Wild Saala Server running at http://localhost:${PORT}`);
});
