/**
 * 发车日记后端 API 服务
 */

import express from 'express'
import corsMiddleware from './middleware/cors.js'
import { testConnection, getPool } from './config/db.js'
import { createCrudRouter } from './routes/users.js'
import { authMiddleware, generateToken } from './middleware/auth.js'
import bcrypt from 'bcryptjs'
import syncRouter from './routes/sync.js'
import { startAllSchedulers } from './services/scheduler.js'

// 手机号正则校验
const PHONE_REGEX = /^1[3-9]\d{9}$/

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

const app = express()
const PORT = process.env.PORT || 3000

// 中间件
app.use(corsMiddleware)
app.use(express.json({ limit: '10mb' }))

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() })
})

// ============================================
// 公开接口（不需要认证）- 用于登录注册流程
// ============================================

// GET /api/version - 获取后端版本和特性（公开接口，用于前端版本检测）
app.get('/api/version', (req, res) => {
  res.json({
    version: '1.1.0',      // 语义化版本
    apiVersion: 1,         // API 版本号（方便前端判断）
    authType: 'jwt',        // 'jwt' | 'userId'
    supports: ['jwt']       // 支持的特性列表
  })
})

// GET /api/users/by/phone/:phone - 根据手机号查询用户（公开，用于登录流程）
app.get('/api/users/by/phone/:phone', async (req, res) => {
  try {
    const pool = getPool()
    const [rows] = await pool.query(
      'SELECT * FROM users WHERE phone = ? AND deletedAt IS NULL',
      [req.params.phone]
    )
    const data = rows.map(row => {
      const { password, ...userWithoutPassword } = row
      // 返回 hasPassword 字段让前端判断用户是否有密码
      return { ...userWithoutPassword, hasPassword: !!password }
    })
    res.json({ success: true, data })
  } catch (err) {
    console.error('查询用户失败:', err)
    res.status(500).json({ success: false, error: err.message })
  }
})

// GET /api/invitation_codes/by/code/:code - 根据邀请码查询（公开，用于注册流程）
app.get('/api/invitation_codes/by/code/:code', async (req, res) => {
  try {
    const pool = getPool()
    const [rows] = await pool.query(
      'SELECT * FROM invitation_codes WHERE code = ? AND deletedAt IS NULL',
      [req.params.code]
    )
    res.json({ success: true, data: rows })
  } catch (err) {
    console.error('查询邀请码失败:', err)
    res.status(500).json({ success: false, error: err.message })
  }
})

// ============================================
// 受保护接口（需要认证）
// ============================================

// 注册通用 CRUD 路由（需要认证）
const tables = ['users', 'merchants', 'workers', 'departures', 'transactions', 'settings', 'daily_quotes', 'invitation_codes']

tables.forEach(table => {
  const router = createCrudRouter(table)

  app.get(`/api/${table}`, authMiddleware, router.getAll)
  app.get(`/api/${table}/:id`, authMiddleware, router.getById)
  // 注意：/by/phone/:phone 和 /by/code/:code 已在上方定义为公开路由
  app.get(`/api/${table}/by/:field/:value`, authMiddleware, router.getByField)
  app.post(`/api/${table}`, authMiddleware, router.create)
  app.put(`/api/${table}/:id`, authMiddleware, router.update)
  app.put(`/api/${table}/by/:field/:value`, authMiddleware, router.updateByField)
  app.delete(`/api/${table}/:id`, authMiddleware, router.delete)
  app.delete(`/api/${table}`, authMiddleware, router.deleteAll)
})

// 挂载同步管理路由
app.use('/api/sync', syncRouter)

// POST /api/users/login - 用户登录验证
app.post('/api/users/login', async (req, res) => {
  try {
    const { phone, password } = req.body

    // 验证手机号格式
    if (!phone || !PHONE_REGEX.test(phone)) {
      return res.status(400).json({ success: false, error: '手机号格式不正确' })
    }

    if (!password) {
      return res.status(400).json({ success: false, error: '密码不能为空' })
    }

    const pool = getPool()
    const [rows] = await pool.query('SELECT * FROM users WHERE phone = ?', [phone])

    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: '用户不存在' })
    }

    const user = rows[0]
    const isPasswordValid = await verifyPassword(password, user.password || '')

    if (!isPasswordValid) {
      return res.status(401).json({ success: false, error: '密码错误' })
    }

    // 登录成功，返回用户信息和 JWT token
    const { password: _, ...userWithoutPassword } = user
    const token = generateToken(user)
    res.json({ success: true, data: userWithoutPassword, token })
  } catch (err) {
    console.error('登录失败:', err)
    res.status(500).json({ success: false, error: err.message })
  }
})

// 启动服务器
const startServer = async () => {
  // 测试数据库连接
  const dbConnected = await testConnection()
  if (!dbConnected) {
    console.error('⚠️  数据库连接失败，服务器将继续启动但无法访问数据库')
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 服务器已启动: http://0.0.0.0:${PORT}`)
    console.log(`📋 API 端点:`)
    tables.forEach(table => {
      console.log(`   GET    /api/${table}`)
      console.log(`   POST   /api/${table}`)
      console.log(`   GET    /api/${table}/:id`)
      console.log(`   PUT    /api/${table}/:id`)
      console.log(`   DELETE /api/${table}/:id`)
    })
    console.log(`   POST   /api/sync/full`)
    console.log(`   POST   /api/sync/incremental`)
    console.log(`   GET    /api/sync/status`)
    console.log(`   GET    /api/sync/files`)
    console.log(`   POST   /api/sync/cleanup`)
    console.log(`   POST   /api/sync/scheduler/start`)
    console.log(`   POST   /api/sync/scheduler/stop`)

    // 启动同步调度器
    startAllSchedulers()
  })
}

startServer()
