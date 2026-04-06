import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { apiOps } from '@/utils/api'
import { useUserStore } from './user'
import { useWorkerStore } from './worker'
import { ROLES } from '@/enums/roles'
import { showErrorToast } from '@/utils/errorHandler'
import { publish } from '@/utils/eventBus'

// 发车记录查询参数
interface DepartureQueryParams {
  page: number
  pageSize: number
  startDate?: string
  endDate?: string
  userId?: string
}

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

  // 分页状态
  const pagination = ref({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0,
    hasMore: true
  })
  const loading = ref(false)
  const refreshing = ref(false)
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

  const loadRecords = async (refresh = false, startDate?: string, endDate?: string) => {
    if (loading.value && !refresh) return
    if (refresh) {
      pagination.value.page = 1
      refreshing.value = true
    }
    loading.value = true

    try {
      // 确保用户列表已加载（用于过滤下级用户）
      await userStore.ensureUsersLoaded()

      const user = userStore.currentUser

      // 构建查询参数
      const params: DepartureQueryParams = {
        page: pagination.value.page,
        pageSize: pagination.value.pageSize
      }

      // 添加日期范围参数
      if (startDate) params.startDate = startDate
      if (endDate) params.endDate = endDate

      // 根据角色设置 userId 过滤
      if (user.role === ROLES.ADMIN) {
        // 管理员：如果选择了中间商，按中间商过滤
        if (userStore.currentMiddlemanId) {
          params.userId = userStore.currentMiddlemanId
        }
        // 不传 userId 则查看全部
      } else if (user.role === ROLES.MIDDLEMAN) {
        // 中间商：查看自己的发车记录
        params.userId = user.id
      } else if (user.role === ROLES.LOADER) {
        // 装发车：查看自己的发车记录
        params.userId = user.id
      }
      // 鸡场不应该看到发车记录

      const res = await apiOps.queryAll('departures', params)
      const results = res.data || []

      // 解析 JSON 字符串字段（兼容已解析和未解析的数据）
      const parsedResults = (results || []).map(r => ({
        ...r,
        merchantDetails: parseJsonField(r.merchantDetails),
        loadingWorkerIds: parseJsonField(r.loadingWorkerIds),
        truckRows: parseJsonField(r.truckRows),
        merchantAmount: parseJsonField(r.merchantAmount)
      }))

      if (refresh) {
        records.value = parsedResults
      } else {
        records.value = [...records.value, ...parsedResults]
      }

      // 更新分页信息
      if (res.pagination) {
        pagination.value = {
          ...pagination.value,
          ...res.pagination,
          hasMore: pagination.value.page < res.pagination.totalPages
        }
      }
    } catch (e) {
      console.error('【Departure】加载发车记录失败:', e)
      showErrorToast('加载发车记录失败')
    } finally {
      loading.value = false
      refreshing.value = false
    }
  }

  const loadMore = () => {
    if (!pagination.value.hasMore || loading.value) return
    pagination.value.page++
    loadRecords()
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
  // loadRecords() // 移除模块级别自动加载，改由页面按需调用

  return {
    records,
    filteredRecords,
    pagination,
    loading,
    refreshing,
    addRecord,
    updateRecord,
    deleteRecord,
    getRecordsByDate,
    getRecordsByDateRange,
    getTodayRecords,
    loadRecords,
    loadMore
  }
})
