/**
 * 数据同步服务
 * 支持从远程阿里云数据库同步到本地文件备份和本地 MySQL 数据库
 */

import mysql from 'mysql2/promise'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import syncConfig from '../config/sync.json' with { type: 'json' }
import dbConfig from '../config/database.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// JSON 字段列表（需要特殊处理）
const JSON_FIELDS = ['merchantDetails', 'truckRows', 'loadingWorkerIds', 'merchantAmount']

// 同步状态
let syncStatus = {
  lastFullSync: null,
  lastIncrementalSync: null,
  isRunning: false,
  currentTask: null
}

/**
 * 获取远程数据库连接池（使用项目现有的数据库配置）
 */
const getRemotePool = () => {
  return mysql.createPool({
    host: dbConfig.host,
    port: dbConfig.port,
    user: dbConfig.user,
    password: dbConfig.password,
    database: dbConfig.database,
    waitForConnections: true,
    connectionLimit: 5,
    connectTimeout: 30000,
    timezone: '+08:00'
  })
}

/**
 * 获取本地数据库连接池
 */
const getLocalPool = () => {
  const localPassword = process.env.LOCAL_DB_PASSWORD || ''
  return mysql.createPool({
    host: syncConfig.local.host,
    port: syncConfig.local.port,
    user: syncConfig.local.user,
    password: localPassword,
    database: syncConfig.local.database,
    waitForConnections: true,
    connectionLimit: 5,
    connectTimeout: 30000,
    timezone: '+08:00'
  })
}

/**
 * 序列化数据（处理 JSON 字段）
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

  return result
}

/**
 * 反序列化数据（处理 JSON 字段）
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
 * 确保备份目录存在
 */
const ensureBackupDir = (dateStr) => {
  const backupDir = path.join(__dirname, '..', syncConfig.backup.dir, dateStr)
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true })
  }
  return backupDir
}

/**
 * 导出表数据为 CSV 文件
 */
const exportToCSV = async (pool, tableName, backupDir) => {
  const [rows] = await pool.query(
    `SELECT * FROM ${tableName} WHERE deletedAt IS NULL`
  )

  if (rows.length === 0) {
    console.log(`  [${tableName}] 无数据，跳过导出`)
    return { success: true, count: 0 }
  }

  // 获取列名
  const columns = Object.keys(rows[0])
  const csvLines = [columns.join(',')]

  // 处理每一行数据
  for (const row of rows) {
    const values = columns.map(col => {
      let value = row[col]

      // 处理 JSON 字段
      if (JSON_FIELDS.includes(col) && typeof value === 'object') {
        value = JSON.stringify(value)
      }

      // 处理 null/undefined
      if (value === null || value === undefined) {
        return ''
      }

      // 处理字符串，添加引号并转义
      if (typeof value === 'string') {
        // 移除换行符和多余引号
        value = value.replace(/"/g, '""').replace(/\r?\n/g, ' ')
        return `"${value}"`
      }

      // 处理日期对象
      if (value instanceof Date) {
        return `"${value.toISOString()}"`
      }

      return String(value)
    })
    csvLines.push(values.join(','))
  }

  const csvContent = csvLines.join('\n')
  const fileName = `${tableName}.csv`
  const filePath = path.join(backupDir, fileName)

  fs.writeFileSync(filePath, '\ufeff' + csvContent, 'utf8') // \ufeff 是 BOM，解决 Excel 中文乱码

  return { success: true, count: rows.length, filePath }
}

/**
 * 同步数据到本地 MySQL
 * 使用 INSERT ... ON DUPLICATE KEY UPDATE 策略
 */
const syncTableToLocalDB = async (remotePool, localPool, tableName) => {
  // 获取远程表的所有数据
  const [rows] = await remotePool.query(
    `SELECT * FROM ${tableName} WHERE deletedAt IS NULL`
  )

  if (rows.length === 0) {
    console.log(`  [${tableName}] 无数据，跳过同步`)
    return { success: true, count: 0 }
  }

  // 获取列名（排除 id，避免插入冲突）
  const columns = Object.keys(rows[0]).filter(col => col !== 'id')

  // 构建 INSERT ... ON DUPLICATE KEY UPDATE 语句
  const setClause = columns.map(col => `${col} = VALUES(${col})`).join(', ')

  // 分批插入，每批 100 条
  const batchSize = 100
  let totalInserted = 0

  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize)

    // 构建批量插入的值
    const values = batch.map(row => {
      const serialized = serializeData(row)
      const vals = columns.map(col => {
        let value = serialized[col]
        if (value === null || value === undefined) {
          return null
        }
        if (typeof value === 'object') {
          return JSON.stringify(value)
        }
        return value
      })
      return vals
    })

    const placeholders = values.map(() => `(${columns.map(() => '?').join(', ')})`).join(', ')
    const flatValues = values.flat()

    try {
      const sql = `
        INSERT INTO ${tableName} (${columns.join(', ')})
        VALUES ${placeholders}
        ON DUPLICATE KEY UPDATE ${setClause}
      `
      await localPool.query(sql, flatValues)
      totalInserted += batch.length
    } catch (err) {
      console.error(`  [${tableName}] 同步失败 (batch ${i / batchSize + 1}):`, err.message)
      throw err
    }
  }

  return { success: true, count: totalInserted }
}

