export const jwtConfig = {
  secret: process.env.JWT_SECRET || 'AERTYPERTRTUFIDMMF',
  expiresIn: process.env.JET_EXPIRES_IN || '18h',
};
