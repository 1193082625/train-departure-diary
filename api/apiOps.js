/**
 * 通用 CRUD API 操作封装
 */

import { requestCache, CACHE_TTL, DEFAULT_TTL, getCacheKey, invalidateCache } from './cache.js'
import { request } from './request.js'

/**
 * 构建 query string
 */
const buildQueryString = (params) => {
  const query = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&')
  return query ? `?${query}` : ''
}

// API 操作封装 - 与原有 dbOps 接口一致
export const apiOps = {
  // 查询所有记录（带缓存）
  queryAll: (table, limit = 500) => {
    const cacheKey = getCacheKey(table, { limit })
    const cached = requestCache.get(cacheKey)

    // 缓存命中且未过期
    if (cached && cached.expireAt > Date.now()) {
      return Promise.resolve(cached.data)
    }

    // 缓存过期但有进行中的请求
    if (cached?.pending) {
      return cached.pending
    }

    // 发起新请求
    const url = `/${table}${limit ? `?limit=${limit}` : ''}`

    const requestPromise = request(url)
      .then(data => {
        requestCache.set(cacheKey, {
          data,
          expireAt: Date.now() + (CACHE_TTL[table] || DEFAULT_TTL),
          pending: null
        })
        return data
      })
      .catch(err => {
        const cached = requestCache.get(cacheKey)
        if (cached) {
          cached.pending = null
        }
        throw err
      })

    // 存储进行中的请求
    if (cached) {
      cached.pending = requestPromise
    } else {
      requestCache.set(cacheKey, {
        data: null,
        expireAt: 0,
        pending: requestPromise
      })
    }

    return requestPromise
  },

  // 根据字段查询（带缓存）
  queryBy: (table, field, value) => {
    const cacheKey = getCacheKey(table, { field, value })
    const cached = requestCache.get(cacheKey)

    // 缓存命中且未过期
    if (cached && cached.expireAt > Date.now()) {
      return Promise.resolve(cached.data)
    }

    // 缓存过期但有进行中的请求
    if (cached?.pending) {
      return cached.pending
    }

    // 发起新请求
    const requestPromise = request(`/${table}/by/${field}/${value}`)
      .then(data => {
        requestCache.set(cacheKey, {
          data,
          expireAt: Date.now() + (CACHE_TTL[table] || DEFAULT_TTL),
          pending: null
        })
        return data
      })
      .catch(err => {
        const cached = requestCache.get(cacheKey)
        if (cached) {
          cached.pending = null
        }
        throw err
      })

    // 存储进行中的请求
    if (cached) {
      cached.pending = requestPromise
    } else {
      requestCache.set(cacheKey, {
        data: null,
        expireAt: 0,
        pending: requestPromise
      })
    }

    return requestPromise
  },

  // 根据 ID 查询（不做缓存，因为是单条数据）
  getById: (table, id) => {
    return request(`/${table}/${id}`)
  },

  // 新增记录
  insert: (table, data) => {
    const result = request(`/${table}`, {
      method: 'POST',
      data: JSON.stringify(data)
    })
    invalidateCache(table)  // 清除该表缓存
    return result
  },

  // 更新记录
  update: (table, id, data) => {
    const result = request(`/${table}/${id}`, {
      method: 'PUT',
      data: JSON.stringify(data)
    })
    invalidateCache(table)  // 清除该表缓存
    return result
  },

  // 删除记录
  delete: (table, id) => {
    const result = request(`/${table}/${id}`, {
      method: 'DELETE'
    })
    invalidateCache(table)  // 清除该表缓存
    return result
  },

  // 清空表
  deleteAll: (table) => {
    const result = request(`/${table}`, {
      method: 'DELETE'
    })
    invalidateCache(table)  // 清除该表缓存
    return result
  },

  // 聚合统计（不走缓存，因为是计算结果）
  aggregate: (params) => {
    // params: { type, workerId, merchantId, startDate, endDate, date, field, operation }
    const { type, workerId, merchantId, startDate, endDate, ...rest } = params
    const queryString = buildQueryString({ startDate, endDate, ...rest })

    let endpoint = '/departures/aggregate'
    if (type === 'byWorker' && workerId) {
      endpoint = `/workers/${workerId}/stats${queryString}`
    } else if (type === 'byMerchant' && merchantId) {
      endpoint = `/merchants/${merchantId}/stats${queryString}`
    } else {
      endpoint = `/departures/aggregate${queryString}`
    }

    return request(endpoint, {
      method: 'GET'
    })
  }
}

export { buildQueryString }

export default apiOps
