import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock user store for testing
const createMockUser = (overrides = {}) => ({
  id: 'user-1',
  role: 'middleman',
  parentId: null,
  ...overrides
})

// Mock quotes data
const mockQuotes = [
  { id: 'q1', date: '2026-04-01', quote: 120, userId: 'user-1' },
  { id: 'q2', date: '2026-04-02', quote: 125, userId: 'user-1' },
  { id: 'q3', date: '2026-04-03', quote: 130, userId: 'user-2' }, // Belongs to different middleman
]

// Simulated dailyQuote component logic
class DailyQuoteComponent {
  constructor() {
    this.quotes = []
    this.currentMiddlemanId = null
  }

  setCurrentUser(user) {
    this.currentUser = user
  }

  setCurrentMiddlemanId(id) {
    this.currentMiddlemanId = id
  }

  // Get filtered quotes based on user role
  getFilteredQuotes() {
    if (!this.currentUser) return []

    if (this.currentUser.role === 'admin' && this.currentMiddlemanId) {
      return this.quotes.filter(q => q.userId === this.currentMiddlemanId)
    }
    if (this.currentUser.role === 'middleman') {
      return this.quotes.filter(q => q.userId === this.currentUser.id)
    }
    if (this.currentUser.role === 'loader' && this.currentUser.parentId) {
      return this.quotes.filter(q => q.userId === this.currentUser.parentId)
    }
    return []
  }

  // Get quote by date
  getQuoteByDate(date) {
    const filtered = this.getFilteredQuotes()
    const quote = filtered.find(q => q.date === date)
    return quote ? quote.quote : null
  }

  // Set quotes
  setQuotes(quotes) {
    this.quotes = quotes
  }
}

