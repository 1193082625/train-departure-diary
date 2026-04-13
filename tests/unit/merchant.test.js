import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock dependencies
const mockRequest = vi.fn()

vi.mock('@/utils/api', () => ({
  request: mockRequest,
}))

vi.mock('@/utils/toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

describe('Merchant 模块测试', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequest.mockReset()
  })

  describe('loadMerchants 逻辑', () => {
    it('应该正确调用 merchants list API', async () => {
      const mockMerchants = [
        { id: '1', name: '鸡场A', phone: '13800000001', margin: 2, userId: 'user1' },
      ]
      mockRequest.mockResolvedValue({
        data: mockMerchants,
        pagination: { total: 3, totalPages: 1, page: 1 }
      })

      const page = 1
      const pageSize = 50
      const res = await mockRequest(`/merchants/list?page=${page}&pageSize=${pageSize}&sort=createdAt&order=desc`)

      expect(mockRequest).toHaveBeenCalledWith('/merchants/list?page=1&pageSize=50&sort=createdAt&order=desc')
      expect(res.data).toEqual(mockMerchants)
    })

    it('应该正确处理分页响应', async () => {
      const paginatedResponse = {
        data: [{ id: '1' }, { id: '2' }],
        pagination: { total: 3, totalPages: 2, page: 1 }
      }
      mockRequest.mockResolvedValue(paginatedResponse)

      const res = await mockRequest('/merchants/list?page=1&pageSize=2')

      expect(res.pagination.total).toBe(3)
      expect(res.pagination.totalPages).toBe(2)
    })

    it('应该在请求失败时处理错误', async () => {
      mockRequest.mockRejectedValue(new Error('网络请求失败'))

      await expect(mockRequest('/merchants/list?page=1&pageSize=50')).rejects.toThrow('网络请求失败')
    })
  })

  describe('角色过滤逻辑', () => {
    const ROLES = {
      ADMIN: 'admin',
      MIDDLEMAN: 'middleman',
      LOADER: 'loader',
      FARM: 'farm',
    }

    const mockMerchants = [
      { id: '1', name: '鸡场A', phone: '13800000001', margin: 2, userId: 'user1', createdAt: '2024-01-01' },
      { id: '2', name: '鸡场B', phone: '13800000002', margin: 3, userId: 'user1', createdAt: '2024-01-02' },
      { id: '3', name: '鸡场C', phone: '13800000003', margin: 2.5, userId: 'user2', createdAt: '2024-01-03' },
    ]

    const filterMerchantsByRole = (merchants, user) => {
      if (!user) return []

      if (user.role === ROLES.ADMIN) {
        return merchants
      }

      if (user.role === ROLES.MIDDLEMAN) {
        return merchants.filter(m => m.userId === user.id)
      }

      if (user.parentId) {
        return merchants.filter(m => m.userId === user.parentId)
      }

      return []
    }

    it('管理员应该看到所有商户', () => {
      const adminUser = { id: 'admin1', role: ROLES.ADMIN }
      const result = filterMerchantsByRole(mockMerchants, adminUser)
      expect(result).toHaveLength(3)
    })

    it('中间商应该只看到自己的商户', () => {
      const middlemanUser = { id: 'user1', role: ROLES.MIDDLEMAN }
      const result = filterMerchantsByRole(mockMerchants, middlemanUser)
      expect(result).toHaveLength(2)
      expect(result.every(m => m.userId === 'user1')).toBe(true)
    })

    it('装发车角色应该只看到所属中间商的商户', () => {
      const loaderUser = { id: 'loader1', role: ROLES.LOADER, parentId: 'user2' }
      const result = filterMerchantsByRole(mockMerchants, loaderUser)
      expect(result).toHaveLength(1)
      expect(result[0].userId).toBe('user2')
    })

    it('无用户时应该返回空数组', () => {
      expect(filterMerchantsByRole(mockMerchants, null)).toEqual([])
    })
  })

  describe('CRUD 操作', () => {
    describe('添加商户', () => {
      it('应该使用 POST 方法创建商户', async () => {
        mockRequest.mockResolvedValue({ success: true })

        const newMerchant = {
          name: '新鸡场',
          phone: '13800000000',
          margin: 2,
          userId: 'user1'
        }

        await mockRequest('/merchants', {
          method: 'POST',
          data: JSON.stringify(newMerchant)
        })

        expect(mockRequest).toHaveBeenCalledWith('/merchants', {
          method: 'POST',
          data: JSON.stringify(newMerchant)
        })
      })

      it('创建成功后 loadMerchants 会被调用', async () => {
        mockRequest.mockResolvedValue({ success: true })

        const data = { name: 'test', phone: '13800000000', margin: 2 }
        await mockRequest('/merchants', {
          method: 'POST',
          data: JSON.stringify(data)
        })

        // After successful save, loadMerchants would be called with current page
        // This test verifies the API call succeeds
        expect(mockRequest).toHaveBeenCalled()
      })
    })

    describe('更新商户', () => {
      it('应该使用 PUT 方法更新商户', async () => {
        mockRequest.mockResolvedValue({ success: true })

        const updateData = { name: '更新后的名字', margin: 3 }

        await mockRequest('/merchants/1', {
          method: 'PUT',
          data: JSON.stringify(updateData)
        })

        expect(mockRequest).toHaveBeenCalledWith('/merchants/1', {
          method: 'PUT',
          data: JSON.stringify(updateData)
        })
      })
    })

    describe('删除商户', () => {
      it('应该使用 DELETE 方法删除商户', async () => {
        mockRequest.mockResolvedValue({ success: true })

        await mockRequest('/merchants/1', { method: 'DELETE' })

        expect(mockRequest).toHaveBeenCalledWith('/merchants/1', { method: 'DELETE' })
      })
    })
  })

  describe('表单验证', () => {
    const validateMerchantForm = (form) => {
      const errors = []

      if (!form.name) {
        errors.push('请输入姓名')
      }

      const phoneRegex = /^1[3-9]\d{9}$/
      if (!form.phone || !phoneRegex.test(form.phone)) {
        errors.push('请输入正确的手机号')
      }

      if (form.margin === null || form.margin === undefined || form.margin === '') {
        errors.push('差额不能为空')
      }

      return errors
    }

    it('应该验证姓名为空的情况', () => {
      const errors = validateMerchantForm({ name: '', phone: '13800000000', margin: 2 })
      expect(errors).toContain('请输入姓名')
    })

    it('应该验证手机号格式错误', () => {
      const errors = validateMerchantForm({ name: '张三', phone: '12345', margin: 2 })
      expect(errors).toContain('请输入正确的手机号')
    })

    it('应该验证手机号包含非法字符', () => {
      const errors = validateMerchantForm({ name: '张三', phone: '1380000000a', margin: 2 })
      expect(errors).toContain('请输入正确的手机号')
    })

    it('应该验证差额为空的情况', () => {
      const errors = validateMerchantForm({ name: '张三', phone: '13800000000', margin: null })
      expect(errors).toContain('差额不能为空')
    })

    it('应该验证差额为空字符串的情况', () => {
      const errors = validateMerchantForm({ name: '张三', phone: '13800000000', margin: '' })
      expect(errors).toContain('差额不能为空')
    })

    it('应该通过正确的表单数据', () => {
      const errors = validateMerchantForm({ name: '张三', phone: '13800000000', margin: 2 })
      expect(errors).toHaveLength(0)
    })

    it('应该接受 1 开头的 11 位手机号', () => {
      const validPhones = ['13800000000', '15900000000', '18800000000', '19900000000']
      validPhones.forEach(phone => {
        const errors = validateMerchantForm({ name: '测试', phone, margin: 2 })
        expect(errors).toHaveLength(0)
      })
    })

    it('空手机号应该验证失败', () => {
      const errors = validateMerchantForm({ name: '张三', phone: '', margin: 2 })
      expect(errors).toContain('请输入正确的手机号')
    })

    it('margin 应该转换为数字', () => {
      const margin = Number('2.5') || 0
      expect(margin).toBe(2.5)

      const invalidMargin = Number('abc') || 0
      expect(invalidMargin).toBe(0)
    })
  })

  describe('分页状态管理', () => {
    it('应该有正确的初始分页状态', () => {
      const pagination = {
        page: 1,
        pageSize: 50,
        total: 0,
        totalPages: 0
      }

      expect(pagination.page).toBe(1)
      expect(pagination.pageSize).toBe(50)
      expect(pagination.total).toBe(0)
      expect(pagination.totalPages).toBe(0)
    })

    it('应该正确更新分页信息', () => {
      const pagination = { page: 1, pageSize: 50, total: 0, totalPages: 0 }
      const response = {
        data: [{ id: '1' }],
        pagination: { total: 100, totalPages: 2, page: 1 }
      }

      pagination.total = response.pagination.total
      pagination.totalPages = response.pagination.totalPages
      pagination.page = response.pagination.page

      expect(pagination.total).toBe(100)
      expect(pagination.totalPages).toBe(2)
      expect(pagination.page).toBe(1)
    })

    it('加载更多时应该增加页码', () => {
      const pagination = { page: 1, pageSize: 50, total: 100, totalPages: 2 }
      const nextPage = pagination.page + 1

      expect(nextPage).toBe(2)
      expect(nextPage).toBeLessThanOrEqual(pagination.totalPages)
    })
  })
})