<template>
  <!-- 个人盈利统计页面 -->
  <view class="user-stats-page">
    <!-- 快捷日期范围选择 -->
    <view class="quick-range">
      <view @click="setQuickRange('today')" :class="['range-btn', quickRangeType === 'today' && 'active']">今天</view>
      <view @click="setQuickRange('month')" :class="['range-btn', quickRangeType === 'month' && 'active']">本月</view>
      <view @click="setQuickRange('lastMonth')" :class="['range-btn', quickRangeType === 'lastMonth' && 'active']">上月</view>
      <view @click="setQuickRange('year')" :class="['range-btn', quickRangeType === 'year' && 'active']">本年</view>
      <view @click="setQuickRange('all')" :class="['range-btn', quickRangeType === 'all' && 'active']">全部</view>
    </view>

    <!-- 日期范围选择 -->
    <view class="date-pickers">
      <picker mode="date" :value="dateRange.start" @change="onStartDateChange">
        <view class="picker">开始: {{ dateRange.start }}</view>
      </picker>
      <text class="date-separator">至</text>
      <picker mode="date" :value="dateRange.end" @change="onEndDateChange">
        <view class="picker">结束: {{ dateRange.end }}</view>
      </picker>
    </view>
    
    <!-- 统计汇总 -->
    <view class="summary">
      <view class="summary-item">
        <text class="summary-label">发车次数</text>
        <text class="summary-value">{{ totalStats.departureCount }}</text>
      </view>
      <view class="summary-item">
        <text class="summary-label">总大框数</text>
        <text class="summary-value">{{ totalStats.totalBigBoxes }}</text>
      </view>
      <view class="summary-item">
        <text class="summary-label">总小框数</text>
        <text class="summary-value">{{ totalStats.totalSmallBoxes }}</text>
      </view>
      <view class="summary-item" v-if="userStore.isAdmin || userStore.isMiddleman">
        <text class="summary-label">总盈利</text>
        <text class="summary-value profit">¥{{ totalStats.totalProfit.toFixed(2) }}</text>
      </view>
    </view>

    <!-- 发车记录列表 -->
    <view class="list-header">
      <text>日期</text>
      <text>鸡场</text>
      <text>大框</text>
      <text>小框</text>
      <text>盈利</text>
    </view>
    <scroll-view
      class="record-list"
      scroll-y
      :refresher-enabled="true"
      :refresher-triggered="isRefreshing"
      :lower-threshold="50"
      @refresherrefresh="onPullDownRefresh"
      @scrolltolower="loadMore"
      v-if="userStore.isAdmin || userStore.isMiddleman"
    >
      <view v-for="record in records" :key="record.id" class="record-item">
        <text>{{ record.date }}</text>
        <text class="merchant-name">{{ formatMerchants(record.merchantDetails) }}</text>
        <text>{{ getTotalBigBoxes(record) }}</text>
        <text>{{ getTotalSmallBoxes(record) }}</text>
        <text :class="['profit', record.getMoney >= 0 ? 'positive' : 'negative']">
          ¥{{ record.getMoney ? Number(record.getMoney).toFixed(2) : '0.00' }}
        </text>
      </view>
      <view v-if="records.length === 0 && !isLoading" class="empty">暂无发车记录</view>
      <view v-if="isLoadingMore" class="loading-more">加载中...</view>
      <view v-if="!hasMore && records.length > 0" class="no-more">没有更多了</view>
    </scroll-view>

  </view>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, watch } from 'vue'
import { departureApi } from '@/utils/api'
import { useUserStore } from '@/store/user'
import { subscribe } from '@/utils/eventBus'

const userStore = useUserStore()

// 快捷日期类型
const quickRangeType = ref('month')

// 日期范围（必须在其他使用 dateRange 的代码之前定义）
const dateRange = reactive({
  start: new Date(new Date().setDate(1)).toISOString().split('T')[0], // 本月第一天
  end: new Date().toISOString().split('T')[0]
})

// 分页数据
const records = ref([])
const currentPage = ref(1)
const pageSize = 20
const totalPages = ref(1)
const hasMore = computed(() => currentPage.value < totalPages.value)
const isLoading = ref(false)
const isLoadingMore = ref(false)
const isRefreshing = ref(false)

// 缓存 key
const getCacheKey = () => `userStats:${dateRange.start}:${dateRange.end}:${currentPage.value}`

