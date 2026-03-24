/**
 * 数据库配置
 */

const dbConfig = {
  host: process.env.DB_HOST || '47.96.90.103',
  port: parseInt(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'yue123456*',
  database: process.env.DB_NAME || 'train_departure_diary',
  waitForConnections: true,
  connectionLimit: 10,
  connectTimeout: 10000,
  idleTimeout: 60000,
  charset: 'utf8mb4',
  timezone: '+08:00'
}

export default dbConfig
