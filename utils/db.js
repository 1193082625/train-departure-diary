// 数据库工具 - 使用 uni-sqlite 插件
// 提供统一的数据库操作接口

const DB_NAME = 'train_departure_db'
let db = null

// 初始化数据库
export const initDB = () => {
  return new Promise((resolve, reject) => {
    // 使用 uni-sqlite 插件
    const sqlite = uni.requireNativePlugin('uni-sqlite')

    if (!sqlite) {
      console.warn('uni-sqlite 插件未安装，使用 localStorage 兼容模式')
      resolve(null)
      return
    }

    // 打开数据库
    sqlite.open({
      name: DB_NAME,
      path: '_doc/train_departure.db'
    }, (res) => {
      if (res.errMsg === 'open:ok') {
        db = sqlite
        // 创建表
        createTables().then(resolve).catch(reject)
      } else {
        console.error('数据库打开失败:', res)
        reject(res)
      }
    })
  })
}

// 创建数据表
const createTables = () => {
  return new Promise((resolve, reject) => {
    if (!db) {
      resolve()
      return
    }

    const tables = [
      // 鸡场表
      `CREATE TABLE IF NOT EXISTS merchants (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        margin REAL DEFAULT 0,
        contact TEXT,
        phone TEXT,
        address TEXT,
        note TEXT,
        createdAt TEXT
      )`,
      // 员工表
      `CREATE TABLE IF NOT EXISTS workers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT DEFAULT 'both',
        phone TEXT,
        note TEXT,
        createdAt TEXT
      )`,
      // 发车记录表
      `CREATE TABLE IF NOT EXISTS departures (
        id TEXT PRIMARY KEY,
        date TEXT NOT NULL,
        dailyQuote REAL DEFAULT 0,
        merchantDetails TEXT,
        reservedBigBoxes INTEGER DEFAULT 0,
        reservedSmallBoxes INTEGER DEFAULT 0,
        departureWorkerId TEXT,
        loadingWorkerIds TEXT,
        fuelCost REAL DEFAULT 0,
        entryFee REAL DEFAULT 0,
        tollFee REAL DEFAULT 0,
        loadingFee REAL DEFAULT 0,
        oilFee REAL DEFAULT 0,
        truckRows TEXT,
        arrivalBigBoxes INTEGER DEFAULT 0,
        arrivalSmallBoxes INTEGER DEFAULT 0,
        returnedBigBoxes INTEGER DEFAULT 0,
        returnedSmallBoxes INTEGER DEFAULT 0,
        merchantAmount TEXT,
        getMoney REAL DEFAULT 0,
        note TEXT,
        createdAt TEXT
      )`,
      // 交易记录表
      `CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY,
        date TEXT NOT NULL,
        targetId TEXT,
        targetType TEXT,
        amount REAL DEFAULT 0,
        type TEXT,
        note TEXT,
        createdAt TEXT
      )`,
      // 设置表
      `CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY DEFAULT 1,
        bigBoxWeight REAL DEFAULT 50,
        smallBoxWeight REAL DEFAULT 30,
        loadingFee REAL DEFAULT 0,
        tollFee REAL DEFAULT 0,
        entryFee REAL DEFAULT 0,
        oilFee REAL DEFAULT 0
      )`
    ]

    const promises = tables.map(sql => {
      return new Promise((res, rej) => {
        db.executeSql({ sql }, (result) => {
          res(result)
        }, (err) => {
          console.error('创建表失败:', err)
          rej(err)
        })
      })
    })

    Promise.all(promises).then(resolve).catch(reject)
  })
}

// 检查数据库是否可用
export const isDBAvailable = () => !!db

