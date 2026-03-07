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

    <!-- 发车记录列表 -->
    <view class="record-list">
      <view class="list-header">
        <text>日期</text>
        <text>鸡场</text>
        <text>大框</text>
        <text>小框</text>
        <text>盈利</text>
      </view>
      <view v-for="record in filteredRecords" :key="record.id" class="record-item">
        <text>{{ record.date }}</text>
        <text class="merchant-name">{{ formatMerchants(record.merchantDetails) }}</text>
        <text>{{ getTotalBigBoxes(record) }}</text>
        <text>{{ getTotalSmallBoxes(record) }}</text>
        <text :class="['profit', record.getMoney >= 0 ? 'positive' : 'negative']">
          ¥{{ record.getMoney ? Number(record.getMoney).toFixed(2) : '0.00' }}
        </text>
      </view>
      <view v-if="filteredRecords.length === 0" class="empty">暂无发车记录</view>
    </view>

    <!-- 底部统计信息 -->
    <view class="stats-summary">
      <view class="summary-title">统计汇总</view>
      <view class="summary-item">
        <text>发车次数</text>
        <text class="value">{{ totalStats.departureCount }}</text>
      </view>
      <view class="summary-item">
        <text>总大框数</text>
        <text class="value">{{ totalStats.totalBigBoxes }}</text>
      </view>
      <view class="summary-item">
        <text>总小框数</text>
        <text class="value">{{ totalStats.totalSmallBoxes }}</text>
      </view>
      <view class="summary-item highlight">
        <text>总盈利</text>
        <text :class="['value', 'profit', totalStats.totalProfit >= 0 ? 'positive' : 'negative']">
          ¥{{ totalStats.totalProfit.toFixed(2) }}
        </text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { useDepartureStore } from '@/store/departure'
import { useMerchantStore } from '@/store/merchant'

const departureStore = useDepartureStore()
const merchantStore = useMerchantStore()

// 快捷日期类型
const quickRangeType = ref('month')

// 日期范围
const dateRange = reactive({
  start: new Date(new Date().setDate(1)).toISOString().split('T')[0], // 本月第一天
  end: new Date().toISOString().split('T')[0]
})

// 设置快捷日期范围
const setQuickRange = (type) => {
  const today = new Date()
  const year = today.getFullYear()
  const month = today.getMonth()
  quickRangeType.value = type

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
      if (departureStore.records.length > 0) {
        const dates = departureStore.records.map(r => r.date).sort()
        dateRange.start = dates[0]
        dateRange.end = today.toISOString().split('T')[0]
      }
      break
  }
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

// 获取日期范围内的记录
const records = computed(() => {
  return departureStore.getRecordsByDateRange(dateRange.start, dateRange.end)
})

// 根据统计类型过滤和分组记录
const filteredRecords = computed(() => {
  const allRecords = records.value
	return [...allRecords].sort((a, b) => b.date.localeCompare(a.date))
})

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
  const allRecords = records.value

  let totalBigBoxes = 0
  let totalSmallBoxes = 0
  let profitDays = new Set()
  let profitMonths = new Set()

  allRecords.forEach(record => {
    totalBigBoxes += record.merchantDetails?.reduce((sum, m) => sum + (m.bigBoxes || 0), 0) || 0
    totalSmallBoxes += record.merchantDetails?.reduce((sum, m) => sum + (m.smallBoxes || 0), 0) || 0
    profitDays.add(record.date)
    profitMonths.add(record.date.substring(0, 7))
  })

  const totalProfit = allRecords.reduce((sum, r) => sum + parseFloat(r.getMoney || 0), 0)

  return {
    departureCount: allRecords.length,
    totalBigBoxes,
    totalSmallBoxes,
    totalProfit,
    profitDays: profitDays.size,
    profitMonths: profitMonths.size
  }
})

// 平均每趟盈利
const avgProfit = computed(() => {
  const count = filteredRecords.value.length
  if (count === 0) return 0
  return totalStats.value.totalProfit / count
})
</script>

<style scoped>
.user-stats-page {
  padding: 15px;
  padding-bottom: 120px;
}

.quick-range {
  display: flex;
  gap: 8px;
  margin-bottom: 15px;
  flex-wrap: wrap;
}

.range-btn {
  padding: 8px 12px;
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
  margin-bottom: 15px;
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
