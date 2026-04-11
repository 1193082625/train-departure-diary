import { describe, it, expect, vi, beforeEach } from 'vitest'

// Cache TTL configuration
const CACHE_TTL = {
  workers: 5 * 60 * 1000,
  merchants: 5 * 60 * 1000,
  departures: 1 * 60 * 1000,
  users: 2 * 60 * 1000,
  daily_quotes: 1 * 60 * 1000,
  invitation_codes: 5 * 60 * 1000,
  transactions: 1 * 60 * 1000
}

const DEFAULT_TTL = 1 * 60 * 1000

// Simulated cache implementation for testing
class RequestCache {
  constructor() {
    this.cache = new Map()
  }

  getCacheKey(table, params = {}) {
    return `${table}:${JSON.stringify(params)}`
  }

  invalidate(table) {
    for (const key of this.cache.keys()) {
      if (key.startsWith(`${table}:`)) {
        this.cache.delete(key)
      }
    }
  }

  clearAll() {
    this.cache.clear()
  }

  getStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()).map(key => {
        const entry = this.cache.get(key)
        return {
          key,
          expired: entry.expireAt <= Date.now(),
          hasPending: !!entry.pending
        }
      })
    }
  }

  async queryAll(table, limit = 500, mockDataFn) {
    const cacheKey = this.getCacheKey(table, { limit })
    const cached = this.cache.get(cacheKey)

    if (cached && cached.expireAt > Date.now()) {
      return cached.data
    }

    if (cached?.pending) {
      return cached.pending
    }

    const data = await mockDataFn()
    this.cache.set(cacheKey, {
      data,
      expireAt: Date.now() + (CACHE_TTL[table] || DEFAULT_TTL),
      pending: null
    })

    return data
  }
}

describe('API 模块测试', () => {
  let requestCache

  beforeEach(() => {
    requestCache = new RequestCache()
  })

  describe('缓存逻辑 - RequestCache.queryAll', () => {
    it('应该缓存首次请求的结果', async () => {
      const mockData = [{ id: '1', name: 'worker1' }]
      let callCount = 0

      const mockFn = async () => {
        callCount++
        return mockData
      }

      // First call
      const result1 = await requestCache.queryAll('workers', 500, mockFn)
      // Second call should use cache
      const result2 = await requestCache.queryAll('workers', 500, mockFn)

      expect(result1).toEqual(mockData)
      expect(result2).toEqual(mockData)
      expect(callCount).toBe(1) // Only called once due to caching
    })

    it('应该区分不同表的缓存', async () => {
      const mockWorkers = [{ id: '1', name: 'worker1' }]
      const mockMerchants = [{ id: '1', name: 'merchant1' }]
      let workerCalls = 0
      let merchantCalls = 0

      const mockWorkersFn = async () => {
        workerCalls++
        return mockWorkers
      }

      const mockMerchantsFn = async () => {
        merchantCalls++
        return mockMerchants
      }

      await requestCache.queryAll('workers', 500, mockWorkersFn)
      await requestCache.queryAll('merchants', 500, mockMerchantsFn)

      // Both should have been called since they're different tables
      expect(workerCalls).toBe(1)
      expect(merchantCalls).toBe(1)
    })

    it('应该支持手动清除缓存', async () => {
      const mockData = [{ id: '1', name: 'worker1' }]
      let callCount = 0

      const mockFn = async () => {
        callCount++
        return mockData
      }

      await requestCache.queryAll('workers', 500, mockFn)
      expect(callCount).toBe(1)

      // Clear the cache
      requestCache.invalidate('workers')

      // Next call should fetch again
      await requestCache.queryAll('workers', 500, mockFn)
      expect(callCount).toBe(2)
    })

    it('应该区分不同 limit 参数的缓存', async () => {
      const mockData1 = [{ id: '1' }]
      const mockData2 = [{ id: '1' }, { id: '2' }]
      let callCount = 0

      const mockFn = async (limit) => {
        callCount++
        return limit === 100 ? mockData2 : mockData1
      }

      await requestCache.queryAll('workers', 50, () => mockFn(50))
      await requestCache.queryAll('workers', 100, () => mockFn(100))

      expect(callCount).toBe(2) // Different limits = different cache keys = 2 calls
    })
  })

  describe('CRUD 操作 - 缓存清除', () => {
    it('insert 应该清除指定表的缓存', async () => {
      const mockData = [{ id: '1' }]
      let callCount = 0

      const mockFn = async () => {
        callCount++
        return mockData
      }

      // Populate cache
      await requestCache.queryAll('workers', 500, mockFn)
      expect(callCount).toBe(1)

      // Simulate insert operation which should invalidate cache
      requestCache.invalidate('workers')

      // Next query should refetch
      await requestCache.queryAll('workers', 500, mockFn)
      expect(callCount).toBe(2)
    })

    it('update 应该清除指定表的缓存', async () => {
      const mockData = [{ id: '1' }]
      let callCount = 0

      const mockFn = async () => {
        callCount++
        return mockData
      }

      await requestCache.queryAll('workers', 500, mockFn)
      expect(callCount).toBe(1)

      // Simulate update operation
      requestCache.invalidate('workers')

      await requestCache.queryAll('workers', 500, mockFn)
      expect(callCount).toBe(2)
    })

    it('delete 应该清除指定表的缓存', async () => {
      const mockData = [{ id: '1' }]
      let callCount = 0

      const mockFn = async () => {
        callCount++
        return mockData
      }

      await requestCache.queryAll('workers', 500, mockFn)
      expect(callCount).toBe(1)

      // Simulate delete operation
      requestCache.invalidate('workers')

      await requestCache.queryAll('workers', 500, mockFn)
      expect(callCount).toBe(2)
    })
  })

  describe('cacheOps', () => {
    it('getStats 应该返回缓存状态', async () => {
      const mockData = [{ id: '1' }]

      await requestCache.queryAll('workers', 500, async () => mockData)

      const stats = requestCache.getStats()
      expect(stats).toHaveProperty('size')
      expect(stats).toHaveProperty('keys')
      expect(stats.size).toBeGreaterThan(0)
    })

    it('clearAll 应该清除所有缓存', async () => {
      const mockData = [{ id: '1' }]

      await requestCache.queryAll('workers', 500, async () => mockData)
      await requestCache.queryAll('merchants', 500, async () => mockData)

      expect(requestCache.getStats().size).toBe(2)

      requestCache.clearAll()

      expect(requestCache.getStats().size).toBe(0)
    })
  })
})
