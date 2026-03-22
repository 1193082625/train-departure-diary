<template>
  <!-- 结账统计页面 -->
  <view class="statistics-page">
    <!-- 管理员中间商选择器 -->
    <middleman-selector />

    <view class="tabs">
      <view :class="['tab', activeTab === 'worker' && 'active']" @click="activeTab = 'worker'">按人员</view>
      <view :class="['tab', activeTab === 'merchant' && 'active']" @click="activeTab = 'merchant'">按鸡场</view>
    </view>

    <!-- 快捷日期范围选择 -->
    <view class="quick-range">
      <view @click="setQuickRange('today')" :class="['range-btn', dateRange.start === dateRange.end && dateRange.start === new Date().toISOString().split('T')[0] && 'active']">今天</view>
      <view @click="setQuickRange('month')" class="range-btn">本月</view>
      <view @click="setQuickRange('lastMonth')" class="range-btn">上月</view>
      <view @click="setQuickRange('year')" class="range-btn">本年</view>
      <view @click="setQuickRange('all')" class="range-btn">全部</view>
    </view>

    <!-- 按人员统计 -->
    <view v-if="activeTab === 'worker'" class="tab-content">
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

    <!-- 按鸡场统计 -->
    <view v-if="activeTab === 'merchant'" class="tab-content">
      <picker :range="merchantOptions" :range-key="'name'" @change="onMerchantChange">
        <view class="picker">{{ selectedMerchant?.name || '选择鸡场' }}</view>
      </picker>

      <picker mode="date" :value="dateRange.start" @change="onStartDateChange">
        <view class="picker">开始: {{ dateRange.start }}</view>
      </picker>
      <picker mode="date" :value="dateRange.end" @change="onEndDateChange">
        <view class="picker">结束: {{ dateRange.end }}</view>
      </picker>

      <!-- 明细列表 -->
      <uni-collapse class="mt-section detail-list-collapse" v-if="merchantRecordList.length > 0">
        <uni-collapse-item title="明细列表" :open="openMerchantRecordList">
          <view class="detail-list">
            <view class="detail-header">
              <text>日期</text>
              <text>报价</text>
              <text>大框</text>
              <text>小框</text>
              <text>斤数</text>
              <text>应结</text>
            </view>
            <view class="detail-item" v-for="item in merchantRecordList" :key="item.date">
              <text>{{ item.date }}</text>
              <text>{{ item.dailyQuote }}</text>
              <text>{{ item.bigBoxes }}</text>
              <text>{{ item.smallBoxes }}</text>
              <text>{{ item.weight }}</text>
              <text>{{ item.receivable }}</text>
            </view>
          </view>
        </uni-collapse-item>
      </uni-collapse>

      <view class="stats-result">
        <view class="stat-item">
          <text>共拉大框</text>
          <text class="value">{{ merchantStats.totalBigBoxes }}</text>
        </view>
        <view class="stat-item">
          <text>共拉小框</text>
          <text class="value">{{ merchantStats.totalSmallBoxes }}</text>
        </view>
        <view class="stat-item">
          <text>共拉斤数</text>
          <text class="value">{{ merchantStats.totalWeight }}</text>
        </view>
        <view class="stat-item">
          <text>应结金额</text>
          <text class="value">¥{{ merchantStats.receivable }}</text>
        </view>
        <view class="stat-item">
          <text>已结金额</text>
          <text class="value">¥{{ merchantStats.paid }}</text>
        </view>
        <view class="stat-item">
          <text>待结金额</text>
          <text class="value unpaid">¥{{ merchantStats.unpaid }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, reactive, watch, watchEffect, nextTick } from 'vue'
import { onShow, onHide } from '@dcloudio/uni-app'
import { useWorkerStore } from '@/store/worker'
import { useMerchantStore } from '@/store/merchant'
import { useDepartureStore } from '@/store/departure'
import { useTransactionStore } from '@/store/transaction'
import { useSettingsStore } from '@/store/settings'
import { subscribe } from '@/utils/eventBus'
import MiddlemanSelector from '@/components/middleman-selector.vue'

