<!-- 今日报价tab -->
<template>
  <view v-if="userStore.isAdmin || userStore.isMiddleman">
    <!-- Tab 切换 -->
    <view class="quote-tabs">
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
        <!-- 全屏按钮 -->
        <view class="chart-fullscreen-btn" @click="openChartFullscreen">
          <text>全屏</text>
        </view>
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
  </view>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { useDepartureStore } from '@/store/departure'
import { useUserStore } from '@/store/user'
import { useDailyQuoteStore } from '@/store/dailyQuote'

const departureStore = useDepartureStore()
const userStore = useUserStore()
const dailyQuoteStore = useDailyQuoteStore()

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

// 获取日历的开始和结束日期
const initCalendarRange = () => {
  const today = new Date()
  const year = today.getFullYear()
  // 从年初开始
  calendarStart.value = `${year}-01-01`
  // 到年底
  calendarEnd.value = `${year}-12-31`
}

// 获取所有报价数据（从发车记录和云端日报价表）
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

  // 从云端日报价表获取手动填写的报价
  dailyQuoteStore.quotes.forEach(item => {
    if (!quotes[item.date]) {
      quotes[item.date] = {
        date: item.date,
        quote: item.quote,
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

  // 获取当日报价（优先显示云端日报价，如果没有则显示记录中的）
  const manualQuote = dailyQuoteStore.getQuoteByDate(date)

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
  quotePopup.value.open('center')
}

// 保存报价
const saveQuote = async () => {
  if (!quoteInput.value || quoteInput.value <= 0) {
    uni.showToast({ title: '请输入有效报价', icon: 'none' })
    return
  }

  try {
    await dailyQuoteStore.saveQuote(popupDate.value, quoteInput.value)
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
  } catch (e) {
    console.error('保存日报价失败:', e)
  }
}

// 折线图相关
const chartRange = ref('month')
const chartPoints = ref([])
const chartWidth = ref(320)
const chartHeight = ref(220)

// 全屏图表相关
const emit = defineEmits(['openChartFullscreen'])

const openChartFullscreen = () => {
  // 传递图表数据到父组件
  emit('openChartFullscreen', {
    chartData: chartData.value,
    chartOpts: chartOpts.value,
    chartRange: chartRange.value
  })
}

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

// 初始化
initCalendarRange()
updateChartData()

// 暴露给父组件使用
defineExpose({
  updateCalendarSelected,
  updateChartData
})
</script>

<style scoped>
/* Tab 样式 */
.quote-tabs { display: flex; background: #f5f5f5; border-radius: 8px; margin-bottom: 15px; }
.quote-tabs .tab { flex: 1; text-align: center; padding: 12px; border-radius: 8px; font-size: 14px; }
.quote-tabs .tab.active { background: #007aff; color: #fff; }
.tab-content { margin-bottom: 20px; }

/* 报价弹窗 */
.quote-popup { background: #fff; border-radius: 16px; padding-bottom: 20px; width: 80vw; margin: 0 auto; }
.record-quote-tip { background: #f6ffed; padding: 10px; border-radius: 4px; margin-bottom: 15px; color: #52c41a; font-size: 14px; }
.popup-header { display: flex; justify-content: space-between; align-items: center; padding: 15px 20px; border-bottom: 1px solid #f0f0f0; }
.popup-title { font-size: 18px; font-weight: bold; }
.popup-close { font-size: 28px; color: #999; }
.popup-content { padding: 10px; overflow-y: auto; }
.form-item { display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid #f5f5f5; }
.form-item input { text-align: right; width: 150px; font-size: 14px; }
.save-btn { background: #007aff; color: #fff; width: 120px; }

/* 图表样式 */
.chart-range { display: flex; gap: 10px; margin-bottom: 15px; }
.chart-range .range-btn { padding: 8px 16px; background: #fff; border-radius: 4px; border: 1px solid #ddd; font-size: 14px; }
.chart-range .range-btn.active { background: #007aff; color: #fff; border-color: #007aff; }
.chart-container { background: #fff; border-radius: 8px; padding-top: 15px; padding-bottom: 15px; position: relative; }
.chart-fullscreen-btn { position: absolute; top: 10px; right: 10px; z-index: 10; padding: 5px 10px; background: rgba(0, 0, 0, 0.5); color: white; border-radius: 4px; font-size: 12px; }
.quote-chart { width: 100%; height: 250px; }
.no-data { text-align: center; padding: 30px; color: #999; background: #fff; border-radius: 8px; }

/* uCharts 图表样式 */
.chart-wrapper { background: #fff; border-radius: 8px; }
</style>
