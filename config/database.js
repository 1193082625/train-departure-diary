/**
 * 数据库配置 - 自建阿里云 MySQL
 *
 * 配置说明:
 * - 本配置用于替代 uniCloud 云数据库
 * - 连接信息从环境变量读取，如未设置则使用默认值
 */

// 数据库连接配置
const dbConfig = {
  // 主机地址 (ECS 内网 IP 或公网 IP)
  host: process.env.DB_HOST || '47.96.90.103',

  // 端口
  port: parseInt(process.env.DB_PORT) || 3306,

  // 用户名
  user: process.env.DB_USER || 'root',

  // 密码
  password: process.env.DB_PASSWORD || 'yue123456*',

  // 数据库名
  database: process.env.DB_NAME || 'train_departure_diary',

  // 连接池配置
  pool: {
    // 最大连接数
    connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT) || 10,
    // 等待连接超时 (毫秒)
    waitForConnections: true,
    // 连接超时 (毫秒)
    connectTimeout: 10000,
    // 空闲连接超时 (毫秒)
    idleTimeout: 60000
  },

  // 字符集
  charset: 'utf8mb4',

  // 时区
  timezone: '+08:00'
}

// 导出配置
export default dbConfig
