import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { apiOps } from '@/utils/api'
import { useUserStore } from './user'
import { useWorkerStore } from './worker'
import { ROLES } from './user'
import { showErrorToast } from '@/utils/errorHandler'
import { publish } from '@/utils/eventBus'

// 解析 JSON 字段，兼容字符串和对象
const parseJsonField = (value) => {
  if (!value) return []
  if (typeof value === 'object') return value
  if (typeof value === 'string') {
    try {
      return JSON.parse(value)
    } catch (e) {
      return []
    }
  }
  return []
}

export const useDepartureStore = defineStore('departure', () => {
  const records = ref([])
  const userStore = useUserStore()
  // 根据用户角色过滤发车记录
  const filteredRecords = computed(() => {
    const user = userStore.currentUser

    if (!user) return []

    // 管理员：根据选中中间商过滤
    if (user.role === ROLES.ADMIN) {
      if (!userStore.currentMiddlemanId) {
        return records.value
      }
      return records.value.filter(r => r.userId === userStore.currentMiddlemanId)
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
      const res = await apiOps.queryAll('departures')
      const results = res.data || []
      if (results && results.length > 0) {
        // 解析 JSON 字符串字段（兼容已解析和未解析的数据）
        records.value = results.map(r => ({
          ...r,
          merchantDetails: parseJsonField(r.merchantDetails),
          loadingWorkerIds: parseJsonField(r.loadingWorkerIds),
          truckRows: parseJsonField(r.truckRows),
          merchantAmount: parseJsonField(r.merchantAmount)
        }))
      } else {
        records.value = []
      }
    } catch (e) {
      console.error('【Departure】加载发车记录失败:', e)
      showErrorToast('加载发车记录失败')
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
        const existRes = await apiOps.queryBy('departures', 'id', record.id)
        const existing = existRes.data || []
        if (existing && existing.length > 0) {
          await apiOps.update('departures', record.id, dbRecord)
        } else {
          // 插入后保存云端返回的 _id
          const inserted = await apiOps.insert('departures', dbRecord)
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
      showErrorToast('保存发车记录失败')
    }
  }

  const addRecord = async (record) => {
    try {
      const userStore = useUserStore()
      const newRecord = {
        ...record,
        id: Date.now().toString(),
        userId: userStore.currentUser?.id || null,
        createdAt: new Date().toISOString()
      }
      records.value.push(newRecord)
      await saveRecords()
      publish('departure:refresh', newRecord)
      return newRecord
    } catch (e) {
      console.error('【Departure】添加发车记录失败:', e)
      showErrorToast('保存发车记录失败')
      throw e
    }
  }

  const updateRecord = async (id, updates) => {
    try {
      const index = records.value.findIndex(r => r.id === id)
      if (index !== -1) {
        records.value[index] = { ...records.value[index], ...updates }
        await saveRecords()
        publish('departure:refresh', records.value[index])
      }
    } catch (e) {
      console.error('【Departure】更新发车记录失败:', e)
      showErrorToast('更新发车记录失败')
      throw e
    }
  }

  const deleteRecord = async (id) => {
    const deletedRecord = records.value.find(r => r.id === id)
    records.value = records.value.filter(r => r.id !== id)
    try {
      await apiOps.delete('departures', id)
      publish('departure:refresh', null)
    } catch (e) {
      // 回滚本地状态
      if (deletedRecord) {
        records.value.push(deletedRecord)
      }
      console.error('【Departure】删除发车记录失败:', e)
      showErrorToast('删除发车记录失败')
      throw e
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

  // 自动调用 loadRecords() 加载发车记录
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
