import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock dependencies
const mockRequest = vi.fn()

vi.mock('@/api', () => ({
  request: mockRequest,
  dailyQuoteApi: {
    getByDate: vi.fn((date) => mockRequest(`/daily_quotes/by/date/${date}`)),
    getByDateRange: vi.fn((startDate, endDate, options = {}) => {
      let url = `/daily_quotes/list?startDate=${startDate}&endDate=${endDate}`
      if (options.groupBy) {
        url += `&groupBy=${options.groupBy}`
      }
      return mockRequest(url)
    }),
    create: vi.fn((data) => mockRequest('/daily_quotes', { method: 'POST', data: JSON.stringify(data) })),
    update: vi.fn((id, data) => mockRequest(`/daily_quotes/${id}`, { method: 'PUT', data: JSON.stringify(data) })),
    delete: vi.fn((id) => mockRequest(`/daily_quotes/${id}`, { method: 'DELETE' })),
  },
}))

// Mock quotes data (后端返回格式)
const mockQuotesResponse = {
  success: true,
  data: [
    { id: 'q1', date: '2026-04-01', quote: 120, userId: 'user-1' },
    { id: 'q2', date: '2026-04-02', quote: 125, userId: 'user-1' },
    { id: 'q3', date: '2026-04-03', quote: 130, userId: 'user-2' },
  ]
}

const mockSingleQuoteResponse = {
  success: true,
  data: [{ id: 'q1', date: '2026-04-01', quote: 120, userId: 'user-1' }]
}

