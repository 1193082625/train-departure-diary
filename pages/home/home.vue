<template>
  <view class="home-page">
    <!-- 快捷操作 -->
    <view class="stats-cards">
      <view class="action-btn" @click="openSettingsPopup">
        <text class="icon">⚙️</text>
        <text>参数设置</text>
      </view>
      <view class="action-btn" @click="goToDeparture">
        <text class="icon">🚚</text>
        <text>发车记录</text>
      </view>
      <view class="action-btn" @click="goToMerchant" v-if="userStore.isAdmin || userStore.isMiddleman">
        <text class="icon">🐔</text>
        <text>鸡场管理</text>
      </view>
      <view class="action-btn" @click="goToWorker" v-if="userStore.isAdmin || userStore.isMiddleman">
        <text class="icon">👤</text>
        <text>管理人员</text>
      </view>
    </view>

    <!-- Tab 切换 -->
    <view class="quote-tabs" v-if="userStore.isAdmin || userStore.isMiddleman">
      <view :class="['tab', activeTab === 'calendar' && 'active']" @click="activeTab = 'calendar'">报价日历</view>
      <view :class="['tab', activeTab === 'chart' && 'active']" @click="activeTab = 'chart'">报价统计</view>
    </view>

    <!-- Tab1: 报价日历 -->
    <view v-if="activeTab === 'calendar'" class="tab-content">
      <uni-calendar
        :selected="calendarSelected"
        :start-date="calendarStart"
        :end-date="calendarEnd"
        :show-month="true"
        @change="onCalendarChange"
      />

    </view>

    <!-- Tab2: 报价统计折线图 -->
    <view v-if="activeTab === 'chart'" class="tab-content">
      <!-- 时间范围切换 -->
      <view class="chart-range">
        <view @click="chartRange = 'week'" :class="['range-btn', chartRange === 'week' && 'active']">周</view>
        <view @click="chartRange = 'month'" :class="['range-btn', chartRange === 'month' && 'active']">月</view>
        <view @click="chartRange = 'year'" :class="['range-btn', chartRange === 'year' && 'active']">年</view>
      </view>

      <!-- uCharts 渐变色曲线区域图 -->
      <view class="chart-container">
        <view v-if="chartData && chartData.series && chartData.series.length > 0" class="chart-wrapper">
          <!-- 图表 -->
          <qiun-data-charts
            type="area"
            canvasId="quoteChart"
            :chartData="chartData"
            :opts="chartOpts"
            :width="chartWidth"
            :height="chartHeight"
          />
        </view>
        <view v-else class="no-data">
          <text>暂无数据</text>
        </view>
      </view>
    </view>

    <view class="recent-records">
      <view class="section-title-wrapper">
        <text class="section-title">今日记录</text>
        <view class="section-title-value-wrapper">
          <text class="section-title-value" v-if="todayStats.count > 0">共{{ todayStats.count }}次</text>
          <image v-if="userStore.isAdmin || userStore.isMiddleman || userStore.isLoader" @click="goToDepartureForm" class="section-title-icon" src="/static/svg/add.svg" mode="aspectFit"></image>
        </view>
      </view>
      <view v-for="record in todayRecords" :key="record.id" class="record-item" @click="editRecord(record)">
        <view class="record-info">
          <text>{{ record.merchantDetails.map(m => m.merchantName).join(', ') || '未选择鸡场' }}</text>
          <text class="record-profit" v-if="record.getMoney">盈利: ¥{{ record.getMoney.toFixed(2) }}</text>
        </view>
      </view>
      <view v-if="todayRecords.length === 0" class="empty">暂无记录</view>
    </view>

    <!-- 填写报价弹窗 -->
    <uni-popup ref="quotePopup" type="bottom">
      <view class="quote-popup">
        <view class="popup-header">
          <text class="popup-title">{{ popupDate }} 报价</text>
          <text class="popup-close" @click="quotePopup.close()">×</text>
        </view>
        <view class="popup-content">
          <view v-if="popupHasRecordQuote" class="record-quote-tip">
            当日发车记录报价: ¥{{ popupRecordQuote }}
          </view>
          <view class="form-item">
            <text>报价金额</text>
            <input v-model="quoteInput" type="digit" placeholder="请输入报价（元/框）" />
          </view>
        </view>
        <button @click="saveQuote" class="save-btn">保存</button>
      </view>
    </uni-popup>

    <!-- 参数设置弹窗 -->
    <uni-popup ref="settingsPopup" type="bottom" @change="popupChange">
      <view class="settings-popup">
        <view class="popup-header">
          <text class="popup-title">参数设置</text>
          <text class="popup-close" @click="settingsPopup.close()">×</text>
        </view>
        <view class="popup-content">
          <uni-collapse accordion  v-model="collapseValue">
            <uni-collapse-item title="斤数设置（斤）">
              <view class="settings-group">
                <view class="form-item">
                  <text>收货大框斤数</text>
                  <input v-model="settingsForm.receiptBigBoxWeight" type="digit" placeholder="请输入" />
                </view>
                <view class="form-item">
                  <text>交货大框斤数</text>
                  <input v-model="settingsForm.deliveryBigBoxWeight" type="digit" placeholder="请输入" />
                </view>
                <view class="form-item">
                  <text>默认小框斤数</text>
                  <input v-model="settingsForm.smallBoxWeight" type="digit" placeholder="请输入" />
                </view>
                <view class="form-item">
                  <text>默认大箱斤数</text>
                  <input v-model="settingsForm.depotCartonBoxesBig" type="digit" placeholder="请输入" />
                </view>
                <view class="form-item">
                  <text>默认小箱斤数</text>
                  <input v-model="settingsForm.depotCartonBoxesSmall" type="digit" placeholder="请输入" />
                </view>
              </view>
            </uni-collapse-item>
            <uni-collapse-item title="费用设置（元）">
              <view class="settings-group">
                <view class="form-item">
                  <text>装车费</text>
                  <input v-model="settingsForm.loadingFee" type="digit" placeholder="请输入" />
                </view>
                <view class="form-item">
                  <text>卸车费</text>
                  <input v-model="settingsForm.unloadingFee" type="digit" placeholder="请输入" />
                </view>
                <view class="form-item">
                  <text>发车费</text>
                  <input v-model="settingsForm.departureFee" type="digit" placeholder="请输入" />
                </view>
                <view class="form-item">
                  <text>过路费</text>
                  <input v-model="settingsForm.tollFee" type="digit" placeholder="请输入" />
                </view>
                <view class="form-item">
                  <text>进门费</text>
                  <input v-model="settingsForm.entryFee" type="digit" placeholder="请输入" />
                </view>
                <view class="form-item">
                  <text>油费</text>
                  <input v-model="settingsForm.oilFee" type="digit" placeholder="请输入" />
                </view>
              </view>
            </uni-collapse-item>
          </uni-collapse>
        </view>
        <button @click="saveSettings" class="save-btn">保存设置</button>
      </view>
    </uni-popup>
  </view>
