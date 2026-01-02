const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const coverRoutes = require('./routes/covers');
const imageRoutes = require('./routes/images');

const app = express();
const PORT = process.env.PORT || 3001;

// Crear directorios necesarios
const uploadsDir = path.join(__dirname, 'uploads');
const coversDir = path.join(uploadsDir, 'covers');
const postersDir = path.join(uploadsDir, 'posters');

[uploadsDir, coversDir, postersDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(uploadsDir));

// Rutas API
app.use('/api/covers', coverRoutes);
app.use('/api/images', imageRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Servir archivos estáticos del frontend en producción
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'public')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});

