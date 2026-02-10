# Medium Clone

A full-stack blogging platform inspired by Medium, built with a Go backend and Next.js frontend.

## Tech Stack

**Backend:** Go, PostgreSQL, sqlc, goose, JWT authentication

**Frontend:** Next.js (App Router), TypeScript, Tailwind CSS

## Features

- User authentication (signup, signin, JWT + refresh tokens)
- Article CRUD with draft/publish workflow
- Full-text search (PostgreSQL tsvector)
- Tags, comments, and claps
- Follow system with personalized feed
- User profiles
- Dark mode support

## Project Structure

``` sh
backend/    # Go REST API server (net/http)
frontend/   # Next.js web application
```

## Getting Started

### Prerequisites

- Go 1.24+
- Node.js 18+
- PostgreSQL
- [goose](https://github.com/pressly/goose) (migrations)
- [sqlc](https://sqlc.dev/) (code generation)

### Backend

```bash
cd backend

# Run migrations
goose -dir sql/schema postgres "$DB_URL" up

# Start server (runs on :8080)
go run main.go
```

Configure via `backend/.env`:

```
DB_URL=postgres://...
JWT_SECRET=your-secret
PLATFORM=dev
```

### Frontend

```bash
cd frontend
npm install
npm run dev   # runs on :3000
```

## API Overview

| Endpoint | Description |
|---|---|
| `POST /api/auth/signup` | Register |
| `POST /api/auth/signin` | Sign in |
| `GET/POST /api/articles` | List / Create articles |
| `GET /api/articles/feed` | Personalized feed |
| `GET /api/articles/search?q=` | Full-text search |
| `POST /api/articles/{id}/clap` | Clap for article |
| `POST /api/articles/{id}/comments` | Add comment |
| `POST /api/users/{username}/follow` | Follow user |
| `GET /api/tags` | List tags |
| `GET /health` | Health check |

## License

MIT
