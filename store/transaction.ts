import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useTransactionStore = defineStore('transaction', () => {
  const transactions = ref([])

  const loadTransactions = () => {
    const data = uni.getStorageSync('transactions')
    transactions.value = data ? JSON.parse(data) : []
  }

  const saveTransactions = () => {
    uni.setStorageSync('transactions', JSON.stringify(transactions.value))
  }

  const addTransaction = (transaction) => {
    transactions.value.push({
      ...transaction,
      id: Date.now().toString(),
      createdAt: new Date().toISOString()
    })
    saveTransactions()
  }

  const deleteTransaction = (id) => {
    transactions.value = transactions.value.filter(t => t.id !== id)
    saveTransactions()
  }

  const getTransactionsByTarget = (targetId) =>
    transactions.value.filter(t => t.targetId === targetId)

  const getTransactionsByDateRange = (startDate, endDate) =>
    transactions.value.filter(t => t.date >= startDate && t.date <= endDate)

  // 初始化加载
  loadTransactions()

  return {
    transactions,
    addTransaction,
    deleteTransaction,
    getTransactionsByTarget,
    getTransactionsByDateRange,
    loadTransactions
  }
})
