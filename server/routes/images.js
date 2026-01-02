const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');
const db = require('../database');

const router = express.Router();

// Configurar multer para imágenes de posters
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const tempDir = path.join(__dirname, '../uploads/temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    cb(null, tempDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos de imagen'));
    }
  },
  limits: { fileSize: 500 * 1024 * 1024 } // 500MB - límite muy alto
});

// Generar poster combinando cover e imagen
router.post('/generate', upload.single('image'), async (req, res) => {
  try {
    const { coverId, name, positionX, positionY, scale } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: 'Se requiere una imagen' });
    }

    if (!coverId || !name) {
      return res.status(400).json({ error: 'Se requieren coverId y name' });
    }

    // Obtener la cover
    db.get('SELECT * FROM covers WHERE id = ?', [coverId], async (err, cover) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (!cover) {
        return res.status(404).json({ error: 'Cover no encontrada' });
      }

      try {
        const coverPath = path.join(__dirname, '..', cover.image_path);
        const imagePath = req.file.path;
        const posterId = uuidv4();
        const posterFilename = `${posterId}.png`;
        const posterPath = path.join(__dirname, '../uploads/posters', posterFilename);

        // Crear directorio de posters si no existe
        const postersDir = path.join(__dirname, '../uploads/posters');
        if (!fs.existsSync(postersDir)) {
          fs.mkdirSync(postersDir, { recursive: true });
        }

        // Obtener dimensiones de la cover
        const coverMetadata = await sharp(coverPath).metadata();
        const coverWidth = coverMetadata.width;
        const coverHeight = coverMetadata.height;

        // Procesar la imagen del usuario
        const imageMetadata = await sharp(imagePath).metadata();
        const imageWidth = imageMetadata.width;
        const imageHeight = imageMetadata.height;

        // Calcular dimensiones escaladas
        const scaleValue = parseFloat(scale || 1);
        const scaledWidth = Math.round(imageWidth * scaleValue);
        const scaledHeight = Math.round(imageHeight * scaleValue);

        // Calcular posición
        let posX = parseFloat(positionX || 0);
        let posY = parseFloat(positionY || 0);

        // Procesar la imagen del usuario (poster) con el tamaño y escala correctos
        // Escalar manteniendo la relación de aspecto, pero permitiendo que se ajuste al tamaño especificado
        const scaledImageBuffer = await sharp(imagePath)
          .resize(scaledWidth, scaledHeight, {
            fit: 'contain',
            background: { r: 0, g: 0, b: 0, alpha: 0 }
          })
          .toBuffer();

        // Obtener las dimensiones reales de la imagen escalada (puede ser menor si mantiene relación de aspecto)
        const scaledImageMetadata = await sharp(scaledImageBuffer).metadata();
        const finalScaledWidth = scaledImageMetadata.width;
        const finalScaledHeight = scaledImageMetadata.height;

        // Asegurarse de que las posiciones no sean negativas
        // Si la posición es negativa o la imagen se sale, ajustarla
        let finalPosX = Math.round(posX);
        let finalPosY = Math.round(posY);
        
        // Asegurar que la imagen no se salga por la izquierda o arriba
        if (finalPosX < 0) finalPosX = 0;
        if (finalPosY < 0) finalPosY = 0;
        
        // Asegurar que la imagen no se salga por la derecha o abajo
        if (finalPosX + finalScaledWidth > coverWidth) {
          finalPosX = Math.max(0, coverWidth - finalScaledWidth);
        }
        if (finalPosY + finalScaledHeight > coverHeight) {
          finalPosY = Math.max(0, coverHeight - finalScaledHeight);
        }

        // Crear el poster: primero la imagen del usuario como base, luego superponer el cover encima
        // Esto hace que el poster quede debajo del cover y se vea a través de las transparencias del PNG
        await sharp({
          create: {
            width: coverWidth,
            height: coverHeight,
            channels: 4,
            background: { r: 0, g: 0, b: 0, alpha: 0 }
          }
        })
          .composite([
            {
              input: scaledImageBuffer,
              left: finalPosX,
              top: finalPosY,
              blend: 'over'
            },
            {
              input: coverPath,
              left: 0,
              top: 0,
              blend: 'over'
            }
          ])
          .png()
          .toFile(posterPath);

        // Guardar en la base de datos
        const posterDbPath = `/uploads/posters/${posterFilename}`;
        db.run(
          'INSERT INTO posters (id, name, cover_id, image_path, position_x, position_y, scale) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [posterId, name, coverId, posterDbPath, finalPosX, finalPosY, scaleValue],
          function(err) {
            // Eliminar archivo temporal
            if (fs.existsSync(imagePath)) {
              fs.unlinkSync(imagePath);
            }

            if (err) {
              return res.status(500).json({ error: err.message });
            }

            res.json({
              id: posterId,
              name,
              cover_id: coverId,
              image_path: posterDbPath,
              position_x: finalPosX,
              position_y: finalPosY,
              scale: scaleValue,
              created_at: new Date().toISOString()
            });
          }
        );
      } catch (error) {
        // Eliminar archivo temporal en caso de error
        if (req.file && req.file.path && fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
        console.error('Error generando poster:', error);
        res.status(500).json({ error: error.message || 'Error al generar el poster' });
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener todos los posters
router.get('/', (req, res) => {
  db.all('SELECT * FROM posters ORDER BY created_at DESC', (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// Obtener un poster por ID
router.get('/:id', (req, res) => {
  const { id } = req.params;
  db.get('SELECT * FROM posters WHERE id = ?', [id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!row) {
      return res.status(404).json({ error: 'Poster no encontrado' });
    }
    res.json(row);
  });
});

// Eliminar un poster
router.delete('/:id', (req, res) => {
  const { id } = req.params;

  db.get('SELECT image_path FROM posters WHERE id = ?', [id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!row) {
      return res.status(404).json({ error: 'Poster no encontrado' });
    }

    const imagePath = path.join(__dirname, '..', row.image_path);
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    }

    db.run('DELETE FROM posters WHERE id = ?', [id], function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ message: 'Poster eliminado correctamente' });
    });
  });
});

module.exports = router;