</template>

<script setup>
import { ref, computed, reactive, onMounted, watch, nextTick } from 'vue'
import { useDepartureStore } from '@/store/departure'
import { useSettingsStore } from '@/store/settings'
import { useUserStore } from '@/store/user'

const departureStore = useDepartureStore()
const settingsStore = useSettingsStore()
const userStore = useUserStore()

// Tab 状态
const activeTab = ref('calendar')

// 日历相关
const calendarSelected = ref([])
const calendarStart = ref('')
const calendarEnd = ref('')
const selectedDateQuote = ref(null)
const quotePopup = ref(null)
const popupDate = ref('')
const popupHasRecordQuote = ref(false)
const popupRecordQuote = ref(0)
const quoteInput = ref(null)

const goToDeparture = () => uni.navigateTo({ url: '/pages/departure/departure' })
const goToMerchant = () => uni.navigateTo({ url: '/pages/merchant/merchant' })
const goToWorker = () => uni.navigateTo({ url: '/pages/worker/worker' })
const goToDepartureForm = () => uni.navigateTo({ url: '/pages/departure/form' })


const editRecord = (record) => {
  uni.navigateTo({ url: `/pages/departure/form?id=${record.id}` })
}

// 获取日历的开始和结束日期
const initCalendarRange = () => {
  const today = new Date()
  const year = today.getFullYear()
  // 从年初开始
  calendarStart.value = `${year}-01-01`
  // 到年底
  calendarEnd.value = `${year}-12-31`
}