/**
 * 全量同步
 * 同步所有 8 张表的全部数据
 */
export const fullSync = async () => {
  if (syncStatus.isRunning) {
    throw new Error('同步任务正在进行中，请稍后再试')
  }

  syncStatus.isRunning = true
  syncStatus.currentTask = 'fullSync'

  const startTime = Date.now()
  const dateStr = new Date().toISOString().split('T')[0]
  const results = {}

  try {
    console.log('=== 开始全量同步 ===')
    console.log(`时间: ${new Date().toISOString()}`)
    console.log('')

    const remotePool = getRemotePool()
    const localPool = getLocalPool()

    // 确保备份目录存在
    const backupDir = ensureBackupDir(dateStr)

    // 同步所有表
    for (const tableName of syncConfig.tables) {
      console.log(`[${tableName}] 开始同步...`)

      // 1. 导出到 CSV 文件
      const csvResult = await exportToCSV(remotePool, tableName, backupDir)
      console.log(`  CSV 导出: ${csvResult.count} 条记录 -> ${csvResult.filePath}`)

      // 2. 同步到本地数据库
      const dbResult = await syncTableToLocalDB(remotePool, localPool, tableName)
      console.log(`  数据库同步: ${dbResult.count} 条记录`)

      results[tableName] = {
        csv: csvResult,
        db: dbResult
      }
    }

    // 关闭连接池
    await remotePool.end()
    await localPool.end()

    syncStatus.lastFullSync = new Date().toISOString()

    const duration = ((Date.now() - startTime) / 1000).toFixed(2)
    console.log('')
    console.log(`=== 全量同步完成，耗时 ${duration}s ===`)

    return {
      success: true,
      date: dateStr,
      duration: parseFloat(duration),
      results
    }
  } catch (err) {
    console.error('全量同步失败:', err)
    throw err
  } finally {
    syncStatus.isRunning = false
    syncStatus.currentTask = null
  }
}

/**
 * 增量同步
 * 只同步最近一天新增或修改的记录
 */
