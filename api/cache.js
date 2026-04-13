/**
 * 缓存基础设施
 */

// 缓存 TTL 配置（毫秒）
export const CACHE_TTL = {
  workers: 5 * 60 * 1000,       // 5 分钟
  merchants: 5 * 60 * 1000,     // 5 分钟
  departures: 1 * 60 * 1000,    // 1 分钟
  users: 2 * 60 * 1000,        // 2 分钟
  daily_quotes: 1 * 60 * 1000, // 1 分钟
  invitation_codes: 5 * 60 * 1000, // 5 分钟
  transactions: 1 * 60 * 1000   // 1 分钟
}

export const DEFAULT_TTL = 1 * 60 * 1000  // 默认 1 分钟

// 请求缓存 Map
// 缓存项结构: { data: any, expireAt: number, pending: Promise | null }
export const requestCache = new Map()

/**
 * 获取缓存键
 */
export const getCacheKey = (table, params = {}) => {
  return `${table}:${JSON.stringify(params)}`
}

/**
 * 清除指定表的所有缓存
 */
export const invalidateCache = (table) => {
  for (const key of requestCache.keys()) {
    if (key.startsWith(`${table}:`)) {
      requestCache.delete(key)
    }
  }
}

/**
 * 缓存管理操作（调试用）
 */
export const cacheOps = {
  clear: (table) => invalidateCache(table),
  clearAll: () => {
    requestCache.clear()
  },
  getStats: () => ({
    size: requestCache.size,
    keys: Array.from(requestCache.keys()).map(key => {
      const entry = requestCache.get(key)
      return {
        key,
        expired: entry.expireAt <= Date.now(),
        hasPending: !!entry.pending
      }
    })
  })
}

export default {
  CACHE_TTL,
  DEFAULT_TTL,
  requestCache,
  getCacheKey,
  invalidateCache,
  cacheOps
}
