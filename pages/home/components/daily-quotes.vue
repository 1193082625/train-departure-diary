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
        ref="calendarRef"
        :key="calendarKey"
        :selected="calendarSelected"
        :start-date="calendarStart"
        :end-date="calendarEnd"
        :date="calendarDate"
        :show-month="true"
        @change="onCalendarChange"
        @monthSwitch="onMonthChange"
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
import { onShow, onHide } from '@dcloudio/uni-app'
import { useUserStore, ROLES } from '@/store/user'
import { dailyQuoteApi } from '@/api'
import toast from '@/utils/toast'

const userStore = useUserStore()

onShow(() => {
  // 切换回当前 tab 时重置日历到当前月并加载当月数据
  resetCalendarToCurrentMonth()
  const today = new Date()
  const currentMonth = getMonthRange(today.getFullYear(), today.getMonth() + 1)
  loadQuotes(currentMonth.start, currentMonth.end)
})

// 本地状态
const quotes = ref([])
const loading = ref(false)
const isLoadingQuotes = ref(false)

// API 调用：按日期范围加载日报价
const loadQuotes = async (startDate, endDate) => {
  // 防止重复请求
  if (isLoadingQuotes.value) return

  // 如果没有传入日期范围，使用当前可见月份范围
  let start = startDate
  let end = endDate
  if (!start || !end) {
    const today = new Date()
    const year = today.getFullYear()
    const month = today.getMonth() + 1
    const range = getMonthRange(year, month)
    start = range.start
    end = range.end
  }

  isLoadingQuotes.value = true
  try {
    const res = await dailyQuoteApi.getByDateRange(start, end)
    // 后端返回格式: { success: true, data: [...] }
    quotes.value = (res && res.success && res.data) ? res.data : []
    // 数据加载完成后更新日历显示
    updateCalendarSelected()
  } catch (e) {
    console.error('【DailyQuote】加载日报价失败:', e)
    quotes.value = []
  } finally {
    isLoadingQuotes.value = false
  }
}

// API 调用：保存报价
const saveQuoteToServer = async (date, quote) => {
  const middlemanId = userStore.getMiddlemanId()
  if (!middlemanId) {
    throw new Error('无权限保存报价')
  }

  // 查找是否已有该日期的报价
  const existing = quotes.value.find(q => q.date === date && q.userId === middlemanId)

  if (existing) {
    // 更新已有报价
    await request(`/daily_quotes/${existing.id}`, {
      method: 'PUT',
      data: JSON.stringify({ quote: Number(quote) })
    })
  } else {
    // 创建新报价
    await request('/daily_quotes', {
      method: 'POST',
      data: JSON.stringify({
        date,
        quote: Number(quote),
        userId: middlemanId
      })
    })
  }
}

// 获取指定日期的报价（由后端过滤）
const getQuoteByDate = async (date) => {
  try {
    const res = await dailyQuoteApi.getByDate(date)
    // 后端返回格式: { success: true, data: [{ id, date, quote, ... }] }
    if (res && res.success && Array.isArray(res.data) && res.data.length > 0) {
      return res.data[0].quote
    }
    return null
  } catch (e) {
    console.error('获取日报价失败:', e)
    return null
  }
}

// Tab 状态
const activeTab = ref('calendar')

// 日历 key，用于触发重新渲染
const calendarKey = ref(0)

// 日历日期控制（用于重置日历到当前月）
const calendarDate = ref(new Date().toISOString().split('T')[0])

// 重置日历时防止触发弹窗的标志
let isResettingCalendar = false

// 重置日历到当前月
const resetCalendarToCurrentMonth = () => {
  // 使用 backToday 重置日历，backToday 会触发 change 事件
  // 我们用标志位防止此时打开弹窗
  isResettingCalendar = true
  if (calendarRef.value) {
    calendarRef.value.backToday()
  }
  nextTick(() => {
    isResettingCalendar = false
  })
}

// 日历 ref
const calendarRef = ref(null)

