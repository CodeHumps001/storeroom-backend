# Storeroom Backend API

A multi-tenant SaaS POS and inventory management system built for Ghanaian SMEs. Storeroom helps shop owners manage products, track sales, generate receipts, and monitor business performance — all from one platform.

---

## Tech Stack

- **Runtime:** Node.js + TypeScript
- **Framework:** Express.js
- **Database:** PostgreSQL (Supabase)
- **ORM:** Prisma
- **Authentication:** JWT + bcrypt
- **File Storage:** Cloudinary
- **Payments:** Paystack
- **Email:** Nodemailer + Mailtrap
- **PDF Generation:** PDFKit
- **Deployment:** Railway

---

## Features

### Authentication & Security

- Organization + Owner registration in a single request
- JWT-based authentication with role-based access control
- Password reset via email with secure token hashing
- Staff invitation system with temporary credentials
- Helmet, CORS, and rate limiting protection

### Multi-tenant Architecture

- Every query scoped to `organizationId` from JWT — never trusted from client
- Two roles: **Owner** (full access) and **Cashier** (sales only)
- Feature gating — PRO features locked behind active subscription

### Inventory Management

- Full product CRUD with image uploads via Cloudinary
- Category management
- Barcode support for fast product lookup
- Stock tracking with low stock alerts

### POS & Sales

- Multi-item sales with real-time stock validation
- Price snapshot at time of sale — immune to future price changes
- Database transactions — all or nothing
- PDF receipt generation with payment breakdown

### Reports & Accounting

- Sales summary with date range filtering
- Top selling products
- Stock value report
- Low stock alerts
- Profit calculation per sale

### Payments

- Paystack payment initialization
- Webhook handling with HMAC SHA-512 signature verification
- Automatic organization upgrade on successful payment
- 30-day subscription management

---

## API Endpoints

### Auth

| Method | Endpoint                     | Access    |
| ------ | ---------------------------- | --------- |
| POST   | /api/v1/auth/register        | Public    |
| POST   | /api/v1/auth/login           | Public    |
| GET    | /api/v1/auth/me              | Protected |
| POST   | /api/v1/auth/forgot-password | Public    |
| POST   | /api/v1/auth/reset-password  | Public    |

### Products

| Method | Endpoint                          | Access    |
| ------ | --------------------------------- | --------- |
| POST   | /api/v1/products                  | Owner     |
| GET    | /api/v1/products                  | Protected |
| GET    | /api/v1/products/:id              | Protected |
| PATCH  | /api/v1/products/:id              | Owner     |
| DELETE | /api/v1/products/:id              | Owner     |
| GET    | /api/v1/products/barcode/:barcode | Protected |

### Categories

| Method | Endpoint               | Access    |
| ------ | ---------------------- | --------- |
| POST   | /api/v1/categories     | Owner     |
| GET    | /api/v1/categories     | Protected |
| DELETE | /api/v1/categories/:id | Owner     |

### Sales

| Method | Endpoint                  | Access    |
| ------ | ------------------------- | --------- |
| POST   | /api/v1/sales             | Protected |
| GET    | /api/v1/sales             | Protected |
| GET    | /api/v1/sales/:id         | Protected |
| GET    | /api/v1/sales/:id/receipt | Protected |

### Reports

| Method | Endpoint                     | Access      |
| ------ | ---------------------------- | ----------- |
| GET    | /api/v1/reports/summary      | Owner + PRO |
| GET    | /api/v1/reports/top-products | Owner + PRO |
| GET    | /api/v1/reports/stock-value  | Owner + PRO |
| GET    | /api/v1/reports/low-stock    | Owner + PRO |

### Staff

| Method | Endpoint      | Access |
| ------ | ------------- | ------ |
| POST   | /api/v1/staff | Owner  |

### Payments

| Method | Endpoint                    | Access   |
| ------ | --------------------------- | -------- |
| POST   | /api/v1/payments/initialize | Owner    |
| POST   | /api/v1/payments/webhook    | Paystack |

---

## Environment Variables

```env
DATABASE_URL=
JWT_SECRET=
EXPIRED_TIME=
MAIL_HOST=
MAIL_PORT=
MAIL_USER=
MAIL_PASS=
PAYSTACK_SECRET_KEY=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
FRONTEND_URL=
NODE_ENV=
```

````

---

## Getting Started

```bash
# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

---

## Architecture Decisions

- **`organizationId` is always read from the JWT** — never trusted from the client. This is the core multi-tenant security rule enforced on every query.
- **Database transactions** — sale creation, stock decrement, and sale item creation happen atomically. One failure rolls everything back.
- **Price snapshots** — `priceAtSale` is recorded at the time of sale. Future product price changes never affect historical sales data.
- **Webhook signature verification** — all Paystack webhooks are verified using HMAC SHA-512 before processing.

---

## Built By

**Yaw Fosu** — Co-founder & Developer, Velux Corporation (codeHumps)

> _Keep building the future._

```

```
````
