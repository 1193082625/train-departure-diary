import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { userDbOps, inviteDbOps, dbOps, initDB } from '@/utils/db'

// 生成UUID
const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

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

// 预设管理员信息
const ADMIN_PHONE = '15369375170'
const ADMIN_CODE = '888888'

// 会话有效期：7 天（毫秒）
const SESSION_EXPIRY = 7 * 24 * 60 * 60 * 1000

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
      const existingUsers = await userDbOps.getUserByPhone(testUser.phone)
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
        await userDbOps.createUser(newUser)
      }
    }

    // 创建测试邀请码
    for (const testCode of TEST_INVITE_CODES) {
      const existingCodes = await inviteDbOps.getByCode(testCode.code)
      if (!existingCodes || existingCodes.length === 0) {
        // 查找创建者
        const creatorPhone = testCode.type === ROLES.MIDDLEMAN ?
          '13800000001' : null

        let creatorId = null
        if (creatorPhone) {
          const creators = await userDbOps.getUserByPhone(creatorPhone)
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
        await inviteDbOps.create(codeData)
      }
    }

  } catch (e) {
    console.error('初始化测试数据失败:', e)
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

  // 加载所有用户
  const loadUsers = async () => {
    try {
      const results = await userDbOps.getAllUsers()
      users.value = results || []
    } catch (e) {
      console.error('加载用户列表失败:', e)
      users.value = []
    }
  }

  // 初始化 - 从本地存储恢复登录状态
  const init = async () => {
    // 先确保数据库初始化完成
    await initDB()

    // 先初始化测试数据
    // await initTestData()

    // 加载所有用户
    await loadUsers()

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
  }

  // 登录
  const login = async (phone, code) => {
    try {
      // 检查手机号是否已注册
      const existingUsers = await userDbOps.getUserByPhone(phone)

      // 检查是否为预设管理员
      if (phone === ADMIN_PHONE && code === ADMIN_CODE) {
        if (existingUsers && existingUsers.length > 0) {
          // 已有管理员账号，直接登录
          currentUser.value = existingUsers[0]
          isLoggedIn.value = true
          uni.setStorageSync('currentUser', JSON.stringify(currentUser.value))
          uni.setStorageSync('loginTime', Date.now())
          return { success: true, user: currentUser.value }
        } else {
          // 创建管理员账号
          const newUser = {
            id: generateUUID(),
            phone: phone,
            nickname: '管理员',
            role: ROLES.ADMIN,
            inviteCode: generateInviteCode(),
            invitedBy: null,
            parentId: null,
            createdAt: new Date().toISOString()
          }
          try {
            await userDbOps.createUser(newUser)
          } catch (e) {
            console.error('创建管理员账号到云端失败，将使用本地存储:', e)
          }
          currentUser.value = newUser
          isLoggedIn.value = true
          uni.setStorageSync('currentUser', JSON.stringify(currentUser.value))
          uni.setStorageSync('loginTime', Date.now())
          return { success: true, user: newUser }
        }
      }

      // 如果用户已存在且设置了密码，必须使用密码登录
      if (existingUsers && existingUsers.length > 0) {
        const user = existingUsers[0]
        if (user.password) {
          // 需要密码登录
          if (!code) {
            return { success: false, message: '请输入密码' }
          }
          // 验证密码
          if (user.password !== code) {
            return { success: false, message: '密码错误' }
          }
          // 密码正确，登录成功，从数据库重新获取用户信息确保角色最新
          const freshUsers = await userDbOps.getUserByPhone(phone)
          if (freshUsers && freshUsers.length > 0) {
            currentUser.value = freshUsers[0]
          } else {
            currentUser.value = user
          }
          isLoggedIn.value = true
          uni.setStorageSync('currentUser', JSON.stringify(currentUser.value))
          uni.setStorageSync('loginTime', Date.now())
          return { success: true, user: currentUser.value }
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
      const invCodes = await inviteDbOps.getByCode(code)
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
        await userDbOps.createUser(newUser)
        userCreated = true
      } catch (e) {
        console.error('创建用户到云端失败，将使用本地存储:', e)
      }

      // 标记邀请码已使用（即使创建用户失败也要标记，避免邀请码被重复使用）
      try {
        await inviteDbOps.useCode(code, newUser.id)
      } catch (e) {
        console.error('标记邀请码失败:', e)
      }

      // 首次登录需要设置密码
      currentUser.value = newUser
      // 不设置 isLoggedIn = true，等待设置密码后再登录
      uni.setStorageSync('currentUser', JSON.stringify(currentUser.value))
      return { success: true, needSetPassword: true, user: newUser }
    } catch (e) {
      console.error('登录失败:', e)
      return { success: false, message: '登录失败' }
    }
  }

  // 设置密码
  const setPassword = async (password) => {
    if (!currentUser.value) return { success: false, message: '未登录' }
    try {
      await userDbOps.updateUser(currentUser.value.id, { password: password })
      currentUser.value = { ...currentUser.value, password: password }
      isLoggedIn.value = true
      uni.setStorageSync('currentUser', JSON.stringify(currentUser.value))
      uni.setStorageSync('loginTime', Date.now())
      return { success: true }
    } catch (e) {
      console.error('设置密码失败:', e)
      return { success: false, message: '设置密码失败' }
    }
  }

  // 修改密码
  const changePassword = async (oldPassword, newPassword) => {
    if (!currentUser.value) return { success: false, message: '未登录' }
    try {
      // 验证旧密码
      if (currentUser.value.password && currentUser.value.password !== oldPassword) {
        return { success: false, message: '原密码错误' }
      }
      await userDbOps.updateUser(currentUser.value.id, { password: newPassword })
      currentUser.value = { ...currentUser.value, password: newPassword }
      uni.setStorageSync('currentUser', JSON.stringify(currentUser.value))
      return { success: true }
    } catch (e) {
      console.error('修改密码失败:', e)
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
        await userDbOps.createUser(newUser)
      } catch (e) {
        console.error('创建用户到云端失败，将使用本地存储:', e)
      }
      currentUser.value = newUser
      isLoggedIn.value = true
      uni.setStorageSync('currentUser', JSON.stringify(currentUser.value))
      uni.setStorageSync('loginTime', Date.now())
      return { success: true, user: newUser }
    } catch (e) {
      console.error('创建用户失败:', e)
      return { success: false, message: '创建用户失败' }
    }
  }

  // 更新用户信息
  const updateUser = async (updates) => {
    if (!currentUser.value) return { success: false, message: '未登录' }
    try {
      await userDbOps.updateUser(currentUser.value.id, updates)
      currentUser.value = { ...currentUser.value, ...updates }
      uni.setStorageSync('currentUser', JSON.stringify(currentUser.value))
      return { success: true }
    } catch (e) {
      console.error('更新用户失败:', e)
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
      console.error('生成装发车邀请码需要选择员工')
      return null
    }

    try {
      const code = generateRandomCode()
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
      await inviteDbOps.create(codeData)
      return code
    } catch (e) {
      console.error('生成邀请码失败:', e)
      return null
    }
  }

  // 获取自己生成的邀请码列表
  const getMyCodes = async () => {
    if (!currentUser.value) return []
    try {
      return await inviteDbOps.getByCreator(currentUser.value.id)
    } catch (e) {
      console.error('获取邀请码列表失败:', e)
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
      console.error('获取下级用户失败:', e)
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
      console.log('【checkPhoneExists】开始检查手机号:', phone)
      const existingUsers = await userDbOps.getUserByPhone(phone)
      console.log('【checkPhoneExists】查询结果:', existingUsers)
      return existingUsers && existingUsers.length > 0
    } catch (e) {
      console.error('【checkPhoneExists】检查失败:', e)
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

    // 中间商：返回自己创建的商户
    if (currentUser.value.role === ROLES.MIDDLEMAN) {
      const results = await dbOps.queryBy('merchants', 'userId', currentUser.value.id)
      return results ? results.map(m => m.id) : []
    }

    // 装发车和鸡场：返回中间商的商户
    if (currentUser.value.parentId) {
      const results = await dbOps.queryBy('merchants', 'userId', currentUser.value.parentId)
      return results ? results.map(m => m.id) : []
    }

    return []
  }

  // 获取当前用户可访问的员工ID列表
  const getMyWorkerIds = async () => {
    if (!currentUser.value) return []

    // 管理员：返回所有员工
    if (currentUser.value.role === ROLES.ADMIN) {
      return null // null 表示全部
    }

    // 中间商：返回自己创建的人员
    if (currentUser.value.role === ROLES.MIDDLEMAN) {
      const results = await dbOps.queryBy('workers', 'userId', currentUser.value.id)
      return results ? results.map(w => w.id) : []
    }

    // 装发车：返回中间商的人员
    if (currentUser.value.parentId) {
      const results = await dbOps.queryBy('workers', 'userId', currentUser.value.parentId)
      return results ? results.map(w => w.id) : []
    }

    return []
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
    ROLES,
    ROLE_NAMES
  }
})
