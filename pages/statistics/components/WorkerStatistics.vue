<template>
  <!-- 按人员统计 -->
  <view class="tab-content">
    <picker :range="workerOptions" :range-key="'name'" :disabled="workersLoading" @change="onWorkerChange">
      <view class="picker">{{ workersLoading ? '加载中...' : (selectedWorker?.name || '选择人员') }}</view>
    </picker>

    <picker mode="date" :value="dateRange.start" @change="onStartDateChange">
      <view class="picker">开始: {{ dateRange.start || '--' }}</view>
    </picker>
    <picker mode="date" :value="dateRange.end" @change="onEndDateChange">
      <view class="picker">结束: {{ dateRange.end || '--' }}</view>
    </picker>

    <view class="empty-content" v-if="!selectedWorker">
      <text class="tips">选择人员后查看数据</text>
    </view>
    <template v-else>

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
              <view class="detail-item" v-for="(item, index) in personRecordList" :key="`${item.date}-${index}`" @click="goToDetail(item)">
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

    </template>
  </view>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { departureApi, apiOps } from '@/api'
import { useUserStore, ROLES } from '@/store/user'
import toast from '@/utils/toast'

const props = defineProps({
  dateRange: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['update:dateRange'])

const userStore = useUserStore()

const allWorkers = ref([])
const workersLoading = ref(false)
const selectedWorkerId = ref('')
const openPersonRecordList = ref(true)

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
const totalList = ref([]) // 完整列表数据

const loadWorkers = async () => {
  workersLoading.value = true
  try {
    const res = await apiOps.queryAll('workers')
    allWorkers.value = res.data || []
  } catch (e) {
    console.error('加载员工列表失败:', e)
    allWorkers.value = []
  } finally {
    workersLoading.value = false
  }
}

// 加载统计数据
const statsLoading = ref(false)
const loadWorkerStats = async () => {
  if (!selectedWorkerId.value) {
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
      selectedWorkerId.value,
      props.dateRange.start,
      props.dateRange.end
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
  if (!selectedWorkerId.value) {
    calendarRecords.value = []
    return
  }
  recordsLoading.value = true
  try {
    const res = await departureApi.getWorkerCalendar(
      selectedWorkerId.value,
      props.dateRange.start,
      props.dateRange.end
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
  if (!selectedWorkerId.value) {
    personRecordList.value = []
    totalList.value = []
    return
  }
  try {
    const res = await departureApi.getWorkerList(
      selectedWorkerId.value,
      props.dateRange.start,
      props.dateRange.end,
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
      selectedWorkerId.value,
      props.dateRange.start,
      props.dateRange.end,
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

onMounted(() => {
  loadWorkers()
})

const workerOptions = computed(() => allWorkers.value)
const selectedWorker = computed(() => allWorkers.value.find(w => w.id === selectedWorkerId.value))

const onWorkerChange = (e) => {
  selectedWorkerId.value = workerOptions.value[e.detail.value]?.id || ''
}

const onStartDateChange = (e) => {
  emit('update:dateRange', { ...props.dateRange, start: e.detail.value })
}

const onEndDateChange = (e) => {
  emit('update:dateRange', { ...props.dateRange, end: e.detail.value })
}

// 跳转详情
const goToDetail = (item) => {
  if (item.id) {
    uni.navigateTo({ url: `/pages/departure/form?id=${item.id}` })
  }
}

// 监听选择人员变化
watch(selectedWorkerId, () => {
  if (selectedWorkerId.value) {
    refreshData()
  }
})

// 监听日期范围变化
watch(() => [props.dateRange.start, props.dateRange.end], () => {
  if (selectedWorkerId.value) {
    currentDate.value = props.dateRange.start
    refreshData()
  }
}, { deep: true })
</script>

<style scoped>
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
