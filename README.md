# Bookstore API

Fully documented NestJS + Prisma REST API for managing books, authors, categories, orders, rentals, notifications, and authentication. The service uses PostgreSQL as the primary store, Redis for caching/token blacklist, and Swagger for up-to-date OpenAPI documentation.

## 🚀 Technologies

- **Framework**: NestJS 11
- **Database**: PostgreSQL with Prisma ORM
- **Cache**: Redis (ioredis)
- **Authentication**: JWT (cookie-based) with token blacklist
- **Validation**: class-validator, class-transformer
- **Documentation**: Swagger/OpenAPI
- **Language**: TypeScript

## 📋 Prerequisites

- Node.js (v18 or higher)
- PostgreSQL database
- Redis server
- Docker & Docker Compose (recommended)
- pnpm (or npm/yarn)

## 🛠️ Installation

```bash
# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env
# Edit .env with your database and Redis credentials

# Start PostgreSQL and Redis with Docker Compose
docker compose up -d

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev

# Seed the database (optional)
pnpm run seed
```

## 🏃 Running the Application

```bash
# Development mode
pnpm run start:dev

# Production mode
pnpm run build
pnpm run start:prod
```

The API will be available at `http://localhost:3000/api`

## 📚 API Documentation

Swagger documentation is available at:

- **UI**: `http://localhost:3000/docs`
- **JSON**: `http://localhost:3000/docs-json`

## ✅ Implemented Features

- Books, Authors, Categories CRUD with validation, search, pagination, and Redis caching
- User authentication with role-based access control and admin whitelisting
- Orders (purchase + rental) and Rentals lifecycle with transactional book status updates
- Notifications center with read/unread filters and bulk acknowledgment
- Swagger documentation for every DTO/controller, global validation pipe, and JWT guards

### 🔐 Authentication Module (`/api/auth`)

- ✅ `POST /api/auth/register` - User registration
- ✅ `POST /api/auth/login` - User login (sets JWT in cookie)
- ✅ `POST /api/auth/logout` - User logout
- ✅ `GET /api/auth/me` - Get current user information

**Features:**

- JWT-based authentication with cookie storage
- Password hashing with bcrypt
- Admin whitelist (configured via `ADMIN_EMAILS_WHITELIST` env variable)
- Role-based access control (USER, ADMIN)
- JWT token blacklist for secure logout (Redis-based)

### 📚 Books Module (`/api/books`)

- ✅ `GET /api/books` - Get paginated list of books
  - Query params: `page`, `limit`, `authorId`, `categoryId`, `year`, `status`, `search`
  - Returns: books with author and category, pagination metadata
- ✅ `GET /api/books/:id` - Get book by ID
  - Returns: book with author, category, orders, and rentals
- ✅ `POST /api/books` - Create new book (ADMIN only)
  - Body: CreateBookDto
  - Validates: title, authorId, categoryId, prices, status
- ✅ `PATCH /api/books/:id` - Update book (ADMIN only)
  - Body: UpdateBookDto (all fields optional)
- ✅ `DELETE /api/books/:id` - Delete book (ADMIN only)
  - Prevents deletion if book has active rentals

**Features:**

- Pagination with metadata (total, totalPages)
- Filtering by author, category, year, status
- Case-insensitive search by title
- Full CRUD operations
- Input validation and sanitization
- Redis caching for GET endpoints (5-10 min TTL)
- Automatic cache invalidation on data changes

### 👤 Authors Module (`/api/authors`)

- ✅ `GET /api/authors` - Get paginated list of authors
  - Query params: `page`, `limit`, `search`, `sortBy`, `sortOrder`, `includeBooks`
  - Returns: authors with book count, optional books list
- ✅ `GET /api/authors/:id` - Get author by ID
  - Returns: author with all books and count
- ✅ `POST /api/authors` - Create new author (ADMIN only)
  - Body: CreateAuthorDto (name, bio?)
  - Validates: name length, prevents duplicates
