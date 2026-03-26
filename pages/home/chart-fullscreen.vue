<template>
  <view class="chart-fullscreen-page">
    <!-- 返回按钮 -->
    <view class="back-btn" @click="goBack" :style="{transform: 'rotate(-90deg)', transformOrigin: `205px 460px`}">
      <text>← 返回</text>
    </view>

    <!-- 时间范围显示 -->
    <!-- <view class="chart-range-title" :style="{transform: 'rotate(-90deg)', transformOrigin: `240px 480px`}">
      <text>{{ rangeLabel }}报价统计</text>
    </view> -->

    <!-- 图表容器 - 横屏布局 -->
    <view class="chart-container-landscape">
      <view v-if="hasChartData" class="chart-wrapper">
        <qiun-data-charts
          type="area"
          canvasId="quoteChartFullscreen"
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
</template>

<script setup>
import { ref, computed } from 'vue'
import { onLoad, onShow, onHide } from '@dcloudio/uni-app'

// 图表数据
const chartData = ref({
  categories: [],
  series: []
})
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
const chartRange = ref('month')
// 图表尺寸 - 横屏时使用更大尺寸
const chartWidth = ref(400)
const chartHeight = ref(250)

const sysInfo = ref({
  windowWidth: 0,
  windowHeight: 0
})

// 时间范围标签
const rangeLabel = ref('')

// 计算是否有图表数据
const hasChartData = computed(() => {
  return chartData.value && chartData.value.series && chartData.value.series.length > 0
})

onShow(() => {
  // 纯CSS旋转，不需要JS锁定方向
  // 动态获取屏幕尺寸作为图表尺寸
  const sysInfo = uni.getSystemInfoSync()
  sysInfo.value = sysInfo
  
  // 旋转后，原本的 windowWidth 变成垂直方向，windowHeight 变成水平方向
  // 横屏时图表宽度应该用 windowHeight，高度应该用 windowWidth
  chartWidth.value = sysInfo.windowHeight - 40  // 留出边距
  chartHeight.value = sysInfo.windowWidth - 120  // 留出标题和边距
})

onHide(() => {
  // 纯CSS旋转，页面返回时自动恢复竖屏，无需解锁方向
})

// 页面加载时接收数据
onLoad((options) => {
  if (options.data) {
    try {
      const decodedData = JSON.parse(decodeURIComponent(options.data))
      chartData.value = decodedData.chartData || chartData.value
      chartOpts.value = decodedData.chartOpts || chartOpts.value
      chartRange.value = decodedData.chartRange || 'month'

      switch (chartRange.value) {
        case 'week':
          rangeLabel.value = '周'
          break
        case 'month':
          rangeLabel.value = '月'
          break
        case 'year':
          rangeLabel.value = '年'
          break
        default:
          rangeLabel.value = '月'
      }
    } catch (e) {
      console.error('解析图表数据失败:', e)
    }
  }
})

// 返回上一页
const goBack = () => {
  uni.navigateBack()
}
</script>

<style scoped>
.chart-fullscreen-page {
  width: 100vh;
  height: 100vw;
  /* background: #1a1a1a; */
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 9999;
  /* CSS 强制横屏 - 旋转 90 度 */
  transform: rotate(90deg);
  transform-origin: center center;
}

.back-btn {
  position: absolute;
  top: 20px;
  left: 20px;
  padding: 10px 20px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  z-index: 100;
}

.back-btn text {
  /* color: #999; */
  font-size: 16px;
}

/* .chart-range-title {
  position: absolute;
  top: 20px;
  right: 20px;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.8);
} */

.chart-container-landscape {
  margin: auto auto;
  width: 90%;
  height: 90%; /* 留出标题空间 */
  padding-bottom: 40px;
  padding-left: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10px;
  box-sizing: border-box;
}

.chart-wrapper {
  /* background: #fff; */
  border-radius: 12px;
  padding: 10px;
  width: 100%;
  height: 100%;
  box-sizing: border-box;
}

.no-data {
  color: #999;
  font-size: 16px;
  text-align: center;
  background: #fff;
  padding: 40px;
  border-radius: 12px;
}
</style>