// 缓存 Map（内存缓存，避免重复请求）
const pageCache = new Map()

// 加载记录（分页）
const loadRecords = async (reset = false) => {
  if (isLoading.value && !reset) {
    return
  }

  if (reset) {
    currentPage.value = 1
    records.value = []
    pageCache.clear()
  }

  const cacheKey = getCacheKey()
  if (pageCache.has(cacheKey)) {
    return
  }

  isLoading.value = true
  try {
    const res = await departureApi.getRecordsByDateRange(
      dateRange.start,
      dateRange.end,
      currentPage.value,
      pageSize
    )

    const newRecords = res.data || []
    // 从 pagination 对象中获取 total（后端返回格式：{ data, pagination: { total, totalPages } }）
    const total = res.pagination?.total || 0
    totalPages.value = Math.max(1, Math.ceil(total / pageSize))

    if (currentPage.value === 1) {
      records.value = newRecords
    } else {
      records.value = [...records.value, ...newRecords]
    }

    // 缓存当前页
    pageCache.set(cacheKey, newRecords)
  } catch (err) {
    console.error('[UserStats] Failed to load records:', err)
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    isLoading.value = false
  }
}

// 加载更多（上拉加载）
const loadMore = async () => {

  // 只有第一页加载完成后才能加载更多
  if (isLoading.value || isLoadingMore.value || !hasMore.value) {
    return
  }

  isLoadingMore.value = true
  currentPage.value++

  await loadRecords()

  isLoadingMore.value = false
}

// 下拉刷新
const onPullDownRefresh = async () => {
  isRefreshing.value = true
  await loadRecords(true)
  isRefreshing.value = false
}

// 日期范围变化时重新加载（防抖处理）
let reloadTimer = null
const reloadDateRange = () => {
  if (reloadTimer) clearTimeout(reloadTimer)
  reloadTimer = setTimeout(() => {
    loadRecords(true)
  }, 100)
}

// 监听日期范围变化
watch(() => dateRange.start, reloadDateRange)
watch(() => dateRange.end, reloadDateRange)

let unsubscribe = null

onMounted(async () => {
  await loadRecords(true)
  unsubscribe = subscribe('departure:refresh', () => {
    loadRecords(true)
  })
})

onUnmounted(() => {
  if (unsubscribe) { unsubscribe(); unsubscribe = null }
  if (reloadTimer) clearTimeout(reloadTimer)
})

// 设置快捷日期范围
const setQuickRange = (type) => {
  const today = new Date()
  const year = today.getFullYear()
  const month = today.getMonth()
  quickRangeType.value = type

  // 用于"全部"选项的历史最小日期
  const minDate = '2020-01-01'

  switch (type) {
    case 'today':
      dateRange.start = today.toISOString().split('T')[0]
      dateRange.end = dateRange.start
      break
    case 'month':
      dateRange.start = new Date(year, month, 2).toISOString().split('T')[0]
      dateRange.end = today.toISOString().split('T')[0]
      break
    case 'lastMonth':
      dateRange.start = new Date(year, month - 1, 2).toISOString().split('T')[0]
      dateRange.end = new Date(year, month, 1).toISOString().split('T')[0]
      break
    case 'year':
      dateRange.start = new Date(year, 0, 2).toISOString().split('T')[0]
      dateRange.end = today.toISOString().split('T')[0]
      break
    case 'all':
      dateRange.start = minDate
      dateRange.end = today.toISOString().split('T')[0]
      break
  }
  // 依赖 watch 的防抖处理来触发加载
}

// 日期选择变化
const onStartDateChange = (e) => {
  dateRange.start = e.detail.value
  quickRangeType.value = ''
}
const onEndDateChange = (e) => {
  dateRange.end = e.detail.value
  quickRangeType.value = ''
}

// 格式化鸡场名称
const formatMerchants = (merchantDetails) => {
  if (!merchantDetails || merchantDetails.length === 0) return '-'
  const names = merchantDetails.map(m => m.merchantName).filter(n => n)
  if (names.length === 0) return '-'
  return names.length > 2 ? names.slice(0, 2).join(',') + '...' : names.join(',')
}

