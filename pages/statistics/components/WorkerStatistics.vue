<template>
  <!-- 按人员统计 -->
  <view class="tab-content">
    <picker :range="workerOptions" :range-key="'name'" @change="onWorkerChange">
      <view class="picker">{{ selectedWorker?.name || '选择人员' }}</view>
    </picker>

    <picker mode="date" :value="dateRange.start" @change="onStartDateChange">
      <view class="picker">开始: {{ dateRange.start }}</view>
    </picker>
    <picker mode="date" :value="dateRange.end" @change="onEndDateChange">
      <view class="picker">结束: {{ dateRange.end }}</view>
    </picker>

    <uni-calendar
    	:insert="true"
		:start-date="dateRange.start"
		:end-date="dateRange.end"
		:clear-date="true"
		:show-month="false"
		:selected="personRecord"
	  	@change="changeDateRange"
		@monthSwitch="clearWorkerStats"
	  	 />

     <!-- 明细列表 -->
     <uni-collapse class="mt-section detail-list-collapse" v-if="personRecordList.length > 0">
      <uni-collapse-item title="明细列表" :open="openPersonRecordList">
        <view class="detail-list">
          <view class="detail-header">
            <text>日期</text>
            <text>信息</text>
          </view>
          <view class="detail-item" v-for="item in personRecordList" :key="item.date">
            <text>{{ item.date }}</text>
            <text>{{ item.info }}</text>
          </view>
        </view>
      </uni-collapse-item>
     </uni-collapse>

    <view class="stats-result">
      <view class="stat-item">
        <text>出勤天数</text>
        <text class="value">{{ workerStats.workDays }}</text>
      </view>
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
        <text class="value profit">¥{{ workerStats.totalProfit }}</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted } from 'vue'
import { useDepartureStore } from '@/store/departure'
import { useSettingsStore } from '@/store/settings'
import { useUserStore, ROLES } from '@/store/user'
import { apiOps } from '@/utils/api'

const props = defineProps({
  dateRange: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['update:dateRange'])

const departureStore = useDepartureStore()
const settingsStore = useSettingsStore()
const userStore = useUserStore()

const allWorkers = ref([])
const selectedWorkerId = ref('')
const personRecord = ref([])
const openPersonRecordList = ref(true)
const personRecordList = ref([])

const loadWorkers = async () => {
  try {
    const res = await apiOps.queryAll('workers')
    allWorkers.value = res.data || []
  } catch (e) {
    console.error('加载员工列表失败:', e)
    allWorkers.value = []
  }
}

// 根据用户角色过滤员工
const filteredWorkers = computed(() => {
  const user = userStore.currentUser
  if (!user) return []

  if (user.role === ROLES.ADMIN) {
    return allWorkers.value
  }

  if (user.role === ROLES.MIDDLEMAN) {
    return allWorkers.value.filter(w => w.userId === user.id)
  }

  if (user.parentId) {
    return allWorkers.value.filter(w => w.userId === user.parentId)
  }

  return []
})

const workerOptions = computed(() => filteredWorkers.value)
const selectedWorker = computed(() => allWorkers.value.find(w => w.id === selectedWorkerId.value))

onMounted(() => {
  loadWorkers()
})

const onWorkerChange = (e) => {
  selectedWorkerId.value = workerOptions.value[e.detail.value]?.id || ''
}

const onStartDateChange = (e) => {
  emit('update:dateRange', { ...props.dateRange, start: e.detail.value })
}

const onEndDateChange = (e) => {
  emit('update:dateRange', { ...props.dateRange, end: e.detail.value })
}

const clearWorkerStats = () => {}

const changeDateRange = () => {}

// 更新出勤记录的函数
const updatePersonRecord = () => {
  if (!selectedWorkerId.value) {
    personRecord.value = []
    return
  }
  const records = departureStore.getRecordsByDateRange(props.dateRange.start, props.dateRange.end)
  const workDates = records
    .filter(r => r.departureWorkerId === selectedWorkerId.value || r.loadingWorkerIds.includes(selectedWorkerId.value))

  personRecord.value = [...new Set(workDates)].map(r => {
    const label = []
    if(r.departureWorkerId === selectedWorkerId.value) {
      label.push('发')
    }
    if(r.loadingWorkerIds.includes(selectedWorkerId.value)) {
      label.push('装')
    }
    return {
      date: r.date,
      info: label.join('+')
    }
  })

  nextTick(() => {
    personRecordList.value = personRecord.value.sort((a, b) => b.date.localeCompare(a.date))
    openPersonRecordList.value = true
  })
}

// 监听选择人员变化，更新出勤记录
watch(selectedWorkerId, () => {
  updatePersonRecord()
})

// 监听日期范围变化，更新记录
watch(() => [props.dateRange.start, props.dateRange.end], () => {
  updatePersonRecord()
}, { deep: true })

const workerStats = computed(() => {
  if (!selectedWorkerId.value) return { workDays: 0, departureCount: 0, loadingCount: 0, totalProfit: 0 }

  const records = departureStore.getRecordsByDateRange(props.dateRange.start, props.dateRange.end)

  const workderRecords = records.filter(r => r.departureWorkerId === selectedWorkerId.value || r.loadingWorkerIds.includes(selectedWorkerId.value))

  const workDays = new Set(workderRecords.map(r => r.date)).size
  // 发车次数
  const departureCount = workderRecords.filter(r => r.departureWorkerId === selectedWorkerId.value).length
  // 装车次数
  const loadingCount = workderRecords.filter(r => r.loadingWorkerIds.includes(selectedWorkerId.value)).length
  // 应结算
  let totalloadingCount = 0;
  records.forEach(record => {
    if(record.loadingWorkerIds.includes(selectedWorkerId.value)) {
      totalloadingCount += Number(settingsStore.loadingFee || 0) / record.loadingWorkerIds.length
    }
  })
  const totalProfit = departureCount * (settingsStore.departureFee || 0) + totalloadingCount

  return { workDays, departureCount, loadingCount, totalProfit: totalProfit.toFixed(2) }
})
</script>

<style scoped>
.tab-content { display: flex; flex-direction: column; gap: 10px; }
.picker { background: #fff; padding: 12px; border-radius: 4px; }
.stats-result { background: #fff; padding: 15px; border-radius: 8px; margin-top: 15px; }
.stat-item { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #f0f0f0; }
.stat-item:last-child { border-bottom: none; }
.value { font-weight: bold; color: #007aff; }
.profit { color: #52c41a; }

.detail-list-collapse .uni-collapse {
  border-radius: 4px;
}
.detail-list { background: #fff; padding: 0 15px 15px; }
.detail-title { font-size: 16px; font-weight: bold; margin-bottom: 10px; }
.detail-header { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #f0f0f0; }
.detail-header text { flex: 1; text-align: center; }
.detail-item { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #f0f0f0; }
.detail-item text { flex: 1; text-align: center; }
.detail-item:last-child { border-bottom: none; }
</style>
