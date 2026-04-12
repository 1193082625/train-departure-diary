<template>
  <!-- 按鸡场统计 -->
  <view class="tab-content">
    <picker :range="merchantOptions" :range-key="'name'" @change="onMerchantChange">
      <view class="picker">{{ selectedMerchant?.name || '选择鸡场' }}</view>
    </picker>

    <picker mode="date" :value="dateRange.start" @change="onStartDateChange">
      <view class="picker">开始: {{ dateRange.start }}</view>
    </picker>
    <picker mode="date" :value="dateRange.end" @change="onEndDateChange">
      <view class="picker">结束: {{ dateRange.end }}</view>
    </picker>

    <view class="empty-content" v-if="!selectedMerchant">
      <text class="tips">选择人员后查看数据</text>
    </view>
    <template v-else>
      <!-- 明细列表 -->
      <uni-collapse class="mt-section detail-list-collapse" v-if="merchantRecordList.length > 0">
        <uni-collapse-item title="明细列表" :open="openMerchantRecordList">
          <view class="detail-list">
            <view class="detail-header">
              <text>日期</text>
              <text>报价</text>
              <text>大框</text>
              <text>小框</text>
              <text>斤数</text>
              <text>应结</text>
            </view>
            <scroll-view scroll-y class="detail-scroll" :style="{ height: scrollHeight }">
              <view class="detail-item" v-for="(item, index) in merchantRecordList" :key="`${item.date}-${index}`">
                <text>{{ item.date }}</text>
                <text>{{ item.dailyQuote }}</text>
                <text>{{ item.bigBoxes }}</text>
                <text>{{ item.smallBoxes }}</text>
                <text>{{ item.weight }}</text>
                <text>{{ item.receivable }}</text>
              </view>
            </scroll-view>
          </view>
        </uni-collapse-item>
      </uni-collapse>

      <view class="stats-result">
        <view class="stat-item">
          <text>共拉大框</text>
          <text class="value">{{ merchantStats.totalBigBoxes }}</text>
        </view>
        <view class="stat-item">
          <text>共拉小框</text>
          <text class="value">{{ merchantStats.totalSmallBoxes }}</text>
        </view>
        <view class="stat-item">
          <text>共拉斤数</text>
          <text class="value">{{ merchantStats.totalWeight }}</text>
        </view>
        <view class="stat-item">
          <text>应结金额</text>
          <text class="value">¥{{ merchantStats.receivable }}</text>
        </view>
        <view class="stat-item">
          <text>已结金额</text>
          <text class="value">¥{{ merchantStats.paid }}</text>
        </view>
        <view class="stat-item">
          <text>待结金额</text>
          <text class="value unpaid">¥{{ merchantStats.unpaid }}</text>
        </view>
      </view>
    </template>
  </view>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useUserStore, ROLES } from '@/store/user'
import { apiOps } from '@/utils/api'

const props = defineProps({
  dateRange: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['update:dateRange'])

const userStore = useUserStore()

const merchants = ref([])
const selectedMerchantId = ref('')
const merchantRecord = ref([])
const openMerchantRecordList = ref(true)
const merchantRecordList = ref([])
const merchantStats = ref({ totalBigBoxes: 0, totalSmallBoxes: 0, totalWeight: 0, receivable: 0, paid: 0, unpaid: 0 })

// 加载商户列表
const loadMerchants = async () => {
  try {
    const res = await apiOps.queryAll('merchants')
    merchants.value = res.data || []
  } catch (e) {
    console.error('【MerchantStatistics】加载商户列表失败:', e)
    merchants.value = []
  }
}

// 根据用户角色过滤商户
const filteredMerchants = computed(() => {
  const user = userStore.currentUser
  if (!user) return []

  if (user.role === ROLES.ADMIN) {
    return merchants.value
  }

  if (user.role === ROLES.MIDDLEMAN) {
    return merchants.value.filter(m => m.userId === user.id)
  }

  if (user.parentId) {
    return merchants.value.filter(m => m.userId === user.parentId)
  }

  return []
})

const merchantOptions = computed(() => filteredMerchants.value)
const selectedMerchant = computed(() => merchants.value.find(m => m.id === selectedMerchantId.value))

onMounted(() => {
  loadMerchants()
})

const onMerchantChange = (e) => {
  selectedMerchantId.value = merchantOptions.value[e.detail.value]?.id || ''
}

const onStartDateChange = (e) => {
  emit('update:dateRange', { ...props.dateRange, start: e.detail.value })
}

const onEndDateChange = (e) => {
  emit('update:dateRange', { ...props.dateRange, end: e.detail.value })
}

// 计算鸡场统计数据
const updateMerchantStats = async () => {
  if (!selectedMerchantId.value) {
    merchantRecord.value = []
    merchantRecordList.value = []
    merchantStats.value = { totalBigBoxes: 0, totalSmallBoxes: 0, totalWeight: 0, receivable: 0, paid: 0, unpaid: 0 }
    return
  }

  // 调用后端聚合接口获取完整数据
  try {
    const res = await apiOps.aggregate({
      type: 'byMerchant',
      merchantId: selectedMerchantId.value,
      startDate: props.dateRange.start,
      endDate: props.dateRange.end
    })
    const data = res.data

    // 使用后端返回的 merchantRecordList
    merchantRecordList.value = data.merchantRecordList || []
    openMerchantRecordList.value = true

    // 构造日历记录
    merchantRecord.value = [...new Set(merchantRecordList.value)].map(r => ({
      date: r.date,
      info: '有生意'
    }))

    // 使用后端返回的统计数据
    merchantStats.value = {
      totalBigBoxes: data.totalBigBoxes || 0,
      totalSmallBoxes: data.totalSmallBoxes || 0,
      totalWeight: data.totalWeight.toFixed(2) || 0,
      receivable: data.totalEarned || 0,
      paid: data.settledAmount || 0,
      unpaid: data.unpaidAmount || 0
    }
  } catch (e) {
    console.error('【MerchantStatistics】获取聚合数据失败:', e)
  }
}

// 监听选择鸡场和日期范围变化
watch(selectedMerchantId, () => {
  updateMerchantStats()
})

watch(() => [props.dateRange.start, props.dateRange.end], () => {
  updateMerchantStats()
}, { deep: true })
</script>

<style scoped>
.tab-content { display: flex; flex-direction: column; gap: 10px; }
.picker { background: #fff; padding: 12px; border-radius: 4px; }
.stats-result { background: #fff; padding: 15px; border-radius: 8px; margin-top: 15px; }
.stat-item { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #f0f0f0; }
.stat-item:last-child { border-bottom: none; }
.value { font-weight: bold; color: #007aff; }
.unpaid { color: #ff4d4f; }

.detail-list-collapse .uni-collapse {
  border-radius: 4px;
}
.detail-list { background: #fff; padding: 0 15px 15px; }
.detail-title { font-size: 16px; font-weight: bold; margin-bottom: 10px; }
.detail-header { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #f0f0f0; }
.detail-header text { flex: 1; text-align: center; }
.detail-scroll {
   max-height: 400px;
   padding-bottom: 20rpx;
 }
.detail-item { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #f0f0f0; }
.detail-item text { flex: 1; text-align: center; }
.detail-item:last-child { border-bottom: none; margin-bottom: 20rpx; }

.empty-content{
  width: 100%;
  height: 200rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.empty-content .tips{
  color: #666;
}
</style>
