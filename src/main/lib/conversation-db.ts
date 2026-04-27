import { existsSync, mkdirSync, statSync } from 'fs';
import { join } from 'path';
import Database from 'better-sqlite3';

import { getWorkspaceDir } from './config';

export interface Conversation {
  id: string;
  title: string;
  messages: string; // JSON stringified Message[]
  createdAt: number; // Unix timestamp
  updatedAt: number; // Unix timestamp
  sessionId?: string | null;
  projectPath?: string | null; // Absolute path to project directory
}

// Database instance and workspace tracking
let db: Database.Database | null = null;
let cachedWorkspaceDir: string | null = null;

function getConfigDir(): string {
  const workspaceDir = getWorkspaceDir();
  const configDir = join(workspaceDir, '.claude-sdk');
  if (!existsSync(configDir)) {
    mkdirSync(configDir, { recursive: true });
  }
  return configDir;
}

function getDbPath(): string {
  return join(getConfigDir(), 'conversations.db');
}

function getDb(): Database.Database {
  const workspaceDir = getWorkspaceDir();

  // Close and reopen if workspace changed
  if (cachedWorkspaceDir !== workspaceDir && db) {
    db.close();
    db = null;
  }
  cachedWorkspaceDir = workspaceDir;

  if (!db) {
    const dbPath = getDbPath();
    db = new Database(dbPath);

    // Create table if it doesn't exist
    db.exec(`
      CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        messages TEXT NOT NULL,
        createdAt INTEGER NOT NULL,
        updatedAt INTEGER NOT NULL,
        sessionId TEXT,
        projectPath TEXT
      )
    `);

    // Migration: Add projectPath column if it doesn't exist
    const columns = db.pragma('table_info(conversations)') as Array<{ name: string }>;
    const hasProjectPath = columns.some((col) => col.name === 'projectPath');
    if (!hasProjectPath) {
      db.exec('ALTER TABLE conversations ADD COLUMN projectPath TEXT');
    }

    // Create index for faster sorting by updatedAt
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_conversations_updatedAt
      ON conversations(updatedAt DESC)
    `);

    // Create index for projectPath lookups
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_conversations_projectPath
      ON conversations(projectPath)
    `);
  }

  return db;
}

export function initializeDatabase(): void {
  // Initialize by getting the database (creates it if needed)
  getDb();
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
  cachedWorkspaceDir = null;
}

export interface CreateConversationOptions {
  title?: string;
  messages?: unknown[];
  sessionId?: string | null;
  projectPath?: string | null;
}