export const incrementalSync = async () => {
  if (syncStatus.isRunning) {
    throw new Error('同步任务正在进行中，请稍后再试')
  }

  syncStatus.isRunning = true
  syncStatus.currentTask = 'incrementalSync'

  const startTime = Date.now()
  const dateStr = new Date().toISOString().split('T')[0]
  const results = {}

  try {
    console.log('=== 开始增量同步 ===')
    console.log(`时间: ${new Date().toISOString()}`)
    console.log('')

    const remotePool = getRemotePool()
    const localPool = getLocalPool()

    // 确保备份目录存在
    const backupDir = ensureBackupDir(dateStr)

    // 同步所有表
    for (const tableName of syncConfig.tables) {
      console.log(`[${tableName}] 开始增量同步...`)

      // 获取最近一天有变化的数据
      const [rows] = await remotePool.query(`
        SELECT * FROM ${tableName}
        WHERE deletedAt IS NULL
          AND (
            createdAt >= DATE_SUB(NOW(), INTERVAL 1 DAY)
            OR updatedAt >= DATE_SUB(NOW(), INTERVAL 1 DAY)
          )
      `)

      if (rows.length === 0) {
        console.log(`  [${tableName}] 无新增或修改数据，跳过`)
        results[tableName] = { count: 0, skipped: true }
        continue
      }

      // 1. 导出到 CSV 文件（追加模式）
      const csvResult = await exportToCSV(remotePool, tableName, backupDir)
      console.log(`  CSV 导出: ${csvResult.count} 条记录 -> ${csvResult.filePath}`)

      // 2. 同步到本地数据库
      const dbResult = await syncTableToLocalDB(remotePool, localPool, tableName)
      console.log(`  数据库同步: ${dbResult.count} 条记录`)

      results[tableName] = {
        csv: csvResult,
        db: dbResult
      }
    }

    // 关闭连接池
    await remotePool.end()
    await localPool.end()

    syncStatus.lastIncrementalSync = new Date().toISOString()

    const duration = ((Date.now() - startTime) / 1000).toFixed(2)
    console.log('')
    console.log(`=== 增量同步完成，耗时 ${duration}s ===`)

    return {
      success: true,
      date: dateStr,
      duration: parseFloat(duration),
      results
    }
  } catch (err) {
    console.error('增量同步失败:', err)
    throw err
  } finally {
    syncStatus.isRunning = false
    syncStatus.currentTask = null
  }
}

/**
 * 清理过期的备份文件
 */
export const cleanupOldBackups = () => {
  const backupRoot = path.join(__dirname, '..', syncConfig.backup.dir)
  const retentionDays = syncConfig.backup.retentionDays || 30
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays)

  if (!fs.existsSync(backupRoot)) {
    console.log('备份目录不存在，无需清理')
    return { success: true, deleted: 0 }
  }

  const subdirs = fs.readdirSync(backupRoot)
  let deletedCount = 0

  for (const subdir of subdirs) {
    const subdirPath = path.join(backupRoot, subdir)

    // 检查是否是目录（日期格式：YYYY-MM-DD）
    if (!fs.statSync(subdirPath).isDirectory()) continue

    // 检查日期是否过期
    const dirDate = new Date(subdir)
    if (isNaN(dirDate.getTime())) continue

    if (dirDate < cutoffDate) {
      console.log(`删除过期备份: ${subdir}`)
      fs.rmSync(subdirPath, { recursive: true })
      deletedCount++
    }
  }

  console.log(`清理完成，删除了 ${deletedCount} 个过期备份目录`)
  return { success: true, deleted: deletedCount }
}

/**
 * 获取已备份的文件列表
 */
export const getBackupFiles = () => {
  const backupRoot = path.join(__dirname, '..', syncConfig.backup.dir)

  if (!fs.existsSync(backupRoot)) {
    return { success: true, backups: [] }
  }

  const subdirs = fs.readdirSync(backupRoot)
    .filter(name => {
      const subdirPath = path.join(backupRoot, name)
      return fs.statSync(subdirPath).isDirectory()
    })
    .sort()
    .reverse()

  const backups = subdirs.map(dateDir => {
    const datePath = path.join(backupRoot, dateDir)
    const files = fs.readdirSync(datePath)
      .filter(f => f.endsWith('.csv'))
      .map(f => {
        const filePath = path.join(datePath, f)
        const stats = fs.statSync(filePath)
        return {
          name: f,
          size: stats.size,
          modifiedAt: stats.mtime.toISOString()
        }
      })

    return {
      date: dateDir,
      files,
      totalSize: files.reduce((sum, f) => sum + f.size, 0)
    }
  })

  return { success: true, backups }
}

/**
 * 获取同步状态
 */
export const getSyncStatus = () => {
  return {
    success: true,
    status: {
      ...syncStatus,
      tables: syncConfig.tables,
      config: {
        backupDir: syncConfig.backup.dir,
        retentionDays: syncConfig.backup.retentionDays,
        cronFull: syncConfig.sync.cronFull,
        cronIncremental: syncConfig.sync.cronIncremental
      }
    }
  }
}

export default {
  fullSync,
  incrementalSync,
  cleanupOldBackups,
  getBackupFiles,
  getSyncStatus
}
