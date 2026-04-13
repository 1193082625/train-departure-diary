<template>
  <view class="home-page">
    <!-- 管理员中间商选择器 -->
    <middleman-selector />

    <!-- 快捷操作 -->
    <quick-entry />

    <!-- 日报价组件（包含日历和图表） -->
    <daily-quotes ref="dailyQuotesRef" />

    <!-- 今日记录组件 -->
    <today-records />
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import MiddlemanSelector from '@/components/middleman-selector.vue'
import QuickEntry from './components/quick-entry.vue'
import DailyQuotes from './components/daily-quotes.vue'
import TodayRecords from './components/today-records.vue'

const dailyQuotesRef = ref(null)

onShow(() => {
  // 重置日历到当前月
  dailyQuotesRef.value?.resetCalendarToCurrentMonth()
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
</style>
