import { defineStore } from 'pinia'
import { ref } from 'vue'
import { apiOps } from '@/utils/api'
import { useUserStore } from './user'
import { ROLES } from './user'
import { showErrorToast } from '@/utils/errorHandler'
import { publish } from '@/utils/eventBus'

export const useTransactionStore = defineStore('transaction', () => {
  const transactions = ref([])

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

  const loadTransactions = async (refresh = false) => {
    if (loading.value && !refresh) return
    if (refresh) {
      pagination.value.page = 1
      refreshing.value = true
    }
    loading.value = true

    try {
      const userStore = useUserStore()
      const user = userStore.currentUser

      // 构建查询参数
      const params = {
        page: pagination.value.page,
        pageSize: pagination.value.pageSize
      }

      // 根据角色设置 userId 过滤
      if (user.role === ROLES.ADMIN) {
        // 管理员：如果选择了中间商，按中间商过滤
        if (userStore.currentMiddlemanId) {
          params.userId = userStore.currentMiddlemanId
        }
        // 不传 userId 则查看全部
      } else if (user.role === ROLES.MIDDLEMAN) {
        // 中间商：查看自己的交易记录
        params.userId = user.id
      } else if (user.role === ROLES.LOADER) {
        // 装发车：查看所属中间商的交易记录
        if (user.parentId) {
          params.userId = user.parentId
        }
      } else if (user.role === ROLES.FARM) {
        // 鸡场：查看自己的交易记录
        params.userId = user.id
      }

      const res = await apiOps.queryAll('transactions', params)

      if (refresh) {
        transactions.value = res.data || []
      } else {
        transactions.value = [...transactions.value, ...(res.data || [])]
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
      console.error('【Transaction】加载交易记录失败:', e)
      showErrorToast('加载交易记录失败')
    } finally {
      loading.value = false
      refreshing.value = false
    }
  }

  const loadMore = () => {
    if (!pagination.value.hasMore || loading.value) return
    pagination.value.page++
    loadTransactions()
  }

  const saveTransactions = async () => {
    try {
      // 保存到数据库
      for (const transaction of transactions.value) {
        const existRes = await apiOps.queryBy('transactions', 'id', transaction.id)
        const existing = existRes.data || []
        if (existing && existing.length > 0) {
          await apiOps.update('transactions', transaction.id, transaction)
        } else {
          await apiOps.insert('transactions', transaction)
        }
      }
    } catch (e) {
      console.error('【Transaction】保存交易记录失败:', e)
      showErrorToast('保存交易记录失败')
    }
  }

  const addTransaction = async (transaction) => {
    try {
      const userStore = useUserStore()
      const newTransaction = {
        ...transaction,
        id: Date.now().toString(),
        userId: userStore.currentUser?.id || null,
        createdAt: new Date().toISOString()
      }
      transactions.value.push(newTransaction)
      await saveTransactions()
      publish('transaction:refresh', newTransaction)
      return newTransaction
    } catch (e) {
      console.error('【Transaction】添加交易记录失败:', e)
      showErrorToast('保存交易记录失败')
      throw e
    }
  }

  const deleteTransaction = async (id) => {
    transactions.value = transactions.value.filter(t => t.id !== id)
    try {
      await apiOps.delete('transactions', id)
      publish('transaction:refresh', null)
    } catch (e) {
      console.error('【Transaction】删除交易记录失败:', e)
      showErrorToast('删除交易记录失败')
    }
  }

  const getTransactionsByTarget = (targetId) =>
    transactions.value.filter(t => t.targetId === targetId)

  const getTransactionsByDateRange = (startDate, endDate) =>
    transactions.value.filter(t => t.date >= startDate && t.date <= endDate)

  // 根据用户角色过滤交易记录
  const getFilteredTransactions = async () => {
    try {
      const userStore = useUserStore()
      const user = userStore.currentUser

      if (!user) return []

      // 管理员：返回全部
      if (user.role === ROLES.ADMIN) {
        return transactions.value
      }

      // 中间商：返回自己的
      if (user.role === ROLES.MIDDLEMAN) {
        return transactions.value.filter(t => t.userId === user.id)
      }

      // 装发车：返回关联自己的（通过targetId关联到自己的商户）
      if (user.role === ROLES.LOADER) {
        if (user.parentId) {
          const merchantRes = await apiOps.queryBy('merchants', 'userId', user.parentId)
          const merchantResults = merchantRes.data || []
          const merchantIds = merchantResults ? merchantResults.map(m => m.id) : []
          return transactions.value.filter(t => merchantIds.includes(t.targetId))
        }
        return []
      }

      // 鸡场：返回自己的
      if (user.role === ROLES.FARM) {
        return transactions.value.filter(t => t.userId === user.id)
      }

      return []
    } catch (e) {
      console.error('【Transaction】获取交易记录失败:', e)
      showErrorToast('获取交易记录失败')
      return []
    }
  }

  // 初始化加载
  loadTransactions()

  return {
    transactions,
    pagination,
    loading,
    refreshing,
    addTransaction,
    deleteTransaction,
    getTransactionsByTarget,
    getTransactionsByDateRange,
    getFilteredTransactions,
    loadTransactions,
    loadMore
  }
})
