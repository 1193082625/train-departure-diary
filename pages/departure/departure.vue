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
        <text class="summary-value">{{ aggregateStats.departureCount }}</text>
      </view>
      <view class="summary-item">
        <text class="summary-label">大框</text>
        <text class="summary-value">{{ aggregateStats.truckBigTotal }}</text>
      </view>
      <view class="summary-item">
        <text class="summary-label">小框</text>
        <text class="summary-value">{{ aggregateStats.truckSmallTotal }}</text>
      </view>
      <view class="summary-item">
        <text class="summary-label">斤数</text>
        <text class="summary-value">{{ (aggregateStats.merchantWeightTotal ?? 0).toFixed(2) || '--' }}</text>
      </view>
      <view class="summary-item" v-if="userStore.isAdmin || userStore.isMiddleman">
        <text class="summary-label">总盈利</text>
        <text class="summary-value profit">¥{{ (aggregateStats.profitTotal ?? 0).toFixed(2) }}</text>
      </view>
    </view>

    <!-- 记录列表 -->
    <scroll-view
      class="record-list"
      scroll-y
      refresher-enabled
      :refresher-triggered="refreshing"
      @refresherrefresh="onRefresh"
      @scrolltolower="onLoadMore"
      lower-threshold="100"
    >
      <!-- 按月/按年模式：分组展示 -->
      <template v-if="viewMode !== 'day'">
        <view v-for="(group, groupKey) in groupedRecords" :key="groupKey" class="record-group">
          <view class="group-header">
            <view class="group-title">{{ groupKey }}</view>
            <view class="group-summary">
              {{ group.records.length }}车 | 大框{{ group.bigBoxes }} | 小框{{ group.smallBoxes }} | 斤数{{ (group.weight ?? 0).toFixed(2) }} <text v-if="userStore.isAdmin || userStore.isMiddleman"> | ¥{{ (group.profit ?? 0).toFixed(2) }}</text>
            </view>
          </view>
          <RecordCard
            v-for="record in group.records"
            :key="record.id"
            :record="record"
            :workers="allWorkers"
            :show-unit="false"
            @click="editRecord"
          />
        </view>
      </template>

      <!-- 按天模式：直接展示 -->
      <template v-else>
        <RecordCard
          v-for="record in records"
          :key="record.id"
          :record="record"
          :workers="allWorkers"
          :show-unit="true"
          @click="editRecord"
        />
      </template>

      <view v-if="records.length === 0 && !loading" class="empty">
        <text>{{ getEmptyText() }}</text>
      </view>
      <view v-if="loading" class="loading-tip">
        <text>加载中...</text>
      </view>
      <view v-if="!hasMore && records.length > 0" class="loading-tip">
        <text>没有更多了</text>
      </view>
    </scroll-view>
  </view>
</template>

<script setup>
import { ref, computed, watch, onMounted, reactive } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { departureApi, apiOps } from '@/api'
import { useUserStore, ROLES } from '@/store/user'
import MiddlemanSelector from '@/components/middleman-selector.vue'
import RecordCard from './components/record-card.vue'
import toast from '@/utils/toast'

const userStore = useUserStore()

// 发车记录数据
const allRecords = ref([])
const currentPage = ref(1)
const pageSize = ref(20)
const hasMore = ref(true)
const loading = ref(false)
const refreshing = ref(false)

// 加载记录（按时间范围+分页）
const loadRecords = async (reset = false) => {
  if (loading.value) return
  if (!reset && !hasMore.value) return

  loading.value = true
  if (reset) {
    currentPage.value = 1
    hasMore.value = true
    refreshing.value = true
  }

  try {
    let startDate, endDate
    if (viewMode.value === 'day') {
      startDate = selectedDate.value
      endDate = selectedDate.value
    } else if (viewMode.value === 'month') {
      startDate = `${selectedYear.value}-${String(selectedMonth.value).padStart(2, '0')}-01`
      endDate = getMonthEndDate(selectedYear.value, selectedMonth.value)
    } else {
      startDate = `${selectedYearForYear.value}-01-01`
      endDate = `${selectedYearForYear.value}-12-31`
    }

    const res = await departureApi.getRecordsByDateRange(startDate, endDate, currentPage.value, pageSize.value)

    if (reset) {
      allRecords.value = res.data || []
    } else {
      allRecords.value = [...allRecords.value, ...(res.data || [])]
    }

    // 按日期和时间排序，确保车次编号正确
    allRecords.value.sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date)
      const aTime = a.createdAt || ''
      const bTime = b.createdAt || ''
      return aTime.localeCompare(bTime)
    })

    // 判断是否还有更多数据
    const receivedCount = res.data?.length || 0
    hasMore.value = receivedCount >= pageSize.value

    if (reset) {
      refreshing.value = false
    }
  } catch (e) {
    console.error('加载发车记录失败:', e)
    toast.error('加载发车记录失败')
    if (reset) {
      refreshing.value = false
    }
  } finally {
    loading.value = false
  }
}