// 获取总大框数
const getTotalBigBoxes = (record) => {
  if (record.isGroup) {
    // 分组记录，计算所有明细的大框总和
    return record.merchantDetails.reduce((sum, m) => sum + (m.bigBoxes || 0), 0)
  }
  return record.merchantDetails?.reduce((sum, m) => sum + (m.bigBoxes || 0), 0) || 0
}

// 获取总小框数
const getTotalSmallBoxes = (record) => {
  if (record.isGroup) {
    return record.merchantDetails.reduce((sum, m) => sum + (m.smallBoxes || 0), 0)
  }
  return record.merchantDetails?.reduce((sum, m) => sum + (m.smallBoxes || 0), 0) || 0
}

// 总统计
const totalStats = computed(() => {
  let totalBigBoxes = 0
  let totalSmallBoxes = 0
  let profitDays = new Set()
  let profitMonths = new Set()

  records.value.forEach(record => {
    totalBigBoxes += record.merchantDetails?.reduce((sum, m) => sum + (m.bigBoxes || 0), 0) || 0
    totalSmallBoxes += record.merchantDetails?.reduce((sum, m) => sum + (m.smallBoxes || 0), 0) || 0
    profitDays.add(record.date)
    profitMonths.add(record.date.substring(0, 7))
  })

  const totalProfit = records.value.reduce((sum, r) => sum + parseFloat(r.getMoney || 0), 0)

  return {
    departureCount: records.value.length,
    totalBigBoxes,
    totalSmallBoxes,
    totalProfit,
    profitDays: profitDays.size,
    profitMonths: profitMonths.size
  }
})
</script>

<style scoped>
.user-stats-page {
  padding: 15px;
  padding-bottom: 20px;
}

.quick-range {
  display: flex;
  gap: 8px;
  margin-bottom: 15px;
  flex-wrap: wrap;
}

.range-btn {
  flex: 1;
  text-align: center;
  padding: 8px 0;
  background: #fff;
  border-radius: 4px;
  font-size: 14px;
  border: 1px solid #ddd;
}

.range-btn.active {
  background: #007aff;
  color: #fff;
  border-color: #007aff;
}

.date-pickers {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 15px;
  background: #fff;
  padding: 12px;
  border-radius: 8px;
}

.picker {
  background: #f5f5f5;
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 14px;
}

.date-separator {
  color: #999;
}

.stats-tabs {
  display: flex;
  gap: 10px;
  background: #f5f5f5;
  border-radius: 8px;
  margin-bottom: 15px;
}

.tab {
  flex: 1;
  text-align: center;
  padding: 10px;
  border-radius: 8px;
  background: #fff;
  font-size: 14px;
}

.tab.active {
  background: #007aff;
  color: #fff;
}

.record-list {
  background: #fff;
  border-radius: 8px;
  overflow: hidden;
  height: 400px;
}

.list-header {
  display: flex;
  justify-content: space-between;
  padding: 12px 10px;
  background: #f5f5f5;
  font-weight: bold;
  font-size: 13px;
}

.list-header text {
  flex: 1;
  text-align: center;
}

.record-item {
  display: flex;
  justify-content: space-between;
  padding: 12px 10px;
  border-bottom: 1px solid #f0f0f0;
  font-size: 13px;
}

.record-item:last-child {
  border-bottom: none;
}

.record-item text {
  flex: 1;
  text-align: center;
}

.merchant-name {
  font-size: 12px !important;
  color: #666;
}

.profit {
  font-weight: bold;
}

.profit.positive {
  color: #52c41a;
}

.profit.negative {
  color: #ff4d4f;
}

.empty {
  color: #999;
  text-align: center;
  padding: 30px;
}

.loading-more,
.no-more {
  color: #999;
  text-align: center;
  padding: 15px;
  font-size: 13px;
}

.stats-summary {
  background: #fff;
  border-radius: 8px;
  padding: 15px;
}

.summary-title {
  font-size: 16px;
  font-weight: bold;
  margin-bottom: 15px;
  padding-bottom: 10px;
  border-bottom: 1px solid #f0f0f0;
}

.summary-item {
  display: flex;
  justify-content: space-between;
  padding: 10px 0;
}

.summary-item.highlight {
  background: #f6ffed;
  margin: 10px -15px;
  padding: 15px;
  border-radius: 0;
}

.value {
  font-weight: bold;
  color: #007aff;
}

.value.profit.positive {
  color: #52c41a;
}

.value.profit.negative {
  color: #ff4d4f;
}
</style>
