import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useDepartureStore = defineStore('departure', () => {
  const records = ref([])

  const loadRecords = () => {
    const data = uni.getStorageSync('departureRecords')
    records.value = data ? JSON.parse(data) : []
  }

  const saveRecords = () => {
    uni.setStorageSync('departureRecords', JSON.stringify(records.value))
  }

  const addRecord = (record) => {
    records.value.push({
      ...record,
      id: Date.now().toString(),
      createdAt: new Date().toISOString()
    })
    saveRecords()
  }

  const updateRecord = (id, updates) => {
    const index = records.value.findIndex(r => r.id === id)
    if (index !== -1) {
      records.value[index] = { ...records.value[index], ...updates }
      saveRecords()
    }
  }

  const deleteRecord = (id) => {
    records.value = records.value.filter(r => r.id !== id)
    saveRecords()
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