- ✅ `PATCH /api/authors/:id` - Update author (ADMIN only)
  - Body: UpdateAuthorDto (all fields optional)
  - Validates: prevents duplicate names
- ✅ `DELETE /api/authors/:id` - Delete author (ADMIN only)
  - Prevents deletion if author has books

**Features:**

- Pagination with metadata
- Search by author name (case-insensitive)
- Sorting by name or createdAt (asc/desc)
- Optional books inclusion
- Duplicate name prevention
- Full CRUD operations
- Redis caching for GET endpoints (5-10 min TTL)
- Automatic cache invalidation on data changes

### 🗂️ Categories Module (`/api/categories`)

- ✅ `GET /api/categories` - Get paginated list of categories
  - Query params: `page`, `limit`, `search`
  - Returns: categories with book count and pagination metadata
- ✅ `GET /api/categories/:id` - Get category by ID
  - Returns: category with associated books and count
- ✅ `POST /api/categories` - Create new category (ADMIN only)
  - Body: CreateCategoryDto (name)
- ✅ `PATCH /api/categories/:id` - Update category (ADMIN only)
  - Body: UpdateCategoryDto (all fields optional)
- ✅ `DELETE /api/categories/:id` - Delete category (ADMIN only)
  - Prevents deletion if category has books

**Features:**

- Pagination with metadata
- Search by category name (case-insensitive)
- Duplicate name prevention
- Full CRUD operations
- Redis caching for GET endpoints (5-10 min TTL)
- Automatic cache invalidation on data changes

### 🛒 Orders Module (`/api/orders`)

- ✅ `GET /api/orders` - List orders for the authenticated user
  - Query params: `page`, `limit`, `type`
  - Returns: orders with book details, rental (if applicable), pagination metadata
- ✅ `GET /api/orders/:id` - Get specific order (owned by the user)
  - Ensures users can only fetch their own orders
- ✅ `POST /api/orders` - Create purchase or rental order
  - Body: CreateOrderDto (bookId, type, duration for rentals)
  - Rental orders automatically create rental records and update book status

**Features:**

- Pagination + filtering by order type
- Ownership enforcement (users see only their orders)
- Business logic for rental vs purchase flows
- Automatic book status updates (RENTED/SOLD) and availability enforcement
- Cache invalidation for affected books (Redis)

### 🔄 Rentals Module (`/api/rentals`)

- ✅ `GET /api/rentals` - List rentals for the authenticated user
  - Query params: `page`, `limit`, `isActive`
  - Returns rentals with book + order info and pagination metadata
- ✅ `GET /api/rentals/:id` - Get rental by ID (owned by the user)
  - Ensures users can access only their rentals
- ✅ `POST /api/rentals/:id/return` - Return a rental
  - Marks rental as inactive, updates book status to AVAILABLE/`available = true`

**Features:**

- Pagination with metadata
- Optional filtering by `isActive`
- Ownership enforcement (users manage only their rentals)
- Automatic book status reset + cache invalidation after return

### 🔔 Notifications Module (`/api/notifications`)

- ✅ `GET /api/notifications` - List notifications for the current user
  - Query params: `page`, `limit`, `read`
  - Returns: notifications array + pagination metadata
- ✅ `GET /api/notifications/:id` - Get notification by ID
  - Access restricted to the owner
- ✅ `PATCH /api/notifications/:id/read` - Mark notification as read
- ✅ `PATCH /api/notifications/read-all` - Mark all notifications as read

**Features:**

- Pagination and optional filtering by read status
- Ownership enforcement via JWT guard
- Batch mark-all endpoint (returns updated count)
- DTO-level validation and transformation for query params
- Swagger docs for every endpoint

### 🏥 Health Module (`/api/health`)

- ✅ `GET /api/health` - Application health check
  - Returns: health status of external services

## 🔒 Security

