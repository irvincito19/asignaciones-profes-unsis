# Agents.md – Plan de Implementación Completo

## Aplicación Web de Asignación de Profesores – UNSIS

**Objetivo**: Desarrollar una aplicación web responsive que permita consultar la asignación de profesores a materias para **todas las carreras** (LCB, LM, LO, LE, LN, LCE, LI, LAP, LGDM, LAM, DEP) utilizando SvelteKit, Tailwind CSS, SQLite y Docker.

---

## 1. Requisitos Generales

- **Frontend**: SvelteKit (adaptador Node) con Tailwind CSS.
- **Backend**: SvelteKit endpoints para servir datos desde SQLite.
- **Base de datos**: SQLite con `better-sqlite3`.
- **Migración de datos**: Script en Node.js que lea el archivo Excel (`xlsx`) y cargue todas las asignaciones.
- **Contenedor**: Docker con `docker-compose`.
- **Interfaz**: Mobile‑first, con navegación por carreras, lista de profesores y detalles de materias.

---

## 2. Diseño de la Base de Datos

El esquema cubre todas las carreras y permite consultas flexibles.

```sql
-- Tabla de carreras (opcional, pero útil)
CREATE TABLE carreras (
    sigla TEXT PRIMARY KEY,
    nombre TEXT
);

-- Profesores (incluye adscripción, horario, estado)
CREATE TABLE profesores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre_completo TEXT NOT NULL,
    adscripcion TEXT,          -- sigla de su adscripción (ej. LI)
    horario_laboral TEXT,
    status TEXT,
    reincorporacion TEXT,
    observaciones TEXT
);

-- Materias
CREATE TABLE materias (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    clave TEXT NOT NULL,               -- ej. "116-A"
    nombre TEXT NOT NULL,
    horas_semana REAL,
    carrera TEXT NOT NULL,             -- sigla de la carrera
    semestre INTEGER,
    grupo TEXT,
    requiere_laboratorio BOOLEAN DEFAULT 0,
    observaciones TEXT,
    FOREIGN KEY (carrera) REFERENCES carreras(sigla)
);

-- Asignaciones (relación muchos a muchos)
CREATE TABLE asignaciones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    profesor_id INTEGER NOT NULL,
    materia_id INTEGER NOT NULL,
    FOREIGN KEY (profesor_id) REFERENCES profesores(id) ON DELETE CASCADE,
    FOREIGN KEY (materia_id) REFERENCES materias(id) ON DELETE CASCADE
);

-- Índices
CREATE INDEX idx_asignaciones_profesor ON asignaciones(profesor_id);
CREATE INDEX idx_asignaciones_materia ON asignaciones(materia_id);
CREATE INDEX idx_materias_carrera ON materias(carrera);