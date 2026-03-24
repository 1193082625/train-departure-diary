/**
 * 通用 CRUD 路由工厂
 * 根据表名和配置生成标准的 RESTful API
 */

import { getPool } from '../config/db.js'

// JSON 字段列表
const JSON_FIELDS = ['merchantDetails', 'truckRows', 'loadingWorkerIds', 'merchantAmount']

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
    // GET /:table - 查询所有
    getAll: async (req, res) => {
      try {
        const pool = getPool()
        const [rows] = await pool.query(`SELECT * FROM ${tableName} LIMIT 500`)
        const data = (rows || []).map(row => deserializeData(row))
        res.json({ success: true, data })
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
          `SELECT * FROM ${tableName} WHERE id = ?`,
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

    // GET /:table/by/:field/:value - 根据字段查询
    getByField: async (req, res) => {
      try {
        const pool = getPool()
        const { field, value } = req.params
        const [rows] = await pool.query(
          `SELECT * FROM ${tableName} WHERE ${field} = ?`,
          [value]
        )
        const data = (rows || []).map(row => deserializeData(row))
        res.json({ success: true, data })
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
        const data = serializeData(req.body)
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
        const data = serializeData(req.body)
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

    // DELETE /:table/:id - 删除
    delete: async (req, res) => {
      try {
        const pool = getPool()
        const [result] = await pool.query(
          `DELETE FROM ${tableName} WHERE id = ?`,
          [req.params.id]
        )

        if (result.affectedRows === 0) {
          return res.status(404).json({ success: false, error: '记录不存在' })
        }
        res.json({ success: true })
      } catch (err) {
        console.error(`删除 ${tableName} 失败:`, err)
        res.status(500).json({ success: false, error: err.message })
      }
    },

    // DELETE /:table - 清空表
    deleteAll: async (req, res) => {
      try {
        const pool = getPool()
        await pool.query(`DELETE FROM ${tableName}`)
        res.json({ success: true })
      } catch (err) {
        console.error(`清空 ${tableName} 失败:`, err)
        res.status(500).json({ success: false, error: err.message })
      }
    }
  }

  return router
}

export default createCrudRouter