// 日历相关
const calendarSelected = ref([])
const calendarStart = ref('')
const calendarEnd = ref('')
const quotePopup = ref(null)
const popupDate = ref('')
const quoteInput = ref(null)

// 计算指定月份的日期范围
// month 是 1-indexed (1=Jan, 12=Dec)
// startDate: month-1 是 Date 的 0-indexed 月份
// endDate: month 是 Date 的 0-indexed 月份，day=0 取上个月最后一天，所以 month+1 再 day=0 取当月最后一天
const getMonthRange = (year, month) => {
  const startDate = new Date(year, month - 1, 2)
  const endDate = new Date(year, month, 1) // 当月最后一天
  return {
    start: startDate.toISOString().split('T')[0],
    end: endDate.toISOString().split('T')[0]
  }
}

// 当前可见月份的日期范围（用于按需加载）
// 直接初始化防止 onShow 先于 initCurrentMonth 执行导致日期错误
const currentVisibleMonth = ref(getMonthRange(new Date().getFullYear(), new Date().getMonth() + 1))

// 记录用户切换到的目标月份（解决 onShow 时 currentVisibleMonth 可能未及时更新的问题）
const lastVisibleMonth = ref({
  start: currentVisibleMonth.value.start,
  end: currentVisibleMonth.value.end
})

