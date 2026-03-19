import { defineStore } from 'pinia'
import { ref } from 'vue'
import { dbOps } from '@/utils/db'

export const useSettingsStore = defineStore('settings', () => {
  const receiptBigBoxWeight = ref<number>(45)  // 收货大框斤数
  const deliveryBigBoxWeight = ref<number>(44)  // 交货大框斤数
  const smallBoxWeight = ref<number>(29.5)  // 默认小框斤数
  const depotCartonBoxesBig = ref<number>(43)  // 默认大箱斤数
  const depotCartonBoxesSmall = ref<number>(30)  // 默认小箱斤数
  const loadingFee = ref<number>(300)      // 装车费
  const unloadingFee = ref<number>(200)    // 卸车费
  const departureFee = ref<number>(200)    // 发车费
  const tollFee = ref<number>(50)         // 过路费
  const entryFee = ref<number>(50)        // 进门费
  const oilFee = ref<number>(50)          // 油费

  const loadSettings = async () => {
    try {
      // 尝试从数据库加载（添加 limit 避免资源耗尽）
      const results = await dbOps.queryAll('settings', 1)
      if (results && results.length > 0) {
        const settings = results[0]
        receiptBigBoxWeight.value = settings.receiptBigBoxWeight ?? 45
        deliveryBigBoxWeight.value = settings.deliveryBigBoxWeight ?? 44
        smallBoxWeight.value = settings.smallBoxWeight ?? 30
        depotCartonBoxesBig.value = settings.depotCartonBoxesBig ?? 43
        depotCartonBoxesSmall.value = settings.depotCartonBoxesSmall ?? 30
        loadingFee.value = settings.loadingFee ?? 0
        unloadingFee.value = settings.unloadingFee ?? 0
        departureFee.value = settings.departureFee ?? 0
        tollFee.value = settings.tollFee ?? 0
        entryFee.value = settings.entryFee ?? 0
        oilFee.value = settings.oilFee ?? 0
      } else {
        // 如果数据库没有，从 localStorage 兼容读取
        loadFromLocalStorage()
      }
    } catch (e) {
      console.error('加载设置失败，使用本地存储:', e)
      // 兼容：localStorage 读取
      loadFromLocalStorage()
    }
  }

  // 从本地存储加载设置
  const loadFromLocalStorage = () => {
    const data = uni.getStorageSync('settings')
    if (data) {
      const settings = JSON.parse(data)
      receiptBigBoxWeight.value = settings.receiptBigBoxWeight ?? 45
      deliveryBigBoxWeight.value = settings.deliveryBigBoxWeight ?? 44
      smallBoxWeight.value = settings.smallBoxWeight ?? 30
      depotCartonBoxesBig.value = settings.depotCartonBoxesBig ?? 43
      depotCartonBoxesSmall.value = settings.depotCartonBoxesSmall ?? 30
      loadingFee.value = settings.loadingFee ?? 0
      unloadingFee.value = settings.unloadingFee ?? 0
      departureFee.value = settings.departureFee ?? 0
      tollFee.value = settings.tollFee ?? 0
      entryFee.value = settings.entryFee ?? 0
      oilFee.value = settings.oilFee ?? 0
    }
  }

  const saveSettings = async () => {
    const settings = {
      id: 1,
      receiptBigBoxWeight: Number(receiptBigBoxWeight.value),
      deliveryBigBoxWeight: Number(deliveryBigBoxWeight.value),
      smallBoxWeight: Number(smallBoxWeight.value),
      depotCartonBoxesBig: Number(depotCartonBoxesBig.value),
      depotCartonBoxesSmall: Number(depotCartonBoxesSmall.value),
      loadingFee: Number(loadingFee.value),
      unloadingFee: Number(unloadingFee.value),
      departureFee: Number(departureFee.value),
      tollFee: Number(tollFee.value),
      entryFee: Number(entryFee.value),
      oilFee: Number(oilFee.value)
    }

    try {
      // 尝试保存到数据库
      await dbOps.update('settings', 1, settings)
    } catch (e) {
      // 兼容：保存到 localStorage
      uni.setStorageSync('settings', JSON.stringify(settings))
    }
  }

  const setReceiptBigBoxWeight = (weight: number) => {
    receiptBigBoxWeight.value = weight
    saveSettings()
  }

  const setDeliveryBigBoxWeight = (weight: number) => {
    deliveryBigBoxWeight.value = weight
    saveSettings()
  }

  const setSmallBoxWeight = (weight: number) => {
    smallBoxWeight.value = weight
    saveSettings()
  }

  const setDepotCartonBoxesBig = (weight: number) => {
    depotCartonBoxesBig.value = weight
    saveSettings()
  }

  const setDepotCartonBoxesSmall = (weight: number) => {
    depotCartonBoxesSmall.value = weight
    saveSettings()
  }

  const setLoadingFee = (fee: number) => {
    loadingFee.value = fee
    saveSettings()
  }

  const setUnloadingFee = (fee: number) => {
    unloadingFee.value = fee
    saveSettings()
  }

  const setDepartureFee = (fee: number) => {
    departureFee.value = fee
    saveSettings()
  }

  const setTollFee = (fee: number) => {
    tollFee.value = fee
    saveSettings()
  }

  const setEntryFee = (fee: number) => {
    entryFee.value = fee
    saveSettings()
  }

  const setOilFee = (fee: number) => {
    oilFee.value = fee
    saveSettings()
  }

  const updateAllSettings = (params) => {
    if (params.receiptBigBoxWeight !== undefined) receiptBigBoxWeight.value = Number(params.receiptBigBoxWeight)
    if (params.deliveryBigBoxWeight !== undefined) deliveryBigBoxWeight.value = Number(params.deliveryBigBoxWeight)
    if (params.smallBoxWeight !== undefined) smallBoxWeight.value = Number(params.smallBoxWeight)
    if (params.depotCartonBoxesBig !== undefined) depotCartonBoxesBig.value = Number(params.depotCartonBoxesBig)
    if (params.depotCartonBoxesSmall !== undefined) depotCartonBoxesSmall.value = Number(params.depotCartonBoxesSmall)
    if (params.loadingFee !== undefined) loadingFee.value = Number(params.loadingFee)
    if (params.unloadingFee !== undefined) unloadingFee.value = Number(params.unloadingFee)
    if (params.departureFee !== undefined) departureFee.value = Number(params.departureFee)
    if (params.tollFee !== undefined) tollFee.value = Number(params.tollFee)
    if (params.entryFee !== undefined) entryFee.value = Number(params.entryFee)
    if (params.oilFee !== undefined) oilFee.value = Number(params.oilFee)
    saveSettings()
  }

  // 初始化加载
  loadSettings()

  return {
    receiptBigBoxWeight,
    deliveryBigBoxWeight,
    smallBoxWeight,
    depotCartonBoxesBig,
    depotCartonBoxesSmall,
    loadingFee,
    unloadingFee,
    departureFee,
    tollFee,
    entryFee,
    oilFee,
    setReceiptBigBoxWeight,
    setDeliveryBigBoxWeight,
    setSmallBoxWeight,
    setDepotCartonBoxesBig,
    setDepotCartonBoxesSmall,
    setLoadingFee,
    setUnloadingFee,
    setDepartureFee,
    setTollFee,
    setEntryFee,
    setOilFee,
    updateAllSettings,
    loadSettings
  }
})
