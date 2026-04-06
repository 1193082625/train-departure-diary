/**
 * API 环境配置
 * 根据环境变量自动选择本地/远程后端服务
 */

// API 环境配置
const ENV_CONFIG = {
  // 本地开发环境 - .env.local
  local: {
    apiBaseUrl: 'http://localhost:3000/api',
    useLocalDb: true
  },
  // 阿里云生产环境 - .env.production
  production: {
    apiBaseUrl: 'http://47.96.90.103:3000/api',
    useLocalDb: false
  }
}

// 获取当前环境模式
const getEnvMode = () => {
  // 优先使用本地存储的设置
  const storedMode = uni.getStorageSync('ENV_MODE')
  if (storedMode && ENV_CONFIG[storedMode]) {
    return storedMode
  }
  // 默认为本地开发
  // 改这里：'local' 或 'production'
  return 'local'
}

// 获取 API 地址
const getApiBaseUrl = () => {
  const mode = getEnvMode()
  return ENV_CONFIG[mode]?.apiBaseUrl || ENV_CONFIG.local.apiBaseUrl
}

// 获取是否使用本地数据库
const isUsingLocalDb = () => {
  const mode = getEnvMode()
  return ENV_CONFIG[mode]?.useLocalDb ?? true
}

// 设置环境模式
const setEnvMode = (mode) => {
  if (ENV_CONFIG[mode]) {
    uni.setStorageSync('ENV_MODE', mode)
    return true
  }
  return false
}

export { getApiBaseUrl, isUsingLocalDb, getEnvMode, setEnvMode, ENV_CONFIG }
