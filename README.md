# Generate Poster

Web app dockerizada para generar posters ajustando imágenes dentro de covers personalizadas.

## Características

- **Gestión de Covers**: Añade covers personalizadas (4K, 2K, 1080p, etc.) con nombre, visibilidad e imagen PNG
- **Generador de Posters**: Selecciona una cover, sube una imagen y ajústala con el ratón o las flechas del teclado
- **Controles de Ajuste**: 
  - Arrastra la imagen con el ratón
  - Usa las flechas del teclado para mover (Shift para pasos más grandes)
  - Usa + y - para escalar (Shift para pasos más grandes)
- **Guardado**: Guarda los posters generados con un nombre personalizado

## Tecnologías

- **Backend**: Node.js + Express
- **Frontend**: React + Vite
- **Base de Datos**: SQLite
- **Procesamiento de Imágenes**: Sharp
- **Docker**: Dockerizado y listo para producción

## Instalación y Uso

### Desarrollo Local

1. Instalar dependencias:
```bash
npm install
cd server && npm install
cd ../client && npm install
```

2. Iniciar en modo desarrollo:
```bash
npm run dev
```

El servidor estará en `http://localhost:3001` y el cliente en `http://localhost:3000`

### Docker (CLI)

También puedes usar la imagen directamente:

```bash
docker create \
  --name=generate-poster \
  -v /ruta/a/data/database.sqlite:/app/database.sqlite \
  -v /ruta/a/uploads:/app/uploads \
  -p 3001:3001 \
  -e TZ=Europe/Madrid \
  alebupal/generate-poster:latest
```

### Docker Compose

1. Construir y ejecutar:
```bash
docker-compose up --build
```

2. Acceder a la aplicación:
```
http://localhost:3001
```

## Estructura del Proyecto

```
generate-poster/
├── server/           # Backend Express
│   ├── routes/       # Rutas API
│   ├── uploads/      # Archivos subidos
│   └── index.js      # Servidor principal
├── client/           # Frontend React
│   ├── src/
│   │   ├── components/
│   │   └── App.jsx
│   └── package.json
├── Dockerfile
└── docker-compose.yml
```

## API Endpoints

### Covers
- `GET /api/covers` - Obtener todas las covers
- `GET /api/covers/visible` - Obtener covers visibles
- `GET /api/covers/:id` - Obtener una cover
- `POST /api/covers` - Crear una cover
- `PUT /api/covers/:id` - Actualizar una cover
- `DELETE /api/covers/:id` - Eliminar una cover

### Posters
- `GET /api/images` - Obtener todos los posters
- `GET /api/images/:id` - Obtener un poster
- `POST /api/images/generate` - Generar un poster
- `DELETE /api/images/:id` - Eliminar un poster

Cursor y Antigravity