// 统计汇总（后端聚合）
const aggregateStats = ref({
  departureCount: 0,
  truckBigTotal: 0,
  truckSmallTotal: 0,
  merchantWeightTotal: 0,
  profitTotal: 0
})
const statsLoading = ref(false)

const loadAggregateStats = async () => {
  if (statsLoading.value) return

  statsLoading.value = true
  try {
    let startDate, endDate
    if (viewMode.value === 'day') {
      startDate = selectedDate.value
      endDate = selectedDate.value
    } else if (viewMode.value === 'month') {
      startDate = `${selectedYear.value}-${String(selectedMonth.value).padStart(2, '0')}-01`
      endDate = getMonthEndDate(selectedYear.value, selectedMonth.value)
    } else {
      startDate = `${selectedYearForYear.value}-01-01`
      endDate = `${selectedYearForYear.value}-12-31`
    }

    const res = await departureApi.aggregate(startDate, endDate, 'summary')
    if (res.data) {
      aggregateStats.value = res.data
    }
  } catch (e) {
    console.error('加载聚合统计失败:', e)
    toast.error('加载统计数据失败')
  } finally {
    statsLoading.value = false
  }
}

// 下拉刷新
const onRefresh = () => {
  loadRecords(true)
  loadAggregateStats()
}

// 上拉加载更多
const onLoadMore = () => {
  if (!hasMore.value || loading.value) return
  currentPage.value++
  loadRecords(false)
}

// 员工数据（本地管理）
const allWorkers = ref([])

const loadWorkers = async () => {
  try {
    const res = await apiOps.queryAll('workers')
    allWorkers.value = res.data || []
  } catch (e) {
    console.error('加载员工列表失败:', e)
    allWorkers.value = []
  }
}

const getWorkerById = (id) => allWorkers.value.find(w => w.id === id)

onShow(() => {
  loadRecords(true)
  loadAggregateStats()
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
  loadAggregateStats()
}

// 快捷选择今天
const selectToday = () => {
  selectedDate.value = today
  loadAggregateStats()
}

// 快捷选择本月
const selectCurrentMonth = () => {
  selectedYear.value = currentYear
  selectedMonth.value = currentMonth
  loadAggregateStats()
}

// 快捷选择本年
const selectCurrentYear = () => {
  selectedYearForYear.value = currentYear
  loadAggregateStats()
}

// 日期变化
const onDateChange = (e) => {
  selectedDate.value = e.detail.value
  loadAggregateStats()
}

// 年份变化（按月模式）
const onYearChange = (e) => {
  selectedYear.value = yearOptions.value[e.detail.value]
  loadAggregateStats()
}

// 月份变化
const onMonthChange = (e) => {
  selectedMonth.value = monthOptions[e.detail.value]
  loadAggregateStats()
}

// 年份变化（按年模式）
const onYearForYearChange = (e) => {
  selectedYearForYear.value = yearOptions.value[e.detail.value]
  loadAggregateStats()
}

// 监听时间范围变化，自动重新加载
watch(
  () => [viewMode.value, selectedDate.value, selectedYear.value, selectedMonth.value, selectedYearForYear.value],
  () => {
    loadRecords(true)
    loadAggregateStats()
  }
)

// 根据视图模式获取记录（已按时间范围过滤）
const records = computed(() => {
  return allRecords.value
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
  const sortedRecords = [...records.value].sort((a, b) => b.date.localeCompare(a.date))

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

  // 为每个分组内的记录计算车次编号
  // 分组内按创建时间正序排序（最早的「第01趟」）
  Object.values(groups).forEach(group => {
    const sortedGroupRecords = [...group.records].sort((a, b) => {
      const aTime = a.createdAt || ''
      const bTime = b.createdAt || ''
      const timeCompare = aTime.localeCompare(bTime)
      if (timeCompare !== 0) return timeCompare
      return a.id.localeCompare(b.id)
    })
    // 建立 id -> 编号 的映射
    const tripNumberMap = {}
    sortedGroupRecords.forEach((r, index) => {
      tripNumberMap[r.id] = `第${String(index + 1).padStart(2, '0')}趟`
    })
    // 按创建时间正序重新排列分组内的记录，并设置编号
    group.records = sortedGroupRecords.map(r => {
      r.tripNumber = tripNumberMap[r.id]
      return r
    })
  })

  return groups
})

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
  if(userStore.currentUser.role === 'loader' && !record.isCreatedByMe) {
    toast.error('没有操作权限')
    return
  }
  uni.navigateTo({ url: `/pages/departure/form?id=${record.id}` })
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
  const totalWeight = record.merchantDetails.reduce((sum, m) => sum + m.weight, 0)
  return totalWeight
}

onMounted(() => {
  loadWorkers()
})
</script>

<style scoped>
.departure-page { padding: 20px; display: flex; flex-direction: column; height: 100vh; }
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

/* 记录分组 */
.record-group { margin-bottom: 20px; }
.group-header { padding: 10px; border-bottom: 1px solid #eee; margin-bottom: 10px; }
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
.loading-tip { text-align: center; color: #999; padding: 20px; }

/* 记录列表 - scroll-view 需要高度 */
.record-list {
  flex: 1;
  min-height: 200px;
}
</style>
