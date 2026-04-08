/**
 * 通用 CRUD 路由工厂
 * 根据表名和配置生成标准的 RESTful API
 */

import { getPool } from '../config/db.js'
import bcrypt from 'bcryptjs'
import { AUTH_CONFIG } from '../config/auth.js'

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
 *
 * 支持三种模式：
 * 1. JWT 鉴权：通过 JWT 中的 userId/role 进行过滤
 * 2. userId 参数查询：通过 req.query.userId 进行过滤（allowUserIdQuery=true 时生效）
 * 3. 无鉴权：返回 null 表示不限制（仅管理员场景）
 */
const getQueryFilter = (req) => {
  // 优先从 JWT 获取
  let { userId, role } = req.user || {}

  // 兼容旧版：如果没有 JWT，尝试从 query.userId 获取
  if (!userId && AUTH_CONFIG.allowUserIdQuery && req.query.userId) {
    userId = req.query.userId
    // 标记为通过 userId 参数查询，role 设为特殊值
    role = 'query_userId'
  }

  if (!userId || !role) {
    return { userId: null, isAdmin: false }
  }

  // 管理员
  if (role === 'admin') {
    return { userId: req.query.userId || null, isAdmin: true }
  }

  // 通过 userId 参数指定的查询（视为中间商权限）
  if (role === 'query_userId') {
    return { userId, role: 'middleman', isMiddleman: true, isQueryUserId: true }
  }

  // 中间商
  if (role === 'middleman') {
    return { userId, role, isMiddleman: true }
  }

  // 装发车
  if (role === 'loader') {
    return { userId }
  }

  return { userId: null, noAccess: true }
}

