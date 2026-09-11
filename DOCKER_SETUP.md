# 🐳 Docker + Prisma 7 Setup Guide

## 📋 Prerequisites

- Docker Desktop installed and running
- Node.js 20+
- npm/pnpm

## 🚀 Quick Start

### 1. Start MySQL Docker Container

```bash
# Start all services (MySQL)
docker-compose up -d

# Check if services are running
docker-compose ps

# View logs
docker-compose logs -f mysql
```

### 2. Verify MySQL Connection

```bash
# Test with mysql CLI
docker exec -it moph-notify-mysql mysql -u root -proot123 -e "SELECT DATABASE();"

# Or access MySQL directly
docker exec -it moph-notify-mysql mysql -u root -proot123
```

### 3. Setup Prisma

```bash
# Generate Prisma Client
npm run prisma:generate

# Create initial migration (if schema changed)
npm run prisma:migrate:dev

# Push schema to database
npm run prisma:push

# View database in Prisma Studio
npm run prisma:studio
```

## 📦 Database Information

| Item          | Value               |
| ------------- | ------------------- |
| **Host**      | localhost           |
| **Port**      | 3306                |
| **Root User** | root                |
| **Password**  | root123             |
| **Database**  | moph_notify_aranhos |
| **Network**   | moph-network        |
| **Container** | moph-notify-mysql   |

## 🛠️ Useful Commands

```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# Remove volumes (reset database)
docker-compose down -v

# View logs
docker-compose logs -f mysql

# Execute MySQL command
docker exec -it moph-notify-mysql mysql -u root -proot123 moph_notify_aranhos

# Prisma commands
npm run prisma:generate    # Generate Prisma Client
npm run prisma:migrate:dev # Create and run migration
npm run prisma:push        # Push schema changes
npm run prisma:studio      # Open Prisma Studio (GUI)
npm run prisma:reset       # Reset database
```

## 📄 Environment Variables

### .env.local (Local Development)

```env
DATABASE_URL=mysql://root:root123@localhost:3306/moph_notify_aranhos
HOS_DB_HOST=localhost
```

## ⚠️ Important Notes

1. **Local Development Only**: Use `.env.local` for Docker, `.env` for production
2. **Database Persistence**: MySQL data is stored in Docker volume `mysql_data`
3. **Reset Database**: `docker-compose down -v` removes all data
4. **Port Conflicts**: If port 3306 is in use, change port mapping in `docker-compose.yml`

## 🐛 Troubleshooting

### Connection Refused

```bash
# Check if MySQL is running
docker-compose ps

# Restart MySQL
docker-compose restart mysql

# Check logs
docker-compose logs mysql
```

### Migration Issues

```bash
# Reset everything
docker-compose down -v
docker-compose up -d

# Re-run migrations
npm run prisma:migrate:dev
```

### phpMyAdmin Won't Connect

- Wait 10-15 seconds for MySQL to be ready
- Check MySQL logs: `docker-compose logs mysql`
- Refresh browser page

## 📚 References

- [Prisma Documentation](https://pris.ly/d/prisma-schema)
- [Prisma MySQL Guide](https://pris.ly/d/mysql)
- [Docker Compose Docs](https://docs.docker.com/compose/)
