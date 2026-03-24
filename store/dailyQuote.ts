import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { apiOps } from '@/utils/api'
import { useUserStore } from './user'
import { ROLES } from './user'
import { showErrorToast } from '@/utils/errorHandler'
import { publish } from '@/utils/eventBus'

export const useDailyQuoteStore = defineStore('dailyQuote', () => {
  const quotes = ref([]) // 日报价列表
  const userStore = useUserStore()

  // 按当前用户过滤的报价列表
  const filteredQuotes = computed(() => {
    const user = userStore.currentUser
    if (!user) return []

    // 管理员：根据选中的中间商过滤
    if (user.role === ROLES.ADMIN && userStore.currentMiddlemanId) {
      return quotes.value.filter(q => q.userId === userStore.currentMiddlemanId)
    }
    // 中间商：返回自己的
    if (user.role === ROLES.MIDDLEMAN) {
      return quotes.value.filter(q => q.userId === user.id)
    }
    // 装发车：返回上级的
    if (user.role === ROLES.LOADER && user.parentId) {
      return quotes.value.filter(q => q.userId === user.parentId)
    }
    // 鸡场：无报价
    return []
  })

  // 加载所有日报价
  const loadQuotes = async () => {
    try {
      const res = await apiOps.queryAll('daily_quotes')
      const results = res.data || []
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
      // 使用中间商ID（LOADER 角色会返回 parentId）
      const middlemanId = userStore.getMiddlemanId()
      if (!middlemanId) {
        throw new Error('无权限保存报价')
      }

      // 先在本地查找是否已有该日期的报价（按中间商过滤）
      const localIndex = quotes.value.findIndex(
        q => q.date === date && q.userId === middlemanId
      )

      // 查询云端是否已有该中间商的当日报价
      const allQuotesRes = await apiOps.queryAll('daily_quotes')
      const allQuotes = allQuotesRes.data || []
      const existing = allQuotes.find(
        q => q.date === date && q.userId === middlemanId
      )

      if (existing) {
        // 更新已有报价
        await apiOps.update('daily_quotes', existing.id, {
          quote: Number(quote)
        })
        // 更新本地
        if (localIndex !== -1) {
          quotes.value[localIndex].quote = Number(quote)
        }
      } else {
        // 创建新报价
        const newQuote = {
          id: Date.now().toString(),
          date,
          quote: Number(quote),
          userId: middlemanId,
          createdAt: new Date().toISOString()
        }
        await apiOps.insert('daily_quotes', newQuote)
        // 更新或添加到本地列表
        if (localIndex !== -1) {
          quotes.value[localIndex] = newQuote
        } else {
          quotes.value.push(newQuote)
        }
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
    filteredQuotes,
    loadQuotes,
    saveQuote,
    getQuoteByDate
  }
})