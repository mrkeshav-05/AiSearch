import { OAuth2Client } from 'google-auth-library';

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:8000/api/v1/auth/google/callback';

const oauthClient = new OAuth2Client(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

export interface GoogleUserInfo {
  googleId: string;
  email: string;
  name: string;
  avatarUrl: string | null;
}

export const googleOAuthService = {
  getAuthUrl(): string {
    return oauthClient.generateAuthUrl({
      access_type: 'offline',
      scope: ['profile', 'email'],
      prompt: 'select_account',
    });
  },

  async getUserInfo(code: string): Promise<GoogleUserInfo> {
    const { tokens } = await oauthClient.getToken(code);
    oauthClient.setCredentials(tokens);

    const ticket = await oauthClient.verifyIdToken({
      idToken: tokens.id_token!,
      audience: CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload) {
      throw new Error('Failed to get Google user payload');
    }

    return {
      googleId: payload.sub,
      email: payload.email!,
      name: payload.name || payload.email!,
      avatarUrl: payload.picture || null,
    };
  },
};
