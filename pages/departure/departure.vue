<template>
  <!-- 发车记录页面 -->
  <view class="departure-page">
    <view class="header">
      <text class="title">发车记录</text>
      <button class="add-btn" size="mini" @click="goToForm">+ 新增</button>
    </view>

    <!-- 管理员中间商选择器 -->
    <middleman-selector />

    <!-- 视图模式切换 -->
    <view class="view-mode-tabs">
      <view
        class="tab-item"
        :class="{ active: viewMode === 'day' }"
        @click="switchViewMode('day')"
      >按天</view>
      <view
        class="tab-item"
        :class="{ active: viewMode === 'month' }"
        @click="switchViewMode('month')"
      >按月</view>
      <view
        class="tab-item"
        :class="{ active: viewMode === 'year' }"
        @click="switchViewMode('year')"
      >按年</view>
    </view>

    <!-- 按天模式 -->
    <view v-if="viewMode === 'day'" class="date-picker flex-between">
      <view class="flex-start">
        <picker mode="date" :value="selectedDate" @change="onDateChange">
          <view class="picker-text">{{ selectedDate }}</view>
        </picker>
        <text class="picker-text-label">(点击日期可切换)</text>
      </view>
      <button
        v-if="viewMode === 'day'"
        size="mini"
        :class="['quick-btn', { active: selectedDate === today }]"
        @click="selectToday"
      >今天</button>
    </view>

    <!-- 按月模式 -->
    <view v-if="viewMode === 'month'" class="month-picker flex-between">
      <view class="flex-start">
        <picker mode="selector" :range="yearOptions" :value="yearOptions.indexOf(selectedYear)" @change="onYearChange">
          <view class="picker-text">{{ selectedYear }}年</view>
        </picker>
        <picker mode="selector" :range="monthOptions" :value="selectedMonth - 1" @change="onMonthChange">
          <view class="picker-text">{{ selectedMonth }}月</view>
        </picker>
        <text class="picker-text-label ml-10">(点击年月可切换)</text>
      </view>
      <button
        v-if="viewMode === 'month'"
        size="mini"
        :class="['quick-btn', { active: selectedYear === currentYear && selectedMonth === currentMonth }]"
        @click="selectCurrentMonth"
      >本月</button>
    </view>

    <!-- 按年模式 -->
    <view v-if="viewMode === 'year'" class="year-picker flex-between">
      <view class="flex-start">
        <picker mode="selector" :range="yearOptions" :value="yearOptions.indexOf(selectedYearForYear)" @change="onYearForYearChange">
          <view class="picker-text">{{ selectedYearForYear }}年</view>
        </picker>
        <text class="picker-text-label">(点击年份可切换)</text>
      </view>
      <button
        v-if="viewMode === 'year'"
        size="mini"
        :class="['quick-btn', { active: selectedYearForYear === currentYear }]"
        @click="selectCurrentYear"
      >本年</button>
    </view>

    <!-- 统计汇总 -->
    <view v-if="records.length > 0" class="summary">
      <view class="summary-item">
        <text class="summary-label">总车次</text>
        <text class="summary-value">{{ records.length }}</text>
      </view>
      <view class="summary-item">
        <text class="summary-label">大框</text>
        <text class="summary-value">{{ totalBigBoxes }}</text>
      </view>
      <view class="summary-item">
        <text class="summary-label">小框</text>
        <text class="summary-value">{{ totalSmallBoxes }}</text>
      </view>
      <view class="summary-item">
        <text class="summary-label">斤数</text>
        <text class="summary-value">{{ totalWeight || '--' }}</text>
      </view>
      <view class="summary-item" v-if="userStore.isAdmin || userStore.isMiddleman">
        <text class="summary-label">总盈利</text>
        <text class="summary-value profit">¥{{ totalProfit.toFixed(2) }}</text>
      </view>
    </view>

    <!-- 记录列表 -->
    <view class="record-list">
      <!-- 按月/按年模式：分组展示 -->
      <template v-if="viewMode !== 'day'">
        <view v-for="(group, groupKey) in groupedRecords" :key="groupKey" class="record-group">
          <view class="group-header">
            <text class="group-title">{{ groupKey }}</text>
            <view class="group-summary">
              {{ group.records.length }}车 | 大框{{ group.bigBoxes }} | 小框{{ group.smallBoxes }} | 斤数{{ group.weight }} <text v-if="userStore.isAdmin || userStore.isMiddleman"> | ¥{{ group.profit.toFixed(2) }}</text>
            </view>
          </view>
          <view
            v-for="record in group.records"
            :key="record.id"
            class="record-card"
            @click="editRecord(record)"
          >
            <view class="record-header">
              <text class="trip-number">{{ getTripNumber(record) }}</text>
              <text class="time">{{ record.date }}</text>
            </view>
            <view class="record-content">
              <text>鸡场: {{ record.merchantDetails.map(m => m.merchantName).join(', ') }}</text>
              <text>发车: {{ getWorkerName(record.departureWorkerId) }}</text>
              <text>装车: {{ record.loadingWorkerIds.map(id => getWorkerName(id)).join(', ') }}</text>
            </view>
            <view class="record-stats">
              <text>大框: {{ calculateTotalBigBoxes(record) }}</text>
              <text>小框: {{ calculateTotalSmallBoxes(record) }}</text>
              <text>斤数: {{ calculateTotalWeight(record) }}</text>
              <text class="profit" v-if="record.getMoney && (userStore.isAdmin || userStore.isMiddleman)">盈利: ¥{{ parseFloat(record.getMoney).toFixed(2) }}</text>
            </view>
          </view>
        </view>
      </template>

      <!-- 按天模式：直接展示 -->
      <template v-else>
        <view
          v-for="record in records"
          :key="record.id"
          class="record-card"
          @click="editRecord(record)"
        >
          <view class="record-header">
            <text class="trip-number">{{ getTripNumber(record) }}</text>
            <text class="time">{{ record.date }}</text>
          </view>
          <view class="record-content">
            <text>鸡场: {{ record.merchantDetails.map(m => m.merchantName).join(', ') }}</text>
            <text>发车: {{ getWorkerName(record.departureWorkerId) }}</text>
            <text>装车: {{ record.loadingWorkerIds.map(id => getWorkerName(id)).join(', ') }}</text>
          </view>
          <view class="record-stats">
            <text>大框: {{ calculateTotalBigBoxes(record) }}</text>
            <text>小框: {{ calculateTotalSmallBoxes(record) }}</text>
            <text>散装: {{ calculateTotalWeight(record) }} 斤</text>
            <text class="profit" v-if="record.getMoney && (userStore.isAdmin || userStore.isMiddleman)">盈利: ¥{{ parseFloat(record.getMoney).toFixed(2) }}</text>
          </view>
        </view>
      </template>

      <view v-if="records.length === 0" class="empty">
        <text>{{ getEmptyText() }}</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { onShow, onHide } from '@dcloudio/uni-app'