// 获取所有报价数据（从发车记录和本地存储）
const getAllQuotes = () => {
  const quotes = {}

  // 从发车记录中提取报价
  departureStore.records.forEach(record => {
    if (record.date && record.dailyQuote) {
      if (!quotes[record.date] || quotes[record.date].source === 'manual') {
        quotes[record.date] = {
          date: record.date,
          quote: record.dailyQuote,
          source: 'record'
        }
      }
    }
  })

  // 从本地存储中获取手动填写的报价
  const manualQuotes = uni.getStorageSync('dailyQuotes') || {}
  Object.keys(manualQuotes).forEach(date => {
    if (!quotes[date]) {
      quotes[date] = {
        date: date,
        quote: manualQuotes[date],
        source: 'manual'
      }
    }
  })

  return quotes
}

// 更新日历选中状态
const updateCalendarSelected = () => {
  const quotes = getAllQuotes()
  const selected = Object.values(quotes).map(q => ({
    date: q.date,
    info: `¥${q.quote}`,
    color: q.source === 'record' ? '#52c41a' : '#1890ff'
  }))
  calendarSelected.value = selected
}

// 日历日期点击事件
const onCalendarChange = (e) => {
  const date = e.fulldate
  popupDate.value = date

  // 检查当日是否有发车记录报价
  const records = departureStore.getRecordsByDate(date)
  const recordQuote = records.find(r => r.dailyQuote)?.dailyQuote

  if (recordQuote) {
    popupHasRecordQuote.value = true
    popupRecordQuote.value = recordQuote
  } else {
    popupHasRecordQuote.value = false
    popupRecordQuote.value = 0
  }

  // 获取当日报价（优先显示本地存储的，如果没有则显示记录中的）
  const manualQuotes = uni.getStorageSync('dailyQuotes') || {}
  const manualQuote = manualQuotes[date]

  if (manualQuote !== undefined) {
    quoteInput.value = manualQuote
    selectedDateQuote.value = {
      date: date,
      quote: manualQuote,
      source: 'manual'
    }
  } else if (recordQuote) {
    quoteInput.value = recordQuote
    selectedDateQuote.value = {
      date: date,
      quote: recordQuote,
      source: 'record'
    }
  } else {
    quoteInput.value = null
    selectedDateQuote.value = null
  }

  // 如果当日无报价，弹出填写窗口
  if (!selectedDateQuote.value) {
    quotePopup.value.open('center')
  }
}

// 保存报价
const saveQuote = () => {
  if (!quoteInput.value || quoteInput.value <= 0) {
    uni.showToast({ title: '请输入有效报价', icon: 'none' })
    return
  }

  // 保存到本地存储
  const manualQuotes = uni.getStorageSync('dailyQuotes') || {}
  manualQuotes[popupDate.value] = quoteInput.value
  uni.setStorageSync('dailyQuotes', manualQuotes)

  uni.showToast({ title: '报价已保存', icon: 'success' })
  quotePopup.value.close()

  // 更新日历显示
  updateCalendarSelected()

  // 更新当前显示
  selectedDateQuote.value = {
    date: popupDate.value,
    quote: quoteInput.value,
    source: 'manual'
  }
}

// 折线图相关
const chartRange = ref('month')
const chartPoints = ref([])
const chartWidth = ref(320)
const chartHeight = ref(220)

// 图表配置（适配 uCharts 格式）
const chartOpts = ref({
  color: ["#FF9500", "#52C41A"],
  padding: [15, 15, 0, 15],
  enableScroll: false,
  legend: {},
  xAxis: { disableGrid: true },
  yAxis: { gridType: "dash", dashLength: 2 },
  extra: {
    area: {
      type: "curve",
      opacity: 0.3,
      addLine: true,
      gradient: true
    }
  }
})

// 图表数据（uCharts格式）
const chartData = ref({
  categories: [],
  series: [
    {
      name: '报价',
      color: '#FF9500',
      data: [],
      areaStyle: true
    },
    {
      name: '盈利',
      color: '#52C41A',
      data: [],
      areaStyle: false
    }
  ]
})

