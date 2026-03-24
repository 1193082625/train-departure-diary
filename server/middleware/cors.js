/**
 * CORS 中间件
 */

import cors from 'cors'

const corsOptions = {
  origin: '*', // 生产环境应限制为具体域名
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}

export default cors(corsOptions)
