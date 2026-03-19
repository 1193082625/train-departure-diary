// 数据库工具 - 使用 uniCloud 云数据库
// 提供统一的数据库操作接口

let db = null
let dbCmd = null
let dbInitStatus = 'pending' // pending | success | failed

// 获取数据库初始化状态
export const getDbInitStatus = () => dbInitStatus

// 初始化数据库连接
export const initDB = () => {
  return new Promise((resolve, reject) => {
    // 等待 uniCloud 初始化完成
    const tryInit = (retryCount = 0) => {
      setTimeout(() => {
        if (typeof uniCloud !== 'undefined' && uniCloud) {
          try {
            db = uniCloud.database()
            dbCmd = db.command
            dbInitStatus = 'success'
            console.log('【数据库】uniCloud 连接成功')
            resolve(db)
          } catch (e) {
            console.warn('【数据库】uniCloud 初始化中，重试...', retryCount)
            if (retryCount < 3) {
              tryInit(retryCount + 1)
            } else {
              dbInitStatus = 'failed'
              console.error('【数据库】uniCloud 初始化失败，数据库不可用')
              resolve(null)
            }
          }
        } else {
          dbInitStatus = 'failed'
          console.error('【数据库】uniCloud 未初始化，数据库不可用')
          resolve(null)
        }
      }, 300 * (retryCount + 1))
    }
    tryInit()
  })
}

