<template>
  
  <view class="statistics-page">
    <!-- 快捷日期范围选择 -->
    <view class="quick-range">
      <view @click="setQuickRange('today')" :class="['range-btn', getActiveRange() === 'today' && 'active']">今天</view>
      <view @click="setQuickRange('month')" :class="['range-btn', getActiveRange() === 'month' && 'active']">本月</view>
      <view @click="setQuickRange('lastMonth')" :class="['range-btn', getActiveRange() === 'lastMonth' && 'active']">上月</view>
      <view @click="setQuickRange('year')" :class="['range-btn', getActiveRange() === 'year' && 'active']">本年</view>
      <view @click="setQuickRange('all')" :class="['range-btn', getActiveRange() === 'all' && 'active']">全部</view>
    </view>

    <!-- 按人员统计 -->
    <view class="tab-content">
      <picker mode="date" :value="dateRange.start" @change="onStartDateChange">
        <view class="picker">开始: {{ dateRange.start || '--' }}</view>
      </picker>
      <picker mode="date" :value="dateRange.end" @change="onEndDateChange">
        <view class="picker">结束: {{ dateRange.end || '--' }}</view>
      </picker>

      <!-- 统计汇总 -->
      <view class="stats-result">
        <view class="stat-item">
          <text>发车次数</text>
          <text class="value">{{ workerStats.departureCount }}</text>
        </view>
        <view class="stat-item">
          <text>装车次数</text>
          <text class="value">{{ workerStats.loadingCount }}</text>
        </view>
        <view class="stat-item">
          <text>应结金额</text>
          <text class="value">¥{{ workerStats.totalEarned || 0 }}</text>
        </view>
        <view class="stat-item">
          <text>已结金额</text>
          <text class="value">¥{{ workerStats.settledAmount || 0 }}</text>
        </view>
        <view class="stat-item">
          <text>待结金额</text>
          <text class="value unpaid">¥{{ workerStats.unpaidAmount || 0 }}</text>
        </view>
      </view>

      <!-- 明细列表 -->
      <uni-collapse class="mt-section detail-list-collapse" v-if="personRecordList.length > 0">
        <uni-collapse-item title="明细列表" :open="openPersonRecordList">
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
              <view class="detail-item" v-for="(item, index) in personRecordList" :key="`${item.date}-${index}`">
                <text>{{ item.date }}</text>
                <text>{{ item.info }}</text>
                <text>{{ item.departureFee }}</text>
                <text>{{ item.loadingFee }}</text>
              </view>
              <view class="load-more" v-if="hasMore">
                <text>{{ loadingMore ? '加载中...' : '上拉加载更多' }}</text>
              </view>
              <view class="no-more" v-else-if="personRecordList.length > 0">
                <text>没有更多了</text>
              </view>
            </scroll-view>
          </view>
        </uni-collapse-item>
      </uni-collapse>

    </view>
  </view>
  
</template>

<script setup>
import { ref, reactive, watch, onMounted, onUnmounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { departureApi } from '@/api'
import { useUserStore } from '@/store/user'
import toast from '@/utils/toast'

const userStore = useUserStore()

// 日期范围
const dateRange = reactive({
  start: new Date((new Date()).getFullYear(), (new Date()).getMonth(), 2).toISOString().split('T')[0], // 本月第一天
  end: new Date().toISOString().split('T')[0]
})

const openPersonRecordList = ref(true)
const scrollHeight = ref('400px')
const quickRangeType = ref('month') // 当前激活的快捷范围，默认本月

// 统计数据
const statsLoading = ref(false)
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

// 日历数据
const calendarRecords = ref([])
const recordsLoading = ref(false)
const currentDate = ref('')

// 列表数据（分页）
const personRecordList = ref([])
const currentPage = ref(1)
const pageSize = 20
const hasMore = ref(false)
const loadingMore = ref(false)
const listLoading = ref(false)
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
  statsLoading.value = true
  try {
    const res = await departureApi.getWorkerStats(
      userStore.currentUser.workerId,
      dateRange.start,
      dateRange.end
    )
    if (res.success && res.data) {
      workerStats.value = res.data
    }
  } catch (e) {
    console.error('加载员工统计失败:', e)
    toast.error('加载统计数据失败')
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
  } finally {
    statsLoading.value = false
  }
}

