<template>
  <!-- 结账记录页面 -->
  <view class="transaction-page">
    <view class="tabs">
      <view :class="['tab', form.type === 'payment_to_merchant' && 'active']"
        @click="form.type = 'payment_to_merchant'">向鸡场结账</view>
      <view :class="['tab', form.type === 'payment_to_worker' && 'active']"
        @click="form.type = 'payment_to_worker'">向员工结账</view>
    </view>

    <view class="form-section">
      <picker :range="targetOptions" :range-key="'name'" @change="onTargetChange">
        <view class="flex-start">
          <view class="picker font-bold">{{ selectedTarget?.name || '选择对象' }}</view>
          <view class="ml-10 picker-text-label">(点击选择或切换)</view>
        </view>
      </picker>

      <view class="form-item mt-section">
        <text>金额（元）</text>
        <input v-model="form.amount" type="digit" placeholder="请输入金额" />
      </view>

      <view class="form-item">
        <text>日期</text>
        <picker mode="date" :value="form.date" @change="onDateChange">
          <view class="picker">{{ form.date }}</view>
        </picker>
      </view>

      <view class="form-item mb-20">
        <text>备注</text>
        <input v-model="form.note" placeholder="可选" />
      </view>

      <button @click="addTransaction" class="add-btn">确认结账</button>
    </view>

    <view class="records">
      <text class="title">结账记录</text>
      <view v-for="t in recentTransactions" :key="t.id" class="record-item">
        <view class="record-info">
          <text class="target">{{ t.targetName }}</text>
          <text class="date">{{ t.date }}</text>
        </view>
        <view class="record-right">
          <text class="amount">-¥{{ t.amount }}</text>
          <text @click="deleteTransaction(t.id)" class="delete">删除</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, reactive, onMounted } from 'vue'
import { onShow, onHide } from '@dcloudio/uni-app'
import { useMerchantStore } from '@/store/merchant'
import { useTransactionStore } from '@/store/transaction'
import { useUserStore, ROLES } from '@/store/user'
import { apiOps } from '@/utils/api'
import { subscribe } from '@/utils/eventBus'
import toast from '@/utils/toast'

const merchantStore = useMerchantStore()
const transactionStore = useTransactionStore()
const userStore = useUserStore()

let unsubscribe = null

onShow(() => {
  unsubscribe = subscribe('transaction:refresh', () => {
    transactionStore.loadTransactions()
  })
  loadWorkers()
})

onHide(() => {
  if (unsubscribe) { unsubscribe(); unsubscribe = null }
})

// 员工数据（本地管理）
const allWorkers = ref([])

const loadWorkers = async () => {
  try {
    const res = await apiOps.queryAll('workers')
    allWorkers.value = res.data || []
  } catch (e) {
    console.error('加载员工列表失败:', e)
    allWorkers.value = []
  }
}

// 根据用户角色过滤员工
const filteredWorkers = computed(() => {
  const user = userStore.currentUser
  if (!user) return []

  if (user.role === ROLES.ADMIN) {
    return allWorkers.value
  }

  if (user.role === ROLES.MIDDLEMAN) {
    return allWorkers.value.filter(w => w.userId === user.id)
  }

  if (user.parentId) {
    return allWorkers.value.filter(w => w.userId === user.parentId)
  }

  return []
})

const getWorkerById = (id) => allWorkers.value.find(w => w.id === id)

const form = reactive({
  type: 'payment_to_merchant',
  targetId: '',
  amount: null,
  date: new Date().toISOString().split('T')[0],
  note: ''
})

const targetOptions = computed(() =>
  form.type === 'payment_to_merchant'
    ? merchantStore.filteredMerchants
    : filteredWorkers.value
)

const selectedTarget = computed(() => {
  if (form.type === 'payment_to_merchant') {
    return merchantStore.getMerchantById(form.targetId)
  }
  return getWorkerById(form.targetId)
})

const recentTransactions = computed(() =>
  transactionStore.transactions.slice().reverse().slice(0, 20).map(t => ({
    ...t,
    targetName: t.type === 'payment_to_merchant'
      ? merchantStore.getMerchantById(t.targetId)?.name
      : getWorkerById(t.targetId)?.name
  }))
)

const onTargetChange = (e) => {
  form.targetId = targetOptions.value[e.detail.value]?.id || ''
}

const onDateChange = (e) => { form.date = e.detail.value }

const addTransaction = () => {
  if (!form.targetId || !form.amount) {
    toast.error('请完善信息')
    return
  }

  transactionStore.addTransaction({
    type: form.type,
    targetId: form.targetId,
    amount: form.amount,
    date: form.date,
    note: form.note
  })

  toast.success('结账成功')
  form.amount = null
  form.note = ''
}

const deleteTransaction = (id) => {
  uni.showModal({
    title: '确认删除',
    content: '确定要删除此记录吗？',
    success: (res) => {
      if (res.confirm) {
        transactionStore.deleteTransaction(id)
      }
    }
  })
}
</script>

<style scoped>
.transaction-page { padding: 20px; }
.tabs { display: flex; background: #f5f5f5; border-radius: 8px; margin-bottom: 20px; }
.tab { flex: 1; text-align: center; padding: 10px; border-radius: 8px; }
.tab.active { background: #007aff; color: #fff; }
.form-section { background: #fff; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
.form-item { display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid #f0f0f0; }
.form-item:last-child { border-bottom: none; }
.form-item input { text-align: right; width: 150px; }
.add-btn { background: #52c41a; color: #fff; margin-top: 15px; margin: 0; }
.records { background: #fff; padding: 15px; border-radius: 8px; }
.title { font-weight: bold; margin-bottom: 10px; display: block; }
.record-item { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #f0f0f0; }
.record-item:last-child { border-bottom: none; }
.record-info { display: flex; flex-direction: column; }
.target { font-weight: bold; }
.date { color: #999; font-size: 12px; }
.record-right { display: flex; align-items: center; gap: 10px; }
.amount { color: #ff4d4f; font-weight: bold; }
.delete { color: #999; font-size: 12px; }
</style>
