import { defineStore } from 'pinia'
import { ref } from 'vue'
import { dbOps } from '@/utils/db'
import { useUserStore } from './user'
import { ROLES } from './user'
import { showErrorToast } from '@/utils/errorHandler'
import { publish } from '@/utils/eventBus'

export const useDailyQuoteStore = defineStore('dailyQuote', () => {
  const quotes = ref([]) // 日报价列表
  const userStore = useUserStore()

  // 加载所有日报价
  const loadQuotes = async () => {
    try {
      const results = await dbOps.queryAll('daily_quotes')
      if (results && results.length > 0) {
        quotes.value = results
      } else {
        quotes.value = []
      }
    } catch (e) {
      console.error('加载日报价失败:', e)
      showErrorToast('加载日报价失败')
      quotes.value = []
    }
  }

  // 保存单条日报价到云端
  const saveQuote = async (date, quote) => {
    try {
      const userId = userStore.currentUser?.id || null
      const existing = await dbOps.queryBy('daily_quotes', 'date', date)
      if (existing && existing.length > 0) {
        // 更新已有报价
        await dbOps.update('daily_quotes', existing[0].id, {
          quote: Number(quote),
          userId
        })
      } else {
        // 创建新报价
        const newQuote = {
          id: Date.now().toString(),
          date,
          quote: Number(quote),
          userId,
          createdAt: new Date().toISOString()
        }
        await dbOps.insert('daily_quotes', newQuote)
        quotes.value.push(newQuote)
      }
      // 更新本地 quotes 数组中的对应记录
      const index = quotes.value.findIndex(q => q.date === date)
      if (index !== -1) {
        quotes.value[index].quote = Number(quote)
        quotes.value[index].userId = userId
      }
      publish('dailyQuote:refresh', { date, quote })
    } catch (e) {
      console.error('保存日报价失败:', e)
      showErrorToast('保存日报价失败')
      throw e
    }
  }

  // 获取指定日期的报价（按当前中间商过滤）
  const getQuoteByDate = (date) => {
    const user = userStore.currentUser

    let filteredQuotes = quotes.value
    if (user?.role === ROLES.ADMIN && userStore.currentMiddlemanId) {
      filteredQuotes = quotes.value.filter(q => q.userId === userStore.currentMiddlemanId)
    } else if (user?.role === ROLES.MIDDLEMAN) {
      filteredQuotes = quotes.value.filter(q => q.userId === user.id)
    } else if (user?.parentId) {
      filteredQuotes = quotes.value.filter(q => q.userId === user.parentId)
    }

    const quoteItem = filteredQuotes.find(q => q.date === date)
    return quoteItem ? quoteItem.quote : null
  }

  // 初始化加载
  loadQuotes()

  return {
    quotes,
    loadQuotes,
    saveQuote,
    getQuoteByDate
  }
})