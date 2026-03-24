/**
 * MySQL 连接池封装
 */

import mysql from 'mysql2/promise'
import dbConfig from './database.js'

let pool = null

/**
 * 获取连接池
 */
export const getPool = () => {
  if (!pool) {
    pool = mysql.createPool({
      host: dbConfig.host,
      port: dbConfig.port,
      user: dbConfig.user,
      password: dbConfig.password,
      database: dbConfig.database,
      waitForConnections: dbConfig.waitForConnections,
      connectionLimit: dbConfig.connectionLimit,
      connectTimeout: dbConfig.connectTimeout,
      idleTimeout: dbConfig.idleTimeout,
      charset: dbConfig.charset,
      timezone: dbConfig.timezone
    })
  }
  return pool
}

/**
 * 测试数据库连接
 */
export const testConnection = async () => {
  try {
    const conn = await getPool().getConnection()
    console.log('✅ 数据库连接成功')
    conn.release()
    return true
  } catch (err) {
    console.error('❌ 数据库连接失败:', err.message)
    return false
  }
}

export default { getPool, testConnection }
