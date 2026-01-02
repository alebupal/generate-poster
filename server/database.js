const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

// Inicializar tablas
db.serialize(() => {
  // Tabla de covers
  db.run(`
    CREATE TABLE IF NOT EXISTS covers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      visible INTEGER DEFAULT 1,
      image_path TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Tabla de posters generados
  db.run(`
    CREATE TABLE IF NOT EXISTS posters (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      cover_id TEXT NOT NULL,
      image_path TEXT NOT NULL,
      position_x REAL DEFAULT 0,
      position_y REAL DEFAULT 0,
      scale REAL DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (cover_id) REFERENCES covers(id)
    )
  `);
});

module.exports = db;

