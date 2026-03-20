import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { dbOps, isDBAvailable } from '@/utils/db'
import { useUserStore } from './user'
import { ROLES } from './user'
import { showErrorToast } from '@/utils/errorHandler'

export const useMerchantStore = defineStore('merchant', () => {
  const merchants = ref([])

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

  const loadMerchants = async () => {
    try {
      const results = await dbOps.queryAll('merchants')
      merchants.value = results || []
    } catch (e) {
      console.error('加载商户列表失败:', e)
      merchants.value = []
    }
  }

  const saveMerchants = async () => {
    // 检查数据库是否可用
    if (!isDBAvailable()) {
      uni.showToast({
        title: '数据库不可用，请检查网络连接',
        icon: 'none',
        duration: 3000
      })
      throw new Error('数据库不可用')
    }

    try {
      // 保存到数据库
      for (const merchant of merchants.value) {
        const existing = await dbOps.queryBy('merchants', 'id', merchant.id)
        if (existing && existing.length > 0) {
          await dbOps.update('merchants', merchant.id, merchant)
        } else {
          await dbOps.insert('merchants', merchant)
        }
      }
    } catch (e) {
      console.error('【Merchant】保存商户失败:', e)
      showErrorToast('保存商户失败')
      throw e
    }
  }

  const addMerchant = async (merchant) => {
    const userStore = useUserStore()
    const newMerchant = {
      ...merchant,
      id: Date.now().toString(),
      userId: userStore.currentUser?.id || null,
      createdAt: new Date().toISOString()
    }
    merchants.value.push(newMerchant)
    await saveMerchants()
    return newMerchant
  }

  const updateMerchant = async (id, updates) => {
    const index = merchants.value.findIndex(m => m.id === id)
    if (index !== -1) {
      merchants.value[index] = { ...merchants.value[index], ...updates }
      await saveMerchants()
    }
  }

  const deleteMerchant = async (id) => {
    merchants.value = merchants.value.filter(m => m.id !== id)
    await saveMerchants()
  }

  const getMerchantById = (id) => merchants.value.find(m => m.id === id)

  // 初始化加载
  loadMerchants()

  return {
    merchants,
    filteredMerchants,
    addMerchant,
    updateMerchant,
    deleteMerchant,
    getMerchantById,
    loadMerchants
  }
})