- JWT authentication via HTTP-only cookies
- JWT token blacklist for secure logout (prevents token reuse after logout)
- Role-based access control (RolesGuard)
- Input validation with class-validator
- Password hashing with bcrypt
- Admin whitelist for role assignment

## ⚡ Performance & Caching

- **Redis caching** for frequently accessed data:
  - Books list and details (5-10 min TTL)
  - Authors list and details (5-10 min TTL)
- **Automatic cache invalidation** on create/update/delete operations
- **Pattern-based cache clearing** for efficient bulk invalidation
- **JWT token blacklist** stored in Redis with automatic expiration

## 📝 API Endpoints Summary

| Method | Endpoint                      | Auth | Role  | Description            |
| ------ | ----------------------------- | ---- | ----- | ---------------------- |
| POST   | `/api/auth/register`          | -    | -     | Register new user      |
| POST   | `/api/auth/login`             | -    | -     | Login user             |
| POST   | `/api/auth/logout`            | ✅   | -     | Logout user            |
| GET    | `/api/auth/me`                | ✅   | -     | Get current user       |
| GET    | `/api/books`                  | -    | -     | List books             |
| GET    | `/api/books/:id`              | -    | -     | Get book by ID         |
| POST   | `/api/books`                  | ✅   | ADMIN | Create book            |
| PATCH  | `/api/books/:id`              | ✅   | ADMIN | Update book            |
| DELETE | `/api/books/:id`              | ✅   | ADMIN | Delete book            |
| GET    | `/api/authors`                | -    | -     | List authors           |
| GET    | `/api/authors/:id`            | -    | -     | Get author by ID       |
| POST   | `/api/authors`                | ✅   | ADMIN | Create author          |
| PATCH  | `/api/authors/:id`            | ✅   | ADMIN | Update author          |
| DELETE | `/api/authors/:id`            | ✅   | ADMIN | Delete author          |
| GET    | `/api/categories`             | -    | -     | List categories        |
| GET    | `/api/categories/:id`         | -    | -     | Get category by ID     |
| POST   | `/api/categories`             | ✅   | ADMIN | Create category        |
| PATCH  | `/api/categories/:id`         | ✅   | ADMIN | Update category        |
| DELETE | `/api/categories/:id`         | ✅   | ADMIN | Delete category        |
| GET    | `/api/orders`                 | ✅   | USER+ | List own orders        |
| GET    | `/api/orders/:id`             | ✅   | USER+ | Get own order by ID    |
| POST   | `/api/orders`                 | ✅   | USER+ | Create purchase/rental |
| GET    | `/api/rentals`                | ✅   | USER+ | List own rentals       |
| GET    | `/api/rentals/:id`            | ✅   | USER+ | Get rental by ID       |
| POST   | `/api/rentals/:id/return`     | ✅   | USER+ | Return rental          |
| GET    | `/api/notifications`          | ✅   | USER+ | List notifications     |
| GET    | `/api/notifications/:id`      | ✅   | USER+ | Notification details   |
| PATCH  | `/api/notifications/:id/read` | ✅   | USER+ | Mark notification read |
| PATCH  | `/api/notifications/read-all` | ✅   | USER+ | Mark all read          |
| GET    | `/api/health`                 | -    | -     | Health check           |

## 🗂️ Project Structure

```
src/
├── modules/
│   ├── auth/           # Authentication & authorization
│   │   ├── jwt/        # JWT strategy and guard
│   │   └── roles/      # Roles guard and decorator
│   ├── books/          # Books CRUD operations
│   ├── authors/        # Authors CRUD operations
│   ├── categories/     # Categories CRUD operations
│   ├── orders/         # Orders (purchase & rental creation)
│   ├── rentals/        # Rentals lifecycle (list, return)
│   ├── notifications/  # Notifications CRUD & read status
│   ├── redis/          # Redis service for caching & token blacklist
│   ├── db/             # Prisma database service
│   └── health/         # Health check
├── config/             # Configuration
├── @types/             # TypeScript type definitions
└── main.ts             # Application entry point

prisma/
├── schema.prisma       # Database schema
├── seed.ts            # Database seeding
└── migrations/        # Database migrations
```

