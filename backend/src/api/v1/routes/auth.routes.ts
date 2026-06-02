import { Router, Request, Response } from 'express';
import { userService } from '../../../services/auth/userService';
import { jwtService } from '../../../services/auth/jwtService';
import { passwordService } from '../../../services/auth/passwordService';
import { googleOAuthService } from '../../../services/auth/googleOAuthService';
import { requireAuth, AuthRequest } from '../middleware/auth.middleware';

export const authRoutes: Router = Router();

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

/**
 * POST /api/v1/auth/signup
 * Register with email + password
 */
authRoutes.post('/signup', async (req: Request, res: Response): Promise<void> => {
  const { email, name, password } = req.body;

  if (!email || !name || !password) {
    res.status(400).json({ success: false, error: { message: 'email, name and password are required' } });
    return;
  }

  if (password.length < 8) {
    res.status(400).json({ success: false, error: { message: 'Password must be at least 8 characters' } });
    return;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    res.status(400).json({ success: false, error: { message: 'Invalid email address' } });
    return;
  }

  const existing = await userService.findByEmail(email);
  if (existing) {
    res.status(409).json({ success: false, error: { message: 'Email already registered' } });
    return;
  }

  try {
    const hash = await passwordService.hash(password);
    const user = await userService.createWithPassword(email.toLowerCase().trim(), name.trim(), hash);
    const token = jwtService.sign({ userId: user.id, email: user.email });

    res.status(201).json({
      success: true,
      data: { token, user: userService.toPublic(user) },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: 'Failed to create user' } });
  }
});

/**
 * POST /api/v1/auth/login
 * Login with email + password
 */
authRoutes.post('/login', async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ success: false, error: { message: 'email and password are required' } });
    return;
  }

  const user = await userService.findByEmail(email.toLowerCase().trim());
  if (!user || !user.password_hash) {
    res.status(401).json({ success: false, error: { message: 'Invalid email or password' } });
    return;
  }

  try {
    const valid = await passwordService.compare(password, user.password_hash);
    if (!valid) {
      res.status(401).json({ success: false, error: { message: 'Invalid email or password' } });
      return;
    }

    const token = jwtService.sign({ userId: user.id, email: user.email });
    res.json({
      success: true,
      data: { token, user: userService.toPublic(user) },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: 'Login failed' } });
  }
});

/**
 * GET /api/v1/auth/google
 * Redirect to Google OAuth consent screen
 */
authRoutes.get('/google', (_req: Request, res: Response): void => {
  const url = googleOAuthService.getAuthUrl();
  res.redirect(url);
});

/**
 * GET /api/v1/auth/google/callback
 * Handle Google OAuth callback
 */
authRoutes.get('/google/callback', async (req: Request, res: Response): Promise<void> => {
  const { code, error } = req.query;

  if (error || !code) {
    res.redirect(`${FRONTEND_URL}/login?error=oauth_denied`);
    return;
  }

  try {
    const googleUser = await googleOAuthService.getUserInfo(code as string);

    // Find by Google ID first
    let user = await userService.findByGoogleId(googleUser.googleId);

    if (!user) {
      // Check if email already exists (link accounts)
      const existing = await userService.findByEmail(googleUser.email);
      if (existing) {
        await userService.updateGoogleId(existing.id, googleUser.googleId, googleUser.avatarUrl);
        user = await userService.findById(existing.id);
      } else {
        user = await userService.createWithGoogle(
          googleUser.googleId,
          googleUser.email,
          googleUser.name,
          googleUser.avatarUrl
        );
      }
    }

    if (!user) {
      res.redirect(`${FRONTEND_URL}/login?error=oauth_failed`);
      return;
    }

    const token = jwtService.sign({ userId: user.id, email: user.email });
    res.redirect(`${FRONTEND_URL}/auth/callback?token=${encodeURIComponent(token)}`);
  } catch (err) {
    console.error('Google OAuth error:', err);
    res.redirect(`${FRONTEND_URL}/login?error=oauth_failed`);
  }
});

/**
 * GET /api/v1/auth/me
 * Get current authenticated user
 */
authRoutes.get('/me', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const user = await userService.findById(req.user!.id);
  if (!user) {
    res.status(404).json({ success: false, error: { message: 'User not found' } });
    return;
  }
  res.json({ success: true, data: { user: userService.toPublic(user) } });
});
