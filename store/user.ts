import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { apiOps, userApi, inviteApi } from '@/api'
import request from '@/api/request'
import toast from '@/utils/toast'
import { useSettingsStore } from './settings'
import { cacheOps } from '@/api/cache'

// 生成邀请码
const generateInviteCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

// 生成6位数字邀请码
const generateRandomCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

// 角色类型
export const ROLES = {
  ADMIN: 'admin',      // 管理员
  MIDDLEMAN: 'middleman', // 中间商
  LOADER: 'loader',    // 装发车
  FARM: 'farm'         // 鸡场
}

// 角色名称映射
export const ROLE_NAMES = {
  [ROLES.ADMIN]: '管理员',
  [ROLES.MIDDLEMAN]: '中间商',
  [ROLES.LOADER]: '装发车',
  [ROLES.FARM]: '鸡场'
}


// 会话有效期：7 天（毫秒）
const SESSION_EXPIRY = 7 * 24 * 60 * 60 * 1000

export const useUserStore = defineStore('user', () => {
  const currentUser = ref(null)
  const isLoggedIn = ref(false)
  const users = ref([])  // 云端加载的所有用户

  // 计算是否为管理员
  const isAdmin = computed(() => currentUser.value?.role === ROLES.ADMIN)

  // 计算是否为中间商
  const isMiddleman = computed(() => currentUser.value?.role === ROLES.MIDDLEMAN)

  // 计算是否为装发车
  const isLoader = computed(() => currentUser.value?.role === ROLES.LOADER)

  // 计算是否为鸡场
  const isFarm = computed(() => currentUser.value?.role === ROLES.FARM)

  // 当前选中的中间商ID（管理员专用）
  const currentMiddlemanId = ref<string | null>(null)

  // 获取中间商列表（管理员用）
  const middlemanList = computed(() => {
    return users.value.filter(u => u.role === ROLES.MIDDLEMAN)
  })

  // 设置当前选中的中间商（管理员用）
  const setCurrentMiddleman = (middlemanId: string | null) => {
    currentMiddlemanId.value = middlemanId
  }

  // 加载所有用户
  const loadUsers = async () => {
    try {
      const res = await userApi.getAllUsers()
      users.value = res.data || []
    } catch (e) {
      console.error('【User】加载用户列表失败:', e)
      toast.error('加载用户列表失败')
      users.value = []
    }
  }

  // 初始化 - 从本地存储恢复登录状态
  const init = async () => {
    try {

      // 从本地存储恢复登录状态
      const userData = uni.getStorageSync('currentUser')
      if (userData) {
        // 检查会话是否过期
        if (checkSessionExpiry()) {
          // 会话过期，清除登录状态
          logout()
          return
        }
        // 兼容旧用户：没有 loginTime 但有 currentUser，设置登录时间
        if (!uni.getStorageSync('loginTime')) {
          uni.setStorageSync('loginTime', Date.now())
        }
        currentUser.value = JSON.parse(userData)
        isLoggedIn.value = true

        // 管理员需要中间商列表，其他角色按需加载
        if (currentUser.value.role === ROLES.ADMIN) {
          await loadUsers()
        }

        // 加载 settings
        useSettingsStore().loadSettings()
      }
    } catch (e) {
      console.error('【User】初始化失败:', e)
      toast.error('初始化失败')
    }
  }

  // 登录
  const login = async (phone, code) => {
    try {
      // 检查手机号是否已注册
      const phoneRes = await userApi.getUserByPhone(phone)
      const existingUsers = phoneRes.data || []

      // 如果用户已存在且设置了密码，必须使用密码登录
      if (existingUsers && existingUsers.length > 0) {
        const user = existingUsers[0]
        if (user.hasPassword) {
          // 需要密码登录
          if (!code) {
            return { success: false, message: '请输入密码' }
          }
          // 调用后端登录 API 验证密码（后端支持哈希密码验证）
          try {
            const loginRes = await userApi.login(phone, code)
            if (loginRes.success) {
              currentUser.value = loginRes.data.user || loginRes.data
              isLoggedIn.value = true
              uni.setStorageSync('currentUser', JSON.stringify(currentUser.value))
              uni.setStorageSync('loginTime', Date.now())
              // 存储 token
              if (loginRes.data?.token) {
                uni.setStorageSync('token', loginRes.data.token)
              }
              return { success: true, user: currentUser.value }
            } else {
              return { success: false, message: loginRes.error || '密码错误' }
            }
          } catch (e) {
            console.error('【User】登录 API 调用失败:', e)
            return { success: false, message: '登录失败' }
          }
        } else {
          // 用户存在但未设置密码，必须使用邀请码
          if (!code) {
            return { success: false, message: '请输入邀请码' }
          }
        }
      }

      // 以下是邀请码登录逻辑（首次登录或未设置密码的用户）
      // 无邀请码且无密码，直接拒绝
      if (!code) {
        return { success: false, message: '请输入邀请码' }
      }

      // 调用事务性注册/登录接口
      const regResult = await userApi.register(phone, code)
      if (!regResult.success) {
        return { success: false, message: regResult.error || '注册失败' }
      }

      // 注册/登录成功，返回 needSetPassword: true
      currentUser.value = regResult.data.user || regResult.data
      // 不设置 isLoggedIn = true，等待设置密码后再登录
      uni.setStorageSync('currentUser', JSON.stringify(currentUser.value))
      // 存储 token
      if (regResult.data?.token) {
        uni.setStorageSync('token', regResult.data.token)
      }
      return { success: true, needSetPassword: true, user: regResult.data }
    } catch (e) {
      console.error('【User】登录失败:', e)
      toast.error('登录失败')
      return { success: false, message: '登录失败' }
    }
  }

  // 设置密码
  const setPassword = async (password) => {
    if (!currentUser.value) return { success: false, message: '未登录' }
    try {
      const result = await request('/users/setPassword', {
        method: 'PUT',
        data: { password }
      })

      if (result.success) {
        // 后端返回的用户数据不包含密码，本地也不存储密码
        currentUser.value = { ...currentUser.value, password: undefined }
        isLoggedIn.value = true
        uni.setStorageSync('currentUser', JSON.stringify(currentUser.value))
        uni.setStorageSync('loginTime', Date.now())
      }

      return result
    } catch (e) {
      console.error('【User】设置密码失败:', e)
      return { success: false, message: '设置密码失败' }
    }
  }

  // 修改密码
  const changePassword = async (oldPassword, newPassword) => {
    if (!currentUser.value) return { success: false, message: '未登录' }
    try {
      // 密码由后端加密存储，前端不需要本地验证旧密码
      // 如果需要验证，应调用后端专门的验证 API（当前未实现）
      await userApi.updateUser(currentUser.value.id, { password: newPassword })
      // 后端返回的用户数据不包含密码，本地也不存储密码
      currentUser.value = { ...currentUser.value, password: undefined }
      uni.setStorageSync('currentUser', JSON.stringify(currentUser.value))
      return { success: true }
    } catch (e) {
      console.error('【User】修改密码失败:', e)
      return { success: false, message: '修改密码失败' }
    }
  }

  // 首次登录选择角色
  const selectRole = async (phone, role) => {
    try {
      const newUser = {
        phone: phone,
        nickname: '',
        role: role,
        inviteCode: generateInviteCode(),
        invitedBy: null,
        parentId: null
      }
      try {
        await userApi.createUser(newUser)
      } catch (e) {
        console.error('【User】创建用户到云端失败，将使用本地存储:', e)
      }
      currentUser.value = newUser
      isLoggedIn.value = true
      uni.setStorageSync('currentUser', JSON.stringify(currentUser.value))
      uni.setStorageSync('loginTime', Date.now())
      return { success: true, user: newUser }
    } catch (e) {
      console.error('【User】创建用户失败:', e)
      // toast.error('创建用户失败')
      return { success: false, message: '创建用户失败' }
    }
  }

  // 更新用户信息
  const updateUser = async (updates) => {
    if (!currentUser.value) return { success: false, message: '未登录' }
    try {
      await userApi.updateUser(currentUser.value.id, updates)
      currentUser.value = { ...currentUser.value, ...updates }
      uni.setStorageSync('currentUser', JSON.stringify(currentUser.value))
      return { success: true }
    } catch (e) {
      console.error('【User】更新用户失败:', e)
      // 云端更新失败时，仅更新本地内存状态
      currentUser.value = { ...currentUser.value, ...updates }
      uni.setStorageSync('currentUser', JSON.stringify(currentUser.value))
      return { success: false, message: '更新失败' }
    }
  }

  // 登出
  const logout = () => {
    currentUser.value = null
    isLoggedIn.value = false
    users.value = []  // 清空用户列表
    currentMiddlemanId.value = null  // 重置中间商选择

    // 清空所有 API 缓存
    cacheOps.clearAll()

    // 重置 settings store
    useSettingsStore().resetToDefaults()

    uni.removeStorageSync('currentUser')
    uni.removeStorageSync('loginTime')
    uni.removeStorageSync('token')
  }

  // 生成邀请码
  const generateCode = async (type, workerInfo) => {
    if (!currentUser.value) return null

    // 检查权限
    if (currentUser.value.role !== ROLES.ADMIN && currentUser.value.role !== ROLES.MIDDLEMAN) {
      return null
    }

    // 如果是装发车角色，必须选择员工
    if (type === ROLES.LOADER && !workerInfo) {
      console.error('【User】生成装发车邀请码需要选择员工')
      return null
    }

    try {
      const code = generateRandomCode()
      const codeData = {
        code: code,
        type: type, // loader/farm/middleman
        creatorId: currentUser.value.id,
        usedBy: null,
        usedAt: null,
        // 员工信息（装发车角色时）
        workerId: workerInfo ? workerInfo.id : null,
        workerPhone: workerInfo ? workerInfo.phone : null,
        workerName: workerInfo ? workerInfo.name : null,
        workerType: workerInfo ? workerInfo.type : null
      }
      await inviteApi.create(codeData)
      return code
    } catch (e) {
      console.error('【User】生成邀请码失败:', e)
      return null
    }
  }

  // 获取自己生成的邀请码列表
  const getMyCodes = async () => {
    if (!currentUser.value) return []
    try {
      const res = await inviteApi.getByCreator(currentUser.value.id)
      return res.data || []
    } catch (e) {
      console.error('【User】获取邀请码列表失败:', e)
      toast.error('获取邀请码列表失败')
      return []
    }
  }

  // 获取当前用户的所有下级用户（基于 parentId 关联）
  const getSubUsers = async () => {
    if (!currentUser.value) return []
    if (currentUser.value.role !== ROLES.ADMIN && currentUser.value.role !== ROLES.MIDDLEMAN) {
      return []
    }
    try {
      // 基于 parentId 获取下级用户
      return users.value.filter(u => u.parentId === currentUser.value.id)
    } catch (e) {
      console.error('【User】获取下级用户失败:', e)
      toast.error('获取下级用户失败')
      return []
    }
  }

  // 检查会话是否过期
  const checkSessionExpiry = () => {
    const loginTime = uni.getStorageSync('loginTime')
    // 无登录时间记录，说明是旧用户迁移，视为有效会话
    if (!loginTime) return false

    const now = Date.now()
    const diff = now - loginTime
    return diff > SESSION_EXPIRY
  }

  // 检查手机号是否已注册
  const checkPhoneExists = async (phone) => {
    try {
      const res = await userApi.getUserByPhone(phone)
      const existingUsers = res.data || []
      let hasPassword = false
      if(existingUsers.length > 0) {
        const user = existingUsers[0]
        hasPassword = !!user.hasPassword
      }
      return existingUsers && existingUsers.length > 0 && hasPassword
    } catch (e) {
      console.error('【User】检查手机号失败:', e)
      toast.error('检查手机号失败')
      return false
    }
  }

  // 获取当前用户的parentId（中间商ID）
  const getParentId = () => {
    return currentUser.value?.parentId || null
  }

  // 获取当前用户的中间商ID（装发车和鸡场返回parentId，中间商返回自己的ID）
  const getMiddlemanId = () => {
    if (!currentUser.value) return null
    if (currentUser.value.role === ROLES.MIDDLEMAN || currentUser.value.role === ROLES.ADMIN) {
      return currentUser.value.id
    }
    return currentUser.value.parentId
  }

  // 获取当前用户可访问的商户ID列表
  const getMyMerchantIds = async () => {
    if (!currentUser.value) return []

    // 管理员：返回所有商户
    if (currentUser.value.role === ROLES.ADMIN) {
      return null // null 表示全部
    }

    try {
      // 中间商：返回自己创建的商户
      if (currentUser.value.role === ROLES.MIDDLEMAN) {
        const res = await apiOps.queryBy('merchants', 'userId', currentUser.value.id)
        const results = res.data || []
        return results ? results.map(m => m.id) : []
      }

      // 装发车和鸡场：返回中间商的商户
      if (currentUser.value.parentId) {
        const res = await apiOps.queryBy('merchants', 'userId', currentUser.value.parentId)
        const results = res.data || []
        return results ? results.map(m => m.id) : []
      }

      return []
    } catch (e) {
      console.error('【User】获取商户ID列表失败:', e)
      toast.error('获取商户列表失败')
      return []
    }
  }

  // 获取当前用户可访问的员工ID列表
  const getMyWorkerIds = async () => {
    if (!currentUser.value) return []

    // 管理员：返回所有员工
    if (currentUser.value.role === ROLES.ADMIN) {
      return null // null 表示全部
    }

    try {
      // 中间商：返回自己创建的人员
      if (currentUser.value.role === ROLES.MIDDLEMAN) {
        const res = await apiOps.queryBy('workers', 'userId', currentUser.value.id)
        const results = res.data || []
        return results ? results.map(w => w.id) : []
      }

      // 装发车：返回中间商的人员
      if (currentUser.value.parentId) {
        const res = await apiOps.queryBy('workers', 'userId', currentUser.value.parentId)
        const results = res.data || []
        return results ? results.map(w => w.id) : []
      }

      return []
    } catch (e) {
      console.error('【User】获取员工ID列表失败:', e)
      toast.error('获取员工列表失败')
      return []
    }
  }

  // 删除中间商及其所有关联数据
  const deleteMiddleman = async (middlemanId) => {
    try {
      // 1. 查询所有关联数据
      // const [
      //   loaderUsersRes,
      //   merchantsRes,
      //   workersRes,
      //   departuresRes,
      //   transactionsRes,
      //   invitationCodesRes,
      //   settingsRes,
      //   dailyQuotesRes
      // ] = await Promise.all([
      //   apiOps.queryBy('users', 'parentId', middlemanId),
      //   apiOps.queryBy('merchants', 'userId', middlemanId),
      //   apiOps.queryBy('workers', 'userId', middlemanId),
      //   apiOps.queryBy('departures', 'userId', middlemanId),
      //   apiOps.queryBy('transactions', 'userId', middlemanId),
      //   inviteApi.getByCreator(middlemanId),
      //   apiOps.queryBy('settings', 'userId', middlemanId),
      //   apiOps.queryBy('daily_quotes', 'userId', middlemanId)
      // ])

      // const loaderUsers = loaderUsersRes.data || []
      // const merchants = merchantsRes.data || []
      // const workers = workersRes.data || []
      // const departures = departuresRes.data || []
      // const transactions = transactionsRes.data || []
      // const invitationCodes = invitationCodesRes.data || []
      // const settings = settingsRes.data || []
      // const dailyQuotes = dailyQuotesRes.data || []

      // // 2. 删除装发车用户
      // for (const loader of loaderUsers) {
      //   await userApi.deleteUser(loader.id)
      // }

      // // 3. 删除商户
      // for (const merchant of merchants) {
      //   await apiOps.delete('merchants', merchant.id)
      // }

      // // 4. 删除员工
      // for (const worker of workers) {
      //   await apiOps.delete('workers', worker.id)
      // }

      // // 5. 删除发车记录
      // for (const record of departures) {
      //   await apiOps.delete('departures', record.id)
      // }

      // // 6. 删除交易记录
      // for (const tx of transactions) {
      //   await apiOps.delete('transactions', tx.id)
      // }

      // // 7. 处理邀请码 - 未使用删除，已使用置空
      // for (const code of invitationCodes) {
      //   if (!code.usedBy) {
      //     await apiOps.delete('invitation_codes', code.id)
      //   } else {
      //     await apiOps.update('invitation_codes', code.id, { creatorId: null })
      //   }
      // }

      // // 8. 删除系统设置
      // for (const setting of settings) {
      //   await apiOps.delete('settings', setting.id)
      // }

      // // 9. 删除日报价
      // for (const quote of dailyQuotes) {
      //   await apiOps.delete('daily_quotes', quote.id)
      // }

      // // 10. 删除中间商用户
      // await userApi.deleteUser(middlemanId)

      // // 11. 刷新用户列表
      // await loadUsers()

      // return { success: true }
    } catch (e) {
      console.error('【User】删除中间商失败:', e)
      throw e
    }
  }

  // 自动调用 init() 确保初始化完成
  init()

  // 导出初始化函数供外部使用（备用）
  const initUserStore = async () => {
    await init()
  }

  return {
    currentUser,
    isLoggedIn,
    users,
    isAdmin,
    isMiddleman,
    isLoader,
    isFarm,
    currentMiddlemanId,
    middlemanList,
    setCurrentMiddleman,
    loadUsers,
    login,
    selectRole,
    logout,
    updateUser,
    setPassword,
    changePassword,
    generateCode,
    getMyCodes,
    getParentId,
    getMiddlemanId,
    getMyMerchantIds,
    getMyWorkerIds,
    checkPhoneExists,
    initUserStore,
    deleteMiddleman,
    ROLES,
    ROLE_NAMES
  }
})