## 🔧 Environment Variables

Create a `.env` file in the root directory:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/bookstore?schema=public"

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=  # Optional, leave empty if no password
REDIS_TTL=300    # Cache TTL in seconds (default: 5 minutes)

# JWT
JWT_SECRET="your-secret-key-here"
NODE_ENV="development"

# Admin whitelist (comma-separated emails)
ADMIN_EMAILS_WHITELIST="admin@example.com,superadmin@example.com"

# Server
PORT=3000
```

## 📦 Available Scripts

```bash
# Development
pnpm run start:dev      # Start in watch mode
pnpm run start:debug    # Start in debug mode

# Production
pnpm run build          # Build for production
pnpm run start:prod     # Start production server

# Database
pnpm run seed           # Seed database
npx prisma generate     # Generate Prisma client
npx prisma migrate dev  # Run migrations
npx prisma studio       # Open Prisma Studio

# Docker
docker compose up -d   # Start PostgreSQL and Redis
docker compose down     # Stop services
docker compose logs -f  # View logs

# Utilities
pnpm run db:backup      # Backup database
pnpm run db:restore     # Restore database
pnpm run lint           # Lint code
pnpm run format         # Format code
```

## 🗄️ Database Schema

The database includes the following models:

- **User** - Users with roles (USER, ADMIN)
- **Book** - Books with status, prices, and availability
- **Author** - Book authors
- **Category** - Book categories
- **Order** - Purchase and rental orders
- **Rental** - Active book rentals
- **Notification** - User notifications

## 🔐 Authentication

The API uses JWT tokens stored in HTTP-only cookies. After login/registration, the token is automatically set in cookies and sent with subsequent requests.

**Token Blacklist:**

- When a user logs out, their JWT token is added to a Redis blacklist
- Blacklisted tokens are automatically rejected on subsequent requests
- Tokens are automatically removed from blacklist after expiration
- This prevents token reuse even if the token was intercepted before logout

**Admin Access:**

- Users with emails in `ADMIN_EMAILS_WHITELIST` are automatically assigned ADMIN role on registration
- ADMIN role is required for creating/updating/deleting books and authors

## 📊 Response Format

### Success Response

```json
{
  "data": [...],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "totalPages": 10
  }
}
```

### Error Response

```json
{
  "statusCode": 400,
  "message": "Error message",
  "error": "Bad Request"
}
```

## 🚧 Planned Features

- [ ] Global exception filters & problem-details responses
- [ ] Automated database backup/restore scripts (Docker + cron)
- [ ] Rate limiting & IP throttling backed by Redis
- [ ] Cache warming jobs for most-used book/author lists
- [ ] Observability stack (structured logging, metrics, tracing)

## 📖 API Usage Examples

### Register User

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "password123"}'
```

### Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "password123"}' \
  -c cookies.txt
```

### Get Books with Filters

```bash
curl "http://localhost:3000/api/books?page=1&limit=10&authorId=xxx&status=AVAILABLE&search=Harry"
```

### Create Book (Admin)

```bash
curl -X POST http://localhost:3000/api/books \
  -H "Content-Type: application/json" \
  -H "Cookie: access_token=your-jwt-token" \
  -d '{
    "title": "Book Title",
    "description": "Description",
    "authorId": "author-uuid",
    "categoryId": "category-uuid",
    "year": 2024,
    "priceCents": 2000,
    "rentPriceCents": 500,
    "status": "AVAILABLE"
  }'
```

## 📄 License

MIT

## Author

Alexander Kolesnik — [@sobol-sudo](https://github.com/sobol-sudo)

Bookstore API - NestJS Project
