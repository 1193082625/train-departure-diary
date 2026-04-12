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
          <view class="detail-item" v-for="item in merchantRecordList" :key="item.date">
            <text>{{ item.date }}</text>
            <text>{{ item.dailyQuote }}</text>
            <text>{{ item.bigBoxes }}</text>
            <text>{{ item.smallBoxes }}</text>
            <text>{{ item.weight }}</text>
            <text>{{ item.receivable }}</text>
          </view>
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
  </view>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted } from 'vue'
import { useUserStore, ROLES } from '@/store/user'
import { useDepartureStore } from '@/store/departure'
import { useTransactionStore } from '@/store/transaction'
import { apiOps } from '@/utils/api'
import { calculateMerchantItem } from '@/utils/calc'

const props = defineProps({
  dateRange: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['update:dateRange'])

const userStore = useUserStore()
const departureStore = useDepartureStore()
const transactionStore = useTransactionStore()

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

const getMerchantById = (id) => merchants.value.find(m => m.id === id)

const merchantOptions = computed(() => filteredMerchants.value)
const selectedMerchant = computed(() => getMerchantById(selectedMerchantId.value))

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
const updateMerchantStats = () => {
  if (!selectedMerchantId.value) {
    merchantRecord.value = []
    merchantRecordList.value = []
    merchantStats.value = { totalBigBoxes: 0, totalSmallBoxes: 0, totalWeight: 0, receivable: 0, paid: 0, unpaid: 0 }
    return
  }

  const records = departureStore.getRecordsByDateRange(props.dateRange.start, props.dateRange.end)
  const merchantRecords = records.filter(r => r.merchantDetails.some(m => m.merchantId === selectedMerchantId.value))

  // 日历记录
  merchantRecord.value = [...new Set(merchantRecords)].map(r => ({
    date: r.date,
    info: '有生意'
  }))

  let totalBigBoxes = 0, totalSmallBoxes = 0, totalWeight = 0, receivable = 0
  let recordList = []

  merchantRecords.forEach(r => {
    const merchant = getMerchantById(selectedMerchantId.value)
    if (merchant) {
      const detail = r.merchantDetails.find(m => m.merchantId === selectedMerchantId.value)
      const bigBoxes = detail?.bigBoxes || 0
      const smallBoxes = detail?.smallBoxes || 0
      const weight = detail?.weight || 0

      totalBigBoxes += bigBoxes
      totalSmallBoxes += smallBoxes
      totalWeight += weight

      const receivePrice = calculateMerchantItem({
        formData: r,
        merchantDetail: {
          margin: merchant.margin,
          ...detail
        }
      })
      receivable += receivePrice

      recordList.push({
        date: r.date,
        bigBoxes: bigBoxes,
        smallBoxes: smallBoxes,
        weight: weight,
        dailyQuote: r.dailyQuote,
        receivable: receivePrice.toFixed(2)
      })
    }
  })

  nextTick(() => {
    merchantRecordList.value = recordList.sort((a, b) => b.date.localeCompare(a.date))
    openMerchantRecordList.value = true
  })

  // 交易记录
  const transactions = transactionStore.getTransactionsByTarget(selectedMerchantId.value)
  const paid = transactions.reduce((sum, t) => sum + Number(t.amount), 0)

  merchantStats.value = {
    totalBigBoxes,
    totalSmallBoxes,
    totalWeight,
    receivable: receivable.toFixed(2),
    paid: Number(paid || 0).toFixed(2),
    unpaid: (receivable - paid).toFixed(2)
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
.detail-item { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #f0f0f0; }
.detail-item text { flex: 1; text-align: center; }
.detail-item:last-child { border-bottom: none; }
</style>
