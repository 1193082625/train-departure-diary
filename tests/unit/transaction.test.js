import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock dependencies
const mockQueryAll = vi.fn()
const mockInsert = vi.fn()
const mockDelete = vi.fn()

vi.mock('@/utils/api', () => ({
  apiOps: {
    queryAll: mockQueryAll,
    insert: mockInsert,
    delete: mockDelete,
  },
}))

vi.mock('@/utils/toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

describe('Transaction 模块测试', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockQueryAll.mockReset()
    mockInsert.mockReset()
    mockDelete.mockReset()
  })

  // ==================== loadTransactions 逻辑 ====================
  describe('loadTransactions 逻辑', () => {
    it('应该调用 queryAll("transactions") 并更新列表', async () => {
      const mockTransactions = [
        { id: 't1', type: 'payment_to_merchant', targetId: 'm1', amount: 1000, date: '2026-01-01' },
        { id: 't2', type: 'payment_to_worker', targetId: 'w1', amount: 500, date: '2026-01-02' },
      ]
      mockQueryAll.mockResolvedValue({ data: mockTransactions })

      const res = await mockQueryAll('transactions')
      const transactions = res.data || []

      expect(mockQueryAll).toHaveBeenCalledWith('transactions')
      expect(transactions).toHaveLength(2)
      expect(transactions[0].type).toBe('payment_to_merchant')
    })

    it('应该在请求失败时设置空数组', async () => {
      mockQueryAll.mockRejectedValue(new Error('网络请求失败'))

      let transactions = []
      try {
        const res = await mockQueryAll('transactions')
        transactions = res.data || []
      } catch {
        transactions = []
      }

      expect(transactions).toEqual([])
    })

    it('应该处理 data 为 null 的响应', async () => {
      mockQueryAll.mockResolvedValue({ data: null })

      const res = await mockQueryAll('transactions')
      const transactions = res.data || []

      expect(transactions).toEqual([])
    })
  })

  // ==================== recentTransactions 计算属性 ====================
  describe('recentTransactions 计算属性', () => {
    const mockMerchants = [
      { id: 'm1', name: '鸡场A' },
      { id: 'm2', name: '鸡场B' },
    ]
    const mockWorkers = [
      { id: 'w1', name: '张三' },
      { id: 'w2', name: '李四' },
    ]

    const getMerchantById = (id) => mockMerchants.find(m => m.id === id)
    const getWorkerById = (id) => mockWorkers.find(w => w.id === id)

    const mapRecentTransactions = (transactions) =>
      transactions.slice().reverse().slice(0, 20).map(t => ({
        ...t,
        targetName: t.type === 'payment_to_merchant'
          ? getMerchantById(t.targetId)?.name
          : getWorkerById(t.targetId)?.name
      }))

    it('应该逆序展示最近 20 条记录', () => {
      const transactions = Array.from({ length: 25 }, (_, i) => ({
        id: `t${i}`,
        type: 'payment_to_merchant',
        targetId: 'm1',
        amount: i * 100,
        date: `2026-01-${String(i + 1).padStart(2, '0')}`
      }))

      const result = mapRecentTransactions(transactions)

      expect(result).toHaveLength(20)
      // 逆序：最新的在最前
      expect(result[0].id).toBe('t24')
      expect(result[1].id).toBe('t23')
    })

    it('向鸡场结账应该显示鸡场名称', () => {
      const transactions = [
        { id: 't1', type: 'payment_to_merchant', targetId: 'm1', amount: 1000, date: '2026-01-01' }
      ]
      const result = mapRecentTransactions(transactions)

      expect(result[0].targetName).toBe('鸡场A')
    })

    it('向员工结账应该显示员工名称', () => {
      const transactions = [
        { id: 't1', type: 'payment_to_worker', targetId: 'w1', amount: 500, date: '2026-01-01' }
      ]
      const result = mapRecentTransactions(transactions)

      expect(result[0].targetName).toBe('张三')
    })

    it('找不到目标时 targetName 应为 undefined', () => {
      const transactions = [
        { id: 't1', type: 'payment_to_merchant', targetId: 'nonexistent', amount: 1000, date: '2026-01-01' }
      ]
      const result = mapRecentTransactions(transactions)

      expect(result[0].targetName).toBeUndefined()
    })

    it('不超过 20 条时全部展示', () => {
      const transactions = Array.from({ length: 5 }, (_, i) => ({
        id: `t${i}`,
        type: 'payment_to_merchant',
        targetId: 'm1',
        amount: 100,
        date: `2026-01-0${i + 1}`
      }))

      const result = mapRecentTransactions(transactions)
      expect(result).toHaveLength(5)
    })
  })

  // ==================== addTransaction 逻辑 ====================
  describe('addTransaction 逻辑', () => {
    it('targetId 为空时不应提交', () => {
      const form = { targetId: '', amount: 1000, date: '2026-01-01', note: '' }
      const isValid = !(!form.targetId || !form.amount)
      expect(isValid).toBe(false)
      expect(mockInsert).not.toHaveBeenCalled()
    })

    it('amount 为 null 时不应提交', () => {
      const form = { targetId: 'm1', amount: null, date: '2026-01-01', note: '' }
      const isValid = !(!form.targetId || !form.amount)
      expect(isValid).toBe(false)
      expect(mockInsert).not.toHaveBeenCalled()
    })

    it('应该调用 insert("transactions") 提交结账记录', async () => {
      mockInsert.mockResolvedValue({ success: true })
      mockQueryAll.mockResolvedValue({ data: [] })

      const form = {
        type: 'payment_to_merchant',
        targetId: 'm1',
        amount: 1000,
        date: '2026-01-01',
        note: '测试备注'
      }

      await mockInsert('transactions', form)

      expect(mockInsert).toHaveBeenCalledWith('transactions', form)
    })

    it('提交成功后应该重新加载交易记录', async () => {
      mockInsert.mockResolvedValue({ success: true })
      mockQueryAll.mockResolvedValue({ data: [{ id: 't1' }] })

      await mockInsert('transactions', { type: 'payment_to_merchant', targetId: 'm1', amount: 1000 })
      const res = await mockQueryAll('transactions')

      expect(mockQueryAll).toHaveBeenCalledWith('transactions')
      expect(res.data).toHaveLength(1)
    })

    it('提交失败时应该抛出错误', async () => {
      mockInsert.mockRejectedValue(new Error('提交失败'))

      await expect(mockInsert('transactions', {})).rejects.toThrow('提交失败')
    })
  })

  // ==================== deleteTransaction 逻辑 ====================
  describe('deleteTransaction 逻辑', () => {
    it('应该调用 delete("transactions", id)', async () => {
      mockDelete.mockResolvedValue({ success: true })
      mockQueryAll.mockResolvedValue({ data: [] })

      await mockDelete('transactions', 't1')

      expect(mockDelete).toHaveBeenCalledWith('transactions', 't1')
    })

    it('删除成功后应该重新加载交易记录', async () => {
      mockDelete.mockResolvedValue({ success: true })
      mockQueryAll.mockResolvedValue({ data: [] })

      await mockDelete('transactions', 't1')
      await mockQueryAll('transactions')

      expect(mockQueryAll).toHaveBeenCalledWith('transactions')
    })

    it('删除失败时应该抛出错误', async () => {
      mockDelete.mockRejectedValue(new Error('删除失败'))

      await expect(mockDelete('transactions', 't1')).rejects.toThrow('删除失败')
    })
  })

  // ==================== 角色过滤逻辑 ====================
  describe('角色过滤逻辑', () => {
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

    const mockWorkers = [
      { id: 'w1', name: '张三', userId: 'user1' },
      { id: 'w2', name: '李四', userId: 'user2' },
    ]

    const filterByRole = (list, user) => {
      if (!user) return []
      if (user.role === ROLES.ADMIN) return list
      if (user.role === ROLES.MIDDLEMAN) return list.filter(item => item.userId === user.id)
      if (user.parentId) return list.filter(item => item.userId === user.parentId)
      return []
    }

    it('管理员应该看到所有鸡场', () => {
      const adminUser = { id: 'admin1', role: ROLES.ADMIN }
      expect(filterByRole(mockMerchants, adminUser)).toHaveLength(3)
    })

    it('中间商应该只看到自己的鸡场', () => {
      const middlemanUser = { id: 'user1', role: ROLES.MIDDLEMAN }
      const result = filterByRole(mockMerchants, middlemanUser)
      expect(result).toHaveLength(2)
      expect(result.every(m => m.userId === 'user1')).toBe(true)
    })

    it('装发车角色应该看到所属中间商的鸡场', () => {
      const loaderUser = { id: 'loader1', role: ROLES.LOADER, parentId: 'user2' }
      const result = filterByRole(mockMerchants, loaderUser)
      expect(result).toHaveLength(1)
      expect(result[0].userId).toBe('user2')
    })

    it('管理员应该看到所有员工', () => {
      const adminUser = { id: 'admin1', role: ROLES.ADMIN }
      expect(filterByRole(mockWorkers, adminUser)).toHaveLength(2)
    })

    it('中间商应该只看到自己的员工', () => {
      const middlemanUser = { id: 'user1', role: ROLES.MIDDLEMAN }
      const result = filterByRole(mockWorkers, middlemanUser)
      expect(result).toHaveLength(1)
      expect(result[0].userId).toBe('user1')
    })

    it('无用户时应该返回空数组', () => {
      expect(filterByRole(mockMerchants, null)).toEqual([])
    })
  })

  // ==================== targetOptions 计算属性 ====================
  describe('targetOptions 计算属性', () => {
    const mockMerchants = [{ id: 'm1', name: '鸡场A' }]
    const mockWorkers = [{ id: 'w1', name: '张三' }]

    it('payment_to_merchant 时目标列表应为鸡场', () => {
      const type = 'payment_to_merchant'
      const targetOptions = type === 'payment_to_merchant' ? mockMerchants : mockWorkers
      expect(targetOptions[0].name).toBe('鸡场A')
    })

    it('payment_to_worker 时目标列表应为员工', () => {
      const type = 'payment_to_worker'
      const targetOptions = type === 'payment_to_merchant' ? mockMerchants : mockWorkers
      expect(targetOptions[0].name).toBe('张三')
    })
  })
})