// 初始化当前可见月份（冗余，用于确保初始化正确）
const initCurrentMonth = () => {
  const today = new Date()
  currentVisibleMonth.value = getMonthRange(today.getFullYear(), today.getMonth() + 1)
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

// 获取所有报价数据（只从云端日报价表获取）
const getAllQuotes = () => {
  const quotesMap = {}

  // 从云端日报价表获取手动填写的报价（后端已按用户过滤）
  quotes.value.forEach(item => {
    quotesMap[item.date] = {
      date: item.date,
      quote: item.quote,
      source: 'manual'
    }
  })

  return quotesMap
}

// 更新日历选中状态
const updateCalendarSelected = () => {
  const quotesMap = getAllQuotes()
  const selected = Object.values(quotesMap).map(q => ({
    date: q.date,
    info: `¥${q.quote}`,
    color: q.source === 'record' ? '#52c41a' : '#1890ff'
  }))
  calendarSelected.value = selected
}

// 日历日期点击事件
const onCalendarChange = async (e) => {
  // 如果是重置日历触发的 change，不打开弹窗
  if (isResettingCalendar) return

  const date = e.fulldate
  popupDate.value = date

  // 获取当日报价
  const manualQuote = await getQuoteByDate(date)

  if (manualQuote !== undefined && manualQuote !== null) {
    quoteInput.value = manualQuote
  } else {
    quoteInput.value = null
  }

  // 弹出填写窗口
  quotePopup.value.open('center')
}

// 日历月份切换事件
const onMonthChange = async (e) => {
  const { year, month } = e
  const range = getMonthRange(year, month)
  currentVisibleMonth.value = range
  lastVisibleMonth.value = { start: range.start, end: range.end }
  // 加载新月份的报价数据
  await loadQuotes(currentVisibleMonth.value.start, currentVisibleMonth.value.end)
  // 更新日历显示
  updateCalendarSelected()
}

// 保存报价
const saveQuote = async () => {
  if (!quoteInput.value || quoteInput.value <= 0) {
    toast.error('请输入有效报价')
    return
  }

  try {
    await saveQuoteToServer(popupDate.value, quoteInput.value)
    toast.success('报价保存成功')
    quotePopup.value.close()

    // 重新加载报价数据
    await loadQuotes(currentVisibleMonth.value.start, currentVisibleMonth.value.end)

    // 更新日历显示
    updateCalendarSelected()

  } catch (e) {
    console.error('保存日报价失败:', e)
    toast.error('保存日报价失败')
  }
}

// 折线图相关
const chartRange = ref('month')
const chartPoints = ref([])
const chartWidth = ref(320)
const chartHeight = ref(220)

const openChartFullscreen = () => {
  const data = {
    chartData: chartData.value,
    chartOpts: chartOpts.value,
    chartRange: chartRange.value
  }

  uni.navigateTo({ url: '/pages/home/chart-fullscreen?data=' + encodeURIComponent(JSON.stringify(data)) })
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

// 获取指定时间范围的报价数据（从云端API获取）
const getChartData = async () => {
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
      // 本月: 1号到本月最后一天
      startDate = new Date(year, month, 2).toISOString().split('T')[0]
      endDate = new Date(year, month + 1, 1).toISOString().split('T')[0]
      break
    case 'year':
      // 本年
      startDate = `${year}-01-01`
      break
  }

  // 年视图使用按月聚合的数据格式
  if (chartRange.value === 'year') {
    try {
      const res = await dailyQuoteApi.getByDateRange(startDate, endDate, { groupBy: 'month' })
      if (res && res.success && Array.isArray(res.data)) {
        return res.data.map(item => ({
          date: item.month,
          quote: item.avgQuote,
          count: item.count
        }))
      }
    } catch (e) {
      console.error('获取图表报价数据失败:', e)
    }
    return []
  }

  // 非年视图：按日期粒度获取数据
  let quotesMap = {}
  try {
    const res = await dailyQuoteApi.getByDateRange(startDate, endDate)
    if (res && res.success && Array.isArray(res.data)) {
      res.data.forEach(item => {
        quotesMap[item.date] = { quote: item.quote, source: 'manual' }
      })
    }
  } catch (e) {
    console.error('获取图表报价数据失败:', e)
  }

  const dateData = []

  // 生成日期范围内的所有日期
  const currentDate = new Date(startDate)
  const end = new Date(endDate)

  while (currentDate <= end) {
    const dateStr = currentDate.toISOString().split('T')[0]
    const quoteInfo = quotesMap[dateStr]

    if (quoteInfo) {
      dateData.push({
        date: dateStr,
        quote: quoteInfo.quote
      })
    }
    currentDate.setDate(currentDate.getDate() + 1)
  }

  return dateData
}

// 更新图表数据（uCharts格式）
const updateChartData = async () => {
  const data = await getChartData()

  if (data.length === 0) {
    chartData.value = {
      categories: [],
      series: [
        { name: '报价', color: '#FF9500', data: [], areaStyle: true },
      ]
    }
    chartPoints.value = []
    return
  }

  // 更新 chartData
  const categories = data.map(d => {
    if (chartRange.value === 'year') {
      // 年视图：d.date 格式为 "2026-02"
      return d.date.slice(5) + '月'
    }
    const date = new Date(d.date)
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
      let label = ''
      if (chartRange.value === 'year') {
        // 年视图：d.date 格式为 "2026-02"
        label = d.date.slice(5) + '月'
      } else {
        const date = new Date(d.date)
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
  } else if (newVal === 'calendar') {
    // 切回日历 tab 时重置日历到当前月并刷新当月报价数据
    resetCalendarToCurrentMonth()
    loadQuotes(currentVisibleMonth.value.start, currentVisibleMonth.value.end).then(() => {
      updateCalendarSelected()
    })
  }
})

// 监听中间商切换，更新日历和图表
watch(() => userStore.currentMiddlemanId, () => {
  const today = new Date()
  const currentMonth = getMonthRange(today.getFullYear(), today.getMonth() + 1)
  loadQuotes(currentMonth.start, currentMonth.end).then(() => {
    updateCalendarSelected()
    updateChartData()
  })
})

// 初始化 - 必须在 uni-calendar 渲染前初始化当前月份，防止 monthchange 先于 initCurrentMonth 执行
initCalendarRange()
initCurrentMonth()
updateCalendarSelected()
// chart 数据将在切换到图表 tab 时才加载

// 暴露给父组件使用
defineExpose({
  updateCalendarSelected,
  updateChartData,
  loadQuotes,
  resetCalendarToCurrentMonth
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
