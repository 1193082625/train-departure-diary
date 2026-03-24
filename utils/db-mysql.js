/**
 * MySQL 数据库操作封装
 * 用于替代 uniCloud 云数据库
 *
 * 提供与 utils/db.js 相同的接口，便于无缝切换
 */

import dbConfig from '@/config/database'

// 连接池
let pool = null
let dbInitStatus = 'pending' // pending | success | failed
let initPromise = null

// JSON 字段列表 - 这些字段需要序列化/反序列化
const JSON_FIELDS = ['merchantDetails', 'truckRows', 'loadingWorkerIds', 'merchantAmount']

/**
 * 获取数据库初始化状态
 */
export const getDbInitStatus = () => dbInitStatus

/**
 * 序列化数据 - 将 JSON 字段转换为字符串
 */
const serializeData = (data) => {
  if (!data || typeof data !== 'object') return data
  const result = { ...data }

  for (const field of JSON_FIELDS) {
    if (result[field] !== undefined) {
      if (typeof result[field] === 'object') {
        result[field] = JSON.stringify(result[field])
      }
      // 如果是空数组或空对象，也转为字符串
      if (Array.isArray(result[field]) && result[field].length === 0) {
        result[field] = '[]'
      }
    }
  }

  // 移除 _id 字段（云端自动生成，不需要）
  delete result._id

  return result
}

/**
 * 反序列化数据 - 将 JSON 字符串字段转换为对象
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
        // 解析失败，保持原值
        console.warn(`解析字段 ${field} 失败:`, e)
      }
    }
  }

  return result
}

/**
 * 等待数据库就绪
 */
export const waitForDB = async (timeout = 10000) => {
  const startTime = Date.now()
  while (Date.now() - startTime < timeout) {
    const dbInstance = await initDB()
    if (dbInstance) return dbInstance
    await new Promise(resolve => setTimeout(resolve, 200))
  }
  throw new Error('数据库初始化超时')
}

/**
 * 初始化数据库连接（幂等）
 */
export const initDB = () => {
  // 如果已有初始化 Promise 且数据库已就绪，直接返回
  if (initPromise && pool) {
    return initPromise
  }

  // 如果已有初始化 Promise 但数据库还未就绪，返回该 Promise
  if (initPromise) {
    return initPromise
  }

  initPromise = new Promise((resolve, reject) => {
    try {
      // 动态导入 mysql2
      import('mysql2/promise').then(({ default: mysql }) => {
        // 创建连接池
        pool = mysql.createPool({
          host: dbConfig.host,
          port: dbConfig.port,
          user: dbConfig.user,
          password: dbConfig.password,
          database: dbConfig.database,
          waitForConnections: dbConfig.pool.waitForConnections,
          connectionLimit: dbConfig.pool.connectionLimit,
          connectTimeout: dbConfig.pool.connectTimeout,
          idleTimeout: dbConfig.pool.idleTimeout,
          charset: dbConfig.charset,
          timezone: dbConfig.timezone
        })

        // 测试连接
        pool.getConnection()
          .then(conn => {
            conn.release()
            dbInitStatus = 'success'
            console.log('【MySQL数据库】初始化成功')
            resolve(pool)
          })
          .catch(err => {
            console.error('【MySQL数据库】连接失败:', err)
            dbInitStatus = 'failed'
            pool = null
            resolve(null)
          })
      }).catch(err => {
        console.error('【MySQL数据库】加载 mysql2 失败:', err)
        dbInitStatus = 'failed'
        resolve(null)
      })
    } catch (e) {
      console.error('【MySQL数据库】初始化异常:', e)
      dbInitStatus = 'failed'
      initPromise = null
      resolve(null)
    }
  })

  return initPromise
}

/**
 * 检查数据库是否可用
 */
export const isDBAvailable = () => {
  if (!pool) {
    console.warn('【MySQL数据库】数据库不可用，数据将无法保存')
  }
  return !!pool
}

/**
 * 将问号占位符转换为实际的数量
 */
const buildWhereClause = (whereObj) => {
  const conditions = []
  const values = []

  for (const [key, value] of Object.entries(whereObj)) {
    if (value === null) {
      conditions.push(`${key} IS NULL`)
    } else {
      conditions.push(`${key} = ?`)
      values.push(value)
    }
  }

  return {
    clause: conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '',
    values
  }
}

/**
 * 构建更新语句
 */
