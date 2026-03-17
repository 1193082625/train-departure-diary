<template>
  <view class="u-charts">
    <canvas
      :canvas-id="canvasId"
      :id="canvasId"
      class="charts-canvas"
      :style="{ width: cWidth + 'px', height: cHeight + 'px' }"
      @touchstart="touchStart"
      @touchmove="touchMove"
      @touchend="touchEnd"
    ></canvas>
  </view>
</template>

<script>
export default {
  name: 'u-charts',
  props: {
    canvasId: {
      type: String,
      default: 'uCharts'
    },
    chartData: {
      type: Object,
      default: () => ({})
    },
    opts: {
      type: Object,
      default: () => ({})
    },
    width: {
      type: Number,
      default: 350
    },
    height: {
      type: Number,
      default: 250
    },
    animation: {
      type: Boolean,
      default: true
    }
  },
  data() {
    return {
      cWidth: 0,
      cHeight: 0,
      ctx: null,
      points: [],
      legend: []
    }
  },
  watch: {
    chartData: {
      handler() {
        this.drawCharts()
      },
      deep: true
    }
  },
  mounted() {
    this.cWidth = this.width
    this.cHeight = this.height
    this.$nextTick(() => {
      this.init()
    })
  },
  methods: {
    init() {
      this.ctx = uni.createCanvasContext(this.canvasId, this)
      this.drawCharts()
    },
    drawCharts() {
      if (!this.ctx || !this.chartData || !this.chartData.series) return

      const ctx = this.ctx
      const width = this.cWidth
      const height = this.cHeight
      const padding = { top: 20, right: 20, bottom: 30, left: 40 }
      const chartWidth = width - padding.left - padding.right
      const chartHeight = height - padding.top - padding.bottom

      // 清空画布
      ctx.clearRect(0, 0, width, height)

      const series = this.chartData.series
      const categories = this.chartData.categories || []

      if (categories.length === 0 || series.length === 0) return

      // 计算Y轴范围
      let minVal = Infinity
      let maxVal = -Infinity
      series.forEach(s => {
        if (s.data) {
          s.data.forEach(v => {
            const val = parseFloat(v)
            if (!isNaN(val)) {
              minVal = Math.min(minVal, val)
              maxVal = Math.max(maxVal, val)
            }
          })
        }
      })

      // 添加边距
      const range = maxVal - minVal || 1
      minVal = minVal - range * 0.1
      maxVal = maxVal + range * 0.1

      // 绘制网格线
      ctx.setStrokeStyle('#eeeeee')
      ctx.setLineWidth(1)
      const gridLines = 5
      for (let i = 0; i <= gridLines; i++) {
        const y = padding.top + (chartHeight / gridLines) * i
        ctx.moveTo(padding.left, y)
        ctx.lineTo(width - padding.right, y)
      }
      ctx.stroke()

      // 绘制Y轴标签
      ctx.setFillStyle('#999999')
      ctx.setFontSize(10)
      for (let i = 0; i <= gridLines; i++) {
        const val = maxVal - ((maxVal - minVal) / gridLines) * i
        const y = padding.top + (chartHeight / gridLines) * i
        ctx.fillText(val.toFixed(0), 5, y + 4)
      }

      // 绘制X轴标签
      const xStep = chartWidth / (categories.length - 1 || 1)
      categories.forEach((cat, i) => {
        const x = padding.left + xStep * i
        ctx.fillText(cat, x - 15, height - 5)
      })

      // 绘制每个系列
      series.forEach((s, sIndex) => {
        if (!s.data || s.data.length === 0) return

        const points = []
        s.data.forEach((val, i) => {
          const x = padding.left + xStep * i
          const y = padding.top + chartHeight - ((parseFloat(val) - minVal) / (maxVal - minVal)) * chartHeight
          points.push({ x, y, val })
        })

        // 获取颜色
        const color = s.color || this.getColor(sIndex)

        // 绘制区域图（如果配置了areaStyle）
        if (s.areaStyle) {
          // 创建渐变
          const gradient = ctx.createLinearGradient(0, padding.top, 0, height - padding.bottom)
          gradient.addColorStop(0, color + '99') // 顶部透明度
          gradient.addColorStop(1, color + '10') // 底部透明度

          ctx.beginPath()
          ctx.moveTo(points[0].x, height - padding.bottom)
          points.forEach(p => {
            ctx.lineTo(p.x, p.y)
          })
          ctx.lineTo(points[points.length - 1].x, height - padding.bottom)
          ctx.closePath()
          ctx.setFillStyle(gradient)
          ctx.fill()
        }

        // 绘制曲线
        if (points.length > 1) {
          ctx.beginPath()
          ctx.setStrokeStyle(color)
          ctx.setLineWidth(2)
          ctx.setLineCap('round')
          ctx.setLineJoin('round')

          // 使用二次贝塞尔曲线连接点
          ctx.moveTo(points[0].x, points[0].y)
          for (let i = 0; i < points.length - 1; i++) {
            const xc = (points[i].x + points[i + 1].x) / 2
            const yc = (points[i].y + points[i + 1].y) / 2
            ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc)
          }
          ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y)
          ctx.stroke()
        }

        // 绘制点
        points.forEach(p => {
          ctx.beginPath()
          ctx.arc(p.x, p.y, 4, 0, 2 * Math.PI)
          ctx.setFillStyle('#ffffff')
          ctx.fill()
          ctx.setStrokeStyle(color)
          ctx.setLineWidth(2)
          ctx.stroke()
        })
      })

      ctx.draw()
    },
    getColor(index) {
      const colors = [
        '#FF9500', // 橙色 - 报价
        '#52C41A', // 绿色 - 盈利
        '#1890FF', // 蓝色
        '#F5222D', // 红色
        '#722ED1', // 紫色
        '#13C2C2', // 青色
        '#FAAD14', // 黄色
        '#EB2F96'  // 粉色
      ]
      return colors[index % colors.length]
    },
    touchStart(e) {
      this.$emit('touchstart', e)
    },
    touchMove(e) {
      this.$emit('touchmove', e)
    },
    touchEnd(e) {
      this.$emit('touchend', e)
    }
  }
}
</script>

<style scoped>
.u-charts {
  width: 100%;
  height: 100%;
}
.charts-canvas {
  width: 100%;
  height: 100%;
}
</style>
