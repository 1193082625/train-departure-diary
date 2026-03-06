import { defineStore } from 'pinia'
import { ref } from 'vue'
import { dbOps } from '@/utils/db'

export const useSettingsStore = defineStore('settings', () => {
  const bigBoxWeight = ref(45)
  const smallBoxWeight = ref(29.5)
  const loadingFee = ref(300)      // 装车费
  const unloadingFee = ref(200)    // 卸车费
  const tollFee = ref(50)         // 过路费
  const entryFee = ref(50)        // 进门费
  const oilFee = ref(50)          // 油费

  const loadSettings = async () => {
    try {
      // 尝试从数据库加载
      const results = await dbOps.queryAll('settings')
      if (results && results.length > 0) {
        const settings = results[0]
        bigBoxWeight.value = settings.bigBoxWeight ?? 50
        smallBoxWeight.value = settings.smallBoxWeight ?? 30
        loadingFee.value = settings.loadingFee ?? 0
        unloadingFee.value = settings.unloadingFee ?? 0
        tollFee.value = settings.tollFee ?? 0
        entryFee.value = settings.entryFee ?? 0
        oilFee.value = settings.oilFee ?? 0
      } else {
        // 如果数据库没有，从 localStorage 兼容读取
        const data = uni.getStorageSync('settings')
        if (data) {
          const settings = JSON.parse(data)
          bigBoxWeight.value = settings.bigBoxWeight ?? 50
          smallBoxWeight.value = settings.smallBoxWeight ?? 30
          loadingFee.value = settings.loadingFee ?? 0
          unloadingFee.value = settings.unloadingFee ?? 0
          tollFee.value = settings.tollFee ?? 0
          entryFee.value = settings.entryFee ?? 0
          oilFee.value = settings.oilFee ?? 0
        }
      }
    } catch (e) {
      // 兼容：localStorage 读取
      const data = uni.getStorageSync('settings')
      if (data) {
        const settings = JSON.parse(data)
        bigBoxWeight.value = settings.bigBoxWeight ?? 50
        smallBoxWeight.value = settings.smallBoxWeight ?? 30
        loadingFee.value = settings.loadingFee ?? 0
        unloadingFee.value = settings.unloadingFee ?? 0
        tollFee.value = settings.tollFee ?? 0
        entryFee.value = settings.entryFee ?? 0
        oilFee.value = settings.oilFee ?? 0
      }
    }
  }

  const saveSettings = async () => {
    const settings = {
      id: 1,
      bigBoxWeight: bigBoxWeight.value,
      smallBoxWeight: smallBoxWeight.value,
      loadingFee: loadingFee.value,
      unloadingFee: unloadingFee.value,
      tollFee: tollFee.value,
      entryFee: entryFee.value,
      oilFee: oilFee.value
    }

    try {
      // 尝试保存到数据库
      await dbOps.update('settings', 1, settings)
    } catch (e) {
      // 兼容：保存到 localStorage
      uni.setStorageSync('settings', JSON.stringify(settings))
    }
  }

  const setBigBoxWeight = (weight) => {
    bigBoxWeight.value = weight
    saveSettings()
  }

  const setSmallBoxWeight = (weight) => {
    smallBoxWeight.value = weight
    saveSettings()
  }

  const setLoadingFee = (fee) => {
    loadingFee.value = fee
    saveSettings()
  }

  const setUnloadingFee = (fee) => {
    unloadingFee.value = fee
    saveSettings()
  }

  const setTollFee = (fee) => {
    tollFee.value = fee
    saveSettings()
  }

  const setEntryFee = (fee) => {
    entryFee.value = fee
    saveSettings()
  }

  const setOilFee = (fee) => {
    oilFee.value = fee
    saveSettings()
  }

  const updateAllSettings = (params) => {
    if (params.bigBoxWeight !== undefined) bigBoxWeight.value = params.bigBoxWeight
    if (params.smallBoxWeight !== undefined) smallBoxWeight.value = params.smallBoxWeight
    if (params.loadingFee !== undefined) loadingFee.value = params.loadingFee
    if (params.unloadingFee !== undefined) unloadingFee.value = params.unloadingFee
    if (params.tollFee !== undefined) tollFee.value = params.tollFee
    if (params.entryFee !== undefined) entryFee.value = params.entryFee
    if (params.oilFee !== undefined) oilFee.value = params.oilFee
    saveSettings()
  }

  // 初始化加载
  loadSettings()

  return {
    bigBoxWeight,
    smallBoxWeight,
    loadingFee,
    unloadingFee,
    tollFee,
    entryFee,
    oilFee,
    setBigBoxWeight,
    setSmallBoxWeight,
    setLoadingFee,
    setUnloadingFee,
    setTollFee,
    setEntryFee,
    setOilFee,
    updateAllSettings,
    loadSettings
  }
})
