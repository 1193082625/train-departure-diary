/**
 * 通用 CRUD 路由工厂
 * 根据表名和配置生成标准的 RESTful API
 */

import { getPool } from '../config/db.js'
import bcrypt from 'bcryptjs'

// JSON 字段列表
const JSON_FIELDS = ['merchantDetails', 'truckRows', 'loadingWorkerIds', 'merchantAmount']

// 允许查询的字段白名单（防止 SQL 注入）
const ALLOWED_QUERY_FIELDS = [
  'id', 'phone', 'userId', 'date', 'role', 'parentId', 'code',
  'name', 'type', 'targetId', 'targetType', 'createdAt',
  'inviteCode', 'invitedBy', 'workerId', 'usedBy', 'creatorId'
]

/**
 * 根据 JWT token 中的用户信息获取查询过滤器
 * 用于数据隔离
 */
const getQueryFilter = (req) => {
  const { userId, role } = req.user || {}

  // 如果没有用户信息（可选认证场景），返回 null 表示不限制
  if (!userId || !role) {
    return { userId: null, isAdmin: false }
  }

  // 管理员：可指定 userId 查询某个中间商的数据，不指定则查全部
  if (role === 'admin') {
    return { userId: req.query.userId || null, isAdmin: true }
  }

  // 中间商：查自己的数据
  if (role === 'middleman') {
    return { userId, role, isMiddleman: true }
  }

  // 装发车：只能查自己的
  if (role === 'loader') {
    return { userId }
  }

  // 鸡场：无发车记录权限（后续路由可以根据 table 拒绝访问）
  return { userId: null, noAccess: true }
}

// 手机号正则校验
const PHONE_REGEX = /^1[3-9]\d{9}$/

// 密码加密
const hashPassword = async (password) => {
  if (!password) return null
  return await bcrypt.hash(password, 10)
}

// 密码校验（兼容旧明文密码）
const verifyPassword = async (inputPassword, storedPassword) => {
  if (!inputPassword || !storedPassword) return false
  // bcrypt 哈希通常以 $2a$, $2b$ 开头，长度 60
  if (storedPassword.length < 32 || !storedPassword.startsWith('$2')) {
    // 旧明文密码，直接比较
    return storedPassword === inputPassword
  }
  return await bcrypt.compare(inputPassword, storedPassword)
}

// 校验手机号
const validatePhone = (phone) => {
  return PHONE_REGEX.test(phone)
}

/**
 * 序列化数据
 */
const serializeData = (data) => {
  if (!data || typeof data !== 'object') return data
  const result = { ...data }

  for (const field of JSON_FIELDS) {
    if (result[field] !== undefined) {
      if (typeof result[field] === 'object') {
        result[field] = JSON.stringify(result[field])
      }
      if (Array.isArray(result[field]) && result[field].length === 0) {
        result[field] = '[]'
      }
    }
  }

  delete result._id
  return result
}

/**
 * 反序列化数据
 */
const deserializeData = (data) => {
  if (!data || typeof data !== 'object') return data
  const result = { ...data }

  for (const field of JSON_FIELDS) {
    if (result[field] !== undefined && result[field] !== null) {
      try {
        if (typeof result[field] === 'string') {
          result[field] = JSON.parse(result[field])
        }
      } catch (e) {
        // 保持原值
      }
    }
  }

  return result
}

/**
 * 创建通用 CRUD 路由
 */
