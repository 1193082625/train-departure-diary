/**
 * 数据库配置
 * 支持多环境配置，通过 dotenv 加载
 */

import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// 根据 NODE_ENV 加载对应环境变量文件
const envFile = process.env.NODE_ENV === 'production'
  ? '.env.production'
  : '.env.local'

dotenv.config({ path: join(__dirname, envFile) })

const dbConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'train_departure_diary',
  waitForConnections: true,
  connectionLimit: 10,
  connectTimeout: 10000,
  idleTimeout: 60000,
  charset: 'utf8mb4',
  timezone: '+08:00'
}

export default dbConfig
