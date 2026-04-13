/**
 * API 模块统一导出
 */

// 基础设施
export { setApiBaseUrl, request } from './request.js'
export { cacheOps, invalidateCache, requestCache, getCacheKey, CACHE_TTL, DEFAULT_TTL } from './cache.js'

// 通用 CRUD 操作
export { apiOps, buildQueryString } from './apiOps.js'

// 业务 API 模块
export { userApi } from './user.js'
export { inviteApi } from './invite.js'
export { dailyQuoteApi } from './dailyQuote.js'
export { departureApi, parseJsonField } from './departure.js'

// 默认导出（兼容旧写法）
import { setApiBaseUrl, request } from './request.js'
import { apiOps } from './apiOps.js'
import { userApi } from './user.js'
import { inviteApi } from './invite.js'
import { dailyQuoteApi } from './dailyQuote.js'
import { departureApi, parseJsonField } from './departure.js'
import { cacheOps } from './cache.js'

export default {
  setApiBaseUrl,
  request,
  cacheOps,
  apiOps,
  userApi,
  inviteApi,
  dailyQuoteApi,
  departureApi,
  parseJsonField
}
