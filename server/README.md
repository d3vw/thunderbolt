# Thunderbolt Server

A Koa TypeScript server with PostgreSQL and Drizzle ORM.

## Features

- Koa web server with TypeScript
- PostgreSQL database with Drizzle ORM
- RESTful API endpoints
- Health check endpoint

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) (JavaScript runtime)
- PostgreSQL database

### Setup

1. Clone the repository
2. Create a `.env` file based on the `.env.example` template
3. Install dependencies:

```bash
bun install
```

4. Start PostgreSQL database
5. Run the server:

```bash
# Development mode with auto-reload
bun dev

# Production mode
bun start
```

### Database Migrations

```bash
# Generate migrations
bun db:migrate

# Apply migrations
bun db:push

# Open Drizzle Studio
bun db:studio
```

## API Endpoints

### Health Check

```
GET /healthcheck
```

Returns the server and database health status.

### Example API

```
GET /example
POST /example
```

Basic CRUD operations for testing.

### Locations API

```
GET /locations?search=<search_term>
```

Returns an autocomplete list of cities that match the search term, along with their latitude and longitude coordinates.

## Environment Variables

- `PORT`: Server port (default: 3001)
- `NODE_ENV`: Environment (development, production)
- `DB_HOST`: Database host
- `DB_PORT`: Database port
- `DB_USER`: Database user
- `DB_PASSWORD`: Database password
- `DB_NAME`: Database name
- `MAPBOX_ACCESS_TOKEN`: Mapbox API access token (required for location search)
