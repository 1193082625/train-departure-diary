<template>
  <!-- 「装发车」角色个人盈利统计页面 -->
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
        <text class="summary-label">装车次数</text>
        <text class="summary-value">{{ totalStats.totalBigBoxes }}</text>
      </view>
      <view class="summary-item">
        <text class="summary-label">总盈利</text>
        <text class="summary-value profit">¥{{ totalStats.totalProfit.toFixed(2) }}</text>
      </view>
    </view>

    <!-- 发车记录列表 -->
    <view class="detail-list">
      <view class="detail-header">
        <text>日期</text>
        <text>信息</text>
        <text>发车费</text>
        <text>装车费</text>
      </view>
      <scroll-view
        scroll-y
        class="detail-scroll"
        :style="{ height: scrollHeight }"
        @scrolltolower="loadMore"
        :lower-threshold="50"
      >
        <view class="detail-item" v-for="(item, index) in personRecordList" :key="`${item.date}-${index}`" @click="goToDetail(item)">
          <text>{{ item.date }}</text>
          <text>{{ item.info }}</text>
          <text>{{ item.departureFee }}</text>
          <text>{{ item.loadingFee }}</text>
        </view>
        <view class="empty-content" v-if="personRecordList.length === 0 && !loadingMore">
          <text class=""tips>暂无数据</text>
        </view>
        <view class="load-more" v-else-if="hasMore">
          <text>{{ loadingMore ? '加载中...' : '上拉加载更多' }}</text>
        </view>
        <view class="no-more" v-else-if="personRecordList.length > 0">
          <text>没有更多了</text>
        </view>
      </scroll-view>
    </view>

  </view>
</template>

<script setup>
import { ref, reactive, computed, onUnmounted, watch } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { departureApi } from '@/api'
import { useUserStore } from '@/store/user'

const userStore = useUserStore()

// 快捷日期类型
const quickRangeType = ref('month')

// 列表展开状态和滚动高度
const scrollHeight = ref('400px')

// 日期范围（必须在其他使用 dateRange 的代码之前定义）
const dateRange = reactive({
  start: new Date(new Date().setDate(1)).toISOString().split('T')[0], // 本月第一天
  end: new Date().toISOString().split('T')[0]
})

// 统计数据
const workerStats = ref({
  workerId: '',
  workDays: 0,
  departureCount: 0,
  departureFeeSum: 0,
  loadingCount: 0,
  loadingFeeSum: 0,
  settledAmount: 0,
  totalEarned: 0,
  unpaidAmount: 0
})

// 列表数据（分页）
const personRecordList = ref([])
const currentPage = ref(1)
const pageSize = 20
const hasMore = ref(false)
const loadingMore = ref(false)
const totalList = ref([]) // 完整列表数据

// 加载统计数据
const loadWorkerStats = async () => {
  if (!userStore.currentUser?.workerId) {
    workerStats.value = {
      workerId: '',
      workDays: 0,
      departureCount: 0,
      departureFeeSum: 0,
      loadingCount: 0,
      loadingFeeSum: 0,
      settledAmount: 0,
      totalEarned: 0,
      unpaidAmount: 0
    }
    return
  }
  try {
    const res = await departureApi.getWorkerStats(
      userStore.currentUser.workerId,
      dateRange.start,
      dateRange.end
    )
    if (res.success && res.data) {
      workerStats.value = res.data
      loadTotalStats()
    }
  } catch (e) {
    workerStats.value = {
      workerId: '',
      workDays: 0,
      departureCount: 0,
      departureFeeSum: 0,
      loadingCount: 0,
      loadingFeeSum: 0,
      settledAmount: 0,
      totalEarned: 0,
      unpaidAmount: 0
    }
  }
}

// 加载列表数据（第一页）
const loadListData = async () => {
  if (!userStore.currentUser?.workerId) {
    personRecordList.value = []
    totalList.value = []
    return
  }
  try {
    const res = await departureApi.getWorkerList(
      userStore.currentUser.workerId,
      dateRange.start,
      dateRange.end,
      1,
      pageSize
    )
    if (res.success && res.data) {
      totalList.value = res.data || []
      personRecordList.value = totalList.value
      hasMore.value = res.pagination?.page < res.pagination?.totalPages
      currentPage.value = 1
    }
  } catch (e) {
    console.error('加载列表数据失败:', e)
    personRecordList.value = []
    totalList.value = []
  }
}

// 加载更多
const loadMore = async () => {
  if (loadingMore.value || !hasMore.value) return

  loadingMore.value = true
  try {
    const nextPage = currentPage.value + 1
    const res = await departureApi.getWorkerList(
      userStore.currentUser.workerId,
      dateRange.start,
      dateRange.end,
      nextPage,
      pageSize
    )
    if (res.success && res.data) {
      const newList = res.data || []
      totalList.value = [...totalList.value, ...newList]
      personRecordList.value = totalList.value
      hasMore.value = res.pagination?.page < res.pagination?.totalPages
      currentPage.value = nextPage
    }
  } catch (e) {
    console.error('加载更多失败:', e)
  } finally {
    loadingMore.value = false
  }
}

// 下拉刷新（重新加载所有数据）
const refreshData = async () => {
  await Promise.all([
    loadWorkerStats(),
    loadListData()
  ])
}

// 跳转详情
const goToDetail = (item) => {
  if (item.id) {
    uni.navigateTo({ url: `/pages/departure/form?id=${item.id}` })
  }
}

// 监听日期范围变化
watch(() => [dateRange.start, dateRange.end], () => {
  refreshData()
}, { deep: true })

onShow(() => {
  loadWorkerStats()
  loadListData()
})

onUnmounted(() => {
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

// 总统计（从 API 加载）
const totalStats = reactive({
  departureCount: 0,
  totalBigBoxes: 0,
  totalSmallBoxes: 0,
  totalProfit: 0
})

// 同步总统计数据（从 workerStats 同步）
const loadTotalStats = () => {
  totalStats.departureCount = workerStats.value.departureCount || 0
  totalStats.totalBigBoxes = workerStats.value.loadingCount || 0
  totalStats.totalSmallBoxes = workerStats.value.loadingCount || 0
  totalStats.totalProfit = workerStats.value.totalEarned || 0
}
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

.detail-list { background: #fff; padding: 0 15px 15px; }
.detail-title { font-size: 16px; font-weight: bold; margin-bottom: 10px; }
.detail-header { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #f0f0f0; }
.detail-header text { flex: 1; text-align: center; }
.detail-scroll {
   max-height: 400px;
   padding-bottom: 20rpx;
 }
.detail-item { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #f0f0f0; }
.detail-item text { flex: 1; text-align: center; }
.detail-item:last-child { border-bottom: none; }

.load-more, .no-more {
  text-align: center;
  padding: 20rpx;
  color: #999;
  font-size: 12px;
}

.empty-content{
  width: 100%;
  height: 200rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.empty-content .tips{
  color: #666;
}
</style>
