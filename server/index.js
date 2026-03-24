/**
 * 发车日记后端 API 服务
 */

import express from 'express'
import corsMiddleware from './middleware/cors.js'
import { testConnection } from './config/db.js'
import { createCrudRouter } from './routes/users.js'

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
