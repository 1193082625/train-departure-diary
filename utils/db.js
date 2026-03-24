/**
 * 数据库工具 - 使用自建阿里云 MySQL
 * 提供统一的数据库操作接口
 *
 * 此文件从 uniCloud 迁移到自建 MySQL
 * 所有接口保持不变，便于无缝切换
 */

// 重新导出 MySQL 实现
export {
  initDB,
  isDBAvailable,
  getDbInitStatus,
  waitForDB,
  dbOps,
  userDbOps,
  inviteDbOps
} from './db-mysql'

// 默认导出
import * as mysqlOps from './db-mysql'
export default mysqlOps