// 检查数据库是否可用
export const isDBAvailable = () => {
  if (!db) {
    console.warn('【数据库】数据库不可用，数据将无法保存到云端')
  }
  return !!db
}

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

      db.collection('users').where({ phone: dbCmd.eq(phone) }).get()
        .then(res => {
          console.log('查询用户结果:', res);
          
          resolve(res.result ? res.result.data : res.data || [])
        })
        .catch(err => {
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

      db.collection('users').doc(id).get()
        .then(res => {
          resolve(res.result ? res.result.data : res.data || [])
        })
        .catch(err => {
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

      db.collection('users').where({ inviteCode: dbCmd.eq(inviteCode) }).get()
        .then(res => {
          resolve(res.result ? res.result.data : res.data || [])
        })
        .catch(err => {
          console.error('查询用户失败:', err)
          reject(err)
        })
    })
  },

  // 创建用户
  createUser: (userData) => {
    return new Promise((resolve, reject) => {
      // 如果数据库未初始化或不可用，直接使用本地存储
      if (!db) {
        const key = 'users'
        const list = uni.getStorageSync(key) ? JSON.parse(uni.getStorageSync(key)) : []
        list.push(userData)
        uni.setStorageSync(key, JSON.stringify(list))
        resolve(userData)
        return
      }

      db.collection('users').add(userData)
        .then(res => {
          console.log('创建用户成功:', res)
          resolve(userData)
        })
        .catch(err => {
          console.error('创建用户到云端失败，降级到本地存储:', err)
          // 云端写入失败时，降级到本地存储
          const key = 'users'
          const list = uni.getStorageSync(key) ? JSON.parse(uni.getStorageSync(key)) : []
          list.push(userData)
          uni.setStorageSync(key, JSON.stringify(list))
          resolve(userData)
        })
    })
  },

  // 更新用户
  updateUser: (id, data) => {
    return new Promise((resolve, reject) => {
      // 如果数据库未初始化或不可用，直接使用本地存储
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

      console.log('更新用户数据:', data);

      // 先查询用户的云端 _id
      db.collection('users').where({ id: dbCmd.eq(id) }).get()
        .then(res => {
          const userData = res.result ? res.result.data : res.data || []
          if (userData.length > 0 && userData[0]._id) {
            // 使用云端的 _id 进行更新
            return db.collection('users').doc(userData[0]._id).update(data)
          } else {
            // 用户不存在于云端，降级到本地存储
            return Promise.reject(new Error('USER_NOT_IN_CLOUD'))
          }
        })
        .then(res => {
          resolve(data)
        })
        .catch(err => {
          console.error('更新用户到云端失败，降级到本地存储:', err)
          // 云端更新失败时，降级到本地存储
          const key = 'users'
          const list = uni.getStorageSync(key) ? JSON.parse(uni.getStorageSync(key)) : []
          const index = list.findIndex(item => item.id === id)
          if (index !== -1) {
            list[index] = { ...list[index], ...data }
            uni.setStorageSync(key, JSON.stringify(list))
          }
          resolve(data)
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

      db.collection('invitation_codes').where({
        code: code,
        usedBy: dbCmd.eq(null)
      }).get()
        .then(res => {
          resolve(res.result ? res.result.data : res.data || [])
        })
        .catch(err => {
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

      db.collection('invitation_codes').add(data)
        .then(res => {
          resolve(data)
        })
        .catch(err => {
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

      db.collection('invitation_codes').where({ code: dbCmd.eq(code) }).update({
        usedBy: userId,
        usedAt: new Date().toISOString()
      })
        .then(res => {
          resolve()
        })
        .catch(err => {
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
  queryAll: (table, limit = 500) => {
    return new Promise((resolve, reject) => {
      if (!db) {
        const data = uni.getStorageSync(table)
        resolve(data ? JSON.parse(data) : [])
        return
      }

      db.collection(table).limit(limit).get()
        .then(res => {
          resolve(res.result ? res.result.data : res.data || [])
        })
        .catch(err => {
          console.error(`查询 ${table} 失败:`, err)
          reject(err)
        })
    })
  },

  // 插入记录
  insert: (table, data) => {
    return new Promise((resolve, reject) => {
      if (!db) {
        const key = table
        const list = uni.getStorageSync(key) ? JSON.parse(uni.getStorageSync(key)) : []
        list.push(data)
        uni.setStorageSync(key, JSON.stringify(list))
        resolve(data)
        return
      }

      // 过滤掉 _id 字段，uniCloud 会自动生成
      const dataToInsert = { ...data }
      delete dataToInsert._id

      db.collection(table).add(dataToInsert)
        .then(res => {
          resolve(data)
        })
        .catch(err => {
          console.error(`插入 ${table} 失败:`, err)
          reject(err)
        })
    })
  },

  // 更新记录
  update: (table, id, data) => {
    return new Promise((resolve, reject) => {
      if (!db) {
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

      // 删除 _id 字段，避免云端验证失败
      const dataToUpdate = { ...data }
      delete dataToUpdate._id

      db.collection(table).doc(id).update(dataToUpdate)
        .then(res => {
          resolve(data)
        })
        .catch(err => {
          console.error(`更新 ${table} 失败:`, err)
          reject(err)
        })
    })
  },

  // 删除记录
  delete: (table, id) => {
    return new Promise((resolve, reject) => {
      if (!db) {
        const key = table
        let list = uni.getStorageSync(key) ? JSON.parse(uni.getStorageSync(key)) : []
        list = list.filter(item => item.id !== id)
        uni.setStorageSync(key, JSON.stringify(list))
        resolve()
        return
      }

      db.collection(table).doc(id).remove()
        .then(res => {
          resolve()
        })
        .catch(err => {
          console.error(`删除 ${table} 失败:`, err)
          reject(err)
        })
    })
  },

  // 根据条件查询
  queryBy: (table, field, value) => {
    return new Promise((resolve, reject) => {
      if (!db) {
        const data = uni.getStorageSync(table)
        const list = data ? JSON.parse(data) : []
        const result = list.filter(item => item[field] === value)
        resolve(result)
        return
      }

      const whereObj = {}
      whereObj[field] = value

      db.collection(table).where(whereObj).get()
        .then(res => {
          resolve(res.result ? res.result.data : res.data || [])
        })
        .catch(err => {
          console.error(`查询 ${table} 失败:`, err)
          reject(err)
        })
    })
  },

  // 删除表中所有记录
  deleteAll: (table) => {
    return new Promise((resolve, reject) => {
      if (!db) {
        uni.removeStorageSync(table)
        resolve()
        return
      }

      // 获取所有记录并删除
      db.collection(table).get()
        .then(res => {
          const data = res.result ? res.result.data : res.data
          if (data && data.length > 0) {
            const promises = data.map(item => {
              return db.collection(table).doc(item._id || item.id).remove()
            })
            return Promise.all(promises)
          }
          return []
        })
        .then(() => resolve())
        .catch(err => {
          console.error(`清空 ${table} 失败:`, err)
          reject(err)
        })
    })
  }
}

export default {
  initDB,
  isDBAvailable,
  getDbInitStatus,
  dbOps,
  userDbOps,
  inviteDbOps,
  merchantUserDbOps,
  merchantFarmDbOps,
  merchantWorkerDbOps
}
