<!-- 今日发车记录 -->
<template>
  <view class="recent-records">
    <view class="section-title-wrapper">
      <view class="section-title-content">
        <text class="section-title">今日记录</text>
        <text class="section-title-value" v-if="todayStats.count > 0">共{{ todayStats.count }}次</text>
      </view>
      <view class="section-title-value-wrapper">
        <image v-if="userStore.isAdmin || userStore.isMiddleman || userStore.isLoader" @click="goToDepartureForm" class="section-title-icon" src="/static/svg/add.svg" mode="aspectFit"></image>
      </view>
    </view>
    <view v-for="record in todayRecords" :key="record.id" class="record-item" @click="editRecord(record)">
      <view class="record-info">
        <text>{{ record.merchantDetails.map(m => m.merchantName).join(', ') || '未选择鸡场' }}</text>
        <text class="record-profit" v-if="record.getMoney && (userStore.isAdmin || userStore.isMiddleman)">盈利: ¥{{ Number(record.getMoney).toFixed(2) }}</text>
      </view>
    </view>
    <view v-if="todayRecords.length === 0" class="empty">暂无记录</view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { departureApi } from '@/api'
import { useUserStore } from '@/store/user'
import { subscribe } from '@/utils/eventBus'

const userStore = useUserStore()

const todayRecords = ref([])

const loadTodayRecords = async () => {
  const today = new Date().toISOString().split('T')[0]
  todayRecords.value = await departureApi.loadRecordsByDate(today)
}

let unsubscribe = null

onMounted(async () => {
  await loadTodayRecords()
  unsubscribe = subscribe('departure:refresh', () => {
    loadTodayRecords()
  })
})

onUnmounted(() => {
  if (unsubscribe) { unsubscribe(); unsubscribe = null }
})

const goToDepartureForm = () => uni.navigateTo({ url: '/pages/departure/form' })

const editRecord = (record) => {
  uni.navigateTo({ url: `/pages/departure/form?id=${record.id}` })
}

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
</script>

<style scoped>
.recent-records { background: #fff; padding: 15px; border-radius: 8px; }
.section-title-wrapper { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
.section-title-content { display: flex; justify-content: start; align-items: center; }
.section-title { font-weight: bold; display: block; margin-right: 10px; }
.section-title-icon { width: 28px; height: 28px; margin-left: 10px; }
.section-title-value-wrapper { display: flex; justify-content: space-between; align-items: center; }
.section-title-value { color: #999; font-size: 14px; display: block; margin-right: 10px; }
.record-item { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f0f0f0; }
.record-item:last-child { border-bottom: none; }
.record-info { display: flex; flex-direction: column; gap: 4px; }
.record-profit { color: #52c41a; font-size: 12px; }
.empty { color: #999; text-align: center; padding: 20px; }
</style>