const buildUpdateClause = (data) => {
  const sets = []
  const values = []

  for (const [key, value] of Object.entries(data)) {
    sets.push(`${key} = ?`)
    values.push(value)
  }

  return {
    clause: sets.length > 0 ? `SET ${sets.join(', ')}` : '',
    values
  }
}

/**
 * 用户相关操作
 */
export const userDbOps = {
  // 根据手机号查询用户
  getUserByPhone: async (phone) => {
    const db = await initDB()
    if (!db) {
      console.error('【getUserByPhone】数据库不可用')
      return []
    }

    try {
      const [rows] = await db.query(
        'SELECT * FROM users WHERE phone = ?',
        [phone]
      )
      return rows || []
    } catch (err) {
      console.error('【getUserByPhone】查询失败:', err)
      return []
    }
  },

  // 根据ID查询用户
  getUserById: async (id) => {
    const db = await initDB()
    if (!db) {
      console.error('【getUserById】数据库不可用')
      return []
    }

    try {
      const [rows] = await db.query(
        'SELECT * FROM users WHERE id = ?',
        [id]
      )
      return rows || []
    } catch (err) {
      console.error('【getUserById】查询失败:', err)
      return []
    }
  },

  // 根据邀请码查询用户
  getUserByInviteCode: async (inviteCode) => {
    const db = await initDB()
    if (!db) {
      console.error('【getUserByInviteCode】数据库不可用')
      return []
    }

    try {
      const [rows] = await db.query(
        'SELECT * FROM users WHERE inviteCode = ?',
        [inviteCode]
      )
      return rows || []
    } catch (err) {
      console.error('【getUserByInviteCode】查询失败:', err)
      return []
    }
  },

  // 创建用户
  createUser: async (userData) => {
    const db = await initDB()
    if (!db) {
      console.error('【createUser】数据库不可用')
      throw new Error('数据库不可用')
    }

    try {
      const data = serializeData(userData)
      const fields = Object.keys(data)
      const placeholders = fields.map(() => '?').join(', ')
      const values = fields.map(f => data[f])

      await db.query(
        `INSERT INTO users (${fields.join(', ')}) VALUES (${placeholders})`,
        values
      )
      return userData
    } catch (err) {
      console.error('【createUser】创建用户失败:', err)
      throw err
    }
  },

  // 更新用户
  updateUser: async (id, data) => {
    const db = await initDB()
    if (!db) {
      console.error('【updateUser】数据库不可用')
      throw new Error('数据库不可用')
    }

    try {
      const updateData = serializeData(data)
      const { clause, values } = buildUpdateClause(updateData)

      await db.query(
        `UPDATE users ${clause} WHERE id = ?`,
        [...values, id]
      )
      return data
    } catch (err) {
      console.error('【updateUser】更新用户失败:', err)
      throw err
    }
  },

  // 查询所有用户
  getAllUsers: async () => {
    const db = await initDB()
    if (!db) {
      console.error('【getAllUsers】数据库不可用')
      return []
    }

    try {
      const [rows] = await db.query('SELECT * FROM users')
      return rows || []
    } catch (err) {
      console.error('【getAllUsers】查询失败:', err)
      return []
    }
  }
}

/**
 * 邀请码相关操作
 */
export const inviteDbOps = {
  // 根据邀请码查询
  getByCode: async (code) => {
    const db = await initDB()
    if (!db) {
      console.error('【getByCode】数据库不可用')
      return []
    }

    try {
      const [rows] = await db.query(
        'SELECT * FROM invitation_codes WHERE code = ? AND usedBy IS NULL',
        [code]
      )
      return rows || []
    } catch (err) {
      console.error('【getByCode】查询失败:', err)
      return []
    }
  },

  // 创建邀请码
  create: async (data) => {
    const db = await initDB()
    if (!db) {
      console.error('【create】数据库不可用')
      throw new Error('数据库不可用')
    }

    try {
      const insertData = serializeData(data)
      const fields = Object.keys(insertData)
      const placeholders = fields.map(() => '?').join(', ')
      const values = fields.map(f => insertData[f])

      await db.query(
        `INSERT INTO invitation_codes (${fields.join(', ')}) VALUES (${placeholders})`,
        values
      )
      return data
    } catch (err) {
      console.error('【create】创建邀请码失败:', err)
      throw err
    }
  },

  // 使用邀请码
  useCode: async (code, userId) => {
    const db = await initDB()
    if (!db) {
      console.error('【useCode】数据库不可用')
      throw new Error('数据库不可用')
    }

    try {
      await db.query(
        'UPDATE invitation_codes SET usedBy = ?, usedAt = ? WHERE code = ?',
        [userId, new Date().toISOString(), code]
      )
    } catch (err) {
      console.error('【useCode】使用邀请码失败:', err)
      throw err
    }
  },

  // 查询创建者的邀请码列表
  getByCreator: async (creatorId) => {
    const db = await initDB()
    if (!db) {
      console.error('【getByCreator】数据库不可用')
      return []
    }

    try {
      const [rows] = await db.query(
        'SELECT * FROM invitation_codes WHERE creatorId = ?',
        [creatorId]
      )
      return rows || []
    } catch (err) {
      console.error('【getByCreator】查询失败:', err)
      return []
    }
  },

  // 查询所有邀请码
  getAll: async () => {
    const db = await initDB()
    if (!db) {
      console.error('【getAll】数据库不可用')
      return []
    }

    try {
      const [rows] = await db.query('SELECT * FROM invitation_codes')
      return rows || []
    } catch (err) {
      console.error('【getAll】查询失败:', err)
      return []
    }
  }
}

