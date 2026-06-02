import { Pool, QueryResult, QueryResultRow } from 'pg';

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://aisearch:aisearch@localhost:5432/aisearch',
});

export const query = <T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> => pool.query<T>(text, params);

const EMBEDDING_DIM = parseInt(process.env.EMBEDDING_DIM || '768', 10);

export const initDB = async (): Promise<void> => {
  // ── pgvector extension ──────────────────────────────────────────────────────
  await pool.query(`CREATE EXTENSION IF NOT EXISTS vector;`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id         TEXT PRIMARY KEY,
      email      TEXT UNIQUE NOT NULL,
      name       TEXT NOT NULL,
      password_hash TEXT,
      google_id  TEXT UNIQUE,
      avatar_url TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_users_email     ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);

    CREATE TABLE IF NOT EXISTS chat_sessions (
      id         TEXT PRIMARY KEY,
      user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title      TEXT NOT NULL DEFAULT 'New chat',
      source     TEXT NOT NULL DEFAULT 'ai' CHECK (source IN ('ai', 'search')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_chat_sessions_user ON chat_sessions(user_id);
    DO $$ BEGIN
      ALTER TABLE chat_sessions ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'ai' CHECK (source IN ('ai', 'search'));
    EXCEPTION WHEN others THEN NULL;
    END $$;

    CREATE TABLE IF NOT EXISTS chat_messages (
      id         TEXT PRIMARY KEY,
      session_id TEXT NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
      role       TEXT NOT NULL CHECK (role IN ('user','assistant')),
      content    TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON chat_messages(session_id);
  `);

  // ── RAG tables ──────────────────────────────────────────────────────────────
  await pool.query(`
    CREATE TABLE IF NOT EXISTS documents (
      id           TEXT PRIMARY KEY,
      user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title        TEXT NOT NULL,
      filename     TEXT NOT NULL,
      file_path    TEXT NOT NULL,
      file_size    BIGINT NOT NULL,
      mime_type    TEXT NOT NULL DEFAULT 'application/pdf',
      status       TEXT NOT NULL DEFAULT 'uploaded'
                   CHECK (status IN ('uploaded','processing','indexed','failed')),
      error_msg    TEXT,
      page_count   INTEGER,
      chunk_count  INTEGER DEFAULT 0,
      metadata     JSONB NOT NULL DEFAULT '{}',
      created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_documents_user   ON documents(user_id);
    CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
  `);

  // Chunks table — embedding column dimension is set at first run from env var.
  // Changing EMBEDDING_DIM requires re-creating chunks (re-index all documents).
  await pool.query(`
    CREATE TABLE IF NOT EXISTS document_chunks (
      id           TEXT PRIMARY KEY,
      document_id  TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
      user_id      TEXT NOT NULL,
      content      TEXT NOT NULL,
      chunk_index  INTEGER NOT NULL,
      page_number  INTEGER,
      token_count  INTEGER,
      metadata     JSONB NOT NULL DEFAULT '{}',
      created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_chunks_document ON document_chunks(document_id);
    CREATE INDEX IF NOT EXISTS idx_chunks_user     ON document_chunks(user_id);
  `);

  // Add embedding column with the configured dimension if it doesn't exist.
  // This is idempotent; it no-ops if the column already exists.
  await pool.query(`
    DO $emb$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'document_chunks' AND column_name = 'embedding'
      ) THEN
        EXECUTE 'ALTER TABLE document_chunks ADD COLUMN embedding vector(${EMBEDDING_DIM})';
        EXECUTE 'CREATE INDEX idx_chunks_embedding ON document_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100)';
      END IF;
    END $emb$;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS rag_sessions (
      id           TEXT PRIMARY KEY,
      user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title        TEXT NOT NULL DEFAULT 'New conversation',
      document_ids TEXT[] NOT NULL DEFAULT '{}',
      created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_rag_sessions_user ON rag_sessions(user_id);

    CREATE TABLE IF NOT EXISTS rag_messages (
      id           TEXT PRIMARY KEY,
      session_id   TEXT NOT NULL REFERENCES rag_sessions(id) ON DELETE CASCADE,
      role         TEXT NOT NULL CHECK (role IN ('user','assistant')),
      content      TEXT NOT NULL,
      citations    JSONB NOT NULL DEFAULT '[]',
      created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_rag_messages_session ON rag_messages(session_id);
  `);

  console.log(`Database schema ready (embedding dim: ${EMBEDDING_DIM})`);
};

export default pool;
