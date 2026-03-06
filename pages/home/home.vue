<template>
  <view class="home-page">
    <view class="stats-cards">
      <view class="stat-card">
        <text class="stat-label">今日发车</text>
        <text class="stat-value">{{ todayStats.count }}次</text>
      </view>
      <view class="stat-card">
        <text class="stat-label">今日收入</text>
        <text class="stat-value">¥{{ todayStats.income }}</text>
      </view>
    </view>

    <view class="quick-actions">
      <view class="action-btn" @click="goToDeparture">
        <text class="icon">🚚</text>
        <text>发车记录</text>
      </view>
      <view class="action-btn" @click="goToTransaction">
        <text class="icon">💰</text>
        <text>单次结账</text>
      </view>
    </view>

    <view class="recent-records">
      <text class="section-title">今日记录</text>
      <view v-for="record in todayRecords" :key="record.id" class="record-item">
			<text>{{ record.merchantDetails.map(m => m.merchantName).join(', ') }}</text>
        <!-- <text class="amount">¥{{ record.totalAmount }}</text> -->
      </view>
      <view v-if="todayRecords.length === 0" class="empty">暂无记录</view>
    </view>
  </view>
</template>

<script setup>
import { computed } from 'vue'
import { useDepartureStore } from '@/store/departure'

const departureStore = useDepartureStore()

const todayRecords = computed(() => departureStore.getTodayRecords())

const todayStats = computed(() => {
  const records = todayRecords.value
  console.log('打印今日收入', records)
  const totalIncome = records.reduce((sum, r) => sum + (r.totalAmount || 0), 0)
  return {
    count: records.length,
    income: totalIncome.toFixed(2)
  }
})

const goToDeparture = () => uni.switchTab({ url: '/pages/departure/departure' })
const goToTransaction = () => uni.navigateTo({ url: '/pages/transaction/transaction' })
</script>

<style scoped>
.home-page { padding: 20px; }
.stats-cards { display: flex; gap: 15px; margin-bottom: 20px; }
.stat-card { flex: 1; background: #fff; padding: 20px; border-radius: 8px; text-align: center; }
.stat-label { color: #999; font-size: 14px; display: block; }
.stat-value { color: #007aff; font-size: 24px; font-weight: bold; display: block; }
.quick-actions { display: flex; gap: 15px; margin-bottom: 20px; }
.action-btn { flex: 1; background: #fff; padding: 20px; border-radius: 8px; text-align: center; }
.icon { font-size: 30px; display: block; margin-bottom: 10px; }
.recent-records { background: #fff; padding: 15px; border-radius: 8px; }
.section-title { font-weight: bold; margin-bottom: 10px; display: block; }
.record-item { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f0f0f0; }
.amount { color: #52c41a; font-weight: bold; }
.empty { color: #999; text-align: center; padding: 20px; }
</style>
