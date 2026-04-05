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

// Create test app
const createTestApp = (tableName) => {
  const app = express()
  app.use(express.json())
  const router = createCrudRouter(tableName)

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
    vi.clearAllMocks()
  })

  describe('GET /departures', () => {
    it('返回分页数据', async () => {
      mockPool.query
        .mockResolvedValueOnce([[{ total: 2 }]]) // count query
        .mockResolvedValueOnce([[
          { id: '1', date: '2026-04-01', merchantDetails: '[]', userId: 'u1' },
          { id: '2', date: '2026-04-02', merchantDetails: '[]', userId: 'u2' }
        ]])

      const app = createTestApp('departures')
      const res = await request(app)
        .get('/departures')
        .query({ page: 1, pageSize: 20 })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data).toHaveLength(2)
      expect(res.body.pagination.total).toBe(2)
    })

    it('按 userId 过滤', async () => {
      mockPool.query
        .mockResolvedValueOnce([[{ total: 1 }]])
        .mockResolvedValueOnce([[
          { id: '1', date: '2026-04-01', merchantDetails: '[]', userId: 'u1' }
        ]])

      const app = createTestApp('departures')
      const res = await request(app)
        .get('/departures')
        .query({ userId: 'u1' })

      expect(res.status).toBe(200)
      expect(res.body.data).toHaveLength(1)
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('AND userId = ?'),
        expect.arrayContaining(['u1'])
      )
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
      mockPool.query.mockResolvedValueOnce([{ affectedRows: 1 }])

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
      mockPool.query.mockResolvedValueOnce([{ affectedRows: 0 }])

      const app = createTestApp('departures')
      const res = await request(app).delete('/departures/nonexistent')

      expect(res.status).toBe(404)
      expect(res.body.success).toBe(false)
    })
  })

  describe('JSON 字段序列化/反序列化', () => {
    it('反序列化存储的 JSON 字符串', async () => {
      mockPool.query
        .mockResolvedValueOnce([[{ total: 1 }]])
        .mockResolvedValueOnce([[
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
        .mockResolvedValueOnce([[{ total: 1 }]])
        .mockResolvedValueOnce([[
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
