import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useMerchantStore = defineStore('merchant', () => {
  const merchants = ref([])

  const loadMerchants = () => {
    const data = uni.getStorageSync('merchants')
    merchants.value = data ? JSON.parse(data) : []
  }

  const saveMerchants = () => {
    uni.setStorageSync('merchants', JSON.stringify(merchants.value))
  }

  const addMerchant = (merchant) => {
    merchants.value.push({
      ...merchant,
      id: Date.now().toString(),
      createdAt: new Date().toISOString()
    })
    saveMerchants()
  }

  const updateMerchant = (id, updates) => {
    const index = merchants.value.findIndex(m => m.id === id)
    if (index !== -1) {
      merchants.value[index] = { ...merchants.value[index], ...updates }
      saveMerchants()
    }
  }

  const deleteMerchant = (id) => {
    merchants.value = merchants.value.filter(m => m.id !== id)
    saveMerchants()
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
