<template>
  <view class="departure-page">
    <view class="header">
      <text class="title">发车记录</text>
      <button class="add-btn" size="mini" @click="goToForm">+ 新增</button>
    </view>

    <!-- 日期选择 -->
    <view class="date-picker">
      <picker mode="date" :value="selectedDate" @change="onDateChange">
        <view class="picker-text">{{ selectedDate }}</view>
      </picker>
    </view>

    <!-- 记录列表 -->
    <view class="record-list">
      <view v-for="record in records" :key="record.id" class="record-card" @click="editRecord(record)">
        <view class="record-header">
          <text class="time">{{ record.date }}</text>
          <!-- <text class="amount">¥{{ record.totalAmount }}</text> -->
        </view>
        <view class="record-content">
          <text>商户: {{ record.merchantDetails.map(m => m.merchantName).join(', ') }}</text>
          <text>发车: {{ getWorkerName(record.departureWorkerId) }}</text>
          <text>装车: {{ record.loadingWorkerIds.map(id => getWorkerName(id)).join(', ') }}</text>
        </view>
        <view class="record-stats">
          <text>大框: {{ calculateTotalBigBoxes(record) }}</text>
          <text>小框: {{ calculateTotalSmallBoxes(record) }}</text>
        </view>
      </view>

      <view v-if="records.length === 0" class="empty">
        <text>当日暂无发车记录</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useDepartureStore } from '@/store/departure'
import { useWorkerStore } from '@/store/worker'

const departureStore = useDepartureStore()
const workerStore = useWorkerStore()

const selectedDate = ref(new Date().toISOString().split('T')[0])

const records = computed(() => {
	const res = departureStore.getRecordsByDate(selectedDate.value)
	console.log(444, res)
	return res;
}
)

const onDateChange = (e) => {
  selectedDate.value = e.detail.value
}

const goToForm = () => {
  uni.navigateTo({ url: '/pages/departure/form' })
}

const editRecord = (record) => {
  uni.navigateTo({ url: `/pages/departure/form?id=${record.id}` })
}

const getWorkerName = (id) => {
  const worker = workerStore.getWorkerById(id)
  return worker ? worker.name : '未知'
}

const calculateTotalBigBoxes = (record) => {
  const merchantBig = record.merchantDetails.reduce((sum, m) => sum + m.bigBoxes, 0)
  return merchantBig - record.reservedBigBoxes
}

const calculateTotalSmallBoxes = (record) => {
  const merchantSmall = record.merchantDetails.reduce((sum, m) => sum + m.smallBoxes, 0)
  return merchantSmall - record.reservedSmallBoxes
}
</script>

<style scoped>
.departure-page { padding: 20px; }
.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.title { font-size: 20px; font-weight: bold; }
.add-btn { background: #007aff; color: #fff; padding: 8px 16px; border-radius: 4px; margin: 0;}
.date-picker { margin-bottom: 15px; }
.picker-text { background: #f5f5f5; padding: 10px; border-radius: 4px; text-align: center; }
.record-card { background: #fff; padding: 15px; border-radius: 8px; margin-bottom: 10px; }
.record-header { display: flex; justify-content: space-between; margin-bottom: 10px; }
.time { color: #999; }
.amount { font-size: 18px; font-weight: bold; color: #52c41a; }
.record-content { display: flex; flex-direction: column; gap: 5px; color: #666; font-size: 14px; }
.record-stats { display: flex; gap: 20px; margin-top: 10px; color: #007aff; }
.empty { text-align: center; color: #999; padding: 40px; }
</style>
