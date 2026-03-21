<template>
  <view class="home-page">
    <!-- 快捷操作 -->
    <quick-entry />

    <!-- 日报价组件（包含日历和图表） -->
    <daily-quotes ref="dailyQuotesRef" @openChartFullscreen="openChartFullscreen" />

    <!-- 今日记录组件 -->
    <today-records />

    <!-- 图表全屏弹窗 -->
    <uni-popup ref="chartFullscreenPopup" type="center" :mask-click="true" @change="onFullscreenPopupChange">
      <view class="fullscreen-chart-popup" :class="{ landscape: isLandscape }">
        <view class="fullscreen-chart-header" v-if="!isLandscape">
          <text class="fullscreen-chart-title">{{ chartRange === 'week' ? '周' : chartRange === 'month' ? '月' : '年' }}报价统计</text>
          <text class="fullscreen-chart-close" @click="chartFullscreenPopup.close()">×</text>
        </view>
        <view class="fullscreen-chart-content">
          <view class="fullscreen-chart-close-btn" v-if="isLandscape" @click="chartFullscreenPopup.close()">
            <text>×</text>
          </view>
          <view class="chart-canvas-wrapper">
            <qiun-data-charts
              type="area"
              canvasId="quoteChartFullscreen"
              :chartData="chartData"
              :opts="chartOpts"
              :width="fullscreenChartWidth"
              :height="fullscreenChartHeight"
            />
          </view>
        </view>
      </view>
    </uni-popup>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import QuickEntry from './components/quick-entry.vue'
import DailyQuotes from './components/daily-quotes.vue'
import TodayRecords from './components/today-records.vue'

const dailyQuotesRef = ref(null)

// 控制图表内容显示（用于全屏跳转时隐藏）
const showChartContent = ref(true)

// 全屏图表相关
const chartFullscreenPopup = ref(null)
const chartData = ref({ categories: [], series: [] })
const chartOpts = ref({})
const chartRange = ref('month')
const fullscreenChartWidth = ref(350)
const fullscreenChartHeight = ref(350)
const isLandscape = ref(false)

// 打开全屏图表
const openChartFullscreen = (data) => {
  // 隐藏当前页面图表区域
  showChartContent.value = false

  // 设置图表数据
  if (data.chartData) {
    chartData.value = data.chartData
  }
  if (data.chartOpts) {
    chartOpts.value = data.chartOpts
  }
  if (data.chartRange) {
    chartRange.value = data.chartRange
  }

  // 打开全屏弹窗
  chartFullscreenPopup.value.open('center')
}

// 全屏弹窗状态变化
const onFullscreenPopupChange = (e) => {
  if (!e.show) {
    // 关闭时重置状态
    isLandscape.value = false
  }
}

// 页面显示时恢复图表内容显示
onShow(() => {
  showChartContent.value = true
})
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

/* 全屏图表弹窗样式 */
.fullscreen-chart-popup {
  width: 90vw;
  max-width: 400px;
  background: white;
  border-radius: 12px;
  padding: 20px;
  position: relative;
  z-index: 9999;
}
/* 确保 uni-popup 层级高于 canvas */
:deep(.uni-popup) {
  z-index: 9998 !important;
}
:deep(.uni-popup__mask) {
  z-index: 9997 !important;
}
:deep(.uni-popup__content) {
  z-index: 9999 !important;
}
.fullscreen-chart-popup.landscape {
  width: 100vw;
  max-width: 100vw;
  height: 100vh;
  max-height: 100vh;
  border-radius: 0;
  padding: 10px;
  display: flex;
  flex-direction: column;
}
.fullscreen-chart-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  position: relative;
}
.fullscreen-chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}
.fullscreen-chart-title { font-size: 16px; font-weight: bold; }
.fullscreen-chart-close { font-size: 24px; color: #999; }
.fullscreen-chart-close-btn {
  position: absolute;
  top: 5px;
  right: 15px;
  width: 32px;
  height: 32px;
  background: rgba(0, 0, 0, 0.5);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}
.fullscreen-chart-close-btn text {
  font-size: 20px;
  color: #fff;
}
.chart-canvas-wrapper {
  position: relative;
  z-index: 1;
}
</style>