// 加载日历数据
const loadCalendarRecords = async () => {
  if (!userStore.currentUser?.workerId) {
    calendarRecords.value = []
    return
  }
  recordsLoading.value = true
  try {
    const res = await departureApi.getWorkerCalendar(
      userStore.currentUser.workerId,
      dateRange.start,
      dateRange.end
    )
    if (res.success && res.data) {
      calendarRecords.value = (res.data.personRecord || []).map(item => ({
        date: item.date,
        info: item.info
      }))
    }
  } catch (e) {
    console.error('加载日历数据失败:', e)
    toast.error('加载日历数据失败')
    calendarRecords.value = []
  } finally {
    recordsLoading.value = false
  }
}

// 加载列表数据（第一页）
const loadListData = async () => {
  if (!userStore.currentUser?.workerId) {
    personRecordList.value = []
    totalList.value = []
    return
  }
  listLoading.value = true
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
    toast.error('加载列表数据失败')
    personRecordList.value = []
    totalList.value = []
  } finally {
    listLoading.value = false
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
    loadCalendarRecords(),
    loadListData()
  ])
}

// 月份切换
const onMonthSwitch = () => {
  // 月份切换时重新加载日历数据
  loadCalendarRecords()
}

// 日期范围变化
const changeDateRange = () => {
  // 日历选择变化时刷新数据
  refreshData()
}

let reloadTimer = null

onMounted(() => {
  if (userStore.currentUser?.workerId) {
    refreshData()
  }
  // 每分钟刷新一次数据
  reloadTimer = setInterval(() => {
    if (userStore.currentUser?.workerId) {
      refreshData()
    }
  }, 60000)
})

// 页面显示时刷新数据
onShow(() => {
  if (userStore.currentUser?.workerId) {
    refreshData()
  }
})


const onStartDateChange = (e) => {
  dateRange.start = e.detail.value
  quickRangeType.value = ''
}

const onEndDateChange = (e) => {
  dateRange.end = e.detail.value
  quickRangeType.value = ''
}

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
      // 全部范围不传日期，由后端处理
      dateRange.start = ''
      dateRange.end = ''
      break
  }
}

// 获取当前激活的快捷范围
const getActiveRange = () => {
  return quickRangeType.value
}

// 监听日期范围变化
watch(() => [dateRange.start, dateRange.end], () => {
  if (userStore.currentUser?.workerId) {
    currentDate.value = dateRange.start
    refreshData()
  }
}, { deep: true })

// 监听当前用户 workerId 变化
watch(() => userStore.currentUser?.workerId, (newWorkerId) => {
  if (newWorkerId) {
    refreshData()
  }
})

onUnmounted(() => {
  if (reloadTimer) clearInterval(reloadTimer)
})
</script>

<style scoped>
.statistics-page { padding: 20px; }
.quick-range { display: flex; gap: 8px; margin-bottom: 15px; flex-wrap: wrap; }
.range-btn { flex: 1; text-align: center; padding: 8px 0; background: #fff; border-radius: 4px; font-size: 14px; border: 1px solid #ddd; }
.range-btn.active { background: #007aff; color: #fff; border-color: #007aff; }
.tab-content { display: flex; flex-direction: column; gap: 10px; }
.picker { background: #fff; padding: 12px; border-radius: 4px; }
.stats-result { background: #fff; padding: 15px; border-radius: 8px; margin-top: 10px;}
.stat-item { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #f0f0f0; }
.stat-item:last-child { border-bottom: none; }
.value { font-weight: bold; color: #007aff; }
.profit { color: #52c41a; }

.detail-list-collapse{
  margin-top: 15px;
}
.detail-list-collapse .uni-collapse {
  border-radius: 4px;
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
