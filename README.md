# 🗄️ Vintage Fits — Server

The **Keystone.js (keystone-next) v9** backend for Vintage Fits. Exposes a GraphQL API, a built-in Admin UI, handles authentication, image uploads, email, Stripe checkout, and role-based access control — all backed by MongoDB.

---

## 📋 Overview

| Detail | Value |
|--------|-------|
| Framework | `@keystone-next/keystone` v9 |
| Database | MongoDB (via Mongoose adapter) |
| Auth | Stateless cookie sessions + `createAuth` |
| Image Storage | Cloudinary |
| Email | Nodemailer (SMTP) |
| Payments | Stripe |
| Language | TypeScript |
| Dev Port | `3000` |

---

## 🗂️ Directory Structure

```
vintage-fits-server/
├── keystone.ts          # Root config — DB, auth, session, CORS, schema, custom mutations
├── types.ts             # Shared TypeScript types (Session, ListAccessArgs, etc.)
├── schemas/             # Keystone list schemas
│   ├── User.ts
│   ├── Product.ts
│   ├── ProductImage.ts
│   ├── CartItem.ts
│   ├── Order.ts
│   ├── OrderItem.ts
│   └── Role.ts
├── mutations/           # Custom GraphQL mutation resolvers
│   ├── addToCart.ts
│   └── checkout.ts
├── lib/
│   └── mail.ts          # Nodemailer password-reset email sender
├── seed-data/           # Sample product seeder (--seed-data flag)
├── .env                 # Environment variables (not committed)
├── .npmrc               # npm config (legacy-peer-deps)
├── tsconfig.json
└── package.json
```

---

## ⚙️ Environment Variables

Create a `.env` file in this directory:

```env
# ─── Database ─────────────────────────────────────────────────────────────────
DATABASE_URL=mongodb://localhost/keystone-vintage-fits

# ─── Session ──────────────────────────────────────────────────────────────────
# Any long, random, secret string — used to sign session cookies
COOKIE_SECRET=changeme-use-a-long-random-string

# ─── Email (Nodemailer) ────────────────────────────────────────────────────────
# Use Mailtrap (https://mailtrap.io) for development
MAIL_HOST=smtp.mailtrap.io
MAIL_PORT=465
MAIL_USER=your-mailtrap-user
MAIL_PASS=your-mailtrap-password

# ─── Cloudinary ───────────────────────────────────────────────────────────────
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_KEY=your-api-key
CLOUDINARY_SECRET=your-api-secret

# ─── CORS ─────────────────────────────────────────────────────────────────────
# The URL of the Next.js frontend — must match exactly
FRONTEND_URL=http://localhost:7777

# ─── Stripe ───────────────────────────────────────────────────────────────────
STRIPE_SECRET=sk_test_...
```

---

## 🚀 Running the Server

### Development

```bash
npm run dev
```

> Uses `NODE_OPTIONS=--openssl-legacy-provider` for Node 17+ OpenSSL compatibility.

- **Admin UI**: <http://localhost:3000>
- **GraphQL API / Playground**: <http://localhost:3000/api/graphql>

### Seed Database

Populate the database with sample products and images:

```bash
npm run seed-data
```

---

## 🗃️ Schemas

### `User`
- Fields: `name`, `email`, `password` (auth), `cart` (relation → CartItem), `orders` (relation → Order), `role` (relation → Role)
- Auth-enabled via `createAuth` — supports sign in, sign up, password reset

### `Product`
- Fields: `name`, `description`, `price`, `status` (`AVAILABLE` | `UNAVAILABLE`), `photo` (relation → ProductImage), `user` (relation → User)
- Access: create/update/delete restricted to the product owner or users with `canManageProducts`

### `ProductImage`
- Fields: `image` (Cloudinary field), `altText`, `product` (relation → Product)
- Uploads go straight to Cloudinary via the `@keystone-next/cloudinary` adapter

### `CartItem`
- Fields: `product` (relation → Product), `user` (relation → User), `quantity`
- Managed via the custom `addToCart` mutation

### `Order`
- Fields: `label`, `total`, `charge` (Stripe charge ID), `items` (relation → OrderItem), `user` (relation → User)
- Created by the custom `checkout` mutation after a successful Stripe charge

