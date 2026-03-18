import { defineStore } from 'pinia'
import { ref } from 'vue'
import { dbOps } from '@/utils/db'
import { useUserStore } from './user'
import { ROLES } from './user'

export const useTransactionStore = defineStore('transaction', () => {
  const transactions = ref([])

  const loadTransactions = async () => {
    try {
      const results = await dbOps.queryAll('transactions')
      if (results && results.length > 0) {
        transactions.value = results
      } else {
        // 兼容：从 localStorage 读取
        const data = uni.getStorageSync('transactions')
        transactions.value = data ? JSON.parse(data) : []
      }
    } catch (e) {
      // 兼容：localStorage 读取
      const data = uni.getStorageSync('transactions')
      transactions.value = data ? JSON.parse(data) : []
    }
  }

  const saveTransactions = async () => {
    try {
      // 保存到数据库
      for (const transaction of transactions.value) {
        const existing = await dbOps.queryBy('transactions', 'id', transaction.id)
        if (existing && existing.length > 0) {
          await dbOps.update('transactions', transaction.id, transaction)
        } else {
          await dbOps.insert('transactions', transaction)
        }
      }
    } catch (e) {
      // 兼容：保存到 localStorage
      uni.setStorageSync('transactions', JSON.stringify(transactions.value))
    }
  }

  const addTransaction = async (transaction) => {
    const userStore = useUserStore()
    const newTransaction = {
      ...transaction,
      id: Date.now().toString(),
      userId: userStore.currentUser?.id || null,
      createdAt: new Date().toISOString()
    }
    transactions.value.push(newTransaction)
    await saveTransactions()
    return newTransaction
  }

  const deleteTransaction = async (id) => {
    transactions.value = transactions.value.filter(t => t.id !== id)
    try {
      await dbOps.delete('transactions', id)
    } catch (e) {
      // 兼容 localStorage
    }
  }

  const getTransactionsByTarget = (targetId) =>
    transactions.value.filter(t => t.targetId === targetId)

  const getTransactionsByDateRange = (startDate, endDate) =>
    transactions.value.filter(t => t.date >= startDate && t.date <= endDate)

  // 根据用户角色过滤交易记录
  const getFilteredTransactions = async () => {
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
        const merchantResults = await dbOps.queryBy('merchants', 'userId', user.parentId)
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