// 通用的 CRUD 操作
export const dbOps = {
  // 查询所有记录
  queryAll: (table) => {
    return new Promise((resolve, reject) => {
      if (!db) {
        // 兼容模式：从 localStorage 读取
        const data = uni.getStorageSync(table)
        resolve(data ? JSON.parse(data) : [])
        return
      }

      db.executeSql({
        sql: `SELECT * FROM ${table}`
      }, (result) => {
        resolve(result.result || [])
      }, (err) => {
        console.error(`查询 ${table} 失败:`, err)
        reject(err)
      })
    })
  },

  // 插入记录
  insert: (table, data) => {
    return new Promise((resolve, reject) => {
      if (!db) {
        // 兼容模式：保存到 localStorage
        const key = table
        const list = uni.getStorageSync(key) ? JSON.parse(uni.getStorageSync(key)) : []
        list.push(data)
        uni.setStorageSync(key, JSON.stringify(list))
        resolve(data)
        return
      }

      const keys = Object.keys(data)
      const values = Object.values(data)
      const placeholders = keys.map(() => '?').join(', ')
      const fields = keys.join(', ')

      db.executeSql({
        sql: `INSERT INTO ${table} (${fields}) VALUES (${placeholders})`,
        args: values
      }, (result) => {
        resolve(data)
      }, (err) => {
        console.error(`插入 ${table} 失败:`, err)
        reject(err)
      })
    })
  },

  // 更新记录
  update: (table, id, data) => {
    return new Promise((resolve, reject) => {
      if (!db) {
        // 兼容模式：更新 localStorage
        const key = table
        const list = uni.getStorageSync(key) ? JSON.parse(uni.getStorageSync(key)) : []
        const index = list.findIndex(item => item.id === id)
        if (index !== -1) {
          list[index] = { ...list[index], ...data }
          uni.setStorageSync(key, JSON.stringify(list))
        }
        resolve(data)
        return
      }

      const updates = Object.entries(data)
        .map(([key, val]) => `${key} = ?`)
        .join(', ')
      const values = Object.values(data)

      db.executeSql({
        sql: `UPDATE ${table} SET ${updates} WHERE id = ?`,
        args: [...values, id]
      }, (result) => {
        resolve(data)
      }, (err) => {
        console.error(`更新 ${table} 失败:`, err)
        reject(err)
      })
    })
  },

  // 删除记录
  delete: (table, id) => {
    return new Promise((resolve, reject) => {
      if (!db) {
        // 兼容模式：删除 localStorage
        const key = table
        let list = uni.getStorageSync(key) ? JSON.parse(uni.getStorageSync(key)) : []
        list = list.filter(item => item.id !== id)
        uni.setStorageSync(key, JSON.stringify(list))
        resolve()
        return
      }

      db.executeSql({
        sql: `DELETE FROM ${table} WHERE id = ?`,
        args: [id]
      }, (result) => {
        resolve()
      }, (err) => {
        console.error(`删除 ${table} 失败:`, err)
        reject(err)
      })
    })
  },

  // 根据条件查询
  queryBy: (table, field, value) => {
    return new Promise((resolve, reject) => {
      if (!db) {
        // 兼容模式
        const data = uni.getStorageSync(table)
        const list = data ? JSON.parse(data) : []
        const result = list.filter(item => item[field] === value)
        resolve(result)
        return
      }

      db.executeSql({
        sql: `SELECT * FROM ${table} WHERE ${field} = ?`,
        args: [value]
      }, (result) => {
        resolve(result.result || [])
      }, (err) => {
        console.error(`查询 ${table} 失败:`, err)
        reject(err)
      })
    })
  },

  // 删除表中所有记录
  deleteAll: (table) => {
    return new Promise((resolve, reject) => {
      if (!db) {
        // 兼容模式：清空 localStorage
        uni.removeStorageSync(table)
        resolve()
        return
      }

      db.executeSql({
        sql: `DELETE FROM ${table}`
      }, (result) => {
        resolve()
      }, (err) => {
        console.error(`清空 ${table} 失败:`, err)
        reject(err)
      })
    })
  }
}

export default {
  initDB,
  isDBAvailable,
  dbOps
}
