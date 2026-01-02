# Build stage para el frontend
FROM node:18-alpine AS frontend-builder

WORKDIR /app/client

COPY client/package*.json ./
RUN npm install

COPY client/ ./
RUN npm run build

# Production stage
FROM node:18-alpine

WORKDIR /app

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

