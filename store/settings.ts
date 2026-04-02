import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { apiOps } from '@/utils/api'
import { useUserStore } from './user'
import { ROLES } from './user'
import { showErrorToast } from '@/utils/errorHandler'

// 生成UUID
const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

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

  // 当前settings所属的userId（中间商ID）
  const currentSettingsUserId = ref<string | null>(null)

  // 获取默认设置
  const getDefaultSettings = () => ({
    receiptBigBoxWeight: 45,
    deliveryBigBoxWeight: 44,
    smallBoxWeight: 29.5,
    depotCartonBoxesBig: 43,
    depotCartonBoxesSmall: 30,
    loadingFee: 0,
    unloadingFee: 0,
    departureFee: 0,
    tollFee: 0,
    entryFee: 0,
    oilFee: 0
  })

  // 初始化指定用户的settings（如果不存在则创建）
  const initSettingsForUser = async (userId: string) => {
    try {
      const res = await apiOps.queryBy('settings', 'userId', userId)
      const results = res.data || []
      if (!results || results.length === 0) {
        // 创建默认settings
        const defaultSettings = getDefaultSettings()
        const newSettings = {
          id: generateUUID(),
          userId: userId,
          ...defaultSettings
        }
        await apiOps.insert('settings', newSettings)
        console.log(`【Settings】为用户 ${userId} 创建默认settings`)
      }
    } catch (e) {
      console.error(`【Settings】初始化用户settings失败:`, e)
      showErrorToast('初始化设置失败')
    }
  }

  // 从数据库加载当前用户的settings
  const loadSettings = async () => {
    const userStore = useUserStore()
    const middlemanId = userStore.getMiddlemanId()

    // 管理员角色不加载settings，使用默认值
    if (!middlemanId) {
      console.log('【Settings】非中间商角色，使用默认设置')
      resetToDefaults()
      currentSettingsUserId.value = null
      return
    }

    try {
      // 按userId查询对应的settings
      const res = await apiOps.queryBy('settings', 'userId', middlemanId)
      const results = res.data || []
      if (results && results.length > 0) {
        const settings = results[0]
        currentSettingsUserId.value = middlemanId
        receiptBigBoxWeight.value = settings.receiptBigBoxWeight ?? 45
        deliveryBigBoxWeight.value = settings.deliveryBigBoxWeight ?? 44
        smallBoxWeight.value = settings.smallBoxWeight ?? 29.5
        depotCartonBoxesBig.value = settings.depotCartonBoxesBig ?? 43
        depotCartonBoxesSmall.value = settings.depotCartonBoxesSmall ?? 30
        loadingFee.value = settings.loadingFee ?? 0
        unloadingFee.value = settings.unloadingFee ?? 0
        departureFee.value = settings.departureFee ?? 0
        tollFee.value = settings.tollFee ?? 0
        entryFee.value = settings.entryFee ?? 0
        oilFee.value = settings.oilFee ?? 0
      } else {
        // 没有找到settings，初始化一个
        await initSettingsForUser(middlemanId)
        resetToDefaults()
        currentSettingsUserId.value = middlemanId
      }
    } catch (e) {
      console.error('【Settings】加载设置失败:', e)
      showErrorToast('加载设置失败')
      resetToDefaults()
    }
  }

  // 重置为默认值
  const resetToDefaults = () => {
    const defaults = getDefaultSettings()
    receiptBigBoxWeight.value = defaults.receiptBigBoxWeight
    deliveryBigBoxWeight.value = defaults.deliveryBigBoxWeight
    smallBoxWeight.value = defaults.smallBoxWeight
    depotCartonBoxesBig.value = defaults.depotCartonBoxesBig
    depotCartonBoxesSmall.value = defaults.depotCartonBoxesSmall
    loadingFee.value = defaults.loadingFee
    unloadingFee.value = defaults.unloadingFee
    departureFee.value = defaults.departureFee
    tollFee.value = defaults.tollFee
    entryFee.value = defaults.entryFee
    oilFee.value = defaults.oilFee
  }

  // 保存设置到数据库
  const saveSettings = async () => {
    const userStore = useUserStore()
    const middlemanId = userStore.getMiddlemanId()

    // 只有中间商角色才能保存
    if (!middlemanId) {
      console.warn('【Settings】非中间商角色，不能保存settings')
      return
    }

    // 装发车角色不能修改settings（只能使用）
    if (userStore.currentUser?.role === ROLES.LOADER) {
      console.warn('【Settings】装发车角色不能修改settings')
      return
    }

    const settingsData = {
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
      // 先查询是否已有该用户的settings
      const existRes = await apiOps.queryBy('settings', 'userId', middlemanId)
      const existing = existRes.data || []
      if (existing && existing.length > 0) {
        // 存在则更新
        await apiOps.update('settings', existing[0].id, settingsData)
      } else {
        // 不存在则插入
        const newSettings = {
          id: generateUUID(),
          userId: middlemanId,
          ...settingsData
        }
        await apiOps.insert('settings', newSettings)
      }
    } catch (e) {
      console.error('【Settings】保存设置失败:', e)
      showErrorToast('保存设置失败')
    }
  }

  // 更新单个设置项并保存
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

  // 批量更新设置
  const updateAllSettings = async (params) => {
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
    try {
      await saveSettings()
    } catch (e) {
      console.error('【Settings】批量更新设置失败:', e)
      showErrorToast('保存设置失败')
      throw e
    }
  }

  // 监听用户登录状态变化，重新加载settings
  const userStore = useUserStore()
  watch(() => userStore.currentUser, (newUser) => {
    if (newUser) {
      loadSettings()
    }
  }, { immediate: false })

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
    currentSettingsUserId,
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
    loadSettings,
    initSettingsForUser
  }
})