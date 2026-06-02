import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;

export const passwordService = {
  async hash(plaintext: string): Promise<string> {
    return bcrypt.hash(plaintext, SALT_ROUNDS);
  },

  async compare(plaintext: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plaintext, hash);
  },
};
