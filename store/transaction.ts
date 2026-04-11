import { defineStore } from 'pinia'
import { ref } from 'vue'
import { apiOps } from '@/utils/api'
import { useUserStore } from './user'
import { ROLES } from './user'
import toast from '@/utils/toast'
import { publish } from '@/utils/eventBus'

export const useTransactionStore = defineStore('transaction', () => {
  const transactions = ref([])

  const loadTransactions = async () => {
    try {
      const res = await apiOps.queryAll('transactions')
      transactions.value = res.data || []
    } catch (e) {
      console.error('【Transaction】加载交易记录失败:', e)
      toast.error('加载交易记录失败')
      transactions.value = []
    }
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
      toast.error('保存交易记录失败')
    }
  }

  const addTransaction = async (transaction) => {
    try {
      const userStore = useUserStore()
      const newTransaction = {
        ...transaction,
        userId: userStore.currentUser?.id || null,
        createdAt: new Date().toISOString()
      }
      transactions.value.push(newTransaction)
      await saveTransactions()
      publish('transaction:refresh', newTransaction)
      return newTransaction
    } catch (e) {
      console.error('【Transaction】添加交易记录失败:', e)
      toast.error('保存交易记录失败')
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
      toast.error('删除交易记录失败')
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
      toast.error('获取交易记录失败')
      return []
    }
  }

  // 初始化加载
  loadTransactions()

  return {
    transactions,
    addTransaction,
    deleteTransaction,
    getTransactionsByTarget,
    getTransactionsByDateRange,
    getFilteredTransactions,
    loadTransactions
  }
})
