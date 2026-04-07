import { describe, it, expect, vi, beforeEach } from 'vitest'
import express from 'express'
import request from 'supertest'
import { createCrudRouter } from '../../routes/users.js'

// Mock database pool
const mockPool = {
  query: vi.fn()
}

vi.mock('../../config/db.js', () => ({
  getPool: () => mockPool
}))

// Mock 认证中间件 - 直接设置 req.user
const mockAuthMiddleware = (user) => (req, res, next) => {
  req.user = user
  next()
}

// 创建测试 app，支持模拟不同角色用户
const createTestApp = (tableName, mockUser = { userId: 'test-user', role: 'admin' }) => {
  const app = express()
  app.use(express.json())
  const router = createCrudRouter(tableName)

  // 添加 mock 认证中间件
  app.use(mockAuthMiddleware(mockUser))

  app.get(`/${tableName}`, router.getAll)
  app.get(`/${tableName}/:id`, router.getById)
  app.get(`/${tableName}/by/:field/:value`, router.getByField)
  app.post(`/${tableName}`, router.create)
  app.put(`/${tableName}/:id`, router.update)
  app.delete(`/${tableName}/:id`, router.delete)

  return app
}

describe('CRUD 路由集成测试', () => {
  beforeEach(() => {
    // 重置 mock，确保每次测试开始时状态干净
    mockPool.query.mockReset()
    // 设置默认返回值（空结果），具体测试会覆盖
    mockPool.query.mockResolvedValue([[]])
  })

  describe('GET /departures', () => {
    it('管理员返回分页数据', async () => {
      mockPool.query
        .mockResolvedValueOnce([[{ total: 2 }]]) // count query
        .mockResolvedValueOnce([[
          { id: '1', date: '2026-04-01', merchantDetails: '[]', userId: 'u1' },
          { id: '2', date: '2026-04-02', merchantDetails: '[]', userId: 'u2' }
        ]])

      const app = createTestApp('departures', { userId: 'admin-1', role: 'admin' })
      const res = await request(app)
        .get('/departures')
        .query({ page: 1, pageSize: 20 })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data).toHaveLength(2)
      expect(res.body.pagination.total).toBe(2)
    })

    it('中间商返回自己 + 装发车人员的数据', async () => {
      // 模拟中间商用户
      const middlemanUser = { userId: 'middleman-1', role: 'middleman' }

      // count query + 查询装发车用户 + 查询主数据
      mockPool.query
        .mockResolvedValueOnce([[{ total: 2 }]]) // count query
        .mockResolvedValueOnce([[ // 查询装发车用户
          { id: 'loader-1' },
          { id: 'loader-2' }
        ]])
        .mockResolvedValueOnce([[ // 主数据查询
          { id: '1', date: '2026-04-01', merchantDetails: '[]', userId: 'middleman-1' },
          { id: '2', date: '2026-04-02', merchantDetails: '[]', userId: 'loader-1' }
        ]])

      const app = createTestApp('departures', middlemanUser)
      const res = await request(app)
        .get('/departures')
        .query({ page: 1, pageSize: 20 })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data).toHaveLength(2)

      // 验证查询了装发车用户
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining("SELECT id FROM users WHERE role = 'loader' AND parentId = ?"),
        expect.arrayContaining(['middleman-1'])
      )
    })

    it('装发车只能看自己的数据', async () => {
      const loaderUser = { userId: 'loader-1', role: 'loader' }

      mockPool.query
        .mockResolvedValueOnce([[{ total: 1 }]]) // count query
        .mockResolvedValueOnce([[
          { id: '1', date: '2026-04-01', merchantDetails: '[]', userId: 'loader-1' }
        ]])

      const app = createTestApp('departures', loaderUser)
      const res = await request(app)
        .get('/departures')
        .query({ page: 1, pageSize: 20 })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data).toHaveLength(1)

      // 验证只按自己的 userId 查询
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('AND userId = ?'),
        expect.arrayContaining(['loader-1'])
      )
    })

    it('鸡场角色无数据访问权限', async () => {
      const farmUser = { userId: 'farm-1', role: 'farm' }

      const app = createTestApp('departures', farmUser)
      const res = await request(app)
        .get('/departures')

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data).toHaveLength(0)
    })

    it('按日期范围过滤', async () => {
      mockPool.query
        .mockResolvedValueOnce([[{ total: 1 }]])
        .mockResolvedValueOnce([[
          { id: '1', date: '2026-04-01', merchantDetails: '[]', userId: 'u1' }
        ]])

      const app = createTestApp('departures')
      const res = await request(app)
        .get('/departures')
        .query({ startDate: '2026-04-01', endDate: '2026-04-30' })

      expect(res.status).toBe(200)
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('AND date >= ?'),
        expect.any(Array)
      )
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('AND date <= ?'),
        expect.any(Array)
      )
    })
  })

  describe('GET /departures/by/:field/:value', () => {
    it('白名单字段验证 - 有效字段', async () => {
      mockPool.query
        .mockResolvedValueOnce([[{ total: 1 }]])
        .mockResolvedValueOnce([[
          { id: '1', date: '2026-04-01', merchantDetails: '[]', userId: 'u1' }
        ]])

      const app = createTestApp('departures')
      const res = await request(app).get('/departures/by/userId/u1')

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
    })

    it('白名单字段验证 - 无效字段拒绝', async () => {
      const app = createTestApp('departures')
      const res = await request(app).get('/departures/by/invalidField/value')

      expect(res.status).toBe(400)
      expect(res.body.success).toBe(false)
      expect(res.body.error).toBe('无效的查询字段')
    })

    it('中间商按字段查询包含装发车数据', async () => {
      const middlemanUser = { userId: 'middleman-1', role: 'middleman' }

      mockPool.query
        .mockResolvedValueOnce([[{ total: 1 }]]) // count query
        .mockResolvedValueOnce([[ // 查询装发车用户
          { id: 'loader-1' }
        ]])
        .mockResolvedValueOnce([[{ total: 1 }]]) // count query (getByField 的 count)
        .mockResolvedValueOnce([[ // 主数据查询
          { id: '1', date: '2026-04-01', merchantDetails: '[]', userId: 'loader-1' }
        ]])

      const app = createTestApp('departures', middlemanUser)
      const res = await request(app).get('/departures/by/date/2026-04-01')

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
    })
  })

  describe('POST /departures', () => {
    it('创建记录并序列化 JSON 字段', async () => {
      mockPool.query.mockResolvedValueOnce([{ insertId: 1 }])

      const app = createTestApp('departures')
      const newRecord = {
        id: 'new-1',
        date: '2026-04-01',
        dailyQuote: 120,
        merchantDetails: [{ merchantId: 'm1', bigBoxes: 10 }],
        userId: 'u1'
      }

      const res = await request(app)
        .post('/departures')
        .send(newRecord)

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)

      // 验证 merchantDetails 被序列化为 JSON 字符串
      const callArgs = mockPool.query.mock.calls[0]
      const values = callArgs[1]
      const merchantDetailsValue = values[3] // merchantDetails is the 4th field
      expect(typeof merchantDetailsValue).toBe('string')
      expect(JSON.parse(merchantDetailsValue)).toEqual([{ merchantId: 'm1', bigBoxes: 10 }])
    })

    it('空数组序列化', async () => {
      mockPool.query.mockResolvedValueOnce([{ insertId: 1 }])

      const app = createTestApp('departures')
      const newRecord = {
        id: 'new-1',
        date: '2026-04-01',
        merchantDetails: [],
        userId: 'u1'
      }

      const res = await request(app)
        .post('/departures')
        .send(newRecord)

      expect(res.status).toBe(200)

      // 验证空数组被序列化为 '[]'
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO departures'),
        expect.arrayContaining(['[]'])
      )
    })
  })

  describe('DELETE /departures/:id', () => {
    it('软删除记录', async () => {
      // mockPool.query: 1. 查询现有记录 2. 执行删除
      mockPool.query
        .mockResolvedValueOnce([[{ id: 'record-1', userId: 'test-user', merchantDetails: '[]' }]])
        .mockResolvedValueOnce([{ affectedRows: 1 }])

      const app = createTestApp('departures')
      const res = await request(app).delete('/departures/record-1')

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE departures SET deletedAt = ?'),
        expect.arrayContaining(['record-1'])
      )
    })

    it('记录不存在返回 404', async () => {
      // 第一次调用：查询记录是否存在（返回空）
      // 第二次调用：不需要，因为已经返回 404 了
      mockPool.query.mockResolvedValueOnce([[]])

      const app = createTestApp('departures')
      const res = await request(app).delete('/departures/nonexistent')

      expect(res.status).toBe(404)
      expect(res.body.success).toBe(false)
    })

    it('无权删除他人记录返回 403', async () => {
      // 查询返回的记录不属于当前用户
      mockPool.query.mockResolvedValueOnce([[{ id: 'record-1', userId: 'other-user', merchantDetails: '[]' }]])

      const app = createTestApp('departures', { userId: 'test-user', role: 'loader' })
      const res = await request(app).delete('/departures/record-1')

      expect(res.status).toBe(403)
      expect(res.body.success).toBe(false)
    })
  })

  describe('JSON 字段序列化/反序列化', () => {
    it('反序列化存储的 JSON 字符串', async () => {
      mockPool.query
        .mockResolvedValueOnce([[{ total: 1 }]]) // count query
        .mockResolvedValueOnce([[ // data query
          {
            id: '1',
            date: '2026-04-01',
            merchantDetails: '[{"merchantId":"m1","bigBoxes":10}]',
            userId: 'u1'
          }
        ]])

      const app = createTestApp('departures')
      const res = await request(app).get('/departures')

      expect(res.status).toBe(200)
      // merchantDetails 应该被反序列化为对象
      expect(res.body.data[0].merchantDetails).toEqual([{ merchantId: 'm1', bigBoxes: 10 }])
    })

    it('已解析的对象保持不变', async () => {
      mockPool.query
        .mockResolvedValueOnce([[{ total: 1 }]]) // count query
        .mockResolvedValueOnce([[ // data query
          {
            id: '1',
            date: '2026-04-01',
            merchantDetails: [{ merchantId: 'm1', bigBoxes: 10 }],
            userId: 'u1'
          }
        ]])

      const app = createTestApp('departures')
      const res = await request(app).get('/departures')

      expect(res.status).toBe(200)
      expect(res.body.data[0].merchantDetails).toEqual([{ merchantId: 'm1', bigBoxes: 10 }])
    })
  })
})
