<template>
  <!-- 结账统计页面 -->
  <view v-if="userStore.isLoader" class="developing-page">
    <view class="developing-icon">🚧</view>
    <view class="developing-text">待上线</view>
    <view class="developing-desc">功能开发中，敬请期待...</view>
  </view>
  <StatisticsContent v-else />
</template>

<script setup>
import { useUserStore } from '@/store/user'
import StatisticsContent from './components/StatisticsContent.vue'

const userStore = useUserStore()
</script>

<style scoped>
.developing-page {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  background: #f5f5f5;
}
.developing-icon {
  font-size: 80px;
  margin-bottom: 20px;
}
.developing-text {
  font-size: 24px;
  font-weight: bold;
  color: #333;
  margin-bottom: 10px;
}
.developing-desc {
  font-size: 14px;
  color: #999;
}
</style>
