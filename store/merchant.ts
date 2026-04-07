import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { apiOps } from '@/utils/api'
import { useUserStore } from './user'
import { ROLES } from '@/enums/roles'
import { showErrorToast } from '@/utils/errorHandler'
import { publish } from '@/utils/eventBus'

export const useMerchantStore = defineStore('merchant', () => {
  const merchants = ref([])

  // 分页状态
  const pagination = ref({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0,
    hasMore: true
  })
  const loading = ref(false)
  const refreshing = ref(false)

  // 根据用户角色过滤商户
  const filteredMerchants = computed(() => {
    const userStore = useUserStore()
    const user = userStore.currentUser

    if (!user) return []

    // 管理员：返回全部
    if (user.role === ROLES.ADMIN) {
      return merchants.value
    }

    // 中间商：返回自己创建的
    if (user.role === ROLES.MIDDLEMAN) {
      return merchants.value.filter(m => m.userId === user.id)
    }

    // 装发车和鸡场：返回中间商的商户
    if (user.parentId) {
      return merchants.value.filter(m => m.userId === user.parentId)
    }

    return []
  })

  // 加载商户列表（始终替换数据，用于列表页）
  const loadMerchants = async () => {
    if (loading.value) return
    loading.value = true

    try {
      const userStore = useUserStore()
      const user = userStore.currentUser

      // 构建查询参数
      const params = {
        page: 1,
        pageSize: pagination.value.pageSize
      }

      // 根据角色设置 userId 过滤
      if (user.role === ROLES.ADMIN) {
        // 管理员：如果选择了中间商，按中间商过滤
        if (userStore.currentMiddlemanId) {
          params.userId = userStore.currentMiddlemanId
        }
        // 不传 userId 则查看全部
      } else if (user.role === ROLES.MIDDLEMAN) {
        // 中间商：查看自己的商户
        params.userId = user.id
      } else if (user.parentId) {
        // 装发车/鸡场：查看所属中间商的商户
        params.userId = user.parentId
      }

      const res = await apiOps.queryAll('merchants', params)

      // 始终替换数据
      merchants.value = res.data || []

      // 更新分页信息
      if (res.pagination) {
        pagination.value = {
          ...pagination.value,
          ...res.pagination,
          hasMore: 1 < res.pagination.totalPages
        }
      }
    } catch (e) {
      console.error('【Merchant】加载商户列表失败:', e)
      showErrorToast('加载商户列表失败')
    } finally {
      loading.value = false
    }
  }

  // 刷新（从第一页开始）
  const refresh = async () => {
    pagination.value.page = 1
    refreshing.value = true
    await loadMerchants()
    refreshing.value = false
  }

  // 加载更多（追加数据）
  const loadMore = async () => {
    if (!pagination.value.hasMore || loading.value) return
    loading.value = true

    try {
      const userStore = useUserStore()
      const user = userStore.currentUser

      const params = {
        page: pagination.value.page + 1,
        pageSize: pagination.value.pageSize
      }

      if (user.role === ROLES.ADMIN) {
        if (userStore.currentMiddlemanId) {
          params.userId = userStore.currentMiddlemanId
        }
      } else if (user.role === ROLES.MIDDLEMAN) {
        params.userId = user.id
      } else if (user.parentId) {
        params.userId = user.parentId
      }

      const res = await apiOps.queryAll('merchants', params)
      merchants.value = [...merchants.value, ...(res.data || [])]

      if (res.pagination) {
        pagination.value = {
          ...pagination.value,
          ...res.pagination,
          hasMore: pagination.value.page < res.pagination.totalPages
        }
      }
    } catch (e) {
      console.error('【Merchant】加载更多失败:', e)
      showErrorToast('加载更多失败')
    } finally {
      loading.value = false
    }
  }

  const saveMerchants = async () => {
    try {
      // 保存到数据库
      for (const merchant of merchants.value) {
        const existRes = await apiOps.queryBy('merchants', 'id', merchant.id)
        const existing = existRes.data || []
        if (existing && existing.length > 0) {
          await apiOps.update('merchants', merchant.id, merchant)
        } else {
          await apiOps.insert('merchants', merchant)
        }
      }
    } catch (e) {
      console.error('【Merchant】保存商户失败:', e)
      showErrorToast('保存商户失败')
      throw e
    }
  }

  const addMerchant = async (merchant) => {
    try {
      const userStore = useUserStore()

      // 校验电话是否已被其他中间商的商户使用
      // const currentMiddlemanId = userStore.getMiddlemanId()
      // const existingByPhone = merchants.value.filter(m => m.phone === merchant.phone)
      // if (existingByPhone.length > 0) {
      //   // 存在，检查是否属于当前中间商
      //   const isOwn = existingByPhone.some(m => m.userId === currentMiddlemanId)
      //   if (isOwn) {
      //     return { success: false, message: '该商户已存在' }
      //   } else {
      //     return { success: false, message: '该电话已被其他商户使用' }
      //   }
      // }

      const newMerchant = {
        ...merchant,
        id: Date.now().toString(),
        userId: userStore.currentUser?.id || null,
        createdAt: new Date().toISOString()
      }
      merchants.value.push(newMerchant)
      await saveMerchants()
      publish('merchant:refresh', newMerchant)
      return newMerchant
    } catch (e) {
      console.error('【Merchant】添加商户失败:', e)
      showErrorToast('添加商户失败')
      throw e
    }
  }

  const updateMerchant = async (id, updates) => {
    try {
      const index = merchants.value.findIndex(m => m.id === id)
      if (index !== -1) {
        merchants.value[index] = { ...merchants.value[index], ...updates }
        await saveMerchants()
        publish('merchant:refresh', merchants.value[index])
      }
    }  catch (e) {
      console.error('【Merchant】更新商户失败:', e)
      showErrorToast('更新商户失败')
      throw e
    }
  }

  const deleteMerchant = async (id) => {
    const deletedMerchant = merchants.value.find(m => m.id === id)
    merchants.value = merchants.value.filter(m => m.id !== id)
    try {
      await apiOps.delete('merchants', id)
      publish('merchant:refresh', null)
    } catch (e) {
      // 回滚本地状态
      if (deletedMerchant) {
        merchants.value.push(deletedMerchant)
      }
      console.error('【Merchant】删除商户失败:', e)
      showErrorToast('删除商户失败')
      throw e
    }
  }

  const getMerchantById = (id) => merchants.value.find(m => m.id === id)

  // 初始化加载
  // loadMerchants() // 移除模块级别自动加载，改由页面按需调用

  return {
    merchants,
    filteredMerchants,
    pagination,
    loading,
    refreshing,
    addMerchant,
    updateMerchant,
    deleteMerchant,
    getMerchantById,
    loadMerchants,
    loadMore,
    refresh
  }
})