/**
 * 通用 CRUD 操作
 */
export const dbOps = {
  // 查询所有记录
  queryAll: async (table, limit = 500) => {
    const db = await initDB()
    if (!db) {
      console.error(`【queryAll:${table}】数据库不可用`)
      return []
    }

    try {
      const [rows] = await db.query(
        `SELECT * FROM ${table} LIMIT ?`,
        [limit]
      )
      // 反序列化 JSON 字段
      return (rows || []).map(row => deserializeData(row))
    } catch (err) {
      console.error(`【queryAll:${table}】查询失败:`, err)
      return []
    }
  },

  // 插入记录
  insert: async (table, data) => {
    const db = await initDB()
    if (!db) {
      console.error(`【insert:${table}】数据库不可用`)
      throw new Error('数据库不可用')
    }

    try {
      const insertData = serializeData(data)
      const fields = Object.keys(insertData)
      const placeholders = fields.map(() => '?').join(', ')
      const values = fields.map(f => insertData[f])

      await db.query(
        `INSERT INTO ${table} (${fields.join(', ')}) VALUES (${placeholders})`,
        values
      )
      return data
    } catch (err) {
      console.error(`【insert:${table}】插入失败:`, err)
      throw err
    }
  },

  // 更新记录
  update: async (table, id, data) => {
    const db = await initDB()
    if (!db) {
      console.error(`【update:${table}】数据库不可用`)
      throw new Error('数据库不可用')
    }

    try {
      const updateData = serializeData(data)
      const { clause, values } = buildUpdateClause(updateData)

      if (!clause) {
        console.warn(`【update:${table}】没有需要更新的字段`)
        return data
      }

      const [result] = await db.query(
        `UPDATE ${table} ${clause} WHERE id = ?`,
        [...values, id]
      )

      // 如果没有找到记录，尝试插入
      if (result.affectedRows === 0) {
        await dbOps.insert(table, { ...data, id })
      }

      return data
    } catch (err) {
      console.error(`【update:${table}】更新失败:`, err)
      throw err
    }
  },

  // 删除记录
  delete: async (table, id) => {
    const db = await initDB()
    if (!db) {
      console.error(`【delete:${table}】数据库不可用`)
      throw new Error('数据库不可用')
    }

    try {
      await db.query(
        `DELETE FROM ${table} WHERE id = ?`,
        [id]
      )
    } catch (err) {
      console.error(`【delete:${table}】删除失败:`, err)
      throw err
    }
  },

  // 根据条件查询
  queryBy: async (table, field, value) => {
    const db = await initDB()
    if (!db) {
      console.error(`【queryBy:${table}】数据库不可用`)
      return []
    }

    try {
      const [rows] = await db.query(
        `SELECT * FROM ${table} WHERE ${field} = ?`,
        [value]
      )
      // 反序列化 JSON 字段
      return (rows || []).map(row => deserializeData(row))
    } catch (err) {
      console.error(`【queryBy:${table}】查询失败:`, err)
      return []
    }
  },

  // 删除表中所有记录
  deleteAll: async (table) => {
    const db = await initDB()
    if (!db) {
      console.error('【deleteAll】数据库不可用')
      throw new Error('数据库不可用')
    }

    try {
      await db.query(`DELETE FROM ${table}`)
    } catch (err) {
      console.error(`【deleteAll:${table}】清空表失败:`, err)
      throw err
    }
  }
}

export default {
  initDB,
  isDBAvailable,
  getDbInitStatus,
  waitForDB,
  dbOps,
  userDbOps,
  inviteDbOps
}