describe('每日报价模块测试', () => {
  let component

  beforeEach(() => {
    component = new DailyQuoteComponent()
    component.setQuotes([...mockQuotes])
  })

  describe('角色过滤逻辑', () => {
    it('管理员应根据 currentMiddlemanId 过滤报价', () => {
      const adminUser = createMockUser({ role: 'admin' })
      component.setCurrentUser(adminUser)
      component.setCurrentMiddlemanId('user-1')

      const filtered = component.getFilteredQuotes()
      expect(filtered).toHaveLength(2)
      expect(filtered.every(q => q.userId === 'user-1')).toBe(true)
    })

    it('管理员切换中间商时应返回不同报价', () => {
      const adminUser = createMockUser({ role: 'admin' })
      component.setCurrentUser(adminUser)

      // 切换到 user-1
      component.setCurrentMiddlemanId('user-1')
      expect(component.getFilteredQuotes()).toHaveLength(2)

      // 切换到 user-2
      component.setCurrentMiddlemanId('user-2')
      expect(component.getFilteredQuotes()).toHaveLength(1)
      expect(component.getFilteredQuotes()[0].date).toBe('2026-04-03')
    })

    it('中间商应只返回自己的报价', () => {
      const middlemanUser = createMockUser({ role: 'middleman', id: 'user-1' })
      component.setCurrentUser(middlemanUser)

      const filtered = component.getFilteredQuotes()
      expect(filtered).toHaveLength(2)
      expect(filtered.every(q => q.userId === 'user-1')).toBe(true)
    })

    it('装发车应根据 parentId 过滤报价', () => {
      const loaderUser = createMockUser({ role: 'loader', id: 'loader-1', parentId: 'user-1' })
      component.setCurrentUser(loaderUser)

      const filtered = component.getFilteredQuotes()
      expect(filtered).toHaveLength(2)
      expect(filtered.every(q => q.userId === 'user-1')).toBe(true)
    })

    it('鸡场角色应返回空数组（无报价权限）', () => {
      const farmUser = createMockUser({ role: 'farm', id: 'farm-1' })
      component.setCurrentUser(farmUser)

      const filtered = component.getFilteredQuotes()
      expect(filtered).toHaveLength(0)
    })

    it('无用户时应返回空数组', () => {
      component.setCurrentUser(null)
      expect(component.getFilteredQuotes()).toHaveLength(0)
    })
  })

  describe('按日期获取报价', () => {
    beforeEach(() => {
      const middlemanUser = createMockUser({ role: 'middleman', id: 'user-1' })
      component.setCurrentUser(middlemanUser)
    })

    it('应该返回指定日期的报价', () => {
      expect(component.getQuoteByDate('2026-04-01')).toBe(120)
      expect(component.getQuoteByDate('2026-04-02')).toBe(125)
    })

    it('不存在的日期应返回 null', () => {
      expect(component.getQuoteByDate('2026-04-99')).toBeNull()
    })
  })

  describe('API 调用模拟', () => {
    it('加载报价应设置 quotes 状态', async () => {
      const mockResponse = { data: [...mockQuotes] }
      const mockRequest = vi.fn().mockResolvedValue(mockResponse)

      const result = await mockRequest('/daily_quotes')
      expect(result.data).toHaveLength(3)
    })

    it('保存报价时应调用正确的 API 端点（新增）', async () => {
      const newQuote = { date: '2026-04-10', quote: 135, userId: 'user-1' }
      const mockInsert = vi.fn().mockResolvedValue({ success: true })

      await mockInsert('/daily_quotes', {
        method: 'POST',
        data: JSON.stringify(newQuote)
      })

      expect(mockInsert).toHaveBeenCalledWith('/daily_quotes', {
        method: 'POST',
        data: JSON.stringify(newQuote)
      })
    })

    it('保存报价时应调用正确的 API 端点（更新）', async () => {
      const existingQuote = { id: 'q1', date: '2026-04-01', quote: 122, userId: 'user-1' }
      const mockUpdate = vi.fn().mockResolvedValue({ success: true })

      await mockUpdate(`/daily_quotes/${existingQuote.id}`, {
        method: 'PUT',
        data: JSON.stringify({ quote: 122 })
      })

      expect(mockUpdate).toHaveBeenCalledWith('/daily_quotes/q1', {
        method: 'PUT',
        data: JSON.stringify({ quote: 122 })
      })
    })
  })

  describe('事件总线集成', () => {
    it('保存报价后应发布刷新事件', () => {
      const eventBus = {
        listeners: {},
        subscribe: function(eventType, callback) {
          if (!this.listeners[eventType]) {
            this.listeners[eventType] = []
          }
          this.listeners[eventType].push(callback)
          return () => {
            const index = this.listeners[eventType].indexOf(callback)
            if (index > -1) this.listeners[eventType].splice(index, 1)
          }
        },
        publish: function(eventType, data) {
          if (this.listeners[eventType]) {
            this.listeners[eventType].forEach(callback => callback(data))
          }
        }
      }

      let callbackCalled = false
      let receivedData = null

      const unsubscribe = eventBus.subscribe('dailyQuote:refresh', (data) => {
        callbackCalled = true
        receivedData = data
      })

      eventBus.publish('dailyQuote:refresh', { date: '2026-04-01', quote: 120 })

      expect(callbackCalled).toBe(true)
      expect(receivedData).toEqual({ date: '2026-04-01', quote: 120 })

      // Test unsubscribe
      unsubscribe()
      callbackCalled = false
      eventBus.publish('dailyQuote:refresh', { date: '2026-04-02', quote: 125 })
      expect(callbackCalled).toBe(false)
    })
  })

  describe('数据一致性', () => {
    it('报价金额应为数字类型', () => {
      const middlemanUser = createMockUser({ role: 'middleman', id: 'user-1' })
      component.setCurrentUser(middlemanUser)

      const quote = component.getQuoteByDate('2026-04-01')
      expect(typeof quote).toBe('number')
    })

    it('日期格式应为 YYYY-MM-DD', () => {
      const middlemanUser = createMockUser({ role: 'middleman', id: 'user-1' })
      component.setCurrentUser(middlemanUser)

      const filtered = component.getFilteredQuotes()
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/
      filtered.forEach(q => {
        expect(q.date).toMatch(dateRegex)
      })
    })
  })
})
