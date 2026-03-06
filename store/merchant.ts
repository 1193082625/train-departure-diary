import { defineStore } from 'pinia'
import { ref } from 'vue'
import { dbOps } from '@/utils/db'

export const useMerchantStore = defineStore('merchant', () => {
  const merchants = ref([])

  const loadMerchants = async () => {
    try {
      const results = await dbOps.queryAll('merchants')
      if (results && results.length > 0) {
        merchants.value = results
      } else {
        // 兼容：从 localStorage 读取
        const data = uni.getStorageSync('merchants')
        merchants.value = data ? JSON.parse(data) : []
      }
    } catch (e) {
      // 兼容：localStorage 读取
      const data = uni.getStorageSync('merchants')
      merchants.value = data ? JSON.parse(data) : []
    }
  }

  const saveMerchants = async () => {
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
      // 兼容：保存到 localStorage
      uni.setStorageSync('merchants', JSON.stringify(merchants.value))
    }
  }

  const addMerchant = async (merchant) => {
    const newMerchant = {
      ...merchant,
      id: Date.now().toString(),
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
    addMerchant,
    updateMerchant,
    deleteMerchant,
    getMerchantById,
    loadMerchants
  }
})
