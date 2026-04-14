/**
 * 核心请求封装
 */

import { ref } from 'vue'

// API 基础 URL
// const BASE_URL = ref('http://47.96.90.103:3000/api')
// const BASE_URL = ref('http://192.168.31.144:3000/api')
// const BASE_URL = ref('http://localhost:3000/api')
const BASE_URL = ref('http://47.96.90.103:3002/api')

/**
 * 获取存储的 token
 */
const getToken = () => uni.getStorageSync('token')

/**
 * 跳转登录页（401 时调用）
 */
const redirectToLogin = () => {
  uni.removeStorageSync('token')
  uni.removeStorageSync('currentUser')
  uni.reLaunch({ url: '/pages/login/login' })
}

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

  const token = getToken()

  try {
    const response = await new Promise((resolve, reject) => {
      const finalHeaders = {
        ...mergedOptions.headers,
        'Authorization': `Bearer ${token || ''}`
      }
      uni.request({
        url,
        method: mergedOptions.method,
        data: mergedOptions.data,
        header: finalHeaders,
        success: (res) => {
          if (res.statusCode === 401) {
            redirectToLogin()
            reject(new Error('登录已过期，请重新登录'))
            return
          }

          if (res.statusCode === 403) {
            reject(new Error('无权限操作'))
            return
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

export { BASE_URL, getToken, redirectToLogin, request }

export default request