// 通用权限检查函数 - 验证用户是否有权限访问/修改记录
const checkOwnership = (record, user, req) => {
  if (!record) return false

  // 如果 user 为空（通过 userId 参数查询场景）
  if (!user) {
    // 从 query.userId 获取 userId 进行校验
    const queryUserId = req.query.userId
    if (queryUserId) {
      return record.userId === queryUserId
    }
    return false
  }

  // 管理员可以访问所有记录
  if (user.role === 'admin') return true

  // 中间商和装发车只能访问自己的数据
  if (user.role === 'middleman' || user.role === 'loader') {
    return record.userId === user.userId
  }

  // 鸡场角色不允许访问业务数据
  return false
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

   // 删除不应由前端控制的字段
   delete result._id
   delete result.updatedAt
   delete result.deletedAt
   delete result.createdAt  // 创建时间也应由后端管理
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
        // 如果是中间商，则查自己和装发车人员的数据
        // 如果是装发车，则只能查自己的数据
        if (filter.isMiddleman) {
          // 中间商：先查询所有 parentId 为当前中间商的装发车用户ID
          const [loaderRows] = await pool.query(
            "SELECT id FROM users WHERE role = 'loader' AND parentId = ? AND deletedAt IS NULL",
            [filter.userId]
          )
          const loaderIds = loaderRows.map(row => row.id)
          const allUserIds = [filter.userId, ...loaderIds]

          if (allUserIds.length === 1) {
            // 只有中间商自己
            whereClause += ` AND ${userIdColumn} = ?`
            queryParams.push(filter.userId)
          } else {
            // 中间商 + 装发车人员
            const placeholders = allUserIds.map(() => '?').join(', ')
            whereClause += ` AND ${userIdColumn} IN (${placeholders})`
            queryParams.push(...allUserIds)
          }
        } else if (filter.userId) {
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
        res.status(500).json({ success: false, error: '服务器内部错误' })
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

        // 权限检查：验证用户是否有权访问该记录
        if (!checkOwnership(rows[0], req.user, req)) {
          return res.status(403).json({ success: false, error: '无权限访问该记录' })
        }

        res.json({ success: true, data: deserializeData(rows[0]) })
      } catch (err) {
        console.error(`查询 ${tableName} 失败:`, err)
        res.status(500).json({ success: false, error: '服务器内部错误' })
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

        // 获取用户权限过滤
        const filter = getQueryFilter(req)

        // 鸡场角色无数据访问权限
        if (filter.noAccess) {
          return res.json({
            success: true,
            data: [],
            pagination: { page, pageSize, total: 0, totalPages: 0 }
          })
        }

        // 构建查询条件，添加 userId 过滤
        let whereClause = `${field} = ? AND deletedAt IS NULL`
        let queryParams = [value]

        // 中间商需要添加自己和装发车人员的 userId 过滤
        if (filter.isMiddleman) {
          const [loaderRows] = await pool.query(
            "SELECT id FROM users WHERE role = 'loader' AND parentId = ? AND deletedAt IS NULL",
            [filter.userId]
          )
          const loaderIds = loaderRows.map(row => row.id)
          const allUserIds = [filter.userId, ...loaderIds]
          const userIdColumn = tableName === 'users' ? 'id' : 'userId'

          if (allUserIds.length === 1) {
            whereClause += ` AND ${userIdColumn} = ?`
            queryParams.push(filter.userId)
          } else {
            const placeholders = allUserIds.map(() => '?').join(', ')
            whereClause += ` AND ${userIdColumn} IN (${placeholders})`
            queryParams.push(...allUserIds)
          }
        } else if (!filter.isAdmin && filter.userId) {
          // 装发车等其他角色
          const userIdColumn = tableName === 'users' ? 'id' : 'userId'
          whereClause += ` AND ${userIdColumn} = ?`
          queryParams.push(filter.userId)
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
        res.status(500).json({ success: false, error: '服务器内部错误' })
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

        // 设置创建时间
        const now = new Date().toISOString()
        data.createdAt = now
        data.updatedAt = now

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
        res.status(500).json({ success: false, error: '服务器内部错误' })
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

        // 权限检查：验证用户是否有权修改该记录
        const [existing] = await pool.query(
          `SELECT * FROM ${tableName} WHERE id = ? AND deletedAt IS NULL`,
          [req.params.id]
        )
        if (existing.length === 0) {
          return res.status(404).json({ success: false, error: '记录不存在' })
        }
        if (!checkOwnership(existing[0], req.user, req)) {
          return res.status(403).json({ success: false, error: '无权限修改该记录' })
        }

        // 自动设置 updatedAt
        const updatedAt = new Date().toISOString()
        const fields = Object.keys(data)
        const sets = fields.map(f => `${f} = ?`).join(', ')
        const values = fields.map(f => data[f])

        const [result] = await pool.query(
          `UPDATE ${tableName} SET ${sets}, updatedAt = ? WHERE id = ?`,
          [...values, updatedAt, req.params.id]
        )

        if (result.affectedRows === 0) {
          return res.status(404).json({ success: false, error: '记录不存在' })
        }
        res.json({ success: true, data: req.body })
      } catch (err) {
        console.error(`更新 ${tableName} 失败:`, err)
        res.status(500).json({ success: false, error: '服务器内部错误' })
      }
    },

    // DELETE /:table/:id - 逻辑删除
    delete: async (req, res) => {
      try {
        const pool = getPool()

        // 权限检查：验证用户是否有权删除该记录
        const [existing] = await pool.query(
          `SELECT * FROM ${tableName} WHERE id = ? AND deletedAt IS NULL`,
          [req.params.id]
        )
        if (existing.length === 0) {
          return res.status(404).json({ success: false, error: '记录不存在或已删除' })
        }
        if (!checkOwnership(existing[0], req.user, req)) {
          return res.status(403).json({ success: false, error: '无权限删除该记录' })
        }

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
        res.status(500).json({ success: false, error: '服务器内部错误' })
      }
    },

    // DELETE /:table - 清空表（逻辑删除）
    deleteAll: async (req, res) => {
      try {
        const pool = getPool()
        const filter = getQueryFilter(req)

        // 鸡场角色不允许删除
        if (filter.noAccess) {
          return res.status(403).json({ success: false, error: '无权限删除该资源' })
        }

        // 构建 WHERE 条件
        let whereClause = 'deletedAt IS NULL'
        let queryParams = []

        const userIdColumn = tableName === 'users' ? 'id' : 'userId'

        // 非管理员需要按 userId 过滤（只能删除自己的数据）
        if (!filter.isAdmin && filter.userId) {
          whereClause += ` AND ${userIdColumn} = ?`
          queryParams.push(filter.userId)
        } else if (!filter.isAdmin) {
          // 非管理员且无 userId（不应该出现）
          return res.status(403).json({ success: false, error: '无权限删除该资源' })
        }

        const deletedAt = new Date().toISOString()
        await pool.query(
          `UPDATE ${tableName} SET deletedAt = ? WHERE ${whereClause}`,
          [deletedAt, ...queryParams]
        )
        res.json({ success: true })
      } catch (err) {
        console.error(`清空 ${tableName} 失败:`, err)
        res.status(500).json({ success: false, error: '服务器内部错误' })
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

        // 自动设置 updatedAt
        const updatedAt = new Date().toISOString()

        const [result] = await pool.query(
          `UPDATE ${tableName} SET ${sets}, updatedAt = ? WHERE ${field} = ? AND deletedAt IS NULL`,
          [...values, updatedAt, value]
        )

        if (result.affectedRows === 0) {
          return res.status(404).json({ success: false, error: '记录不存在' })
        }
        res.json({ success: true, data: req.body })
      } catch (err) {
        console.error(`更新 ${tableName} 失败:`, err)
        res.status(500).json({ success: false, error: '服务器内部错误' })
      }
    }
  }

  return router
}

export default createCrudRouter
