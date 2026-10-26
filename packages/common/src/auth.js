import jwt from 'jsonwebtoken';

const secret = () => process.env.JWT_SECRET || 'change-me-in-production';

export function signToken(user) {
  return jwt.sign(
    { sub: String(user._id || user.id), email: user.email, name: user.name, role: user.role },
    secret(),
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' },
  );
}

export function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ message: 'Missing token' });
  try {
    req.user = jwt.verify(token, secret());
    next();
  } catch {
    res.status(401).json({ message: 'Invalid or expired token' });
  }
}

export const requireRole =
  (...roles) =>
  (req, res, next) =>
    roles.includes(req.user?.role) ? next() : res.status(403).json({ message: 'Forbidden' });
