<div align="center">
  
  # ⚡ WILD SAALA
  
  ### *Not Just a Hoodie. A Wild Statement.*
  
  An ultra-premium, dark-themed, open-source streetwear e-commerce platform and analytics dashboard built for high-performance scale and seamless developer configuration.

  [![GitHub license](https://img.shields.io/badge/License-MIT-39FF14.svg?style=for-the-badge&logo=github&logoColor=black)](LICENSE)
  [![Node Version](https://img.shields.io/badge/Node-v18%2B-00BFFF.svg?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
  [![DB Database](https://img.shields.io/badge/Database-SQLite3-yellow.svg?style=for-the-badge&logo=sqlite&logoColor=white)](#architecture)
  [![Vercel Style](https://img.shields.io/badge/UX%2FUI-Premium%20Dark-ff007f.svg?style=for-the-badge&logo=figma&logoColor=white)](#design-aesthetics)

  <p align="center">
    <a href="#key-features">Key Features</a> •
    <a href="#architecture">Architecture</a> •
    <a href="#quick-start">Quick Start</a> •
    <a href="#api-documentation">API Docs</a> •
    <a href="#roadmap">Roadmap</a> •
    <a href="#contributing">Contributing</a>
  </p>


</div>

---

## 📈 Key Metrics & Architecture

* **Performance first**: Zero large framework bloat. Pure vanilla HTML5/CSS3 and native client-side logic.
* **Lightweight Core**: Backed by a high-efficiency SQLite3 relational engine.
* **Responsive Fluid Grid**: Native 12-column CSS layouts rendering perfectly across Ultra-wide, Desktop, Tablet, and Mobile displays.
* **Indian Market Optimization**: Native validation support for Indian state dropdown curations and 6-digit pin code numeric regex checks.

## ✨ Features & Capabilities

### 📦 E-Commerce Core & Operations
* **Inventory System**: Modular variant mapper (size/color combinations) with dynamic "Sold Out" status triggers and visual badges.
* **Cart Persistence**: Client-side localStorage persistence ensuring user baskets are maintained seamlessly across browser sessions and navigation.
* **Coupon Engine**: Robust discount logic (e.g. `WD20` prepaid coupon campaign) with real-time validation and automatic COD payment-method switch invalidation.
* **Order Management**: Transactional ordering system storing customer address schemas, item selections, and status pipelines.
* **Payment Flow**: Dynamic multi-channel checkout support with native validations for Indian state selections and 6-digit pin code constraints.

### 🛡️ Admin & User Workspace
* **Admin Dashboards**: Command Center displaying total revenue, orders, active user analytics, categories, returns, and inventory tables.
* **User Dashboards**: Customer dashboard showing profile sessions, profile states, and purchase history.
* **Authentication**: Session checkouts prefilled dynamically from active user sessions (`localStorage`).
* **Analytics**: Business intelligence telemetry tracking revenue growth distributions, popular category percentages, and waitlists.

### ⚡ Technical Design & Optimization
* **Responsive UI**: High-end minimalist dark theme with glassmorphism, responsive navigation grids, and interactive micro-animations.
* **Scalable Backend**: Decoupled Express API routes managing database operations asynchronously with error-handling parameters.
* **Real-time Updates**: Instant client-side search filtering, dynamic category rendering, and live active filter chip updates.
* **Performance Optimization**: Zero framework-overhead, optimized asset weight, thin CSS schemas, and cached database index operations.

---

## 🏗️ Architecture

```mermaid
graph TD
    Client[Storefront & Admin SPA - HTML5/CSS3/Vanilla JS]
    Server[NodeJS Express API Engine]
    DB[(SQLite3 Database)]
    Utility[Product Utils Module - Shared Session/Cart State]
    
    Client -->|API Requests| Server
    Client -->|Session Store & Cart Events| Utility
    Server -->|Queries & Operations| DB
```

---

## 🚀 Quick Start

### Prerequisites
* [Node.js](https://nodejs.org) (v18.0.0 or higher)
* NPM (v9.0.0 or higher)

### Setup & Run
1. **Clone the Repository**
   ```bash
   git clone https://github.com/your-username/wildsaala.git
   cd wildsaala
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Initialize Database and Seed Products**
   ```bash
   # Seeds the sqlite wildsaala.db file automatically
   node db.js
   ```

4. **Launch the Engine**
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` in your browser.

---

## 🔌 API Documentation

### Products API
* **`GET /api/products`**  
  Retrieves catalog listing. Query parameters:
  * `store=1` (Retrieve only published/active stock)
  * `section=featured` (Filter by section curation)
* **`GET /api/products/:id`**  
  Retrieves details of a specific product (including nested variations and media).
* **`POST /api/products`**  
  Creates a new product in the registry (Admin only).

### Collections & Curations
* **`GET /api/collections`**  
  Retrieves custom drops/lookbooks.
* **`GET /api/collections/:slug/products`**  
  Retrieves products curated under a specific collection slug.

### Checkout & Ordering
* **`POST /api/orders`**  
  Accepts payload with user details, shipping matrix, coupon reference, and cart item arrays. Outputs order success IDs.

---

## 🛠️ Security & Code Integrity

* **Guarded Validation**: All forms enforce regex checkmarks (e.g. 6-digit numeric postal limits) before processing.
* **Clean Context Separation**: Shared cart logic and storefront modals are isolated in the `product-utils` scope, ensuring that admin paths remain unpolluted and clean.
* **Developer Signature**: All source code files are watermarked with an embedded signature header comment block for authorship verification:
  ```javascript
  /**
   * Developer Signature & Watermark
   * Name: Mada Dhivakar
   * Contact: dhivakarmada@gmail.com
   */
  ```

---

## 🗺️ Future Roadmap

- [ ] JWT integration for Admin & Profile accounts.
- [ ] Direct Razorpay API gateway synchronization.
- [ ] Automated SMS waitlist notification integration.
- [ ] Full Docker containerization support.

---

## 🤝 Contributing

Contributions are welcome! Please feel free to open pull requests or issues.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

Distributed under the MIT License. See [LICENSE](LICENSE) for more details.

---

## ✉️ Contact & Links

* **Developer**: Mada Dhivakar
* **Email**: dhivakarmada@gmail.com
* **GitHub Portfolio**: [Mada Dhivakar Github](https://github.com/mada-dhivakar) *(placeholder)*
* **Project Link**: [https://github.com/your-username/wildsaala](https://github.com/your-username/wildsaala)
