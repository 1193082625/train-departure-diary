<template>
  <!-- 结账统计页面 -->
  <view class="statistics-page">
    <!-- 管理员中间商选择器 -->
    <middleman-selector />

    <!-- 快捷日期范围选择 -->
    <view class="quick-range">
      <view @click="setQuickRange('today')" :class="['range-btn', getActiveRange() === 'today' && 'active']">今天</view>
      <view @click="setQuickRange('month')" :class="['range-btn', getActiveRange() === 'month' && 'active']">本月</view>
      <view @click="setQuickRange('lastMonth')" :class="['range-btn', getActiveRange() === 'lastMonth' && 'active']">上月</view>
      <view @click="setQuickRange('year')" :class="['range-btn', getActiveRange() === 'year' && 'active']">本年</view>
      <view @click="setQuickRange('all')" :class="['range-btn', getActiveRange() === 'all' && 'active']">全部</view>
    </view>

    <view class="tabs">
      <view :class="['tab', activeTab === 'worker' && 'active']" @click="activeTab = 'worker'">按人员</view>
      <view :class="['tab', activeTab === 'merchant' && 'active']" @click="activeTab = 'merchant'">按鸡场</view>
    </view>

    <!-- 按人员统计 -->
    <WorkerStatistics v-if="activeTab === 'worker'" :date-range="dateRange" @update:date-range="onDateRangeUpdate" />

    <!-- 按鸡场统计 -->
    <MerchantStatistics v-if="activeTab === 'merchant'" :date-range="dateRange" @update:date-range="onDateRangeUpdate" />
  </view>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { onShow, onHide } from '@dcloudio/uni-app'
import { useDepartureStore } from '@/store/departure'
import { subscribe } from '@/utils/eventBus'
import MiddlemanSelector from '@/components/middleman-selector.vue'
import WorkerStatistics from './WorkerStatistics.vue'
import MerchantStatistics from './MerchantStatistics.vue'

const departureStore = useDepartureStore()

let unsubscribers = []

onShow(() => {
  unsubscribers.push(subscribe('departure:refresh', () => {
    departureStore.loadRecords()
  }))
})

onHide(() => {
  unsubscribers.forEach(fn => fn())
  unsubscribers = []
})

const activeTab = ref('worker')
const dateRange = reactive({
  start: new Date(new Date().setDate(1)).toISOString().split('T')[0], // 本月第一天
  end: new Date().toISOString().split('T')[0]
})

const onDateRangeUpdate = (newRange) => {
  dateRange.start = newRange.start
  dateRange.end = newRange.end
}

// 快捷日期范围设置
const setQuickRange = (type) => {
  const today = new Date()
  const year = today.getFullYear()
  const month = today.getMonth()

  switch (type) {
    case 'today':
      dateRange.start = today.toISOString().split('T')[0]
      dateRange.end = dateRange.start
      break
    case 'month':
      // 获取本月第一天
      dateRange.start = new Date(year, month, 2).toISOString().split('T')[0]
      // 获取本月最后一天
      dateRange.end = today.toISOString().split('T')[0]
      break
    case 'lastMonth':
      // 获取上月第一天
      dateRange.start = new Date(year, month - 1, 2).toISOString().split('T')[0]
      // 获取上月最后一天
      dateRange.end = new Date(year, month, 1).toISOString().split('T')[0]
      break
    case 'year':
      // 获取本年第一天
      dateRange.start = new Date(year, 0, 2).toISOString().split('T')[0]
      // 获取本年最后一天
      dateRange.end = today.toISOString().split('T')[0]
      break
    case 'all':
      // 获取最早记录日期
      if (departureStore.records.length > 0) {
        const dates = departureStore.records.map(r => r.date).sort()
        dateRange.start = dates[0]
        dateRange.end = today.toISOString().split('T')[0]
      }
      break
  }
}

// 获取当前激活的快捷范围
const getActiveRange = () => {
  const todayObj = new Date()
  const today = todayObj.toISOString().split('T')[0]
  const year = todayObj.getFullYear()
  const month = todayObj.getMonth()

  // 今天
  if(dateRange.start === today && dateRange.end === today) {
    return 'today'
  }

   // 本月
   const monthStart = new Date(year, month, 2).toISOString().split('T')[0]
   if (dateRange.start === monthStart && dateRange.end === today) {
     return 'month'
   }

   // 上月
   const lastMonthStart = new Date(year, month - 1, 2).toISOString().split('T')[0]
   const lastMonthEnd = new Date(year, month, 1).toISOString().split('T')[0]
   if (dateRange.start === lastMonthStart && dateRange.end === lastMonthEnd) {
     return 'lastMonth'
   }

   // 本年
   const yearStart = new Date(year, 0, 2).toISOString().split('T')[0]
   if (dateRange.start === yearStart && dateRange.end === today) {
     return 'year'
   }

   // 全部
   if (departureStore.records.length > 0) {
     const dates = departureStore.records.map(r => r.date).sort()
     if (dateRange.start === dates[0] && dateRange.end === today) {
       return 'all'
     }
   }

   return null
}
</script>

<style scoped>
.statistics-page { padding: 20px; }
.tabs { display: flex; gap: 10px; background: #f5f5f5; border-radius: 8px; margin-bottom: 20px; }
.tab { flex: 1; text-align: center; padding: 10px; border-radius: 8px; background: #fff;}
.tab.active { background: #007aff; color: #fff; }
.quick-range { display: flex; gap: 8px; margin-bottom: 15px; flex-wrap: wrap; }
.range-btn { flex: 1; text-align: center; padding: 8px 0; background: #fff; border-radius: 4px; font-size: 14px; border: 1px solid #ddd; }
.range-btn.active { background: #007aff; color: #fff; border-color: #007aff; }
</style>
