import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { apiOps, userApi, inviteApi, setToken, clearToken } from '@/utils/api'
import { showErrorToast } from '@/utils/errorHandler'
import { ADMIN_PHONE, ADMIN_CODE, SESSION_EXPIRY } from '@/constants/auth'
import { USERS_CACHE_KEY, USERS_CACHE_TIME_KEY, USERS_CACHE_MAX_AGE } from '@/constants/cache'
import { ROLES, ROLE_NAMES } from '@/enums/roles'
import { generateUUID, generateInviteCode } from '@/utils/uuid'

// 重新导出，保持向后兼容
export { ROLES, ROLE_NAMES }

// 测试用户数据
const TEST_USERS = [
  { phone: '15369375170', role: ROLES.ADMIN, inviteCode: '888888', nickname: '管理员', password: '123456' },
  { phone: '18131172057', role: ROLES.MIDDLEMAN, inviteCode: '111111', nickname: '中间商A', password: '123456' },
  { phone: '13800000002', role: ROLES.LOADER, inviteCode: '222222', nickname: '装发车A', parentId: null, password: '123456' },
  { phone: '13800000003', role: ROLES.FARM, inviteCode: '333333', nickname: '鸡场A', parentId: null, password: '123456' }
]

// 测试邀请码
const TEST_INVITE_CODES = [
  { code: '111111', type: ROLES.MIDDLEMAN },
  { code: '222222', type: ROLES.LOADER },
  { code: '333333', type: ROLES.FARM }
]

