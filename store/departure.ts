import { defineStore } from 'pinia'
import { ref } from 'vue'
import { dbOps } from '@/utils/db'

export const useDepartureStore = defineStore('departure', () => {
  const records = ref([])

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
    const newRecord = {
      ...record,
      id: Date.now().toString(),
      createdAt: new Date().toISOString()
    }
    records.value.push(newRecord)
    await saveRecords()
    return newRecord
  }

  const updateRecord = async (id, updates) => {
    const index = records.value.findIndex(r => r.id === id)
    if (index !== -1) {
      const oldData = { ...records.value[index] }
      records.value[index] = { ...records.value[index], ...updates }

      // 记录修改历史
      try {
        const changes = calculateChanges(oldData, updates)
        if (Object.keys(changes).length > 0) {
          const userId = uni.getStorageSync('userId') || ''
          const userRole = uni.getStorageSync('userRole') || ''

          await dbOps.insert('departure_history', {
            departure_id: id,
            modifier_id: userId,
            modifier_role: userRole,
            before_data: JSON.stringify(oldData),
            after_data: JSON.stringify(updates),
            changes: JSON.stringify(changes),
            created_at: Date.now()
          })
        }
      } catch (e) {
        console.log('记录历史失败', e)
      }

      await saveRecords()
    }
  }

  // 计算修改的字段
  const calculateChanges = (oldData, newData) => {
    const changes = {}
    const fields = ['date', 'dailyQuote', 'departureWorkerId', 'loadingWorkerIds', 'oilFee', 'entryFee', 'tollFee', 'loadingFee', 'unloadingFee', 'departureFee', 'returnedBigBoxes', 'returnedSmallBoxes', 'note']

    fields.forEach(field => {
      const oldVal = JSON.stringify(oldData[field])
      const newVal = JSON.stringify(newData[field])
      if (oldVal !== newVal) {
        changes[field] = { old: oldData[field], new: newData[field] }
      }
    })

    return changes
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
    addRecord,
    updateRecord,
    deleteRecord,
    getRecordsByDate,
    getRecordsByDateRange,
    getTodayRecords,
    loadRecords
  }
})