import { useDepartureStore } from '@/store/departure'
import { useWorkerStore } from '@/store/worker'
import { useUserStore } from '@/store/user'
import { subscribe } from '@/utils/eventBus'
import MiddlemanSelector from '@/components/middleman-selector.vue'

const departureStore = useDepartureStore()
const workerStore = useWorkerStore()
const userStore = useUserStore()

let unsubscribe = null

onShow(() => {
  unsubscribe = subscribe('departure:refresh', () => {
    departureStore.loadRecords()
  })
})

onHide(() => {
  if (unsubscribe) { unsubscribe(); unsubscribe = null }
})

// 今天的日期
const today = new Date().toISOString().split('T')[0]
const currentYear = new Date().getFullYear()
const currentMonth = new Date().getMonth() + 1

// 视图模式
const viewMode = ref('day')

// 按天
const selectedDate = ref(today)

// 按月
const selectedYear = ref(currentYear)
const selectedMonth = ref(currentMonth)

// 按年
const selectedYearForYear = ref(currentYear)

// 年份选项（当前年份前后5年）
const yearOptions = computed(() => {
  const years = []
  for (let i = currentYear - 5; i <= currentYear + 1; i++) {
    years.push(i)
  }
  return years
})

// 月份选项
const monthOptions = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]

// 切换视图模式
const switchViewMode = (mode) => {
  viewMode.value = mode
}

