/**
 * JWT 认证配置
 */

export const JWT_SECRET = process.env.JWT_SECRET || 'train-departure-diary-secret-key-2024'
export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d'

/**
 * 认证配置
 * 控制 JWT 鉴权和 userId 参数查询的开关
 */
export const AUTH_CONFIG = {
  // 是否强制 JWT 鉴权
  // - true: 所有请求必须携带有效 JWT
  // - false: JWT 可选，有则解析，无则通过 userId 参数或匿名处理
  enforceJwtAuth: process.env.ENFORCE_JWT_AUTH === 'true',

  // 允许通过 userId 参数查询（enforceJwtAuth=false 时生效）
  allowUserIdQuery: true
}
