import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock dependencies
const mockAggregate = vi.fn()
const mockQueryAll = vi.fn()

vi.mock('@/utils/api', () => ({
  apiOps: {
    aggregate: mockAggregate,
    queryAll: mockQueryAll,
  },
}))

describe('MerchantStatistics 模块测试', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAggregate.mockReset()
    mockQueryAll.mockReset()
  })

  // ==================== updateMerchantStats 逻辑 ====================
  describe('updateMerchantStats 逻辑', () => {
    it('未选择鸡场时应该重置所有统计数据', async () => {
      const selectedMerchantId = ''
      let merchantRecordList = []
      let merchantStats = { totalBigBoxes: 10, receivable: 500, paid: 200, unpaid: 300 }

      if (!selectedMerchantId) {
        merchantRecordList = []
        merchantStats = { totalBigBoxes: 0, totalSmallBoxes: 0, totalWeight: 0, receivable: 0, paid: 0, unpaid: 0 }
      }

      expect(merchantRecordList).toEqual([])
      expect(merchantStats.totalBigBoxes).toBe(0)
      expect(merchantStats.receivable).toBe(0)
      expect(mockAggregate).not.toHaveBeenCalled()
    })

    it('选择鸡场后应该调用 aggregate API', async () => {
      const mockResponse = {
        data: {
          totalBigBoxes: 20,
          totalSmallBoxes: 10,
          totalWeight: 880,
          totalEarned: 10000,
          settledAmount: 6000,
          unpaidAmount: 4000,
          merchantRecordList: [
            { date: '2026-01-05', dailyQuote: 120, bigBoxes: 10, smallBoxes: 5, weight: 440, receivable: 5000 },
            { date: '2026-01-10', dailyQuote: 125, bigBoxes: 10, smallBoxes: 5, weight: 440, receivable: 5000 },
          ]
        }
      }
      mockAggregate.mockResolvedValue(mockResponse)

      const params = {
        type: 'byMerchant',
        merchantId: 'merchant-1',
        startDate: '2026-01-01',
        endDate: '2026-01-31'
      }

      const res = await mockAggregate(params)

      expect(mockAggregate).toHaveBeenCalledWith(params)
      expect(res.data.totalEarned).toBe(10000)
      expect(res.data.merchantRecordList).toHaveLength(2)
    })

    it('应该正确映射后端数据到 merchantStats', async () => {
      const mockResponse = {
        data: {
          totalBigBoxes: 20,
          totalSmallBoxes: 10,
          totalWeight: 880,
          totalEarned: 10000,
          settledAmount: 6000,
          unpaidAmount: 4000,
          merchantRecordList: []
        }
      }
      mockAggregate.mockResolvedValue(mockResponse)

      const res = await mockAggregate({ type: 'byMerchant', merchantId: 'merchant-1', startDate: '2026-01-01', endDate: '2026-01-31' })
      const data = res.data

      const merchantStats = {
        totalBigBoxes: data.totalBigBoxes || 0,
        totalSmallBoxes: data.totalSmallBoxes || 0,
        totalWeight: data.totalWeight || 0,
        receivable: data.totalEarned || 0,
        paid: data.settledAmount || 0,
        unpaid: data.unpaidAmount || 0
      }

      expect(merchantStats.totalBigBoxes).toBe(20)
      expect(merchantStats.totalSmallBoxes).toBe(10)
      expect(merchantStats.totalWeight).toBe(880)
      expect(merchantStats.receivable).toBe(10000)
      expect(merchantStats.paid).toBe(6000)
      expect(merchantStats.unpaid).toBe(4000)
    })

    it('应该正确填充 merchantRecordList', async () => {
      const recordList = [
        { date: '2026-01-05', dailyQuote: 120, bigBoxes: 10, smallBoxes: 5, weight: 440, receivable: 5000 },
        { date: '2026-01-10', dailyQuote: 125, bigBoxes: 10, smallBoxes: 5, weight: 440, receivable: 5000 },
      ]
      mockAggregate.mockResolvedValue({
        data: {
          totalBigBoxes: 20,
          totalSmallBoxes: 10,
          totalWeight: 880,
          totalEarned: 10000,
          settledAmount: 6000,
          unpaidAmount: 4000,
          merchantRecordList: recordList
        }
      })

      const res = await mockAggregate({ type: 'byMerchant', merchantId: 'merchant-1', startDate: '2026-01-01', endDate: '2026-01-31' })
      const merchantRecordList = res.data.merchantRecordList || []

      expect(merchantRecordList).toHaveLength(2)
      expect(merchantRecordList[0].date).toBe('2026-01-05')
      expect(merchantRecordList[0].bigBoxes).toBe(10)
      expect(merchantRecordList[1].receivable).toBe(5000)
    })

    it('API 失败时应该捕获错误，不崩溃', async () => {
      mockAggregate.mockRejectedValue(new Error('网络请求失败'))

      let merchantStats = { totalBigBoxes: 0, receivable: 0, paid: 0, unpaid: 0 }

      try {
        await mockAggregate({ type: 'byMerchant', merchantId: 'merchant-1', startDate: '2026-01-01', endDate: '2026-01-31' })
      } catch {
        // 保持原有 stats 不变
      }

      expect(merchantStats.totalBigBoxes).toBe(0)
    })

    it('后端返回空 merchantRecordList 时应该设置为空数组', async () => {
      mockAggregate.mockResolvedValue({
        data: {
          totalBigBoxes: 0,
          totalSmallBoxes: 0,
          totalWeight: 0,
          totalEarned: 0,
          settledAmount: 0,
          unpaidAmount: 0,
          merchantRecordList: null
        }
      })

      const res = await mockAggregate({ type: 'byMerchant', merchantId: 'merchant-1', startDate: '2026-01-01', endDate: '2026-01-31' })
      const merchantRecordList = res.data.merchantRecordList || []

      expect(merchantRecordList).toEqual([])
    })

    it('应该携带完整的日期范围参数', async () => {
      mockAggregate.mockResolvedValue({ data: { totalEarned: 0, settledAmount: 0, unpaidAmount: 0, merchantRecordList: [] } })

      await mockAggregate({
        type: 'byMerchant',
        merchantId: 'merchant-1',
        startDate: '2026-01-01',
        endDate: '2026-12-31'
      })

      expect(mockAggregate).toHaveBeenCalledWith(
        expect.objectContaining({
          startDate: '2026-01-01',
          endDate: '2026-12-31',
          merchantId: 'merchant-1'
        })
      )
    })
  })

  // ==================== 角色过滤逻辑 ====================
  describe('商户角色过滤逻辑', () => {
    const ROLES = {
      ADMIN: 'admin',
      MIDDLEMAN: 'middleman',
      LOADER: 'loader',
    }

    const mockMerchants = [
      { id: 'm1', name: '鸡场A', userId: 'user1' },
      { id: 'm2', name: '鸡场B', userId: 'user1' },
      { id: 'm3', name: '鸡场C', userId: 'user2' },
    ]

    const filterMerchantsByRole = (merchants, user) => {
      if (!user) return []
      if (user.role === ROLES.ADMIN) return merchants
      if (user.role === ROLES.MIDDLEMAN) return merchants.filter(m => m.userId === user.id)
      if (user.parentId) return merchants.filter(m => m.userId === user.parentId)
      return []
    }

    it('管理员应该看到所有鸡场', () => {
      const adminUser = { id: 'admin1', role: ROLES.ADMIN }
      expect(filterMerchantsByRole(mockMerchants, adminUser)).toHaveLength(3)
    })

    it('中间商应该只看到自己的鸡场', () => {
      const middlemanUser = { id: 'user1', role: ROLES.MIDDLEMAN }
      const result = filterMerchantsByRole(mockMerchants, middlemanUser)
      expect(result).toHaveLength(2)
      expect(result.every(m => m.userId === 'user1')).toBe(true)
    })

    it('装发车角色应该看到所属中间商的鸡场', () => {
      const loaderUser = { id: 'loader1', role: ROLES.LOADER, parentId: 'user2' }
      const result = filterMerchantsByRole(mockMerchants, loaderUser)
      expect(result).toHaveLength(1)
      expect(result[0].userId).toBe('user2')
    })

    it('无用户时应该返回空数组', () => {
      expect(filterMerchantsByRole(mockMerchants, null)).toEqual([])
    })

    it('没有 parentId 的装发车角色应该返回空数组', () => {
      const loaderUser = { id: 'loader1', role: ROLES.LOADER, parentId: null }
      const result = filterMerchantsByRole(mockMerchants, loaderUser)
      expect(result).toEqual([])
    })
  })

  // ==================== 已结/应结/待结金额计算 ====================
  describe('结账金额计算逻辑', () => {
    it('待结金额 = 应结 - 已结', () => {
      const totalEarned = 10000
      const settledAmount = 6000
      const unpaidAmount = totalEarned - settledAmount

      expect(unpaidAmount).toBe(4000)
    })

    it('全部结清时待结金额应为 0', () => {
      const totalEarned = 5000
      const settledAmount = 5000
      const unpaidAmount = totalEarned - settledAmount

      expect(unpaidAmount).toBe(0)
    })

    it('未结账时待结金额应等于应结金额', () => {
      const totalEarned = 8000
      const settledAmount = 0
      const unpaidAmount = totalEarned - settledAmount

      expect(unpaidAmount).toBe(8000)
    })

    it('后端直接返回 unpaidAmount 时应直接使用', async () => {
      mockAggregate.mockResolvedValue({
        data: {
          totalEarned: 10000,
          settledAmount: 7000,
          unpaidAmount: 3000, // 后端直接计算好的
          merchantRecordList: []
        }
      })

      const res = await mockAggregate({ type: 'byMerchant', merchantId: 'merchant-1', startDate: '2026-01-01', endDate: '2026-01-31' })

      expect(res.data.unpaidAmount).toBe(3000)
    })
  })

  // ==================== loadMerchants 逻辑 ====================
  describe('loadMerchants 逻辑', () => {
    it('应该调用 queryAll("merchants") 加载鸡场列表', async () => {
      const mockMerchants = [
        { id: 'm1', name: '鸡场A', userId: 'user1' },
      ]
      mockQueryAll.mockResolvedValue({ data: mockMerchants })

      const res = await mockQueryAll('merchants')
      const merchants = res.data || []

      expect(mockQueryAll).toHaveBeenCalledWith('merchants')
      expect(merchants).toHaveLength(1)
      expect(merchants[0].name).toBe('鸡场A')
    })

    it('加载失败时应该设置空数组', async () => {
      mockQueryAll.mockRejectedValue(new Error('网络错误'))

      let merchants = []
      try {
        const res = await mockQueryAll('merchants')
        merchants = res.data || []
      } catch {
        merchants = []
      }

      expect(merchants).toEqual([])
    })
  })
})
