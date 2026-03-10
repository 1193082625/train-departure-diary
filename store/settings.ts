import { defineStore } from 'pinia'
import { ref } from 'vue'
import { dbOps } from '@/utils/db'

export const useSettingsStore = defineStore('settings', () => {
  const receiptBigBoxWeight = ref(45)  // 收货大框斤数
  const deliveryBigBoxWeight = ref(44)  // 交货大框斤数
  const smallBoxWeight = ref(29.5)  // 默认小框斤数
  const depotCartonBoxesBig = ref(43)  // 默认大箱斤数
  const depotCartonBoxesSmall = ref(30)  // 默认小箱斤数
  const loadingFee = ref(300)      // 装车费
  const unloadingFee = ref(200)    // 卸车费
  const departureFee = ref(200)    // 发车费
  const tollFee = ref(50)         // 过路费
  const entryFee = ref(50)        // 进门费
  const oilFee = ref(50)          // 油费

  const loadSettings = async () => {
    try {
      // 尝试从数据库加载
      const results = await dbOps.queryAll('settings')
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
        const data = uni.getStorageSync('settings')
        if (data) {
          const settings = JSON.parse(data)
          receiptBigBoxWeight.value = settings.receiptBigBoxWeight ?? 45
          deliveryBigBoxWeight.value = settings.deliveryBigBoxWeight ?? 44
          smallBoxWeight.value = settings.smallBoxWeight ?? 29.5
          loadingFee.value = settings.loadingFee ?? 0
          unloadingFee.value = settings.unloadingFee ?? 0
          departureFee.value = settings.departureFee ?? 0
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
  }

  const saveSettings = async () => {
    const settings = {
      id: 1,
      receiptBigBoxWeight: receiptBigBoxWeight.value,
      deliveryBigBoxWeight: deliveryBigBoxWeight.value,
      smallBoxWeight: smallBoxWeight.value,
      depotCartonBoxesBig: depotCartonBoxesBig.value,
      depotCartonBoxesSmall: depotCartonBoxesSmall.value,
      loadingFee: loadingFee.value,
      unloadingFee: unloadingFee.value,
      departureFee: departureFee.value,
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

  const setReceiptBigBoxWeight = (weight) => {
    receiptBigBoxWeight.value = weight
    saveSettings()
  }

  const setDeliveryBigBoxWeight = (weight) => {
    deliveryBigBoxWeight.value = weight
    saveSettings()
  }

  const setSmallBoxWeight = (weight) => {
    smallBoxWeight.value = weight
    saveSettings()
  }

  const setDepotCartonBoxesBig = (weight) => {
    depotCartonBoxesBig.value = weight
    saveSettings()
  }

  const setDepotCartonBoxesSmall = (weight) => {
    depotCartonBoxesSmall.value = weight
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

  const setDepartureFee = (fee) => {
    departureFee.value = fee
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
    if (params.receiptBigBoxWeight !== undefined) receiptBigBoxWeight.value = params.receiptBigBoxWeight
    if (params.deliveryBigBoxWeight !== undefined) deliveryBigBoxWeight.value = params.deliveryBigBoxWeight
    if (params.smallBoxWeight !== undefined) smallBoxWeight.value = params.smallBoxWeight
    if (params.depotCartonBoxesBig !== undefined) depotCartonBoxesBig.value = params.depotCartonBoxesBig
    if (params.depotCartonBoxesSmall !== undefined) depotCartonBoxesSmall.value = params.depotCartonBoxesSmall
    if (params.loadingFee !== undefined) loadingFee.value = params.loadingFee
    if (params.unloadingFee !== undefined) unloadingFee.value = params.unloadingFee
    if (params.departureFee !== undefined) departureFee.value = params.departureFee
    if (params.tollFee !== undefined) tollFee.value = params.tollFee
    if (params.entryFee !== undefined) entryFee.value = params.entryFee
    if (params.oilFee !== undefined) oilFee.value = params.oilFee
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
