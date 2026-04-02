/**
 * 发车日记后端 API 服务
 */

import express from 'express'
import corsMiddleware from './middleware/cors.js'
import { testConnection, getPool } from './config/db.js'
import { createCrudRouter } from './routes/users.js'
import bcrypt from 'bcryptjs'

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

// 注册通用 CRUD 路由
const tables = ['users', 'merchants', 'workers', 'departures', 'transactions', 'settings', 'daily_quotes', 'invitation_codes']

tables.forEach(table => {
  const router = createCrudRouter(table)

  app.get(`/api/${table}`, router.getAll)
  app.get(`/api/${table}/:id`, router.getById)
  app.get(`/api/${table}/by/:field/:value`, router.getByField)
  app.post(`/api/${table}`, router.create)
  app.put(`/api/${table}/:id`, router.update)
  app.put(`/api/${table}/by/:field/:value`, router.updateByField)
  app.delete(`/api/${table}/:id`, router.delete)
  app.delete(`/api/${table}`, router.deleteAll)
})

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

    // 登录成功，返回用户信息（不包含密码）
    const { password: _, ...userWithoutPassword } = user
    res.json({ success: true, data: userWithoutPassword })
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
  })
}

startServer()
