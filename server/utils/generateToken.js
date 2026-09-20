import jwt from 'jsonwebtoken';

/**
 * Generate a signed JWT containing minimal, zero-trust authorized payload
 * @param {Object} user 
 * @returns {string} Signed JWT
 */
export const generateToken = (user) => {
  const secret = process.env.JWT_SECRET || 'nexus_corporate_jwt_secret_fallback_2026';
  const expiresIn = process.env.JWT_EXPIRES_IN || '1d';

  return jwt.sign(
    {
      userId: user._id ? user._id.toString() : user.userId,
      role: user.role || 'client'
    },
    secret,
    { expiresIn }
  );
};
