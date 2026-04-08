/**
 * API 调用封装
 * 替代原有的数据库操作，改用 HTTP API 调用
 *
 * API 基础 URL - 需要根据环境配置
 */

import { ref } from 'vue'

// API 基础 URL - 自建阿里云 MySQL 后端
// const BASE_URL = ref('http://47.96.90.103:3000/api')
const BASE_URL = ref('http://localhost:3000/api')

/**
 * 设置 API 基础地址
 */
export const setApiBaseUrl = (url) => {
  BASE_URL.value = url
}

/**
 * 通用请求封装
 */
const request = async (endpoint, options = {}) => {
  const url = `${BASE_URL.value}${endpoint}`

  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json'
    }
  }

  const mergedOptions = {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...options.headers
    }
  }

  try {
    const response = await new Promise((resolve, reject) => {
      uni.request({
        url,
        ...mergedOptions,
        success: (res) => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(res.data)
          } else {
            reject(new Error(res.data?.error || `请求失败: ${res.statusCode}`))
          }
        },
        fail: (err) => {
          reject(new Error(err.errMsg || '网络请求失败'))
        }
      })
    })

    return response
  } catch (err) {
    console.error(`API 请求失败 [${endpoint}]:`, err)
    throw err
  }
}

// API 操作封装 - 与原有 dbOps 接口一致

export const apiOps = {
  // 查询所有记录（自动携带当前用户的 userId）
  queryAll: (table, limit = 500) => {
    const userData = uni.getStorageSync('currentUser')
    const userId = userData ? JSON.parse(userData).id : null
    const endpoint = userId ? `/${table}?userId=${userId}` : `/${table}`
    return request(endpoint)
  },

  // 根据字段查询
  queryBy: (table, field, value) => {
    return request(`/${table}/by/${field}/${value}`)
  },

  // 根据 ID 查询
  getById: (table, id) => {
    return request(`/${table}/${id}`)
  },

  // 新增记录（自动携带当前用户的 userId）
  insert: (table, data) => {
    const userData = uni.getStorageSync('currentUser')
    const userId = userData ? JSON.parse(userData).id : null
    const endpoint = userId ? `/${table}?userId=${userId}` : `/${table}`
    return request(endpoint, {
      method: 'POST',
      data: JSON.stringify(data)
    })
  },

  // 更新记录（自动携带当前用户的 userId）
  update: (table, id, data) => {
    const userData = uni.getStorageSync('currentUser')
    const userId = userData ? JSON.parse(userData).id : null
    const endpoint = userId ? `/${table}/${id}?userId=${userId}` : `/${table}/${id}`
    return request(endpoint, {
      method: 'PUT',
      data: JSON.stringify(data)
    })
  },

  // 删除记录
  delete: (table, id) => {
    return request(`/${table}/${id}`, {
      method: 'DELETE'
    })
  },

  // 清空表
  deleteAll: (table) => {
    return request(`/${table}`, {
      method: 'DELETE'
    })
  }
}

// 用户相关 API
export const userApi = {
  getUserByPhone: (phone) => apiOps.queryBy('users', 'phone', phone),
  getUserById: (id) => apiOps.getById('users', id),
  getUserByInviteCode: (inviteCode) => apiOps.queryBy('users', 'inviteCode', inviteCode),
  createUser: (data) => apiOps.insert('users', data),
  updateUser: (id, data) => apiOps.update('users', id, data),
  deleteUser: (id) => apiOps.delete('users', id),
  getAllUsers: () => apiOps.queryAll('users'),
  // 密码登录（后端验证密码）
  login: (phone, password) => {
    return request('/users/login', {
      method: 'POST',
      data: JSON.stringify({ phone, password })
    })
  }
}

// 邀请码相关 API
export const inviteApi = {
  getByCode: (code) => request('/invitation_codes/by/code/' + code),
  create: (data) => apiOps.insert('invitation_codes', data),
  useCode: (code, userId) => {
    return request(`/invitation_codes/by/code/${code}`, {
      method: 'PUT',
      data: JSON.stringify({ usedBy: userId, usedAt: new Date().toISOString() })
    })
  },
  getByCreator: (creatorId) => {
    // 后端不支持按 creatorId 查询，改为获取所有后在前端过滤
    return apiOps.queryAll('invitation_codes').then(res => ({
      ...res,
      data: (res.data || []).filter(code => code.creatorId === creatorId)
    }))
  },
  getAll: () => apiOps.queryAll('invitation_codes')
}

export default {
  setApiBaseUrl,
  apiOps,
  userApi,
  inviteApi
}
