/**
 * API 调用封装
 * 替代原有的数据库操作，改用 HTTP API 调用
 * 支持版本检测，自动适配新旧后端
 */

import { ref } from 'vue'
import { getApiBaseUrl } from '../config/env.js'

// API 基础 URL - 根据环境配置动态获取
const BASE_URL = ref(getApiBaseUrl())

// JWT 存储键名
const JWT_STORAGE_KEY = 'authToken'

// 模块级 token 缓存（备选方案，应对 getStorageSync 可能的问题）
let cachedToken = null

// ============================================
// 版本检测状态
// ============================================
let backendVersion = null
let versionChecked = false

/**
 * 检测后端版本
 * 首次请求时自动调用，确定后端支持的认证方式
 */
const detectBackendVersion = async () => {
  if (versionChecked) return backendVersion

  try {
    const res = await new Promise((resolve, reject) => {
      uni.request({
        url: `${BASE_URL.value}/version`,
        method: 'GET',
        success: (res) => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(res.data)
          } else {
            reject(new Error(`版本检测失败: ${res.statusCode}`))
          }
        },
        fail: (err) => {
          reject(new Error(err.errMsg || '版本检测请求失败'))
        }
      })
    })
    backendVersion = res
  } catch (e) {
    // 默认为旧版本 1.0.0
    backendVersion = {
      version: '1.0.0',
      apiVersion: 1,
      authType: 'userId',
      supports: []
    }
  }
  versionChecked = true
  return backendVersion
}

/**
 * 获取后端认证类型
 */
const getAuthType = () => backendVersion?.authType || 'userId'

/**
 * 重置版本检测状态（切换后端地址时调用）
 */
export const resetVersionDetection = () => {
  backendVersion = null
  versionChecked = false
}

/**
 * 设置 API 基础地址
 */
export const setApiBaseUrl = (url) => {
  BASE_URL.value = url
  // 切换地址后重置版本检测
  resetVersionDetection()
}

/**
 * 获取 JWT token
 */
export const getToken = () => {
  // 优先从 storage 获取
  const token = uni.getStorageSync(JWT_STORAGE_KEY)
  // 如果 storage 为空但缓存有值，使用缓存（应对 storage 同步问题）
  if (!token && cachedToken) {
    return cachedToken
  }
  return token
}

/**
 * 设置 JWT token
 */
export const setToken = (token) => {
  cachedToken = token // 同时更新缓存
  uni.setStorageSync(JWT_STORAGE_KEY, token)
}

/**
 * 清除 JWT token
 */
export const clearToken = () => {
  uni.removeStorageSync(JWT_STORAGE_KEY)
}

/**
 * 通用请求封装
 * 支持版本检测，自动适配新旧后端
 */
const request = async (endpoint, options = {}) => {
  // 首次请求时检测后端版本
  if (!versionChecked) {
    await detectBackendVersion()
  }

  let url = `${BASE_URL.value}${endpoint}`

  const header = {
    'Content-Type': 'application/json'
  }

  // 根据后端版本决定认证方式
  const authType = getAuthType()

  if (authType === 'jwt') {
    // 新版 1.1.0+：使用 JWT token
    const token = getToken()
    if (token) {
      header['Authorization'] = `Bearer ${token}`
    }
  } else {
    // 旧版 1.0.0：使用 userId 参数
    const user = uni.getStorageSync('currentUser')
    if (user?.id) {
      const separator = endpoint.includes('?') ? '&' : '?'
      url += `${separator}userId=${encodeURIComponent(user.id)}`
    }
  }

  const defaultOptions = {
    header
  }

  const mergedOptions = {
    ...defaultOptions,
    ...options,
    header: {
      ...defaultOptions.header,
      ...options.header
    }
  }

  try {
    const response = await new Promise((resolve, reject) => {
      uni.request({
        url,
        ...mergedOptions,
        success: (res) => {
          // 401 未授权，清除 token 并跳转登录页
          if (res.statusCode === 401) {
            clearToken()
            uni.removeStorageSync('currentUser')
            uni.reLaunch({ url: '/pages/login/login' })
            return reject(new Error('登录已过期，请重新登录'))
          }
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

// 手动构建查询字符串（兼容小程序环境）
const buildQueryString = (params = {}) => {
  if (!params || Object.keys(params).length === 0) return ''
  return Object.entries(params)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&')
}

export const apiOps = {
  // 查询所有记录（支持分页参数）
  queryAll: (table, params = {}) => {
    const queryString = buildQueryString(params)
    const endpoint = queryString ? `/${table}?${queryString}` : `/${table}`
    return request(endpoint)
  },

  // 根据字段查询（支持分页参数）
  queryBy: (table, field, value, params = {}) => {
    const queryString = buildQueryString(params)
    const endpoint = `/${table}/by/${field}/${value}${queryString ? '?' + queryString : ''}`
    return request(endpoint)
  },

  // 根据 ID 查询
  getById: (table, id) => {
    return request(`/${table}/${id}`)
  },

  // 新增记录
  insert: (table, data) => {
    return request(`/${table}`, {
      method: 'POST',
      data: JSON.stringify(data)
    })
  },

  // 更新记录
  update: (table, id, data) => {
    return request(`/${table}/${id}`, {
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
    return apiOps.queryBy('invitation_codes', 'creatorId', creatorId)
  },
  getAll: () => apiOps.queryAll('invitation_codes')
}

export default {
  setApiBaseUrl,
  resetVersionDetection,
  getToken,
  setToken,
  clearToken,
  apiOps,
  userApi,
  inviteApi
}
