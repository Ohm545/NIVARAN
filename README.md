# NIVARAN

Full-stack web application built with:

| Layer      | Technology                        |
|------------|-----------------------------------|
| Frontend   | HTML5 · CSS3 · Vanilla JS (ES6+)  |
| Backend    | Node.js · Express.js              |
| Database   | PostgreSQL via Prisma ORM         |
| AI         | Azure OpenAI — GPT-5.4            |

---

## Project Structure

```
nivaran/
├── frontend/           # Static HTML/CSS/JS — no framework
│   ├── css/            # Modular stylesheets
│   ├── js/             # ES modules (api, components, services, pages)
│   └── assets/
├── backend/            # Express.js REST API
│   ├── config/         # env, database, cors config
│   ├── routes/         # Route registration
│   ├── controllers/    # Request handlers
│   ├── services/       # Business logic
│   ├── middleware/     # Auth, error handling, rate limiting
│   ├── validators/     # Input validation
│   ├── utils/          # Shared helpers
│   └── ai/             # Azure OpenAI client & service
├── prisma/             # Schema & migrations
└── tests/
```

---

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
# Fill in DATABASE_URL, JWT_SECRET, and Azure OpenAI credentials
```

### 3. Set up the database

```bash
npm run db:migrate
npm run db:generate
```

### 4. Start the backend

```bash
npm run dev
```

### 5. Serve the frontend

Open `frontend/index.html` via Live Server (VS Code extension) or any static file server pointed at the `frontend/` folder.

---

## API

All endpoints are prefixed with `/api`.

| Method | Path    | Description     |
|--------|---------|-----------------|
| GET    | /health | Health check    |
| GET    | /api    | API root check  |

More routes will be documented here as features are built.
