// 数据库工具 - 使用 uniCloud 云数据库
// 提供统一的数据库操作接口

let db = null
let dbCmd = null
let dbInitStatus = 'pending' // pending | success | failed
let initPromise = null // 缓存初始化 Promise（只在成功时缓存）

// 获取数据库初始化状态
export const getDbInitStatus = () => dbInitStatus

// 等待数据库就绪的辅助函数
export const waitForDB = async (timeout = 10000) => {
  const startTime = Date.now()
  while (Date.now() - startTime < timeout) {
    const dbInstance = await initDB()
    if (dbInstance) return dbInstance
    await new Promise(resolve => setTimeout(resolve, 200))
  }
  throw new Error('数据库初始化超时')
}

// 初始化数据库连接（幂等，成功后缓存）
export const initDB = () => {
  // 如果已有初始化 Promise 且数据库已就绪，直接返回
  if (initPromise && db) {
    return initPromise
  }

  // 如果已有初始化 Promise 但数据库还未就绪，返回该 Promise
  if (initPromise) {
    return initPromise
  }

  initPromise = new Promise((resolve, reject) => {
    // 等待 uniCloud 初始化完成
    const maxRetries = 300     // 增加到 300 次（300 次 × 200ms = 60 秒）
    const retryInterval = 200
    let retryCount = 0

    const tryInit = () => {
      setTimeout(() => {
        if (typeof uniCloud !== 'undefined' && uniCloud) {
          try {
            const database = uniCloud.database()
            if (database) {
              db = database
              // 初始化命令
              dbCmd = db.command
              dbInitStatus = 'success'
              console.log('【数据库】初始化成功')
              resolve(db)
              return
            }
          } catch (e) {
            console.warn('【数据库】初始化中...', retryCount)
          }
        } else {
          console.warn('【数据库】等待 uniCloud...', retryCount)
        }

        if (retryCount < maxRetries) {
          retryCount++
          tryInit()
        } else {
          dbInitStatus = 'failed'
          initPromise = null  // 清除缓存，允许下次重试
          console.error('【数据库】初始化超时')
          resolve(null)
        }
      }, retryInterval)
    }
    tryInit()
  })

  return initPromise
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
    return new Promise(async (resolve, reject) => {
      // 关键操作：必须确保云端数据库就绪
      const dbInstance = await initDB()

      // 数据库不可用时，直接返回空（禁止降级到本地存储）
      if (!dbInstance) {
        console.error('【getUserByPhone】云端数据库不可用，拒绝返回本地存储数据')
        resolve([])
        return
      }

      // 云端查询
      dbInstance.collection('users').where({ phone: dbInstance.command.eq(phone) }).get()
        .then(res => {
          resolve(res.result ? res.result.data : res.data || [])
        })
        .catch(err => {
          console.error('云端查询失败:', err)
          reject(err)
        })
    })
  },

  // 根据ID查询用户
  getUserById: (id) => {
    return new Promise(async (resolve, reject) => {
      // 关键操作：必须确保云端数据库就绪
      const dbInstance = await initDB()

      // 数据库不可用时，直接返回空（禁止降级到本地存储）
      if (!dbInstance) {
        console.error('【getUserById】云端数据库不可用，拒绝返回本地存储数据')
        resolve([])
        return
      }

      dbInstance.collection('users').doc(id).get()
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
    return new Promise(async (resolve, reject) => {
      // 关键操作：必须确保云端数据库就绪
      const dbInstance = await initDB()

      // 数据库不可用时，直接返回空（禁止降级到本地存储）
      if (!dbInstance) {
        console.error('【getUserByInviteCode】云端数据库不可用，拒绝返回本地存储数据')
        resolve([])
        return
      }

      dbInstance.collection('users').where({ inviteCode: dbInstance.command.eq(inviteCode) }).get()
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
    return new Promise(async (resolve, reject) => {
      // 关键操作：必须确保云端数据库就绪
      const dbInstance = await initDB()

      // 数据库不可用时，直接拒绝（禁止降级到本地存储）
      if (!dbInstance) {
        console.error('【createUser】云端数据库不可用，拒绝写入本地存储')
        reject(new Error('云端数据库不可用'))
        return
      }

      dbInstance.collection('users').add(userData)
        .then(res => {
          resolve(userData)
        })
        .catch(err => {
          console.error('创建用户到云端失败:', err)
          reject(err)
        })
    })
  },

  // 更新用户
  updateUser: (id, data) => {
    return new Promise(async (resolve, reject) => {
      // 关键操作：必须确保云端数据库就绪
      const dbInstance = await initDB()

      // 数据库不可用时，直接拒绝（禁止降级到本地存储）
      if (!dbInstance) {
        console.error('【updateUser】云端数据库不可用，拒绝写入本地存储')
        reject(new Error('云端数据库不可用'))
        return
      }

      // 先查询用户的云端 _id
      dbInstance.collection('users').where({ id: dbInstance.command.eq(id) }).get()
        .then(res => {
          const userData = res.result ? res.result.data : res.data || []
          if (userData.length > 0 && userData[0]._id) {
            // 使用云端的 _id 进行更新
            return dbInstance.collection('users').doc(userData[0]._id).update(data)
          } else {
            // 用户不存在于云端
            return Promise.reject(new Error('USER_NOT_IN_CLOUD'))
          }
        })
        .then(res => {
          resolve(data)
        })
        .catch(err => {
          console.error('更新用户到云端失败:', err)
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
    return new Promise(async (resolve, reject) => {
      // 关键操作：必须确保云端数据库就绪
      const dbInstance = await initDB()

      // 数据库不可用时，直接返回空（禁止降级到本地存储）
      if (!dbInstance) {
        console.error('【getByCode】云端数据库不可用，拒绝返回本地存储数据')
        resolve([])
        return
      }

      dbInstance.collection('invitation_codes').where({
        code: code,
        usedBy: dbInstance.command.eq(null)
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
    return new Promise(async (resolve, reject) => {
      // 关键操作：必须确保云端数据库就绪
      const dbInstance = await initDB()

      // 数据库不可用时，直接拒绝（禁止降级到本地存储）
      if (!dbInstance) {
        console.error('【create】云端数据库不可用，拒绝写入本地存储')
        reject(new Error('云端数据库不可用'))
        return
      }

      dbInstance.collection('invitation_codes').add(data)
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
    return new Promise(async (resolve, reject) => {
      // 关键操作：必须确保云端数据库就绪
      const dbInstance = await initDB()

      // 数据库不可用时，直接拒绝（禁止降级到本地存储）
      if (!dbInstance) {
        console.error('【useCode】云端数据库不可用，拒绝操作本地存储')
        reject(new Error('云端数据库不可用'))
        return
      }

      dbInstance.collection('invitation_codes').where({ code: dbInstance.command.eq(code) }).update({
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

// 通用的 CRUD 操作
export const dbOps = {
  // 查询所有记录
  queryAll: (table, limit = 500) => {
    return new Promise(async (resolve, reject) => {
      // 关键操作：必须确保云端数据库就绪
      const dbInstance = await initDB()

      // 数据库不可用时，直接返回空（禁止降级到本地存储）
      if (!dbInstance) {
        console.error(`【queryAll:${table}】云端数据库不可用，拒绝返回本地存储数据`)
        resolve([])
        return
      }

      // 云端查询
      dbInstance.collection(table).limit(limit).get()
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
    return new Promise(async (resolve, reject) => {
      // 关键操作：必须确保云端数据库就绪
      const dbInstance = await initDB()

      // 数据库不可用时，直接拒绝（禁止降级到本地存储）
      if (!dbInstance) {
        console.error(`【insert:${table}】云端数据库不可用，拒绝写入本地存储`)
        reject(new Error('云端数据库不可用'))
        return
      }

      // 过滤掉 _id 字段，uniCloud 会自动生成
      const dataToInsert = { ...data }
      delete dataToInsert._id

      dbInstance.collection(table).add(dataToInsert)
        .then(res => {
          // 云端插入成功，保存云端的 _id 到返回数据中
          const resultData = { ...data }
          if (res.result && res.result._id) {
            resultData._id = res.result._id
          }
          resolve(resultData)
        })
        .catch(err => {
          console.error(`插入 ${table} 到云端失败:`, err)
          reject(err)
        })
    })
  },

  // 更新记录
  update: (table, id, data) => {
    return new Promise(async (resolve, reject) => {
      // 关键操作：必须确保云端数据库就绪
      const dbInstance = await initDB()

      // 数据库不可用时，直接拒绝（禁止降级到本地存储）
      if (!dbInstance) {
        console.error(`【update:${table}】云端数据库不可用，拒绝写入本地存储`)
        reject(new Error('云端数据库不可用'))
        return
      }

      // 删除 _id 字段，避免云端验证失败
      const dataToUpdate = { ...data }
      delete dataToUpdate._id

      // 先查询云端是否有该记录，获取云端的 _id
      dbInstance.collection(table).where({ id: dbInstance.command.eq(id) }).get()
        .then(res => {
          const existingData = res.result ? res.result.data : res.data || []
          if (existingData.length > 0 && existingData[0]._id) {
            // 使用云端的 _id 进行更新
            return dbInstance.collection(table).doc(existingData[0]._id).update(dataToUpdate)
          } else {
            // 记录不存在于云端，尝试插入新记录
            return dbInstance.collection(table).add(dataToUpdate)
          }
        })
        .then(res => {
          resolve(data)
        })
        .catch(err => {
          console.error(`更新 ${table} 到云端失败:`, err)
          reject(err)
        })
    })
  },

  // 删除记录
  delete: (table, id) => {
    return new Promise(async (resolve, reject) => {
      // 关键操作：必须确保云端数据库就绪
      const dbInstance = await initDB()

      // 数据库不可用时，直接拒绝（禁止降级到本地存储）
      if (!dbInstance) {
        console.error(`【delete:${table}】云端数据库不可用，拒绝操作本地存储`)
        reject(new Error('云端数据库不可用'))
        return
      }

      // 先查询云端是否有该记录，获取云端的 _id
      dbInstance.collection(table).where({ id: dbInstance.command.eq(id) }).get()
        .then(res => {
          const existingData = res.result ? res.result.data : res.data || []
          if (existingData.length > 0 && existingData[0]._id) {
            // 使用云端的 _id 进行删除
            return dbInstance.collection(table).doc(existingData[0]._id).remove()
          } else {
            // 记录不存在于云端，视为删除成功
            return Promise.resolve()
          }
        })
        .then(res => {
          resolve()
        })
        .catch(err => {
          console.error(`删除 ${table} 从云端失败:`, err)
          reject(err)
        })
    })
  },

  // 根据条件查询
  queryBy: (table, field, value) => {
    return new Promise(async (resolve, reject) => {
      // 关键操作：必须确保云端数据库就绪
      const dbInstance = await initDB()

      // 数据库不可用时，直接返回空（禁止降级到本地存储）
      if (!dbInstance) {
        console.error(`【queryBy:${table}】云端数据库不可用，拒绝返回本地存储数据`)
        resolve([])
        return
      }

      const whereObj = {}
      whereObj[field] = dbInstance.command.eq(value)

      dbInstance.collection(table).where(whereObj).get()
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
    return new Promise(async (resolve, reject) => {
      // 关键操作：必须确保云端数据库就绪
      const dbInstance = await initDB()

      // 数据库不可用时，直接拒绝（禁止降级到本地存储）
      if (!dbInstance) {
        console.error('【deleteAll】云端数据库不可用，拒绝操作本地存储')
        reject(new Error('云端数据库不可用'))
        return
      }

      // 获取所有记录并删除
      dbInstance.collection(table).get()
        .then(res => {
          const data = res.result ? res.result.data : res.data
          if (data && data.length > 0) {
            const promises = data.map(item => {
              return dbInstance.collection(table).doc(item._id || item.id).remove()
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
  waitForDB,
  dbOps,
  userDbOps,
  inviteDbOps
}