export const createCrudRouter = (tableName) => {
  const router = {
    // GET /:table - 查询所有（分页）
    getAll: async (req, res) => {
      try {
        const pool = getPool()
        const page = Math.max(1, parseInt(req.query.page) || 1)
        const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize) || 20))
        const offset = (page - 1) * pageSize

        // 获取 JWT 中的用户信息和角色过滤逻辑
        const filter = getQueryFilter(req)

        // 鸡场角色无数据访问权限
        if (filter.noAccess) {
          return res.json({
            success: true,
            data: [],
            pagination: { page, pageSize, total: 0, totalPages: 0 }
          })
        }

        // 构建 WHERE 条件
        let whereClause = 'deletedAt IS NULL'
        let queryParams = []

        // users 表的主键是 id，其他表的主键是 userId
        const userIdColumn = tableName === 'users' ? 'id' : 'userId'

        // 如果是管理员且没有指定 userId，则不限制（查全部）
        // 如果是管理员指定了 userId，则按指定 userId 过滤
        // 如果是中间商或装发车，则只能查自己的数据
        if (filter.userId) {
          whereClause += ` AND ${userIdColumn} = ?`
          queryParams.push(filter.userId)
        } else if (!filter.isAdmin) {
          // 非管理员且没有 userId（不应该出现），拒绝访问
          return res.status(403).json({ success: false, error: '无权限访问该资源' })
        }

        // 日期范围过滤
        const startDate = req.query.startDate
        const endDate = req.query.endDate

        if (startDate) {
          whereClause += ' AND date >= ?'
          queryParams.push(startDate)
        }

        if (endDate) {
          whereClause += ' AND date <= ?'
          queryParams.push(endDate)
        }

        // 查询总数
        const [countResult] = await pool.query(
          `SELECT COUNT(*) as total FROM ${tableName} WHERE ${whereClause}`,
          queryParams
        )
        const total = countResult[0].total

        // 查询分页数据（使用 id 排序，因为不是所有表都有 createdAt）
        const [rows] = await pool.query(
          `SELECT * FROM ${tableName} WHERE ${whereClause} ORDER BY id DESC LIMIT ? OFFSET ?`,
          [...queryParams, pageSize, offset]
        )
        const data = (rows || []).map(row => deserializeData(row))

        res.json({
          success: true,
          data,
          pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) }
        })
      } catch (err) {
        console.error(`查询 ${tableName} 失败:`, err)
        res.status(500).json({ success: false, error: err.message })
      }
    },

    // GET /:table/:id - 根据 ID 查询
    getById: async (req, res) => {
      try {
        const pool = getPool()
        const [rows] = await pool.query(
          `SELECT * FROM ${tableName} WHERE id = ? AND deletedAt IS NULL`,
          [req.params.id]
        )
        if (rows.length === 0) {
          return res.status(404).json({ success: false, error: '记录不存在' })
        }
        res.json({ success: true, data: deserializeData(rows[0]) })
      } catch (err) {
        console.error(`查询 ${tableName} 失败:`, err)
        res.status(500).json({ success: false, error: err.message })
      }
    },

    // GET /:table/by/:field/:value - 根据字段查询（分页）
    getByField: async (req, res) => {
      try {
        const pool = getPool()
        const { field, value } = req.params
        const page = Math.max(1, parseInt(req.query.page) || 1)
        const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize) || 20))
        const offset = (page - 1) * pageSize

        // 白名单验证，防止 SQL 注入
        if (!ALLOWED_QUERY_FIELDS.includes(field)) {
          return res.status(400).json({ success: false, error: '无效的查询字段' })
        }

        // 查询总数
        const [countResult] = await pool.query(
          `SELECT COUNT(*) as total FROM ${tableName} WHERE ${field} = ? AND deletedAt IS NULL`,
          [value]
        )
        const total = countResult[0].total

        // 查询分页数据（使用 id 排序，因为不是所有表都有 createdAt）
        const [rows] = await pool.query(
          `SELECT * FROM ${tableName} WHERE ${field} = ? AND deletedAt IS NULL ORDER BY id DESC LIMIT ? OFFSET ?`,
          [value, pageSize, offset]
        )
        const data = (rows || []).map(row => deserializeData(row))

        res.json({
          success: true,
          data,
          pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) }
        })
      } catch (err) {
        console.error(`查询 ${tableName} 失败:`, err)
        res.status(500).json({ success: false, error: err.message })
      }
    },

    // POST /:table - 新增
    create: async (req, res) => {
      try {
        const pool = getPool()
        console.log(`[DEBUG] POST /${tableName} body:`, JSON.stringify(req.body).substring(0, 200))
        let data = serializeData(req.body)

        // users 表特殊处理：密码加密和手机号校验
        if (tableName === 'users') {
          // 手机号校验
          if (data.phone && !validatePhone(data.phone)) {
            return res.status(400).json({ success: false, error: '手机号格式不正确' })
          }
          // 密码加密
          if (data.password) {
            data.password = await hashPassword(data.password)
          }
        }

        console.log(`[DEBUG] serializeData result, fields:`, Object.keys(data))
        const fields = Object.keys(data)
        const placeholders = fields.map(() => '?').join(', ')
        const values = fields.map(f => data[f])

        await pool.query(
          `INSERT INTO ${tableName} (${fields.join(', ')}) VALUES (${placeholders})`,
          values
        )
        res.json({ success: true, data: req.body })
      } catch (err) {
        console.error(`新增 ${tableName} 失败:`, err)
        res.status(500).json({ success: false, error: err.message })
      }
    },

    // PUT /:table/:id - 更新
    update: async (req, res) => {
      try {
        const pool = getPool()
        let data = serializeData(req.body)

        // users 表特殊处理：密码加密和手机号校验
        if (tableName === 'users') {
          // 手机号校验
          if (data.phone && !validatePhone(data.phone)) {
            return res.status(400).json({ success: false, error: '手机号格式不正确' })
          }
          // 密码加密（只有当密码不是哈希时才加密，避免重复加密）
          if (data.password && !data.password.startsWith('$2')) {
            data.password = await hashPassword(data.password)
          }
        }

        const fields = Object.keys(data)
        const sets = fields.map(f => `${f} = ?`).join(', ')
        const values = fields.map(f => data[f])

        const [result] = await pool.query(
          `UPDATE ${tableName} SET ${sets} WHERE id = ?`,
          [...values, req.params.id]
        )

        if (result.affectedRows === 0) {
          return res.status(404).json({ success: false, error: '记录不存在' })
        }
        res.json({ success: true, data: req.body })
      } catch (err) {
        console.error(`更新 ${tableName} 失败:`, err)
        res.status(500).json({ success: false, error: err.message })
      }
    },

    // DELETE /:table/:id - 逻辑删除
    delete: async (req, res) => {
      try {
        const pool = getPool()
        const deletedAt = new Date().toISOString()
        const [result] = await pool.query(
          `UPDATE ${tableName} SET deletedAt = ? WHERE id = ? AND deletedAt IS NULL`,
          [deletedAt, req.params.id]
        )

        if (result.affectedRows === 0) {
          return res.status(404).json({ success: false, error: '记录不存在或已删除' })
        }
        res.json({ success: true })
      } catch (err) {
        console.error(`删除 ${tableName} 失败:`, err)
        res.status(500).json({ success: false, error: err.message })
      }
    },

    // DELETE /:table - 清空表（逻辑删除）
    deleteAll: async (req, res) => {
      try {
        const pool = getPool()
        const deletedAt = new Date().toISOString()
        await pool.query(`UPDATE ${tableName} SET deletedAt = ? WHERE deletedAt IS NULL`, [deletedAt])
        res.json({ success: true })
      } catch (err) {
        console.error(`清空 ${tableName} 失败:`, err)
        res.status(500).json({ success: false, error: err.message })
      }
    },

    // PUT /:table/by/:field/:value - 根据字段更新
    updateByField: async (req, res) => {
      try {
        const pool = getPool()
        const { field, value } = req.params

        // 白名单验证，防止 SQL 注入
        if (!ALLOWED_QUERY_FIELDS.includes(field)) {
          return res.status(400).json({ success: false, error: '无效的查询字段' })
        }

        const data = serializeData(req.body)
        const fields = Object.keys(data)
        const sets = fields.map(f => `${f} = ?`).join(', ')
        const values = fields.map(f => data[f])

        const [result] = await pool.query(
          `UPDATE ${tableName} SET ${sets} WHERE ${field} = ? AND deletedAt IS NULL`,
          [...values, value]
        )

        if (result.affectedRows === 0) {
          return res.status(404).json({ success: false, error: '记录不存在' })
        }
        res.json({ success: true, data: req.body })
      } catch (err) {
        console.error(`更新 ${tableName} 失败:`, err)
        res.status(500).json({ success: false, error: err.message })
      }
    }
  }

  return router
}

export default createCrudRouter