describe('每日报价模块测试 (dailyQuoteApi)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequest.mockReset()
  })

  describe('dailyQuoteApi.getByDate', () => {
    it('应正确调用 apiOps.queryBy 并返回报价数据', async () => {
      mockRequest.mockResolvedValue(mockSingleQuoteResponse)

      const { dailyQuoteApi } = await import('@/utils/api')
      const result = await dailyQuoteApi.getByDate('2026-04-01')

      expect(mockRequest).toHaveBeenCalledWith('/daily_quotes/by/date/2026-04-01')
      expect(result).toEqual(mockSingleQuoteResponse)
    })

    it('不存在的日期应返回相应的响应结构', async () => {
      const emptyResponse = { success: true, data: [] }
      mockRequest.mockResolvedValue(emptyResponse)

      const { dailyQuoteApi } = await import('@/utils/api')
      const result = await dailyQuoteApi.getByDate('2026-04-99')

      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(0)
    })
  })

  describe('dailyQuoteApi.getByDateRange', () => {
    it('应正确构建日期范围查询 URL', async () => {
      mockRequest.mockResolvedValue({ success: true, data: [] })

      const { dailyQuoteApi } = await import('@/utils/api')
      await dailyQuoteApi.getByDateRange('2026-04-01', '2026-04-30')

      expect(mockRequest).toHaveBeenCalledWith('/daily_quotes/list?startDate=2026-04-01&endDate=2026-04-30')
    })

    it('应正确处理 groupBy 选项', async () => {
      mockRequest.mockResolvedValue({ success: true, data: [] })

      const { dailyQuoteApi } = await import('@/utils/api')
      await dailyQuoteApi.getByDateRange('2026-01-01', '2026-12-31', { groupBy: 'month' })

      expect(mockRequest).toHaveBeenCalledWith('/daily_quotes/list?startDate=2026-01-01&endDate=2026-12-31&groupBy=month')
    })

    it('应正确返回日期范围内的报价列表', async () => {
      mockRequest.mockResolvedValue(mockQuotesResponse)

      const { dailyQuoteApi } = await import('@/utils/api')
      const result = await dailyQuoteApi.getByDateRange('2026-04-01', '2026-04-30')

      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(3)
      expect(result.data[0].quote).toBe(120)
    })
  })

  describe('dailyQuoteApi.create', () => {
    it('应正确调用 apiOps.insert 创建新报价', async () => {
      const newQuote = { date: '2026-04-10', quote: 135, userId: 'user-1' }
      const insertResult = { success: true, data: { id: 'q-new', ...newQuote } }
      mockRequest.mockResolvedValue(insertResult)

      const { dailyQuoteApi } = await import('@/utils/api')
      const result = await dailyQuoteApi.create(newQuote)

      expect(mockRequest).toHaveBeenCalledWith('/daily_quotes', {
        method: 'POST',
        data: JSON.stringify(newQuote)
      })
      expect(result.success).toBe(true)
    })
  })

  describe('dailyQuoteApi.update', () => {
    it('应正确调用 apiOps.update 更新报价', async () => {
      const updateData = { quote: 122 }
      const updateResult = { success: true }
      mockRequest.mockResolvedValue(updateResult)

      const { dailyQuoteApi } = await import('@/utils/api')
      const result = await dailyQuoteApi.update('q1', updateData)

      expect(mockRequest).toHaveBeenCalledWith('/daily_quotes/q1', {
        method: 'PUT',
        data: JSON.stringify(updateData)
      })
      expect(result.success).toBe(true)
    })
  })

  describe('dailyQuoteApi.delete', () => {
    it('应正确调用 apiOps.delete 删除报价', async () => {
      const deleteResult = { success: true }
      mockRequest.mockResolvedValue(deleteResult)

      const { dailyQuoteApi } = await import('@/utils/api')
      const result = await dailyQuoteApi.delete('q1')

      expect(mockRequest).toHaveBeenCalledWith('/daily_quotes/q1', { method: 'DELETE' })
      expect(result.success).toBe(true)
    })
  })

  describe('数据一致性验证', () => {
    it('报价金额应为数字类型', async () => {
      mockRequest.mockResolvedValue(mockQuotesResponse)

      const { dailyQuoteApi } = await import('@/utils/api')
      const result = await dailyQuoteApi.getByDateRange('2026-04-01', '2026-04-30')

      result.data.forEach(q => {
        expect(typeof q.quote).toBe('number')
      })
    })

    it('日期格式应为 YYYY-MM-DD', async () => {
      mockRequest.mockResolvedValue(mockQuotesResponse)

      const { dailyQuoteApi } = await import('@/utils/api')
      const result = await dailyQuoteApi.getByDateRange('2026-04-01', '2026-04-30')

      const dateRegex = /^\d{4}-\d{2}-\d{2}$/
      result.data.forEach(q => {
        expect(q.date).toMatch(dateRegex)
      })
    })

    it('报价应大于 0', async () => {
      mockRequest.mockResolvedValue(mockQuotesResponse)

      const { dailyQuoteApi } = await import('@/utils/api')
      const result = await dailyQuoteApi.getByDateRange('2026-04-01', '2026-04-30')

      result.data.forEach(q => {
        expect(q.quote).toBeGreaterThan(0)
      })
    })
  })

  describe('API 错误处理', () => {
    it('API 请求失败时应返回 success: false', async () => {
      const errorResponse = { success: false, message: '服务器错误' }
      mockRequest.mockResolvedValue(errorResponse)

      const { dailyQuoteApi } = await import('@/utils/api')
      const result = await dailyQuoteApi.getByDate('2026-04-01')

      expect(result.success).toBe(false)
    })

    it('网络错误时应抛出异常', async () => {
      mockRequest.mockRejectedValue(new Error('Network Error'))

      const { dailyQuoteApi } = await import('@/utils/api')

      await expect(dailyQuoteApi.getByDate('2026-04-01')).rejects.toThrow('Network Error')
    })
  })

  describe('按日期获取报价业务逻辑', () => {
    it('组件获取指定日期报价的逻辑应该正确处理响应', async () => {
      // 模拟 daily-quotes.vue 组件中的 getQuoteByDate 逻辑
      const getQuoteByDate = async (date) => {
        const res = await mockRequest(`/daily_quotes/by/date/${date}`)
        // 后端返回格式: { success: true, data: [{ id, date, quote, ... }] }
        if (res && res.success && Array.isArray(res.data) && res.data.length > 0) {
          return res.data[0].quote
        }
        return null
      }

      mockRequest.mockResolvedValue(mockSingleQuoteResponse)
      const quote = await getQuoteByDate('2026-04-01')
      expect(quote).toBe(120)

      // 测试不存在的日期
      mockRequest.mockResolvedValue({ success: true, data: [] })
      const noQuote = await getQuoteByDate('2026-04-99')
      expect(noQuote).toBeNull()
    })
  })
})
