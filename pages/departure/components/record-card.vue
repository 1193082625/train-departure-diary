<template>
  <view class="record-card" @click="$emit('click', record)">
    <view class="record-header">
      <text class="trip-number">{{ record.tripNumber }}</text>
      <text class="time">{{ record.date }}</text>
    </view>
    <view class="record-content">
      <text>鸡场: {{ record.merchantDetails.map(m => m.merchantName).join(', ') }}</text>
      <text>发车: {{ getWorkerName(record.departureWorkerId) }}</text>
      <text>装车: {{ record.loadingWorkerIds.map(id => getWorkerName(id)).join(', ') }}</text>
    </view>
    <view class="record-stats">
      <text>大框: {{ calculateTotalBigBoxes(record) }}</text>
      <text>小框: {{ calculateTotalSmallBoxes(record) }}</text>
      <text>{{ showUnit ? '散装' : '斤数' }}: {{ calculateTotalWeight(record).toFixed(2) }}{{ showUnit ? ' 斤' : '' }}</text>
    </view>
    <view class="record-stats" v-if="record.getMoney && (userStore.isAdmin || userStore.isMiddleman)">
      <text class="profit">盈利: ¥{{ parseFloat(record.getMoney).toFixed(2) }}</text>
    </view>
  </view>
</template>

<script setup>
import { useUserStore } from '@/store/user'

const props = defineProps({
  record: { type: Object, required: true },
  workers: { type: Array, default: () => [] },
  showUnit: { type: Boolean, default: false }
})

defineEmits(['click'])

const userStore = useUserStore()

const getWorkerName = (id) => {
  const worker = props.workers.find(w => w.id === id)
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

const calculateTotalWeight = (record) => {
  return record.merchantDetails.reduce((sum, m) => sum + m.weight, 0)
}
</script>

<style scoped>
.record-card { background: #fff; padding: 15px; border-radius: 8px; margin-bottom: 10px; }
.record-header { display: flex; justify-content: space-between; margin-bottom: 10px; }
.trip-number { font-weight: bold; color: #007aff; font-size: 14px; }
.time { color: #999; }
.record-content { display: flex; flex-direction: column; gap: 5px; color: #666; font-size: 14px; }
.record-stats { display: flex; gap: 20px; margin-top: 10px; color: #007aff; flex-wrap: wrap; }
.profit { color: #52c41a; font-weight: bold; }
</style>
