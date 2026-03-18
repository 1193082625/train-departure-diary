import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { dbOps } from '@/utils/db'
import { useUserStore } from './user'
import { ROLES } from './user'

export const useDepartureStore = defineStore('departure', () => {
  const records = ref([])

  // 根据用户角色过滤发车记录
  const filteredRecords = computed(() => {
    const userStore = useUserStore()
    const user = userStore.currentUser

    if (!user) return []

    // 管理员：返回全部
    if (user.role === ROLES.ADMIN) {
      return records.value
    }

    // 中间商：返回自己的
    if (user.role === ROLES.MIDDLEMAN) {
      return records.value.filter(r => r.userId === user.id)
    }

    // 装发车：返回自己的
    if (user.role === ROLES.LOADER) {
      return records.value.filter(r => r.userId === user.id)
    }

    // 鸡场：无发车记录
    return []
  })

  const loadRecords = async () => {
    try {
      const results = await dbOps.queryAll('departures')
      if (results && results.length > 0) {
        // 解析 JSON 字符串字段
        records.value = results.map(r => ({
          ...r,
          merchantDetails: r.merchantDetails ? JSON.parse(r.merchantDetails) : [],
          loadingWorkerIds: r.loadingWorkerIds ? JSON.parse(r.loadingWorkerIds) : [],
          truckRows: r.truckRows ? JSON.parse(r.truckRows) : [],
          merchantAmount: r.merchantAmount ? JSON.parse(r.merchantAmount) : []
        }))
      } else {
        // 兼容：从 localStorage 读取
        const data = uni.getStorageSync('departureRecords')
        records.value = data ? JSON.parse(data) : []
      }
    } catch (e) {
      // 兼容：localStorage 读取
      const data = uni.getStorageSync('departureRecords')
      records.value = data ? JSON.parse(data) : []
    }
  }

  const saveRecords = async () => {
    try {
      // 保存到数据库
      for (const record of records.value) {
        const dbRecord = {
          ...record,
          merchantDetails: JSON.stringify(record.merchantDetails || []),
          loadingWorkerIds: JSON.stringify(record.loadingWorkerIds || []),
          truckRows: JSON.stringify(record.truckRows || []),
          merchantAmount: JSON.stringify(record.merchantAmount || [])
        }
        const existing = await dbOps.queryBy('departures', 'id', record.id)
        if (existing && existing.length > 0) {
          await dbOps.update('departures', record.id, dbRecord)
        } else {
          await dbOps.insert('departures', dbRecord)
        }
      }
    } catch (e) {
      // 兼容：保存到 localStorage
      uni.setStorageSync('departureRecords', JSON.stringify(records.value))
    }
  }

  const addRecord = async (record) => {
    const userStore = useUserStore()
    const newRecord = {
      ...record,
      id: Date.now().toString(),
      userId: userStore.currentUser?.id || null,
      createdAt: new Date().toISOString()
    }
    records.value.push(newRecord)
    await saveRecords()
    return newRecord
  }

  const updateRecord = async (id, updates) => {
    const index = records.value.findIndex(r => r.id === id)
    if (index !== -1) {
      records.value[index] = { ...records.value[index], ...updates }
      await saveRecords()
    }
  }

  const deleteRecord = async (id) => {
    records.value = records.value.filter(r => r.id !== id)
    try {
      await dbOps.delete('departures', id)
    } catch (e) {
      // 兼容 localStorage
    }
  }

  // 计算相关
  const getRecordsByDate = (date) =>
    records.value.filter(r => r.date === date)

  const getRecordsByDateRange = (startDate, endDate) =>
    records.value.filter(r => r.date >= startDate && r.date <= endDate)

  const getTodayRecords = () => {
    const today = new Date().toISOString().split('T')[0]
    return records.value.filter(r => r.date === today)
  }

  // 初始化加载
  loadRecords()

  return {
    records,
    filteredRecords,
    addRecord,
    updateRecord,
    deleteRecord,
    getRecordsByDate,
    getRecordsByDateRange,
    getTodayRecords,
    loadRecords
  }
})