// 快捷选择今天
const selectToday = () => {
  selectedDate.value = today
}

// 快捷选择本月
const selectCurrentMonth = () => {
  selectedYear.value = currentYear
  selectedMonth.value = currentMonth
}

// 快捷选择本年
const selectCurrentYear = () => {
  selectedYearForYear.value = currentYear
}

// 日期变化
const onDateChange = (e) => {
  selectedDate.value = e.detail.value
}

// 年份变化（按月模式）
const onYearChange = (e) => {
  selectedYear.value = yearOptions.value[e.detail.value]
}

// 月份变化
const onMonthChange = (e) => {
  selectedMonth.value = monthOptions[e.detail.value]
}

// 年份变化（按年模式）
const onYearForYearChange = (e) => {
  selectedYearForYear.value = yearOptions.value[e.detail.value]
}

// 根据视图模式获取记录
const records = computed(() => {
  if (viewMode.value === 'day') {
    return departureStore.getRecordsByDate(selectedDate.value)
  } else if (viewMode.value === 'month') {
    const startDate = `${selectedYear.value}-${String(selectedMonth.value).padStart(2, '0')}-01`
    const endDate = getMonthEndDate(selectedYear.value, selectedMonth.value)
    return departureStore.getRecordsByDateRange(startDate, endDate)
  } else {
    const startDate = `${selectedYearForYear.value}-01-01`
    const endDate = `${selectedYearForYear.value}-12-31`
    return departureStore.getRecordsByDateRange(startDate, endDate)
  }
})

