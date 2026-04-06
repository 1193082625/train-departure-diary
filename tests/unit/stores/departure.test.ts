import { describe, it, expect } from 'vitest'
import { ROLES } from '@/enums/roles'

// 测试数据
const mockUsers = [
  { id: 'admin-1', role: ROLES.ADMIN },
  { id: 'middleman-1', role: ROLES.MIDDLEMAN },
  { id: 'middleman-2', role: ROLES.MIDDLEMAN },
  { id: 'loader-1', role: ROLES.LOADER, parentId: 'middleman-1' },
  { id: 'loader-2', role: ROLES.LOADER, parentId: 'middleman-1' },
  { id: 'loader-3', role: ROLES.LOADER, parentId: 'middleman-2' },
  { id: 'farm-1', role: ROLES.FARM, parentId: 'middleman-1' }
]

const mockRecords = [
  { id: '1', userId: 'middleman-1', date: '2026-04-01' },
  { id: '2', userId: 'middleman-1', date: '2026-04-02' },
  { id: '3', userId: 'loader-1', date: '2026-04-03' },
  { id: '4', userId: 'loader-2', date: '2026-04-04' },
  { id: '5', userId: 'middleman-2', date: '2026-04-05' },
  { id: '6', userId: 'loader-3', date: '2026-04-06' },
  { id: '7', userId: 'farm-1', date: '2026-04-07' }
]

// 模拟 filteredRecords 计算逻辑 (从 store/departure.ts 复制)
const computeFilteredRecords = (user, users, records, currentMiddlemanId = null) => {
  if (!user) return []

  // 管理员：根据选中中间商过滤
  if (user.role === ROLES.ADMIN) {
    if (!currentMiddlemanId) {
      return records
    }
    return records.filter(r => r.userId === currentMiddlemanId)
  }

  // 中间商：返回自己的 + 名下所有装发车用户添加的记录
  if (user.role === ROLES.MIDDLEMAN) {
    const loaderUserIds = users
      .filter(u => u.role === ROLES.LOADER && u.parentId === user.id)
      .map(u => u.id)
    return records.filter(r =>
      r.userId === user.id || loaderUserIds.includes(r.userId)
    )
  }

  // 装发车：返回自己的
  if (user.role === ROLES.LOADER) {
    return records.filter(r => r.userId === user.id)
  }

  // 鸡场：无发车记录
  return []
}

describe('departure Store 角色过滤逻辑测试', () => {
  describe('ADMIN 角色', () => {
    it('无 middlemanId 时返回全部记录', () => {
      const user = mockUsers.find(u => u.id === 'admin-1')
      const result = computeFilteredRecords(user, mockUsers, mockRecords, null)
      expect(result).toHaveLength(7)
    })

    it('有 middlemanId 时按中间商过滤 (只过滤 userId 精确匹配)', () => {
      const user = mockUsers.find(u => u.id === 'admin-1')
      // 管理员按 middlemanId 过滤只返回该中间商自己的记录，不含下属 loader
      const result = computeFilteredRecords(user, mockUsers, mockRecords, 'middleman-1')
      expect(result).toHaveLength(2) // 只有 middleman-1 自己创建的记录
      expect(result.every(r => r.userId === 'middleman-1')).toBe(true)
    })

    it('只看到单个中间商的数据', () => {
      const user = mockUsers.find(u => u.id === 'admin-1')
      const result = computeFilteredRecords(user, mockUsers, mockRecords, 'middleman-2')
      expect(result).toHaveLength(1) // 只有 middleman-2 自己
    })
  })

  describe('MIDDLEMAN 角色', () => {
    it('返回自己 + 下属 loader 的记录 (不含 farm)', () => {
      const user = mockUsers.find(u => u.id === 'middleman-1')
      const result = computeFilteredRecords(user, mockUsers, mockRecords, null)
      // 中间商只包含自己 + LOADER 角色的记录，不含 FARM
      expect(result.map(r => r.userId).sort()).toEqual(['loader-1', 'loader-2', 'middleman-1', 'middleman-1'])
    })

    it('不返回其他中间商的记录', () => {
      const user = mockUsers.find(u => u.id === 'middleman-2')
      const result = computeFilteredRecords(user, mockUsers, mockRecords, null)
      expect(result).toHaveLength(2) // middleman-2 + loader-3
      expect(result.every(r => r.userId === 'middleman-2' || r.userId === 'loader-3')).toBe(true)
    })
  })

  describe('LOADER 角色', () => {
    it('只返回自己的记录', () => {
      const user = mockUsers.find(u => u.id === 'loader-1')
      const result = computeFilteredRecords(user, mockUsers, mockRecords, null)
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('3')
    })

    it('不返回其他 loader 或中间商的记录', () => {
      const user = mockUsers.find(u => u.id === 'loader-2')
      const result = computeFilteredRecords(user, mockUsers, mockRecords, null)
      expect(result).toHaveLength(1)
      expect(result[0].userId).toBe('loader-2')
    })
  })

  describe('FARM 角色', () => {
    it('返回空数组', () => {
      const user = mockUsers.find(u => u.id === 'farm-1')
      const result = computeFilteredRecords(user, mockUsers, mockRecords, null)
      expect(result).toHaveLength(0)
    })
  })

  describe('边界情况', () => {
    it('user 为 null 时返回空数组', () => {
      const result = computeFilteredRecords(null, mockUsers, mockRecords, null)
      expect(result).toHaveLength(0)
    })

    it('空记录列表返回空数组', () => {
      const user = mockUsers.find(u => u.id === 'middleman-1')
      const result = computeFilteredRecords(user, mockUsers, [], null)
      expect(result).toHaveLength(0)
    })

    it('loader 无 parentId 时只返回自己的记录', () => {
      const loaderNoParent = { id: 'loader-x', role: ROLES.LOADER, parentId: null }
      const allUsers = [...mockUsers, loaderNoParent]
      const recordsWithLoaderX = [...mockRecords, { id: '99', userId: 'loader-x' }]
      const user = allUsers.find(u => u.id === 'loader-x')
      const result = computeFilteredRecords(user, allUsers, recordsWithLoaderX, null)
      expect(result).toHaveLength(1)
      expect(result[0].userId).toBe('loader-x')
    })
  })
})