const workerStore = useWorkerStore()
const merchantStore = useMerchantStore()
const departureStore = useDepartureStore()
const transactionStore = useTransactionStore()
const settingsStore = useSettingsStore()

let unsubscribers = []

onShow(() => {
  unsubscribers.push(subscribe('departure:refresh', () => {
    departureStore.loadRecords()
  }))
  unsubscribers.push(subscribe('worker:refresh', () => {
    workerStore.loadWorkers()
  }))
  unsubscribers.push(subscribe('merchant:refresh', () => {
    merchantStore.loadMerchants()
  }))
  unsubscribers.push(subscribe('transaction:refresh', () => {
    transactionStore.loadTransactions()
  }))
})

onHide(() => {
  unsubscribers.forEach(fn => fn())
  unsubscribers = []
})

const activeTab = ref('worker')
const selectedWorkerId = ref('')
const selectedMerchantId = ref('')
const dateRange = reactive({
  start: new Date(new Date().setDate(1)).toISOString().split('T')[0], // 本月第一天
  end: new Date().toISOString().split('T')[0]
})

const personRecord = ref([])
const merchantRecord = ref([])

// 人员明细列表
const openPersonRecordList = ref(true)
const personRecordList = ref([])

// 鸡场明细列表
const openMerchantRecordList = ref(true)
const merchantRecordList = ref([])

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

// 更新出勤记录的函数
const updatePersonRecord = () => {
  if (!selectedWorkerId.value) {
    personRecord.value = []
    return
  }
  const records = departureStore.getRecordsByDateRange(dateRange.start, dateRange.end)
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
    personRecordList.value = personRecord.value
    openPersonRecordList.value = true
  })
}

// 更新鸡场记录的函数
const updateMerchantRecord = () => {
  if (!selectedMerchantId.value) {
    merchantRecord.value = []
    merchantRecordList.value = []
    return
  }
  const records = departureStore.getRecordsByDateRange(dateRange.start, dateRange.end)
  const workDates = records
    .filter(r => r.merchantDetails.some(m => m.merchantId === selectedMerchantId.value))

  // 日历记录
  merchantRecord.value = [...new Set(workDates)].map(r => ({
    date: r.date,
    info: '有生意'
  }))
}

// 监听选择人员变化，更新出勤记录
watch(selectedWorkerId, () => {
  updatePersonRecord()
})

// 监听选择鸡场变化，更新有生意记录
watch(selectedMerchantId, () => {
  updateMerchantRecord()
})

// 监听日期范围变化，更新记录
watch(() => [dateRange.start, dateRange.end], () => {
  updatePersonRecord()
  updateMerchantRecord()
})

const workerOptions = computed(() => workerStore.filteredWorkers)
const merchantOptions = computed(() => merchantStore.filteredMerchants)

const selectedWorker = computed(() => workerStore.getWorkerById(selectedWorkerId.value))
const selectedMerchant = computed(() => merchantStore.getMerchantById(selectedMerchantId.value))

const onWorkerChange = (e) => { selectedWorkerId.value = workerOptions.value[e.detail.value]?.id || '' }
const onMerchantChange = (e) => { selectedMerchantId.value = merchantOptions.value[e.detail.value]?.id || '' }
const onStartDateChange = (e) => { dateRange.start = e.detail.value }
const onEndDateChange = (e) => { dateRange.end = e.detail.value }

const clearWorkerStats = () => {}
const changeDateRange = () => {

}

const workerStats = computed(() => {
  if (!selectedWorkerId.value) return { workDays: 0, departureCount: 0, loadingCount: 0, totalProfit: 0 }

  const records = departureStore.getRecordsByDateRange(dateRange.start, dateRange.end)

  const workderRecords = records.filter(r => r.departureWorkerId === selectedWorkerId.value || r.loadingWorkerIds.includes(selectedWorkerId.value))

  const workDays = new Set(workderRecords.map(r => r.date)).size
  // 发车次数
  const departureCount = workderRecords.filter(r => r.departureWorkerId === selectedWorkerId.value).length
  // 装车次数
  const loadingCount = workderRecords.filter(r => r.loadingWorkerIds.includes(selectedWorkerId.value)).length
  // 应结算(装车费默认按两人分摊)
  const totalProfit = departureCount * (settingsStore.departureFee || 0) + loadingCount * (settingsStore.loadingFee / 2 || 0)

  return { workDays, departureCount, loadingCount, totalProfit: totalProfit.toFixed(2) }
})