// 获取月份结束日期
const getMonthEndDate = (year, month) => {
  const lastDay = new Date(year, month, 0).getDate()
  return `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
}

// 按日期分组（按月模式）
const groupedRecords = computed(() => {
  if (viewMode.value === 'day') return {}

  const groups = {}
  const sortedRecords = [...records.value].sort((a, b) => a.date.localeCompare(b.date))

  sortedRecords.forEach(record => {
    const key = viewMode.value === 'month' ? record.date : record.date.substring(0, 7)
    if (!groups[key]) {
      groups[key] = {
        records: [],
        bigBoxes: 0,
        smallBoxes: 0,
        weight: 0,
        profit: 0
      }
    }
    groups[key].records.push(record)
    groups[key].bigBoxes += calculateTotalBigBoxes(record)
    groups[key].smallBoxes += calculateTotalSmallBoxes(record)
    groups[key].weight += calculateTotalWeight(record)
    groups[key].profit += parseFloat(record.getMoney || 0)
  })

  return groups
})

// 计算总大框
const totalBigBoxes = computed(() => {
  return records.value.reduce((sum, r) => sum + calculateTotalBigBoxes(r), 0)
})

// 计算总小框
const totalSmallBoxes = computed(() => {
  return records.value.reduce((sum, r) => sum + calculateTotalSmallBoxes(r), 0)
})

// 计算总斤数
const totalWeight = computed(() => {
  return records.value.reduce((sum, r) => sum + calculateTotalWeight(r), 0)
})

// 计算总盈利
const totalProfit = computed(() => {
  return records.value.reduce((sum, r) => sum + parseFloat(r.getMoney || 0), 0)
})

// 计算车次编号
const getTripNumber = (record) => {
  const sameDayRecords = records.value
    .filter(r => r.date === record.date)
    .sort((a, b) => {
      const aTime = a.createdAt || ''
      const bTime = b.createdAt || ''
      return aTime.localeCompare(bTime)
    })
  const index = sameDayRecords.findIndex(r => r.id === record.id)
  return `第${String(index + 1).padStart(2, '0')}趟`
}

// 获取空文本
const getEmptyText = () => {
  if (viewMode.value === 'day') {
    return '当日暂无发车记录'
  } else if (viewMode.value === 'month') {
    return `${selectedYear.value}年${selectedMonth.value}月暂无发车记录`
  } else {
    return `${selectedYearForYear.value}年暂无发车记录`
  }
}

const goToForm = () => {
  uni.navigateTo({ url: '/pages/departure/form' })
}

const editRecord = (record) => {
  uni.navigateTo({ url: `/pages/departure/form?id=${record.id}` })
}

const getWorkerName = (id) => {
  const worker = workerStore.getWorkerById(id)
  return worker ? worker.name : '未知'
}

const calculateTotalBigBoxes = (record) => {
  const merchantBig = record.merchantDetails.reduce((sum, m) => sum + m.bigBoxes, 0)
  return merchantBig - record.reservedBigBoxes
}

const calculateTotalSmallBoxes = (record) => {
  const merchantSmall = record.merchantDetails.reduce((sum, m) => sum + m.smallBoxes, 0)
  return merchantSmall - record.reservedSmallBoxes
}

const calculateTotalWeight = (record) => {
  return record.merchantDetails.reduce((sum, m) => sum + m.weight, 0)
}

onMounted(() => {
  departureStore.loadRecords()
})
</script>

<style scoped>
.departure-page { padding: 20px; }
.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.title { font-size: 20px; font-weight: bold; }
.add-btn { background: #007aff; color: #fff; padding: 8px 16px; border-radius: 4px; margin: 0;}

/* 视图模式切换 */
.view-mode-tabs { display: flex; background: #fff; border-radius: 8px; margin-bottom: 15px; overflow: hidden; }
.tab-item { flex: 1; text-align: center; padding: 10px; color: #666; cursor: pointer; }
.tab-item.active { background: #007aff; color: #fff; }

/* 快捷筛选 */
.quick-filter { margin-bottom: 15px; }
.quick-btn { background: #f5f5f5; color: #666; padding: 3px 10px; margin-right: 0 !important; border-radius: 4px; }
.quick-btn.active { background: #007aff; color: #fff; }

/* 日期选择器 */
.date-picker, .month-picker, .year-picker { margin-bottom: 15px; }
.month-picker, .year-picker { display: flex; gap: 10px; }
.picker-text { background: #f5f5f5; padding: 10px; border-radius: 4px; font-size: 18px; font-weight: bold; }
.picker-text-label { font-size: 12px; color: #999; margin-top: 5px; }

/* 统计汇总 */
.summary { display: flex; justify-content: space-around; background: #f0f7ff; padding: 15px; border-radius: 8px; margin-bottom: 15px; box-shadow: 0 0 10px 0 rgba(0, 0, 0, 0.1); }
.summary-item { display: flex; flex-direction: column; align-items: center; }
.summary-label { font-size: 12px; color: #666; }
.summary-value { font-size: 16px; font-weight: bold; color: #333; }
.summary-value.profit { color: #52c41a; }

/* 记录分组 */
.record-group { margin-bottom: 20px; }
.group-header { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #eee; margin-bottom: 10px; }
.group-title { font-weight: bold; color: #333; }
.group-summary { font-size: 12px; color: #666; }

/* 记录卡片 */
.record-card { background: #fff; padding: 15px; border-radius: 8px; margin-bottom: 10px; }
.record-header { display: flex; justify-content: space-between; margin-bottom: 10px; }
.trip-number { font-weight: bold; color: #007aff; font-size: 14px; }
.time { color: #999; }
.amount { font-size: 18px; font-weight: bold; color: #52c41a; }
.record-content { display: flex; flex-direction: column; gap: 5px; color: #666; font-size: 14px; }
.record-stats { display: flex; gap: 20px; margin-top: 10px; color: #007aff; flex-wrap: wrap; }
.profit { color: #52c41a; font-weight: bold; }
.empty { text-align: center; color: #999; padding: 40px; }
</style>
