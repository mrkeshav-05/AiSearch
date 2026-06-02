import { query } from '../../db/database';
import { randomUUID } from 'crypto';

export interface User {
  id: string;
  email: string;
  name: string;
  password_hash: string | null;
  google_id: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface PublicUser {
  id: string;
  email: string;
  name: string;
  avatar_url: string | null;
  created_at: string;
}

export const userService = {
  async findById(id: string): Promise<User | undefined> {
    const { rows } = await query<User>('SELECT * FROM users WHERE id = $1', [id]);
    return rows[0];
  },

  async findByEmail(email: string): Promise<User | undefined> {
    const { rows } = await query<User>('SELECT * FROM users WHERE email = $1', [email]);
    return rows[0];
  },

  async findByGoogleId(googleId: string): Promise<User | undefined> {
    const { rows } = await query<User>('SELECT * FROM users WHERE google_id = $1', [googleId]);
    return rows[0];
  },

  async createWithPassword(email: string, name: string, passwordHash: string): Promise<User> {
    const id = randomUUID();
    const { rows } = await query<User>(
      `INSERT INTO users (id, email, name, password_hash)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [id, email, name, passwordHash]
    );
    return rows[0];
  },

  async createWithGoogle(googleId: string, email: string, name: string, avatarUrl: string | null): Promise<User> {
    const id = randomUUID();
    const { rows } = await query<User>(
      `INSERT INTO users (id, email, name, google_id, avatar_url)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [id, email, name, googleId, avatarUrl]
    );
    return rows[0];
  },

  async updateGoogleId(userId: string, googleId: string, avatarUrl: string | null): Promise<void> {
    await query(
      `UPDATE users SET google_id = $1, avatar_url = $2, updated_at = NOW() WHERE id = $3`,
      [googleId, avatarUrl, userId]
    );
  },

  toPublic(user: User): PublicUser {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      avatar_url: user.avatar_url,
      created_at: user.created_at,
    };
  },
};
