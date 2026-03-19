import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { dbOps } from '@/utils/db'
import { useUserStore } from './user'
import { useWorkerStore } from './worker'
import { ROLES } from './user'

export const useDepartureStore = defineStore('departure', () => {
  const records = ref([])
  const userStore = useUserStore()
  // 根据用户角色过滤发车记录
  const filteredRecords = computed(() => {
    const user = userStore.currentUser

    if (!user) return []

    // 管理员：返回全部
    if (user.role === ROLES.ADMIN) {
      return records.value
    }

    // 中间商：返回自己的 + 名下所有装发车用户添加的记录
    // 逻辑：通过 parentId 关联，找到所有 parentId = 当前中间商ID 的装发车用户
    if (user.role === ROLES.MIDDLEMAN) {
      // 使用 userStore.users（已从云端加载）
      const allUsers = userStore.users

      // 找出 parentId = 当前中间商ID 的装发车用户ID列表
      const loaderUserIds = allUsers
        .filter(u => u.role === ROLES.LOADER && u.parentId === user.id)
        .map(u => u.id)
      // 返回自己或自己员工添加的记录
      return records.value.filter(r =>
        r.userId === user.id || loaderUserIds.includes(r.userId)
      )
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
      // 先刷新用户列表，确保中间商能看到最新的下级用户
      await userStore.loadUsers()
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
        records.value = []
      }
    } catch (e) {
      console.error('加载发车记录失败:', e)
      records.value = []
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
          // 插入后保存云端返回的 _id
          const inserted = await dbOps.insert('departures', dbRecord)
          if (inserted._id) {
            // 更新本地记录的云端 _id
            const index = records.value.findIndex(r => r.id === record.id)
            if (index !== -1) {
              records.value[index]._id = inserted._id
            }
          }
        }
      }
    } catch (e) {
      console.error('【Departure】保存发车记录失败:', e)
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
  // 使用 filteredRecords 以确保按用户角色过滤
  const getRecordsByDate = (date) =>
    filteredRecords.value.filter(r => r.date === date)

  const getRecordsByDateRange = (startDate, endDate) =>
    filteredRecords.value.filter(r => r.date >= startDate && r.date <= endDate)

  const getTodayRecords = () => {
    const today = new Date().toISOString().split('T')[0]
    return filteredRecords.value.filter(r => r.date === today)
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
