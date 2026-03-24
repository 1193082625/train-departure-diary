/**
 * 数据迁移脚本
 * 从 uniCloud JSON 导出文件迁移到 MySQL
 *
 * 使用方法: node migrate-data.js
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import mysql from 'mysql2/promise'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// 数据库配置
const dbConfig = {
  host: '47.96.90.103',
  port: 3306,
  user: 'root',
  password: 'yue123456*',
  database: 'train_departure_diary'
}

// 数据目录
const dataDir = '/Users/wangyue/Desktop/claude-pros/相关资料/发车日记-数据'

// 转换 $date 格式
const convertDate = (obj) => {
  if (obj && typeof obj === 'object') {
    if (obj.$date) {
      return obj.$date
    }
    for (const key of Object.keys(obj)) {
      obj[key] = convertDate(obj[key])
    }
  }
  return obj
}

// 转换数据并清理
const transformRecord = (record) => {
  // 转换日期格式
  record = convertDate(record)

  // 删除云端 _id
  delete record._id

  // 删除 dcloud_appid 等无用字段
  delete record.dcloud_appid
  delete record.status
  delete record.create_date
  delete record.mobile

  return record
}

// 读取并解析 JSON 文件
const readJsonFile = (filepath) => {
  try {
    const content = fs.readFileSync(filepath, 'utf-8')
    const lines = content.split('\n').filter(line => line.trim())
    return lines.map(line => JSON.parse(line))
  } catch (e) {
    console.error(`读取文件失败: ${filepath}`, e.message)
    return []
  }
}

// 迁移数据
const migrate = async () => {
  const pool = mysql.createPool(dbConfig)

  try {
    console.log('🔄 开始数据迁移...\n')

    // 获取所有导出文件
    const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.json'))
    console.log(`📁 发现 ${files.length} 个数据文件\n`)

    // 按文件名模式分类文件（基于内容特征）
    const tableData = {
      users: [],
      merchants: [],
      workers: [],
      departures: [],
      daily_quotes: [],
      invitation_codes: [],
      transactions: [],
      settings: []
    }

    // 读取并分类所有数据
    for (const file of files) {
      const filepath = path.join(dataDir, file)
      const records = readJsonFile(filepath)

      if (records.length === 0) continue

      // 根据第一条记录判断表类型
      const first = records[0]

      // users 表有 role 字段
      if ('role' in first && 'password' in first) {
        tableData.users.push(...records)
        console.log(`  ✅ users: ${records.length} 条`)
      }
      // merchants 表有 margin 字段
      else if ('margin' in first && 'name' in first && !('role' in first)) {
        tableData.merchants.push(...records)
        console.log(`  ✅ merchants: ${records.length} 条`)
      }
      // workers 表有 type 字段
      else if ('type' in first && 'name' in first && !('margin' in first)) {
        tableData.workers.push(...records)
        console.log(`  ✅ workers: ${records.length} 条`)
      }
      // departures 表有 merchantDetails 字段
      else if ('merchantDetails' in first || 'truckRows' in first) {
        tableData.departures.push(...records)
        console.log(`  ✅ departures: ${records.length} 条`)
      }
      // daily_quotes 表有 date 和 quote 字段
      else if ('date' in first && 'quote' in first && !('merchantDetails' in first)) {
        tableData.daily_quotes.push(...records)
        console.log(`  ✅ daily_quotes: ${records.length} 条`)
      }
      // invitation_codes 表有 code 和 type 字段
      else if ('code' in first && 'type' in first && !('password' in first)) {
        tableData.invitation_codes.push(...records)
        console.log(`  ✅ invitation_codes: ${records.length} 条`)
      }
      else {
        console.log(`  ⚠️  未知表类型 (${file}):`, Object.keys(first))
      }
    }

    console.log('\n📊 数据统计:')
    for (const [table, records] of Object.entries(tableData)) {
      if (records.length > 0) {
        console.log(`  ${table}: ${records.length} 条`)
      }
    }

    // 清空现有数据
    console.log('\n🗑️  清空现有数据...')
    for (const table of Object.keys(tableData)) {
      try {
        await pool.query(`DELETE FROM ${table}`)
        console.log(`  ✅ ${table} 已清空`)
      } catch (e) {
        console.log(`  ⚠️  ${table} 清空失败:`, e.message)
      }
    }

    // 插入数据
    console.log('\n📥 开始插入数据...')

    for (const [table, records] of Object.entries(tableData)) {
      if (records.length === 0) continue

      let inserted = 0
      let errors = 0

      for (const record of records) {
        try {
          const transformed = transformRecord(record)

          // 构建 INSERT 语句
          const fields = Object.keys(transformed).filter(k => k !== undefined && k !== null)
          const values = fields.map(f => transformed[f])

          if (fields.length === 0) continue

          const placeholders = fields.map(() => '?').join(', ')
          const sql = `INSERT INTO ${table} (${fields.join(', ')}) VALUES (${placeholders})`

          await pool.query(sql, values)
          inserted++
        } catch (e) {
          errors++
          if (errors <= 3) {
            console.log(`  ⚠️  ${table} 插入失败:`, e.message)
          }
        }
      }

      if (inserted > 0) {
        console.log(`  ✅ ${table}: 插入 ${inserted} 条${errors > 0 ? `, 失败 ${errors} 条` : ''}`)
      }
    }

    // 验证结果
    console.log('\n📊 迁移后数据库统计:')
    for (const table of Object.keys(tableData)) {
      try {
        const [rows] = await pool.query(`SELECT COUNT(*) as count FROM ${table}`)
        console.log(`  ${table}: ${rows[0].count} 条`)
      } catch (e) {
        console.log(`  ${table}: 查询失败`)
      }
    }

    console.log('\n✅ 数据迁移完成!')

  } catch (e) {
    console.error('❌ 迁移失败:', e)
  } finally {
    await pool.end()
  }
}

migrate()
