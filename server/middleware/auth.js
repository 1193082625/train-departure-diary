/**
 * JWT 认证中间件
 */

import jwt from 'jsonwebtoken'
import { JWT_SECRET, JWT_EXPIRES_IN, AUTH_CONFIG } from '../config/auth.js'

/**
 * 生成 JWT token
 * @param {Object} user - 用户对象
 * @returns {string} JWT token
 */
export const generateToken = (user) => {
  const payload = {
    userId: user.id,
    role: user.role,
    phone: user.phone
  }
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN })
}

/**
 * 验证 JWT token
 * @param {string} token - JWT token
 * @returns {Object|null} 解码后的 payload 或 null
 */
export const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET)
  } catch (err) {
    return null
  }
}

/**
 * JWT 认证中间件
 * 从 Authorization: Bearer <token> 头提取并验证 token
 * 验证成功后将用户信息挂载到 req.user
 */
export const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization

  if (!authHeader) {
    return res.status(401).json({ success: false, error: '未提供认证令牌' })
  }

  const parts = authHeader.split(' ')
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({ success: false, error: '认证令牌格式错误' })
  }

  const token = parts[1]
  const decoded = verifyToken(token)

  if (!decoded) {
    return res.status(401).json({ success: false, error: '令牌无效或已过期' })
  }

  // 将用户信息挂载到 req.user
  req.user = {
    userId: decoded.userId,
    role: decoded.role,
    phone: decoded.phone
  }

  next()
}

/**
 * 可选的认证中间件 - 如果没有 token 也不会拒绝请求
 * 但如果提供了 token，会验证并挂载用户信息
 * 根据 AUTH_CONFIG.enforceJwtAuth 决定是否强制要求 JWT
 */
export const optionalAuthMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization

  if (!authHeader) {
    // 没有 Authorization 头
    if (AUTH_CONFIG.enforceJwtAuth) {
      return res.status(401).json({ success: false, error: '未提供认证令牌' })
    }
    // 非强制模式：继续处理，req.user 保持 undefined
    return next()
  }

  const parts = authHeader.split(' ')
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    if (AUTH_CONFIG.enforceJwtAuth) {
      return res.status(401).json({ success: false, error: '认证令牌格式错误' })
    }
    return next()
  }

  const token = parts[1]
  const decoded = verifyToken(token)

  if (!decoded) {
    if (AUTH_CONFIG.enforceJwtAuth) {
      return res.status(401).json({ success: false, error: '令牌无效或已过期' })
    }
    // 非强制模式：token 无效但继续处理
    return next()
  }

  req.user = {
    userId: decoded.userId,
    role: decoded.role,
    phone: decoded.phone
  }
  next()
}
