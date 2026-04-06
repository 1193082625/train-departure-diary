/**
 * JWT 认证配置
 */

export const JWT_SECRET = process.env.JWT_SECRET || 'train-departure-diary-secret-key-2024'
export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d'
