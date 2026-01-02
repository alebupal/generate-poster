const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const db = require('../database');

const router = express.Router();

// Configurar multer para covers
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const coversDir = path.join(__dirname, '../uploads/covers');
    if (!fs.existsSync(coversDir)) {
      fs.mkdirSync(coversDir, { recursive: true });
    }
    cb(null, coversDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'image/png') {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos PNG'));
    }
  },
  limits: { fileSize: 500 * 1024 * 1024 } // 500MB - límite muy alto
});

// Middleware para manejar errores de multer
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'El archivo es demasiado grande. Máximo 500MB' });
    }
    return res.status(400).json({ error: `Error al subir el archivo: ${err.message}` });
  }
  if (err) {
    return res.status(400).json({ error: err.message });
  }
  next();
};

// Obtener todas las covers
router.get('/', (req, res) => {
  db.all('SELECT * FROM covers ORDER BY created_at DESC', (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// Obtener covers visibles
router.get('/visible', (req, res) => {
  db.all('SELECT * FROM covers WHERE visible = 1 ORDER BY created_at DESC', (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// Obtener una cover por ID
router.get('/:id', (req, res) => {
  const { id } = req.params;
  db.get('SELECT * FROM covers WHERE id = ?', [id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!row) {
      return res.status(404).json({ error: 'Cover no encontrada' });
    }
    res.json(row);
  });
});

// Crear una nueva cover
router.post('/', (req, res) => {
  upload.single('image')(req, res, (err) => {
    // Manejar errores de multer
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: 'El archivo es demasiado grande. Máximo 10MB' });
        }
        return res.status(400).json({ error: `Error al subir el archivo: ${err.message}` });
      }
      return res.status(400).json({ error: err.message });
    }

    try {
      const { name, visible } = req.body;
      
      if (!req.file) {
        return res.status(400).json({ error: 'Se requiere una imagen' });
      }

      if (!name || name.trim() === '') {
        // Si hay un archivo pero falta el nombre, eliminar el archivo subido
        if (req.file && req.file.path) {
          try {
            fs.unlinkSync(req.file.path);
          } catch (unlinkErr) {
            console.error('Error eliminando archivo:', unlinkErr);
          }
        }
        return res.status(400).json({ error: 'Se requiere un nombre' });
      }

      const id = uuidv4();
      const imagePath = `/uploads/covers/${req.file.filename}`;

      // Normalizar el valor de visible
      let visibleValue = 0;
      if (visible === 'true' || visible === true || visible === '1' || visible === 1) {
        visibleValue = 1;
      }

      db.run(
        'INSERT INTO covers (id, name, visible, image_path) VALUES (?, ?, ?, ?)',
        [id, name.trim(), visibleValue, imagePath],
        function(err) {
          if (err) {
            // Si hay error en la BD, eliminar el archivo subido
            if (req.file && req.file.path) {
              try {
                fs.unlinkSync(req.file.path);
              } catch (unlinkErr) {
                console.error('Error eliminando archivo:', unlinkErr);
              }
            }
            return res.status(500).json({ error: err.message });
          }
          res.json({
            id,
            name: name.trim(),
            visible: visibleValue,
            image_path: imagePath,
            created_at: new Date().toISOString()
          });
        }
      );
    } catch (error) {
      // Si hay un error, eliminar el archivo subido si existe
      if (req.file && req.file.path) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (unlinkErr) {
          console.error('Error eliminando archivo:', unlinkErr);
        }
      }
      res.status(500).json({ error: error.message });
    }
  });
});

// Actualizar una cover
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { name, visible } = req.body;

  db.run(
    'UPDATE covers SET name = ?, visible = ? WHERE id = ?',
    [name, visible === 'true' || visible === true ? 1 : 0, id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Cover no encontrada' });
      }
      db.get('SELECT * FROM covers WHERE id = ?', [id], (err, row) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        res.json(row);
      });
    }
  );
});

// Eliminar una cover
router.delete('/:id', (req, res) => {
  const { id } = req.params;

  // Primero obtener la ruta de la imagen para eliminarla
  db.get('SELECT image_path FROM covers WHERE id = ?', [id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!row) {
      return res.status(404).json({ error: 'Cover no encontrada' });
    }

    // Eliminar el archivo
    const imagePath = path.join(__dirname, '..', row.image_path);
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    }

    // Eliminar de la base de datos
    db.run('DELETE FROM covers WHERE id = ?', [id], function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ message: 'Cover eliminada correctamente' });
    });
  });
});

module.exports = router;