export function createConversation(
  titleOrOptions: string | CreateConversationOptions,
  messages?: unknown[],
  sessionId?: string | null,
  projectPath?: string | null
): Conversation {
  // Support both old signature and new options object
  let opts: CreateConversationOptions;
  if (typeof titleOrOptions === 'string') {
    opts = {
      title: titleOrOptions,
      messages: messages ?? [],
      sessionId,
      projectPath
    };
  } else {
    opts = titleOrOptions;
  }

  const database = getDb();
  const id = Date.now().toString();
  const now = Date.now();
  const messagesJson = JSON.stringify(opts.messages ?? []);
  const title = opts.title || 'New Project';

  const stmt = database.prepare(`
    INSERT INTO conversations (id, title, messages, createdAt, updatedAt, sessionId, projectPath)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(id, title, messagesJson, now, now, opts.sessionId ?? null, opts.projectPath ?? null);

  return {
    id,
    title,
    messages: messagesJson,
    createdAt: now,
    updatedAt: now,
    sessionId: opts.sessionId ?? null,
    projectPath: opts.projectPath ?? null
  };
}

export function updateConversation(
  id: string,
  title?: string,
  messages?: unknown[],
  sessionId?: string | null
): void {
  const database = getDb();

  // Get existing conversation to check what changed
  const existing = database.prepare('SELECT * FROM conversations WHERE id = ?').get(id) as
    | Conversation
    | undefined;

  if (!existing) {
    throw new Error(`Conversation ${id} not found`);
  }

  // Determine what to update
  const newTitle = title !== undefined ? title : existing.title;
  const newMessages = messages !== undefined ? JSON.stringify(messages) : existing.messages;
  const newSessionId = sessionId !== undefined ? sessionId : existing.sessionId;

  // Check if anything actually changed
  const messagesChanged = messages !== undefined && existing.messages !== newMessages;
  const titleChanged = title !== undefined && existing.title !== title;
  const sessionIdChanged = sessionId !== undefined && existing.sessionId !== sessionId;

  // Only update timestamp if something changed
  const newUpdatedAt =
    messagesChanged || titleChanged || sessionIdChanged ? Date.now() : existing.updatedAt;

  const stmt = database.prepare(`
    UPDATE conversations
    SET title = ?, messages = ?, updatedAt = ?, sessionId = ?
    WHERE id = ?
  `);

  stmt.run(newTitle, newMessages, newUpdatedAt, newSessionId ?? null, id);
}

export function getConversation(id: string): Conversation | null {
  const database = getDb();

  const row = database.prepare('SELECT * FROM conversations WHERE id = ?').get(id) as
    | Conversation
    | undefined;

  if (!row) {
    return null;
  }

  return {
    id: row.id,
    title: row.title,
    messages: row.messages,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    sessionId: row.sessionId ?? null,
    projectPath: row.projectPath ?? null
  };
}

export function listConversations(limit: number = 100): Conversation[] {
  const database = getDb();

  const rows = database
    .prepare('SELECT * FROM conversations ORDER BY updatedAt DESC LIMIT ?')
    .all(limit) as Conversation[];

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    messages: row.messages,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    sessionId: row.sessionId ?? null,
    projectPath: row.projectPath ?? null
  }));
}

/**
 * Lists unique projects (by projectPath).
 * Returns the most recent conversation for each unique projectPath.
 * This ensures each project appears only once in the list, even if it has multiple conversations.
 */
export function listProjects(limit: number = 100): Conversation[] {
  const database = getDb();

  // Use a subquery to find the most recent conversation for each unique projectPath
  // This prevents duplicate projects when a project has multiple conversations
  const rows = database
    .prepare(
      `
      SELECT c.* FROM conversations c
      INNER JOIN (
        SELECT projectPath, MAX(updatedAt) as maxUpdated
        FROM conversations
        WHERE projectPath IS NOT NULL
        GROUP BY projectPath
      ) grouped ON c.projectPath = grouped.projectPath AND c.updatedAt = grouped.maxUpdated
      ORDER BY c.updatedAt DESC
      LIMIT ?
    `
    )
    .all(limit) as Conversation[];

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    messages: row.messages,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    sessionId: row.sessionId ?? null,
    projectPath: row.projectPath ?? null
  }));
}

/**
 * Gets a conversation by its projectPath.
 * Returns the most recent conversation for that path.
 */
export function getConversationByProjectPath(projectPath: string): Conversation | null {
  const database = getDb();

  const row = database
    .prepare('SELECT * FROM conversations WHERE projectPath = ? ORDER BY updatedAt DESC LIMIT 1')
    .get(projectPath) as Conversation | undefined;

  if (!row) {
    return null;
  }

  return {
    id: row.id,
    title: row.title,
    messages: row.messages,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    sessionId: row.sessionId ?? null,
    projectPath: row.projectPath ?? null
  };
}

/**
 * Lists all conversations for a specific project (by path).
 * Returns conversations sorted by most recently updated.
 * Supports one-to-many relationship between projects and conversations.
 */
export function listConversationsByProject(
  projectPath: string,
  limit: number = 50
): Conversation[] {
  const database = getDb();

  const rows = database
    .prepare('SELECT * FROM conversations WHERE projectPath = ? ORDER BY updatedAt DESC LIMIT ?')
    .all(projectPath, limit) as Conversation[];

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    messages: row.messages,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    sessionId: row.sessionId ?? null,
    projectPath: row.projectPath ?? null
  }));
}

export function deleteConversation(id: string): void {
  const database = getDb();
  database.prepare('DELETE FROM conversations WHERE id = ?').run(id);
}

export function getDatabaseStatus():
  | { connected: boolean; type: 'sqlite'; path: string }
  | { connected: false; type: null; path: null } {
  try {
    const database = getDb();
    // Simple query to verify connection
    database.prepare('SELECT 1').get();
    return {
      connected: true,
      type: 'sqlite',
      path: getDbPath()
    };
  } catch {
    return {
      connected: false,
      type: null,
      path: null
    };
  }
}

export interface DatabaseStats {
  conversationCount: number;
  fileSizeBytes: number;
  oldestConversation: number | null; // Unix timestamp
  newestConversation: number | null; // Unix timestamp
  path: string;
}

export function getDatabaseStats(): DatabaseStats {
  const database = getDb();
  const dbPath = getDbPath();

  // Get conversation count
  const countResult = database.prepare('SELECT COUNT(*) as count FROM conversations').get() as {
    count: number;
  };

  // Get oldest and newest conversation dates
  const dateResult = database
    .prepare(
      `
    SELECT
      MIN(createdAt) as oldest,
      MAX(updatedAt) as newest
    FROM conversations
  `
    )
    .get() as { oldest: number | null; newest: number | null };

  // Get file size
  let fileSizeBytes = 0;
  try {
    const stats = statSync(dbPath);
    fileSizeBytes = stats.size;
  } catch {
    // File might not exist yet
  }

  return {
    conversationCount: countResult.count,
    fileSizeBytes,
    oldestConversation: dateResult.oldest,
    newestConversation: dateResult.newest,
    path: dbPath
  };
}

export function generateTitleFromMessages(messages: unknown[]): string {
  // Find the first user message and use it as the title (truncated)
  for (const msg of messages) {
    if (typeof msg === 'object' && msg !== null && 'role' in msg && msg.role === 'user') {
      let content = '';
      if ('content' in msg && typeof msg.content === 'string') {
        content = msg.content;
      }
      // Truncate to 60 characters
      return content.length > 60 ? content.substring(0, 60) + '...' : content || 'New Chat';
    }
  }
  return 'New Chat';
}
