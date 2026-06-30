const mysql = require('mysql2/promise')

let pool

async function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host:     process.env.DB_HOST     || 'localhost',
      port:     parseInt(process.env.DB_PORT) || 3306,
      user:     process.env.DB_USER     || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME     || 'docvault',
      waitForConnections: true,
      connectionLimit: 10,
    })
  }
  return pool
}

async function initDB() {
  const db = await getPool()

  // Utilizadores
  await db.query(`
    CREATE TABLE IF NOT EXISTS utilizadores (
      id           INT          AUTO_INCREMENT PRIMARY KEY,
      uuid         VARCHAR(36)  NOT NULL UNIQUE,
      nome         VARCHAR(120) NOT NULL,
      email        VARCHAR(255) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      role         ENUM('admin','user') DEFAULT 'user',
      ativo        TINYINT(1)   DEFAULT 1,
      criado_em    DATETIME     DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `)

  // Pastas — pai_id NULL = raiz
  await db.query(`
    CREATE TABLE IF NOT EXISTS pastas (
      id        INT          AUTO_INCREMENT PRIMARY KEY,
      uuid      VARCHAR(36)  NOT NULL UNIQUE,
      nome      VARCHAR(255) NOT NULL,
      pai_id    INT          DEFAULT NULL,
      dono_id   INT          NOT NULL,
      criado_em DATETIME     DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (pai_id)  REFERENCES pastas(id) ON DELETE CASCADE,
      FOREIGN KEY (dono_id) REFERENCES utilizadores(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `)

  // Documentos
  await db.query(`
    CREATE TABLE IF NOT EXISTS documentos (
      id            INT          AUTO_INCREMENT PRIMARY KEY,
      uuid          VARCHAR(36)  NOT NULL UNIQUE,
      nome_original VARCHAR(255) NOT NULL,
      nome_arquivo  VARCHAR(255) NOT NULL,
      tipo_mime     VARCHAR(100),
      tamanho_bytes BIGINT,
      extensao      VARCHAR(20),
      pasta_id      INT          DEFAULT NULL,
      dono_id       INT          NOT NULL,
      criado_em     DATETIME     DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (pasta_id) REFERENCES pastas(id) ON DELETE SET NULL,
      FOREIGN KEY (dono_id)  REFERENCES utilizadores(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `)

  // Colunas de partilha (adicionar se não existirem)
  try { await db.query(`ALTER TABLE documentos ADD COLUMN token_partilha VARCHAR(36) NULL DEFAULT NULL`) } catch(_){}
  try { await db.query(`ALTER TABLE pastas     ADD COLUMN token_partilha VARCHAR(36) NULL DEFAULT NULL`) } catch(_){}

  console.log('✅  Base de dados pronta')
}

module.exports = { getPool, initDB }
