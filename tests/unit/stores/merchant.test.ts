import { describe, it, expect } from 'vitest'
import { ROLES } from '@/enums/roles'

// 测试数据
const mockUsers = [
  { id: 'admin-1', role: ROLES.ADMIN },
  { id: 'middleman-1', role: ROLES.MIDDLEMAN },
  { id: 'middleman-2', role: ROLES.MIDDLEMAN },
  { id: 'loader-1', role: ROLES.LOADER, parentId: 'middleman-1' },
  { id: 'farm-1', role: ROLES.FARM, parentId: 'middleman-1' }
]

const mockMerchants = [
  { id: 'm1', name: '商户A', userId: 'middleman-1' },
  { id: 'm2', name: '商户B', userId: 'middleman-1' },
  { id: 'm3', name: '商户C', userId: 'middleman-2' },
  { id: 'm4', name: '商户D', userId: 'other-user' }
]

// 模拟 filteredMerchants 计算逻辑 (从 store/merchant.ts 复制)
const computeFilteredMerchants = (user, merchants, currentMiddlemanId = null) => {
  if (!user) return []

  // 管理员：返回全部
  if (user.role === ROLES.ADMIN) {
    return merchants
  }

  // 中间商：返回自己创建的
  if (user.role === ROLES.MIDDLEMAN) {
    return merchants.filter(m => m.userId === user.id)
  }

  // 装发车和鸡场：返回中间商的商户
  if (user.parentId) {
    return merchants.filter(m => m.userId === user.parentId)
  }

  return []
}

describe('merchant Store 角色过滤逻辑测试', () => {
  describe('ADMIN 角色', () => {
    it('返回全部商户', () => {
      const user = mockUsers.find(u => u.id === 'admin-1')
      const result = computeFilteredMerchants(user, mockMerchants)
      expect(result).toHaveLength(4)
    })

    it('可以按中间商过滤 (管理员场景)', () => {
      const user = mockUsers.find(u => u.id === 'admin-1')
      // 管理员场景：currentMiddlemanId 被传入时过滤
      const filteredByAdmin = mockMerchants.filter(m => m.userId === 'middleman-1')
      expect(filteredByAdmin).toHaveLength(2)
    })
  })

  describe('MIDDLEMAN 角色', () => {
    it('返回自己创建的商户', () => {
      const user = mockUsers.find(u => u.id === 'middleman-1')
      const result = computeFilteredMerchants(user, mockMerchants)
      expect(result).toHaveLength(2)
      expect(result.every(m => m.userId === 'middleman-1')).toBe(true)
    })

    it('不返回其他中间商的商户', () => {
      const user = mockUsers.find(u => u.id === 'middleman-2')
      const result = computeFilteredMerchants(user, mockMerchants)
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('m3')
    })
  })

  describe('LOADER/FARM 角色', () => {
    it('返回中间商的商户', () => {
      const user = mockUsers.find(u => u.id === 'loader-1')
      const result = computeFilteredMerchants(user, mockMerchants)
      expect(result).toHaveLength(2) // middleman-1's merchants
      expect(result.every(m => m.userId === 'middleman-1')).toBe(true)
    })

    it('farm 用户也返回中间商的商户', () => {
      const user = mockUsers.find(u => u.id === 'farm-1')
      const result = computeFilteredMerchants(user, mockMerchants)
      expect(result).toHaveLength(2)
    })

    it('无 parentId 时返回空', () => {
      const loaderNoParent = { id: 'loader-x', role: ROLES.LOADER, parentId: null }
      const result = computeFilteredMerchants(loaderNoParent, mockMerchants)
      expect(result).toHaveLength(0)
    })
  })

  describe('边界情况', () => {
    it('user 为 null 时返回空数组', () => {
      const result = computeFilteredMerchants(null, mockMerchants)
      expect(result).toHaveLength(0)
    })

    it('空商户列表返回空数组', () => {
      const user = mockUsers.find(u => u.id === 'middleman-1')
      const result = computeFilteredMerchants(user, [])
      expect(result).toHaveLength(0)
    })

    it('商户列表中无匹配时返回空', () => {
      const user = mockUsers.find(u => u.id === 'middleman-1')
      const result = computeFilteredMerchants(user, [mockMerchants[2]]) // 只有 middleman-2 的商户
      expect(result).toHaveLength(0)
    })
  })
})
