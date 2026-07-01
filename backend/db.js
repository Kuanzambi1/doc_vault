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

  // Departamentos
  await db.query(`
    CREATE TABLE IF NOT EXISTS departamentos (
      id INT AUTO_INCREMENT PRIMARY KEY,
      nome VARCHAR(255) NOT NULL UNIQUE,
      criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `)

  // Inserir departamentos iniciais
  const [deps] = await db.query('SELECT COUNT(*) as count FROM departamentos')
  if (deps[0].count === 0) {
    await db.query(`
      INSERT INTO departamentos (nome) VALUES 
      ('Geral'),
      ('Administração e Finanças'),
      ('TI'),
      ('Marketing'),
      ('Análise e Relatórios Research'),
      ('Design')
    `)
  } else {
    // Garantir que "Geral" existe caso a BD já esteja criada
    const [[g]] = await db.query("SELECT id FROM departamentos WHERE nome = 'Geral'")
    if (!g) {
      await db.query("INSERT INTO departamentos (nome) VALUES ('Geral')")
    }
    // Garantir que "Design" existe
    const [[d]] = await db.query("SELECT id FROM departamentos WHERE nome = 'Design'")
    if (!d) {
      await db.query("INSERT INTO departamentos (nome) VALUES ('Design')")
    }
  }

  // Colunas de partilha e departamento
  try { await db.query(`ALTER TABLE documentos ADD COLUMN token_partilha VARCHAR(36) NULL DEFAULT NULL`) } catch(_){}
  try { await db.query(`ALTER TABLE pastas     ADD COLUMN token_partilha VARCHAR(36) NULL DEFAULT NULL`) } catch(_){}
  try {
    await db.query(`ALTER TABLE utilizadores ADD COLUMN departamento_id INT NULL DEFAULT NULL`)
    await db.query(`ALTER TABLE utilizadores ADD CONSTRAINT fk_user_dep FOREIGN KEY (departamento_id) REFERENCES departamentos(id) ON DELETE SET NULL`)
  } catch(_) {}

  // Partilha de pastas com departamentos
  await db.query(`
    CREATE TABLE IF NOT EXISTS pasta_departamentos (
      pasta_id INT NOT NULL,
      departamento_id INT NOT NULL,
      PRIMARY KEY (pasta_id, departamento_id),
      FOREIGN KEY (pasta_id) REFERENCES pastas(id) ON DELETE CASCADE,
      FOREIGN KEY (departamento_id) REFERENCES departamentos(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `)

  // Partilha de documentos com departamentos
  await db.query(`
    CREATE TABLE IF NOT EXISTS documento_departamentos (
      documento_id INT NOT NULL,
      departamento_id INT NOT NULL,
      PRIMARY KEY (documento_id, departamento_id),
      FOREIGN KEY (documento_id) REFERENCES documentos(id) ON DELETE CASCADE,
      FOREIGN KEY (departamento_id) REFERENCES departamentos(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `)

  // Associação utilizadores <-> departamentos (múltiplos)
  await db.query(`
    CREATE TABLE IF NOT EXISTS utilizador_departamentos (
      utilizador_id INT NOT NULL,
      departamento_id INT NOT NULL,
      PRIMARY KEY (utilizador_id, departamento_id),
      FOREIGN KEY (utilizador_id) REFERENCES utilizadores(id) ON DELETE CASCADE,
      FOREIGN KEY (departamento_id) REFERENCES departamentos(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `)

  // Migrar dados antigos de utilizadores.departamento_id para a nova tabela
  try {
    const [users] = await db.query('SELECT id, departamento_id FROM utilizadores WHERE departamento_id IS NOT NULL')
    for (const u of users) {
      await db.query('INSERT IGNORE INTO utilizador_departamentos (utilizador_id, departamento_id) VALUES (?, ?)', [u.id, u.departamento_id])
    }
  } catch (err) {
    console.error('Erro na migração de utilizador_departamentos:', err)
  }

  console.log('✅  Base de dados pronta')
}

module.exports = { getPool, initDB }