const merchantStats = ref({ totalBigBoxes: 0, totalSmallBoxes: 0, receivable: 0, paid: 0, unpaid: 0 })

watchEffect(() => {
  if (!selectedMerchantId.value) return { totalBigBoxes: 0, totalSmallBoxes: 0, receivable: 0, paid: 0, unpaid: 0 }

  const records = departureStore.getRecordsByDateRange(dateRange.start, dateRange.end)

  const merchantRecords = records.filter(r => r.merchantDetails.some(m => m.merchantId === selectedMerchantId.value))

  let totalBigBoxes = 0, totalSmallBoxes = 0, totalWeight = 0, receivable = 0

  let recordList = []
  merchantRecordList.value = []
  openMerchantRecordList.value = false

  merchantRecords.forEach(r => {
    // 获取鸡场信息
    const merchant = merchantStore.getMerchantById(selectedMerchantId.value)
    if (merchant) {
      const detail = r.merchantDetails.find(m => m.merchantId === selectedMerchantId.value)
      const bigBoxes = detail?.bigBoxes || 0
      const smallBoxes = detail?.smallBoxes || 0
      const weight = detail?.weight || 0

      totalBigBoxes += bigBoxes
      totalSmallBoxes += smallBoxes
      totalWeight += weight

      const bigWeight = settingsStore.receiptBigBoxWeight || 45
      const deliveryBigWeight = settingsStore.deliveryBigBoxWeight || 44
      const smallWeight = settingsStore.smallBoxWeight || 29.5

      // 计算每斤价格
      const price = (r.dailyQuote - merchant.margin) / (settingsStore.bigBoxWeight || 45)
      // 计算应结算
      receivable += price * (bigWeight * bigBoxes + smallWeight * smallBoxes + weight)

      recordList.push({
        date: r.date,
        bigBoxes: bigBoxes,
        smallBoxes: smallBoxes,
        weight: weight,
        dailyQuote: r.dailyQuote,
        receivable: receivable.toFixed(2)
      })
    }
  })
  nextTick(() => {
    merchantRecordList.value = recordList
    openMerchantRecordList.value = true
  })

  // 交易记录
  const transactions = transactionStore.getTransactionsByTarget(selectedMerchantId.value)
  // 已结金额
  const paid = transactions.reduce((sum, t) => sum + t.amount, 0)

  merchantStats.value = {
    totalBigBoxes,
    totalSmallBoxes,
    totalWeight,
    receivable: receivable.toFixed(2),
    paid: paid.toFixed(2),
    unpaid: (receivable - paid).toFixed(2)
  }
})

</script>
<style>
.uni-calendar-item__weeks-box-item {
  width: 100%!important;
}
</style>
<style scoped>
.statistics-page { padding: 20px; }
.tabs { display: flex; gap: 10px; background: #f5f5f5; border-radius: 8px; margin-bottom: 20px; }
.tab { flex: 1; text-align: center; padding: 10px; border-radius: 8px; background: #fff;}
.tab.active { background: #007aff; color: #fff; }
.quick-range { display: flex; gap: 8px; margin-bottom: 15px; flex-wrap: wrap; }
.range-btn { padding: 8px 12px; background: #fff; border-radius: 4px; font-size: 14px; border: 1px solid #ddd; }
.range-btn.active { background: #007aff; color: #fff; border-color: #007aff; }
.tab-content { display: flex; flex-direction: column; gap: 10px; }
.picker { background: #fff; padding: 12px; border-radius: 4px; }
.stats-result { background: #fff; padding: 15px; border-radius: 8px; margin-top: 15px; }
.stat-item { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #f0f0f0; }
.stat-item:last-child { border-bottom: none; }
.value { font-weight: bold; color: #007aff; }
.profit { color: #52c41a; }
.unpaid { color: #ff4d4f; }

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