### `OrderItem`
- Snapshot of the product at purchase time: `name`, `description`, `price`, `photo`, `quantity`, plus a back-relation to `Order`

### `Role`
- Boolean permission flags: `canManageProducts`, `canSeeOtherUsers`, `canManageUsers`, `canManageRoles`, `canManageCart`, `canManageOrders`
- Assigned to a `User` to grant elevated access in the Admin UI or API

---

## 🔧 Custom GraphQL Mutations

Defined via `extendGraphqlSchema` in `keystone.ts`:

```graphql
type Mutation {
  # Adds a product to the signed-in user's cart (increments qty if already present)
  addToCart(productId: ID): CartItem

  # Creates a Stripe PaymentIntent charge, clears the cart, and returns an Order
  checkout(token: String!): Order
}
```

### `addToCart` (`mutations/addToCart.ts`)
1. Checks the session for an authenticated user
2. Queries existing cart items for the given product
3. If found — increments `quantity`; if not — creates a new `CartItem`

### `checkout` (`mutations/checkout.ts`)
1. Verifies session
2. Fetches the user's cart with product + price data
3. Creates a Stripe charge using the provided token
4. Creates an `Order` with snapshots of each `CartItem` as `OrderItem` records
5. Deletes all `CartItem` records for the user

---

## 🔐 Authentication & Session

```ts
const { withAuth } = createAuth({
  listKey: 'User',
  identityField: 'email',
  secretField: 'password',
  initFirstItem: { fields: ['name', 'email', 'password'] },
  passwordReset: {
    async sendToken(args) {
      await sendPasswordResetEmail(args.token, args.identity);
    },
  },
});
```

- Session duration: **360 days** (configurable via `maxAge` in `sessionConfig`)
- Session data loads: `id`, `name`, `email`, and the full `role` object on every request
- Admin UI is protected — requires an active session (`isAccessAllowed: ({ session }) => !!session?.data`)

---

## 📦 Key Dependencies

| Package | Purpose |
|---------|---------|
| `@keystone-next/keystone` | Core CMS framework |
| `@keystone-next/auth` | Session-based authentication |
| `@keystone-next/fields` | Field types (text, int, select, relationship, etc.) |
| `@keystone-next/cloudinary` | Cloudinary image field |
| `@keystone-next/admin-ui` | Admin dashboard UI |
| `@keystonejs/server-side-graphql-client` | Internal GraphQL calls in mutations/seeder |
| `nodemailer` | Sending password-reset emails |
| `stripe` | Processing payments |
| `dotenv` | Loading `.env` variables |
| `next` | Keystone uses Next.js as its server runtime |

---

## 🤔 Known Issues & Gotchas

### Node.js 17+ OpenSSL
Webpack 4 (used by keystone-next v9) conflicts with Node 17+'s OpenSSL 3. The `dev` script forces `NODE_OPTIONS=--openssl-legacy-provider`. Use **Node 14** or **Node 16** to avoid this.

### `extract-files` ESM Interop
The `postinstall` script removes the `exports` field from `extract-files/package.json`, patching a CJS/ESM resolution conflict that breaks `apollo-upload-client`.

### `sendUserPasswordResetLink` Not Exposed
The mutation `sendUserPasswordResetLink` is NOT part of the public API surface in this version. Password resets are handled internally through the `passwordReset.sendToken` callback in `createAuth`, which calls `sendPasswordResetEmail`. The frontend uses a custom `REQUEST_RESET_MUTATION` that is wired to `sendUserPasswordResetLink` in newer Keystone versions — this will result in a `ValidationError` until upgraded.

### MongoDB Must Be Running
The server will crash on startup if MongoDB is not reachable. Verify your connection with:
```bash
mongosh "mongodb://localhost/keystone-vintage-fits"
```

---

## 🧪 Development Tips

- Use [Mailtrap](https://mailtrap.io/) as a safe SMTP sandbox for email testing in development.
- Use [Stripe CLI](https://stripe.com/docs/stripe-cli) to forward webhooks locally.
- The GraphQL Playground at `/api/graphql` lets you explore and test queries/mutations directly in the browser.

---

## 📄 License

[MIT](./LICENSE)