// 计算图表Y轴范围
const chartValues = computed(() => {
  if (chartPoints.value.length === 0) return { min: 0, max: 100, avg: 50 }
  const values = chartPoints.value.map(p => p.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const avg = values.reduce((a, b) => a + b, 0) / values.length
  return {
    min: min * 0.9,
    max: max * 1.1,
    avg
  }
})

const minChartValue = computed(() => chartValues.value.min)
const maxChartValue = computed(() => chartValues.value.max)
const avgChartValue = computed(() => chartValues.value.avg)

// 获取指定时间范围的报价和盈利数据
const getChartData = () => {
  const today = new Date()
  let startDate = ''
  let endDate = today.toISOString().split('T')[0]

  // 计算起始日期
  const year = today.getFullYear()
  const month = today.getMonth()

  switch (chartRange.value) {
    case 'week':
      // 最近7天
      const weekStart = new Date(today)
      weekStart.setDate(today.getDate() - 6)
      startDate = weekStart.toISOString().split('T')[0]
      break
    case 'month':
      // 本月
      startDate = new Date(year, month, 1).toISOString().split('T')[0]
      break
    case 'year':
      // 本年
      startDate = `${year}-01-01`
      break
  }

  // 获取日期范围内的报价
  const quotes = getAllQuotes()
  const dateData = []

  // 生成日期范围内的所有日期
  const currentDate = new Date(startDate)
  const end = new Date(endDate)

  while (currentDate <= end) {
    const dateStr = currentDate.toISOString().split('T')[0]
    const quoteInfo = quotes[dateStr]

    // 获取当日的盈利（从发车记录中获取）
    const records = departureStore.getRecordsByDate(dateStr)
    let profit = 0
    if (records && records.length > 0) {
      // 计算当日总盈利
      profit = records.reduce((sum, r) => sum + parseFloat(r.getMoney || 0), 0)
    }

    if (quoteInfo) {
      dateData.push({
        date: dateStr,
        quote: quoteInfo.quote,
        profit: profit
      })
    } else if (profit !== 0) {
      // 即使没有报价，只要有盈利也显示
      dateData.push({
        date: dateStr,
        quote: null,
        profit: profit
      })
    }
    currentDate.setDate(currentDate.getDate() + 1)
  }

  return dateData
}

// 更新图表数据（uCharts格式）
const updateChartData = () => {
  const data = getChartData()

  if (data.length === 0) {
    chartData.value = {
      categories: [],
      series: [
        { name: '报价', color: '#FF9500', data: [], areaStyle: true },
        { name: '盈利', color: '#52C41A', data: [], areaStyle: false }
      ]
    }
    chartPoints.value = []
    return
  }

  // 更新 chartData
  const categories = data.map(d => {
    const date = new Date(d.date)
    if (chartRange.value === 'year') {
      return `${date.getMonth() + 1}月`
    }
    return `${date.getMonth() + 1}/${date.getDate()}`
  })

  const quoteData = data.map(d => d.quote)
  const profitData = data.map(d => d.profit)

  chartData.value = {
    categories,
    series: [
      {
        name: '报价',
        color: '#FF9500',
        data: quoteData,
        areaStyle: true
      },
      {
        name: '盈利',
        color: '#52C41A',
        data: profitData,
        areaStyle: false
      }
    ]
  }

  // 同时更新旧的 chartPoints 以保持兼容性
  const values = data.map(d => d.quote).filter(v => v !== null)
  if (values.length > 0) {
    const maxValue = Math.max(...values) * 1.1
    const minValue = Math.min(...values) * 0.9

    chartPoints.value = data.map((d, index) => {
      const x = 20 + (280 / (data.length - 1 || 1)) * index
      const y = 180 - ((d.quote - minValue) / (maxValue - minValue || 1)) * 180
      const date = new Date(d.date)
      let label = ''
      if (chartRange.value === 'year') {
        label = `${date.getMonth() + 1}月`
      } else {
        label = `${date.getMonth() + 1}/${date.getDate()}`
      }

      return {
        x,
        y,
        value: d.quote,
        label
      }
    }).filter(p => p.value !== null)
  } else {
    chartPoints.value = []
  }
}

// 触摸图表事件
const touchChart = (e) => {
  // 可以添加交互功能
}

// 监听时间范围变化
watch(chartRange, () => {
  updateChartData()
})

// 监听 tab 切换
watch(activeTab, (newVal) => {
  if (newVal === 'chart') {
    nextTick(() => {
      updateChartData()
    })
  }
})

// 监听发车记录变化，更新日历
watch(() => departureStore.records, () => {
  updateCalendarSelected()
}, { deep: true })

const settingsPopup = ref(null)
const collapseValue = ref(['0'])
const settingsForm = reactive({
  receiptBigBoxWeight: 45, // 收货大框斤数
  deliveryBigBoxWeight: 44, // 交货大框斤数
  smallBoxWeight: 29.5, // 默认小框斤数
  depotCartonBoxesBig: 43, // 默认大箱斤数
  depotCartonBoxesSmall: 30, // 默认小箱斤数
  loadingFee: 300, // 装车费
  unloadingFee: 200, // 卸车费
  departureFee: 200, // 发车费
  tollFee: 50, // 过路费
  entryFee: 50, // 进门费
  oilFee: 50, // 油费
})

const todayRecords = computed(() => departureStore.getTodayRecords())

const todayStats = computed(() => {
  const records = todayRecords.value
  const totalIncome = records.reduce((sum, r) => {
    return sum + parseFloat(r.getMoney || 0)
  }, 0)
  return {
    count: records.length,
    income: totalIncome.toFixed(2)
  }
})


// 初始化
onMounted(() => {
  initCalendarRange()
  updateCalendarSelected()

  // 默认显示当天日期的报价
  const today = new Date().toISOString().split('T')[0]
  const quotes = getAllQuotes()
  if (quotes[today]) {
    selectedDateQuote.value = {
      date: today,
      quote: quotes[today].quote,
      source: quotes[today].source
    }
  }
})

const openSettingsPopup = () => {
  settingsPopup.value.open('center')
}

const popupChange = (e) => {
  if (e.show) {
    // 弹窗打开时，加载当前设置
    settingsForm.receiptBigBoxWeight = settingsStore.receiptBigBoxWeight
    settingsForm.deliveryBigBoxWeight = settingsStore.deliveryBigBoxWeight
    settingsForm.smallBoxWeight = settingsStore.smallBoxWeight
    settingsForm.depotCartonBoxesBig = settingsStore.depotCartonBoxesBig
    settingsForm.depotCartonBoxesSmall = settingsStore.depotCartonBoxesSmall
    settingsForm.loadingFee = settingsStore.loadingFee
    settingsForm.unloadingFee = settingsStore.unloadingFee
    settingsForm.departureFee = settingsStore.departureFee
    settingsForm.tollFee = settingsStore.tollFee
    settingsForm.entryFee = settingsStore.entryFee
    settingsForm.oilFee = settingsStore.oilFee
  }
}

const saveSettings = () => {
  settingsStore.updateAllSettings({
    receiptBigBoxWeight: settingsForm.receiptBigBoxWeight,
    deliveryBigBoxWeight: settingsForm.deliveryBigBoxWeight,
    smallBoxWeight: settingsForm.smallBoxWeight,
    depotCartonBoxesBig: settingsForm.depotCartonBoxesBig,
    depotCartonBoxesSmall: settingsForm.depotCartonBoxesSmall,
    loadingFee: settingsForm.loadingFee,
    unloadingFee: settingsForm.unloadingFee,
    departureFee: settingsForm.departureFee,
    tollFee: settingsForm.tollFee,
    entryFee: settingsForm.entryFee,
    oilFee: settingsForm.oilFee
  })
  uni.showToast({
    title: '设置已保存',
    icon: 'success'
  })
  settingsPopup.value.close()
}
</script>
<style>
.uni-collapse-item__wrap-content{
  padding: 0 18px!important;
}
.uni-calendar-item__weeks-box-item {
  width: 100%!important;
}
</style>
<style scoped>
.home-page { padding: 20px; }
.stats-cards { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 20px; }
.stat-card { flex: 1; background: #fff; padding: 20px; border-radius: 8px; text-align: center; }
.stat-label { color: #999; font-size: 14px; display: block; }
.stat-value { color: #007aff; font-size: 30px; font-weight: bold; display: block; margin-bottom: 10px; height: 42px; line-height: 42px; }
.stat-value.icon { font-size: 28px; margin-bottom: 0!important; }
.action-btn { flex: 1; background: #fff; padding: 20px; border-radius: 8px; text-align: center; }
.icon { font-size: 30px; display: block; margin-bottom: 10px; }
.recent-records { background: #fff; padding: 15px; border-radius: 8px; }
.section-title-wrapper { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
.section-title-content { display: flex; justify-content: start; align-items: center; }
.section-title { font-weight: bold; display: block;}
.section-title-icon { width: 28px; height: 28px; margin-left: 10px; }
.section-title-value-wrapper { display: flex; justify-content: space-between; align-items: center; }
.section-title-value { color: #999; font-size: 14px; display: block; margin-right: 10px; }
.section-title-value-icon { width: 28px; height: 28px; margin-left: 10px; }
.record-item { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f0f0f0; }
.record-item:last-child { border-bottom: none; }
.record-info { display: flex; flex-direction: column; gap: 4px; }
.record-profit { color: #52c41a; font-size: 12px; }
.amount { color: #52c41a; font-weight: bold; }
.empty { color: #999; text-align: center; padding: 20px; }

/* 弹窗样式 */
.settings-popup { background: #fff; border-radius: 16px; padding-bottom: 20px; }
.popup-header { display: flex; justify-content: space-between; align-items: center; padding: 15px 20px; border-bottom: 1px solid #f0f0f0; }
.popup-title { font-size: 18px; font-weight: bold; }
.popup-close { font-size: 28px; color: #999; }
.popup-content { padding: 10px; overflow-y: auto; }
.settings-group { margin-bottom: 20px; }
.settings-group:last-child { margin-bottom: 0; }
.group-title { font-size: 14px; color: #999; margin-bottom: 10px; display: block; }
.form-item { display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid #f5f5f5; }
.form-item input { text-align: right; width: 150px; font-size: 14px; }
.save-btn { background: #007aff; color: #fff; width: 120px; }

/* Tab 样式 */
.quote-tabs { display: flex; background: #f5f5f5; border-radius: 8px; margin-bottom: 15px; }
.quote-tabs .tab { flex: 1; text-align: center; padding: 12px; border-radius: 8px; font-size: 14px; }
.quote-tabs .tab.active { background: #007aff; color: #fff; }
.tab-content { margin-bottom: 20px; }

/* 报价信息卡片 */
.quote-info-card { background: #fff; padding: 15px; border-radius: 8px; margin-top: 15px; text-align: center; }
.quote-date { color: #999; font-size: 14px; margin-bottom: 8px; }
.quote-value { color: #007aff; font-size: 28px; font-weight: bold; margin-bottom: 8px; }
.quote-source { color: #999; font-size: 12px; }

/* 报价弹窗 */
.quote-popup { background: #fff; border-radius: 16px; padding-bottom: 20px; width: 80vw; margin: 0 auto; }
.record-quote-tip { background: #f6ffed; padding: 10px; border-radius: 4px; margin-bottom: 15px; color: #52c41a; font-size: 14px; }

/* 图表样式 */
.chart-range { display: flex; gap: 10px; margin-bottom: 15px; }
.chart-range .range-btn { padding: 8px 16px; background: #fff; border-radius: 4px; border: 1px solid #ddd; font-size: 14px; }
.chart-range .range-btn.active { background: #007aff; color: #fff; border-color: #007aff; }
.chart-container { background: #fff; border-radius: 8px; padding-top: 15px; padding-bottom: 15px; }
.quote-chart { width: 100%; height: 250px; }
.no-data { text-align: center; padding: 30px; color: #999; background: #fff; border-radius: 8px; }

/* 视图图表样式 */
.chart-view { display: flex; height: 220px; position: relative; }
.chart-y-axis { display: flex; flex-direction: column; justify-content: space-between; padding: 10px 5px; font-size: 12px; color: #999; }
.chart-area { flex: 1; position: relative; border-left: 1px solid #ddd; border-bottom: 1px solid #ddd; }
.grid-line { position: absolute; left: 0; right: 0; height: 1px; background: #eee; }
.line-container { position: relative; height: 100%; width: 100%; }
.chart-point { position: absolute; width: 10px; height: 10px; background: #1890ff; border-radius: 50%; transform: translate(-50%, 50%); }
.chart-point::before { content: ''; position: absolute; top: -5px; left: -5px; right: -5px; bottom: -5px; border: 2px solid #1890ff; border-radius: 50%; opacity: 0.3; }
.chart-label { position: absolute; transform: translateX(-50%); font-size: 10px; color: #666; white-space: nowrap; }

/* uCharts 图表样式 */
.chart-wrapper { background: #fff; border-radius: 8px; }
.chart-legend { display: flex; justify-content: center; gap: 20px; margin-bottom: 10px; }
.legend-item { display: flex; align-items: center; gap: 6px; font-size: 12px; color: #666; }
.legend-dot { width: 10px; height: 10px; border-radius: 50%; }

/* 数据列表样式 */
.chart-data-list { background: #fff; border-radius: 8px; margin-top: 15px; padding: 15px; }
.data-list-title { font-size: 14px; font-weight: bold; margin-bottom: 10px; }
.data-item { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f0f0f0; font-size: 14px; }
.data-item:last-child { border-bottom: none; }
.data-value { color: #1890ff; font-weight: bold; }
</style>