// 初始化测试数据
const initTestData = async () => {
  try {
    // 创建测试用户
    for (const testUser of TEST_USERS) {
      const res = await userApi.getUserByPhone(testUser.phone)
      const existingUsers = res.data || []
      if (!existingUsers || existingUsers.length === 0) {
        const newUser = {
          id: generateUUID(),
          phone: testUser.phone,
          nickname: testUser.nickname,
          password: testUser.password || null,
          role: testUser.role,
          inviteCode: testUser.inviteCode,
          invitedBy: null,
          parentId: testUser.parentId || null,
          createdAt: new Date().toISOString()
        }
        await userApi.createUser(newUser)
      }
    }

    // 创建测试邀请码
    for (const testCode of TEST_INVITE_CODES) {
      const res = await inviteApi.getByCode(testCode.code)
      const existingCodes = res.data || []
      if (!existingCodes || existingCodes.length === 0) {
        // 查找创建者
        const creatorPhone = testCode.type === ROLES.MIDDLEMAN ?
          '13800000001' : null

        let creatorId = null
        if (creatorPhone) {
          const creatorsRes = await userApi.getUserByPhone(creatorPhone)
          const creators = creatorsRes.data || []
          creatorId = creators && creators.length > 0 ? creators[0].id : null
        }

        const codeData = {
          id: generateUUID(),
          code: testCode.code,
          type: testCode.type,
          creatorId: creatorId,
          usedBy: null,
          usedAt: null,
          createdAt: new Date().toISOString()
        }
        await inviteApi.create(codeData)
      }
    }

  } catch (e) {
    console.error('【User】初始化测试数据失败:', e)
    showErrorToast('初始化测试数据失败')
  }
}

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

  // 尝试从本地缓存恢复用户列表
  const restoreUsersFromCache = () => {
    try {
      const cached = uni.getStorageSync(USERS_CACHE_KEY)
      if (cached) {
        users.value = JSON.parse(cached)
        console.log('【User】从缓存恢复用户列表:', users.value.length)
      }
    } catch (e) {
      console.warn('【User】恢复缓存失败:', e)
    }
  }

  // 保存用户列表到本地缓存
  const saveUsersToCache = () => {
    try {
      uni.setStorageSync(USERS_CACHE_KEY, JSON.stringify(users.value))
      uni.setStorageSync(USERS_CACHE_TIME_KEY, Date.now())
    } catch (e) {
      console.warn('【User】保存缓存失败:', e)
    }
  }

  // 加载所有用户（带缓存）
  const loadUsers = async (forceRefresh = false) => {
    // 如果用户列表已有数据且不是强制刷新，直接返回
    if (!forceRefresh && users.value.length > 0) {
      console.log('【User】用户列表已加载，跳过:', users.value.length)
      return
    }

    // 尝试从缓存恢复
    if (!forceRefresh) {
      restoreUsersFromCache()
      if (users.value.length > 0) {
        return
      }
    }

    try {
      const res = await userApi.getAllUsers()
      users.value = res.data || []
      saveUsersToCache()
      console.log('【User】从服务器加载用户列表:', users.value.length)
    } catch (e) {
      console.error('【User】加载用户列表失败:', e)
      showErrorToast('加载用户列表失败')
      // 加载失败时尝试用缓存
      if (users.value.length === 0) {
        restoreUsersFromCache()
      }
    }
  }

  // 确保用户列表已加载（按需加载）
  const ensureUsersLoaded = async () => {
    if (users.value.length === 0) {
      await loadUsers()
    }
  }

  // 初始化 - 从本地存储恢复登录状态
  const init = async () => {
    try {
      // 先初始化测试数据
      // await initTestData()

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
      }
    } catch (e) {
      console.error('【User】初始化失败:', e)
      showErrorToast('初始化失败')
    }
  }

  // 登录
  const login = async (phone, code) => {
    try {
      // 检查手机号是否已注册
      const phoneRes = await userApi.getUserByPhone(phone)
      const existingUsers = phoneRes.data || []

      // 检查是否为预设管理员
      if (phone === ADMIN_PHONE && code === ADMIN_CODE) {
        // 已有管理员账号，直接登录
        currentUser.value = existingUsers[0]
        isLoggedIn.value = true
        uni.setStorageSync('currentUser', JSON.stringify(currentUser.value))
        uni.setStorageSync('loginTime', Date.now())
        // 管理员登录也需要获取 token
        try {
          const loginRes = await userApi.login(phone, code)
          if (loginRes.token) {
            setToken(loginRes.token)
          }
        } catch (e) {
          console.error('【User】获取管理员 token 失败:', e)
        }
        return { success: true, user: currentUser.value }
      }

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
              currentUser.value = loginRes.data
              isLoggedIn.value = true
              // 存储 JWT token
              if (loginRes.token) {
                setToken(loginRes.token)
              }
              uni.setStorageSync('currentUser', JSON.stringify(currentUser.value))
              uni.setStorageSync('loginTime', Date.now())
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

      // 验证邀请码
      const invRes = await inviteApi.getByCode(code)
      const invCodes = invRes.data || []
      if (!invCodes || invCodes.length === 0) {
        return { success: false, message: '邀请码无效' }
      }

      const inv = invCodes[0]
      // 邀请码已被使用
      if (inv.usedBy) {
        return { success: false, message: '邀请码已被使用' }
      }

      // 校验手机号一致性：如果邀请码关联了员工手机号，必须使用同一个手机号
      if (inv.workerPhone && inv.workerPhone !== phone) {
        return { success: false, message: '请使用生成邀请码时的手机号登录' }
      }

      // 如果用户已存在但用不同的邀请码，拒绝
      if (existingUsers && existingUsers.length > 0) {
        const user = existingUsers[0]
        if (user.invitedBy !== code) {
          return { success: false, message: '该手机号已注册' }
        }
        // 用户已存在且邀请码正确，应该有密码了（前面已处理），这里不应该到达
        return { success: false, message: '账号异常，请联系管理员' }
      }

      // 新用户注册
      const newUser = {
        id: generateUUID(),
        phone: phone,
        nickname: inv.workerName || '', // 继承员工姓名
        password: null, // 未设置密码，需要设置密码
        role: inv.type, // 根据邀请码类型决定角色
        inviteCode: generateInviteCode(),
        invitedBy: code,
        parentId: inv.creatorId, // 上级中间商ID
        createdAt: new Date().toISOString(),
        // 继承员工信息
        workerId: inv.workerId || null,
        workerType: inv.workerType || null
      }

      // 即使云端创建失败，也允许用户本地登录
      let userCreated = false
      try {
        await userApi.createUser(newUser)
        userCreated = true
      } catch (e) {
        console.error('【User】创建用户到云端失败，将使用本地存储:', e)
      }

      // 标记邀请码已使用（即使创建用户失败也要标记，避免邀请码被重复使用）
      try {
        await inviteApi.useCode(code, newUser.id)
      } catch (e) {
        console.error('【User】标记邀请码失败:', e)
      }

      // 首次登录需要设置密码
      currentUser.value = newUser
      // 不设置 isLoggedIn = true，等待设置密码后再登录
      uni.setStorageSync('currentUser', JSON.stringify(currentUser.value))
      return { success: true, needSetPassword: true, user: newUser }
    } catch (e) {
      console.error('【User】登录失败:', e)
      showErrorToast('登录失败')
      return { success: false, message: '登录失败' }
    }
  }

  // 设置密码
  const setPassword = async (password) => {
    if (!currentUser.value) return { success: false, message: '未登录' }
    try {
      await userApi.updateUser(currentUser.value.id, { password: password })
      // 后端返回的用户数据不包含密码，本地也不存储密码
      currentUser.value = { ...currentUser.value, password: undefined }
      isLoggedIn.value = true
      uni.setStorageSync('currentUser', JSON.stringify(currentUser.value))
      uni.setStorageSync('loginTime', Date.now())
      return { success: true }
    } catch (e) {
      console.error('【User】设置密码失败:', e)
      showErrorToast('设置密码失败')
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
      showErrorToast('修改密码失败')
      return { success: false, message: '修改密码失败' }
    }
  }

  // 首次登录选择角色
  const selectRole = async (phone, role) => {
    try {
      const newUser = {
        id: generateUUID(),
        phone: phone,
        nickname: '',
        role: role,
        inviteCode: generateInviteCode(),
        invitedBy: null,
        parentId: null,
        createdAt: new Date().toISOString()
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
      showErrorToast('创建用户失败')
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
      showErrorToast('更新用户信息失败')
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
    clearToken() // 清除 JWT token
    uni.removeStorageSync('currentUser')
    uni.removeStorageSync('loginTime')
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
      const code = generateInviteCode()
      const codeData = {
        id: generateUUID(),
        code: code,
        type: type, // loader/farm/middleman
        creatorId: currentUser.value.id,
        usedBy: null,
        usedAt: null,
        createdAt: new Date().toISOString(),
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
      showErrorToast('生成邀请码失败')
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
      showErrorToast('获取邀请码列表失败')
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
      showErrorToast('获取下级用户失败')
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
      showErrorToast('检查手机号失败')
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
      showErrorToast('获取商户列表失败')
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
      showErrorToast('获取员工列表失败')
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
      showErrorToast('删除中间商失败')
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
    ensureUsersLoaded,
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
