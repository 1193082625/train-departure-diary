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
      <scroll-view scroll-y class="scroll-container" @scrolltolower="onLoadMore" :refresher-enabled="true" :refresher-triggered="transactionStore.refreshing" @refresherrefresh="onRefresh">
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
        <view v-if="transactionStore.loading && !transactionStore.refreshing" class="loading-tip">加载中...</view>
        <view v-if="!transactionStore.pagination.hasMore && recentTransactions.length > 0" class="loading-tip">没有更多了</view>
      </scroll-view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, reactive } from 'vue'
import { onShow, onHide } from '@dcloudio/uni-app'
import { useWorkerStore } from '@/store/worker'
import { useTransactionStore } from '@/store/transaction'
import { useUserStore, ROLES } from '@/store/user'
import { apiOps } from '@/utils/api'
import { subscribe } from '@/utils/eventBus'

const workerStore = useWorkerStore()
const transactionStore = useTransactionStore()
const userStore = useUserStore()

let unsubscribe = null

// 页面级别独立数据管理（参考 form.vue）
const formMerchants = ref([])
const formWorkers = ref([])
const formLoading = ref(false)

// 一次性加载全部数据
const loadFormData = async () => {
  if (formLoading.value) return
  formLoading.value = true

  try {
    const user = userStore.currentUser
    const params = { page: 1, pageSize: 99999 }

    // 根据角色设置 userId 过滤
    if (user.role === ROLES.ADMIN) {
      if (userStore.currentMiddlemanId) {
        params.userId = userStore.currentMiddlemanId
      }
    } else if (user.role === ROLES.MIDDLEMAN) {
      params.userId = user.id
    } else if (user.parentId) {
      params.userId = user.parentId
    }

    // 并行加载鸡场和员工数据
    const [merchantRes, workerRes] = await Promise.all([
      apiOps.queryAll('merchants', params),
      apiOps.queryAll('workers', params)
    ])

    formMerchants.value = merchantRes.data || []
    formWorkers.value = workerRes.data || []
  } catch (e) {
    console.error('加载表单数据失败:', e)
  } finally {
    formLoading.value = false
  }
}

// 页面级根据角色过滤鸡场
const formFilteredMerchants = computed(() => {
  const user = userStore.currentUser
  if (!user) return []

  if (user.role === ROLES.ADMIN) {
    return formMerchants.value
  }
  if (user.role === ROLES.MIDDLEMAN) {
    return formMerchants.value.filter(m => m.userId === user.id)
  }
  if (user.parentId) {
    return formMerchants.value.filter(m => m.userId === user.parentId)
  }
  return []
})

// 页面级根据角色过滤员工
const formFilteredWorkers = computed(() => {
  const user = userStore.currentUser
  if (!user) return []

  if (user.role === ROLES.ADMIN) {
    return formWorkers.value
  }
  if (user.role === ROLES.MIDDLEMAN) {
    return formWorkers.value.filter(w => w.userId === user.id)
  }
  if (user.parentId) {
    return formWorkers.value.filter(w => w.userId === user.parentId)
  }
  return []
})

onShow(() => {
  // 加载商户和员工数据（页面级别独立加载，不依赖 store 缓存）
  loadFormData()
  // 页面显示时加载数据
  transactionStore.loadTransactions(true)
  unsubscribe = subscribe('transaction:refresh', () => {
    transactionStore.loadTransactions(true)
  })
})

onHide(() => {
  if (unsubscribe) { unsubscribe(); unsubscribe = null }
})

const form = reactive({
  type: 'payment_to_merchant',
  targetId: '',
  amount: null,
  date: new Date().toISOString().split('T')[0],
  note: ''
})

const targetOptions = computed(() =>
  form.type === 'payment_to_merchant'
    ? formFilteredMerchants.value
    : formFilteredWorkers.value
)

const selectedTarget = computed(() => {
  if (form.type === 'payment_to_merchant') {
    return formFilteredMerchants.value.find(m => m.id === form.targetId)
  }
  return formFilteredWorkers.value.find(w => w.id === form.targetId)
})

const recentTransactions = computed(() =>
  transactionStore.transactions.slice().reverse().slice(0, 20).map(t => ({
    ...t,
    targetName: t.type === 'payment_to_merchant'
      ? formFilteredMerchants.find(m => m.id === t.targetId)?.name
      : formFilteredWorkers.find(w => w.id === t.targetId)?.name
  }))
)

const onTargetChange = (e) => {
  form.targetId = targetOptions.value[e.detail.value]?.id || ''
}

const onDateChange = (e) => { form.date = e.detail.value }

const addTransaction = () => {
  if (!form.targetId || !form.amount) {
    uni.showToast({ title: '请完善信息', icon: 'none' })
    return
  }

  transactionStore.addTransaction({
    type: form.type,
    targetId: form.targetId,
    amount: form.amount,
    date: form.date,
    note: form.note
  })

  uni.showToast({ title: '结账成功', icon: 'success' })
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

// 下拉刷新
const onRefresh = async () => {
  await transactionStore.loadTransactions(true)
}

// 上拉加载
const onLoadMore = () => {
  transactionStore.loadMore()
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
.loading-tip { text-align: center; color: #999; padding: 20px; }
.scroll-container { height: calc(100vh - 350px); }
</style>
