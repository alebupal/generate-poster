# Changelog

Todas las modificaciones notables de este proyecto serán documentadas en este archivo.

## [1.0.2] - 2026-01-02

### Corregido
- Cambiada imagen base de Docker a `node:18-slim` (Debian) para resolver problemas persistentes de compilación de dependencias nativas (`sharp`, `sqlite3`).

## [1.0.1] - 2026-01-02

### Añadido
- Añadido `CHANGELOG.md` para seguimiento de versiones.

### Corregido
- Solucionado error de construcción en Docker instalando dependencias de construcción (`python3`, `make`, `g++`) necesarias para `sqlite3` y `sharp` en Alpine Linux.
