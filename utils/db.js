// 数据库工具 - 使用 uni-sqlite 插件
// 提供统一的数据库操作接口

const DB_NAME = 'train_departure_db'
let db = null

// 初始化数据库
export const initDB = () => {
  return new Promise((resolve, reject) => {
    // 使用 uni-sqlite 插件（仅在原生 App 环境中可用）
    let sqlite = null
    try {
      if (typeof uni.requireNativePlugin === 'function') {
        sqlite = uni.requireNativePlugin('uni-sqlite')
      }
    } catch (e) {
      console.warn('uni-sqlite 插件加载失败:', e)
    }

    if (!sqlite) {
      console.warn('uni-sqlite 插件未安装或不可用，使用 localStorage 兼容模式')
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
      // 用户表
      `CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        phone TEXT UNIQUE NOT NULL,
        nickname TEXT,
        password TEXT,
        role TEXT DEFAULT 'admin',
        inviteCode TEXT,
        invitedBy TEXT,
        parentId TEXT,
        createdAt TEXT
      )`,
      // 邀请码表
      `CREATE TABLE IF NOT EXISTS invitation_codes (
        id TEXT PRIMARY KEY,
        code TEXT UNIQUE NOT NULL,
        type TEXT NOT NULL,
        creatorId TEXT,
        usedBy TEXT,
        usedAt TEXT,
        createdAt TEXT
      )`,
      // 中间商的装发车人员关联表
      `CREATE TABLE IF NOT EXISTS merchant_workers (
        id TEXT PRIMARY KEY,
        middlemanId TEXT,
        workerId TEXT
      )`,
      // 中间商的鸡场关联表
      `CREATE TABLE IF NOT EXISTS merchant_farms (
        id TEXT PRIMARY KEY,
        middlemanId TEXT,
        merchantId TEXT,
        userId TEXT
      )`,
      // 中间商的下级用户表
      `CREATE TABLE IF NOT EXISTS merchant_users (
        id TEXT PRIMARY KEY,
        middlemanId TEXT,
        userId TEXT,
        userPhone TEXT,
        userRole TEXT,
        createdAt TEXT
      )`,
      // 鸡场表
      `CREATE TABLE IF NOT EXISTS merchants (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        margin REAL DEFAULT 0,
        contact TEXT,
        phone TEXT,
        address TEXT,
        note TEXT,
        userId TEXT,
        createdAt TEXT
      )`,
      // 员工表
      `CREATE TABLE IF NOT EXISTS workers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT DEFAULT 'both',
        phone TEXT,
        note TEXT,
        userId TEXT,
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
        userId TEXT,
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
        userId TEXT,
        note TEXT,
        createdAt TEXT
      )`,
      // 设置表
      `CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY DEFAULT 1,
        receiptBigBoxWeight REAL DEFAULT 45,
        deliveryBigBoxWeight REAL DEFAULT 44,
        smallBoxWeight REAL DEFAULT 29.5,
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

// 用户相关查询
export const userDbOps = {
  // 根据手机号查询用户
  getUserByPhone: (phone) => {
    return new Promise((resolve, reject) => {
      if (!db) {
        const data = uni.getStorageSync('users')
        const list = data ? JSON.parse(data) : []
        const result = list.filter(item => item.phone === phone)
        resolve(result)
        return
      }

      db.executeSql({
        sql: 'SELECT * FROM users WHERE phone = ?',
        args: [phone]
      }, (result) => {
        resolve(result.result || [])
      }, (err) => {
        console.error('查询用户失败:', err)
        reject(err)
      })
    })
  },

  // 根据ID查询用户
  getUserById: (id) => {
    return new Promise((resolve, reject) => {
      if (!db) {
        const data = uni.getStorageSync('users')
        const list = data ? JSON.parse(data) : []
        const result = list.filter(item => item.id === id)
        resolve(result)
        return
      }

      db.executeSql({
        sql: 'SELECT * FROM users WHERE id = ?',
        args: [id]
      }, (result) => {
        resolve(result.result || [])
      }, (err) => {
        console.error('查询用户失败:', err)
        reject(err)
      })
    })
  },

  // 根据邀请码查询
  getUserByInviteCode: (inviteCode) => {
    return new Promise((resolve, reject) => {
      if (!db) {
        const data = uni.getStorageSync('users')
        const list = data ? JSON.parse(data) : []
        const result = list.filter(item => item.inviteCode === inviteCode)
        resolve(result)
        return
      }

      db.executeSql({
        sql: 'SELECT * FROM users WHERE inviteCode = ?',
        args: [inviteCode]
      }, (result) => {
        resolve(result.result || [])
      }, (err) => {
        console.error('查询用户失败:', err)
        reject(err)
      })
    })
  },

  // 创建用户
  createUser: (userData) => {
    return new Promise((resolve, reject) => {
      if (!db) {
        const key = 'users'
        const list = uni.getStorageSync(key) ? JSON.parse(uni.getStorageSync(key)) : []
        list.push(userData)
        uni.setStorageSync(key, JSON.stringify(list))
        resolve(userData)
        return
      }

      const keys = Object.keys(userData)
      const values = Object.values(userData)
      const placeholders = keys.map(() => '?').join(', ')
      const fields = keys.join(', ')

      db.executeSql({
        sql: `INSERT INTO users (${fields}) VALUES (${placeholders})`,
        args: values
      }, (result) => {
        resolve(userData)
      }, (err) => {
        console.error('创建用户失败:', err)
        reject(err)
      })
    })
  },

  // 更新用户
  updateUser: (id, data) => {
    return new Promise((resolve, reject) => {
      if (!db) {
        const key = 'users'
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
        sql: `UPDATE users SET ${updates} WHERE id = ?`,
        args: [...values, id]
      }, (result) => {
        resolve(data)
      }, (err) => {
        console.error('更新用户失败:', err)
        reject(err)
      })
    })
  },

  // 查询所有用户
  getAllUsers: () => {
    return dbOps.queryAll('users')
  }
}

// 邀请码相关查询
export const inviteDbOps = {
  // 根据邀请码查询
  getByCode: (code) => {
    return new Promise((resolve, reject) => {
      if (!db) {
        const data = uni.getStorageSync('invitation_codes')
        const list = data ? JSON.parse(data) : []
        const result = list.filter(item => item.code === code && !item.usedBy)
        resolve(result)
        return
      }

      db.executeSql({
        sql: 'SELECT * FROM invitation_codes WHERE code = ? AND usedBy IS NULL',
        args: [code]
      }, (result) => {
        resolve(result.result || [])
      }, (err) => {
        console.error('查询邀请码失败:', err)
        reject(err)
      })
    })
  },

  // 创建邀请码
  create: (data) => {
    return new Promise((resolve, reject) => {
      if (!db) {
        const key = 'invitation_codes'
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
        sql: `INSERT INTO invitation_codes (${fields}) VALUES (${placeholders})`,
        args: values
      }, (result) => {
        resolve(data)
      }, (err) => {
        console.error('创建邀请码失败:', err)
        reject(err)
      })
    })
  },

  // 使用邀请码
  useCode: (code, userId) => {
    return new Promise((resolve, reject) => {
      if (!db) {
        const key = 'invitation_codes'
        const list = uni.getStorageSync(key) ? JSON.parse(uni.getStorageSync(key)) : []
        const index = list.findIndex(item => item.code === code)
        if (index !== -1) {
          list[index].usedBy = userId
          list[index].usedAt = new Date().toISOString()
          uni.setStorageSync(key, JSON.stringify(list))
        }
        resolve()
        return
      }

      db.executeSql({
        sql: 'UPDATE invitation_codes SET usedBy = ?, usedAt = ? WHERE code = ?',
        args: [userId, new Date().toISOString(), code]
      }, (result) => {
        resolve()
      }, (err) => {
        console.error('使用邀请码失败:', err)
        reject(err)
      })
    })
  },

  // 查询创建者的邀请码列表
  getByCreator: (creatorId) => {
    return dbOps.queryBy('invitation_codes', 'creatorId', creatorId)
  },

  // 查询所有邀请码
  getAll: () => {
    return dbOps.queryAll('invitation_codes')
  }
}

// 商户关联相关查询
export const merchantUserDbOps = {
  // 添加下级用户
  add: (data) => {
    return dbOps.insert('merchant_users', data)
  },

  // 根据中间商ID查询下级用户
  getByMiddleman: (middlemanId) => {
    return dbOps.queryBy('merchant_users', 'middlemanId', middlemanId)
  },

  // 根据用户ID查询
  getByUser: (userId) => {
    return dbOps.queryBy('merchant_users', 'userId', userId)
  },

  // 删除
  delete: (id) => {
    return dbOps.delete('merchant_users', id)
  }
}

// 商户鸡场关联
export const merchantFarmDbOps = {
  // 关联
  add: (data) => {
    return dbOps.insert('merchant_farms', data)
  },

  // 根据中间商查询
  getByMiddleman: (middlemanId) => {
    return dbOps.queryBy('merchant_farms', 'middlemanId', middlemanId)
  },

  // 根据用户查询
  getByUser: (userId) => {
    return dbOps.queryBy('merchant_farms', 'userId', userId)
  },

  // 删除
  delete: (id) => {
    return dbOps.delete('merchant_farms', id)
  }
}

// 商户员工关联
export const merchantWorkerDbOps = {
  // 关联
  add: (data) => {
    return dbOps.insert('merchant_workers', data)
  },

  // 根据中间商查询
  getByMiddleman: (middlemanId) => {
    return dbOps.queryBy('merchant_workers', 'middlemanId', middlemanId)
  },

  // 根据用户查询
  getByUser: (userId) => {
    return dbOps.queryBy('merchant_workers', 'userId', userId)
  },

  // 删除
  delete: (id) => {
    return dbOps.delete('merchant_workers', id)
  }
}

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
  dbOps,
  userDbOps,
  inviteDbOps,
  merchantUserDbOps,
  merchantFarmDbOps,
  merchantWorkerDbOps
}
