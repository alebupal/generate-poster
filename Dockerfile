# Build stage para el frontend
FROM node:18-alpine AS frontend-builder

WORKDIR /app/client

COPY client/package*.json ./
RUN npm install

COPY client/ ./
RUN npm run build

# Production stage
FROM node:18-slim

WORKDIR /app

# Instalar dependencias para compilación si fallan los prebuilds (opcional pero recomendado para sharp/sqlite3 en algunos entornos)
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

# Instalar dependencias del servidor
COPY server/package*.json ./
RUN npm install --production

# Copiar código del servidor
COPY server/ ./

# Copiar build del frontend
COPY --from=frontend-builder /app/client/dist ./public

# Crear directorios necesarios
RUN mkdir -p uploads/covers uploads/posters uploads/temp

# Exponer puerto
EXPOSE 3001

# Comando para iniciar el servidor
CMD ["node", "index.js"]

