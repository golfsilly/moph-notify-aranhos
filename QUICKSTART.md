# 🚀 Quick Start: Prisma 7 + MySQL Docker

## 📝 Setup Instructions

### Step 1: Start MySQL Docker (First Time Only)

```bash
# Start Docker services
docker-compose up -d

# Verify MySQL is running
docker-compose ps

# Wait 15-30 seconds for MySQL to be ready
```

### Step 2: Initialize Prisma Schema

```bash
# Generate Prisma Client
npm run prisma:generate

# Push schema to database
npm run prisma:push
```

### Step 3: Seed Sample Data (Optional)

```bash
npm run prisma:seed
```

### Step 4: View Database in Prisma Studio

```bash
npm run prisma:studio
```

This opens http://localhost:5555 where you can:

- Browse your database tables
- Create/edit/delete records
- Run queries

---

## 🎯 Typical Workflow

### When You Start Development

```bash
# 1. Start Docker
docker-compose up -d

# 2. Run your app
npm run dev

# 3. Open Prisma Studio (in another terminal)
npm run prisma:studio
```

### When You Update Schema

```bash
# 1. Edit prisma/schema.prisma

# 2. Create a migration
npm run prisma:migrate:dev

# 3. This will:
#    - Generate SQL
#    - Run it on the database
#    - Update Prisma Client

# 4. Restart your app (if needed)
```

### To Reset Everything

```bash
# This will:
# - Drop all tables
# - Re-run all migrations
# - Re-seed data
npm run prisma:reset
```

---

## 📊 Database Access

### Option 1: Prisma Studio (Recommended)

```bash
npm run prisma:studio
# Opens: http://localhost:5555
```

### Option 2: phpMyAdmin

```
URL: http://localhost:8080
Username: sa
Password: aranhospi
```

### Option 3: MySQL CLI

```bash
docker exec -it moph-notify-mysql mysql -u sa -p hos
# Password: aranhospi
```

---

## 🔄 Connection Status

| Component         | Status    | How to Check                 |
| ----------------- | --------- | ---------------------------- |
| **MySQL**         | Running   | `docker-compose ps`          |
| **Database**      | Connected | `npm run prisma:studio`      |
| **Prisma Client** | Generated | Check `src/generated/prisma` |

---

## ⚡ Common Commands

```bash
# Start/Stop Docker
docker-compose up -d      # Start all services
docker-compose down       # Stop services
docker-compose down -v    # Stop and remove volumes (deletes data!)

# Prisma Operations
npm run prisma:generate   # Generate Prisma Client
npm run prisma:migrate:dev # Create & run migration
npm run prisma:push       # Push schema without migration
npm run prisma:pull       # Pull schema from existing database
npm run prisma:studio     # Open Prisma Studio GUI
npm run prisma:format     # Format schema.prisma
npm run prisma:reset      # Drop & re-run all migrations

# Development
npm run dev              # Start Next.js dev server
npm run build            # Build for production
npm start                # Run production build
npm run lint             # Run ESLint
```

---

## 🐛 Troubleshooting

### MySQL Container Won't Start

```bash
# Check logs
docker-compose logs mysql

# Restart Docker
docker-compose restart mysql

# Full reset (clears data!)
docker-compose down -v
docker-compose up -d
```

### "Connection refused" Error

- Wait 20 seconds for MySQL to start
- Check: `docker-compose ps`
- View logs: `docker-compose logs mysql`

### Prisma Client Not Found

```bash
npm run prisma:generate
```

### Database Schema Out of Sync

```bash
# Push current schema to database
npm run prisma:push

# Or reset everything
npm run prisma:reset
```

---

## 📚 Files Created

| File                   | Purpose                            |
| ---------------------- | ---------------------------------- |
| `docker-compose.yml`   | Docker MySQL + phpMyAdmin setup    |
| `scripts/init.sql`     | Initial database schema            |
| `.env.local`           | Local development variables        |
| `.env.example`         | Template for environment variables |
| `prisma/schema.prisma` | Prisma database schema             |
| `prisma/seed.ts`       | Sample data seeder                 |
| `DOCKER_SETUP.md`      | Detailed Docker guide              |
| `prisma7.config.ts`    | Prisma 7 configuration             |

---

## 🔗 Next Steps

1. **Update Schema**: Edit `prisma/schema.prisma`
2. **Create Migration**: `npm run prisma:migrate:dev`
3. **Use Prisma Client**: Import and use in your code

Example:

```typescript
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Create
const user = await prisma.user.create({
  data: { name: "John", email: "john@example.com" },
});

// Read
const users = await prisma.user.findMany();

// Update
const updated = await prisma.user.update({
  where: { id: 1 },
  data: { name: "Jane" },
});

// Delete
await prisma.user.delete({ where: { id: 1 } });
```

---

## 📖 Resources

- [Prisma Docs](https://pris.ly/d/prisma-schema)
- [MySQL Guide](https://pris.ly/d/mysql)
- [Docker Compose Docs](https://docs.docker.com/compose/)
- [Prisma Studio](https://pris.ly/d/prisma-studio)

Happy coding! 🎉
