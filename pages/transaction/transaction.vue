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
      <view class="filter-section">
        <text class="filter-label">筛选：</text>
        <picker :range="filterOptions" :range-key="'name'" @change="onFilterChange">
          <view class="filter-picker">
            {{ filterOptions.find(o => o.id === filterTargetId)?.name || '全部' }}
          </view>
        </picker>
      </view>

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

      <!-- 加载状态 -->
      <view v-if="loading" class="loading">
        <text>加载中...</text>
      </view>

      <!-- 加载更多 -->
      <view v-if="loadingMore" class="loading-more">
        <text>加载中...</text>
      </view>

      <!-- 没有更多数据了 -->
      <view v-else-if="hasMore === false && transactions.length > 0" class="no-more-data">
        <text>没有更多数据了</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, reactive, nextTick, watch } from 'vue'
import { onShow, onHide, onReachBottom, onPullDownRefresh } from '@dcloudio/uni-app'
import { apiOps, request } from '@/api'
import toast from '@/utils/toast'

// 交易记录（本地管理）
const transactions = ref([])
const loading = ref(false)
const loadingMore = ref(false)
const pagination = ref({
  page: 1,
  pageSize: 15,
  total: 0,
  totalPages: 0
})

// 筛选器状态
const filterTargetId = ref('')

// 筛选器选项（包含"全部"选项）
const filterOptions = computed(() => {
  const allOption = [{ id: '', name: '全部' }]
  if (form.type === 'payment_to_merchant') {
    return [...allOption, ...merchants.value]
  }
  return [...allOption, ...allWorkers.value]
})

const hasMore = computed(() => pagination.value.page < pagination.value.totalPages)

// 直接调用分页接口，绕过缓存
// appendMode: true 时追加数据，false 时替换数据
let lastScrollHeight = 0
const loadTransactions = async (page = 1, appendMode = false) => {
  if (appendMode) {
    loadingMore.value = true
    // 保存当前内容高度
    const query = uni.createSelectorQuery().select('.records')
    query.boundingClientRect((rect) => {
      if (rect) {
        lastScrollHeight = rect.height
      }
    }).exec()
  } else {
    loading.value = true
  }

  try {
    const type = form.type === 'payment_to_merchant' ? 'payment_to_merchant' : 'payment_to_worker'
    let url = `/transactions/list?page=${page}&pageSize=${pagination.value.pageSize}&sort=date&order=desc&type=${type}`
    if (filterTargetId.value) {
      url += `&targetId=${filterTargetId.value}`
    }
    const res = await request(url)
    const newData = res.data || []

    if (appendMode) {
      transactions.value = [...transactions.value, ...newData]
      // DOM 更新后恢复滚动位置
      nextTick(() => {
        const newQuery = uni.createSelectorQuery().select('.records')
        newQuery.boundingClientRect((rect) => {
          if (rect && lastScrollHeight > 0) {
            uni.pageScrollTo({
              scrollTop: rect.height - lastScrollHeight,
              duration: 0
            })
          }
        }).exec()
      })
    } else {
      transactions.value = newData
    }

    pagination.value.total = res.pagination?.total || 0
    pagination.value.totalPages = res.pagination?.totalPages || 0
    pagination.value.page = page
  } catch (e) {
    console.error('加载交易记录失败:', e)
    toast.error('加载交易记录失败')
    if (!appendMode) {
      transactions.value = []
    }
  } finally {
    loading.value = false
    loadingMore.value = false
  }
}

onShow(() => {
  loadWorkers()
  loadMerchants()
  loadTransactions(1)
})

// 上拉加载更多
onReachBottom(() => {
  if (!loadingMore.value && pagination.value.page < pagination.value.totalPages) {
    loadTransactions(pagination.value.page + 1, true)
  }
})

// 下拉刷新
onPullDownRefresh(() => {
  loadTransactions(1).then(() => {
    uni.stopPullDownRefresh()
  })
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

const getWorkerById = (id) => allWorkers.value.find(w => w.id === id)

// 商户数据（本地管理）
const merchants = ref([])

const loadMerchants = async () => {
  try {
    const res = await apiOps.queryAll('merchants')
    merchants.value = res.data || []
  } catch (e) {
    console.error('加载商户列表失败:', e)
    merchants.value = []
  }
}

const getMerchantById = (id) => merchants.value.find(m => m.id === id)

const form = reactive({
  type: 'payment_to_merchant',
  targetId: '',
  amount: null,
  date: new Date().toISOString().split('T')[0],
  note: ''
})

// 切换 tab 时重置筛选器
watch(() => form.type, () => {
  filterTargetId.value = ''
  loadTransactions(1)
})

// 筛选器变化时重新加载
watch(filterTargetId, () => {
  if (transactions.value.length > 0) {
    loadTransactions(1)
  }
})

const targetOptions = computed(() =>
  form.type === 'payment_to_merchant'
    ? merchants.value
    : allWorkers.value
)

const selectedTarget = computed(() => {
  if (form.type === 'payment_to_merchant') {
    return getMerchantById(form.targetId)
  }
  return getWorkerById(form.targetId)
})

const recentTransactions = computed(() =>
  transactions.value.map(t => ({
    ...t,
    targetName: t.type === 'payment_to_merchant'
      ? getMerchantById(t.targetId)?.name
      : getWorkerById(t.targetId)?.name
  }))
)

const onTargetChange = (e) => {
  form.targetId = targetOptions.value[e.detail.value]?.id || ''
}

const onFilterChange = (e) => {
  filterTargetId.value = filterOptions.value[e.detail.value]?.id || ''
}

const onDateChange = (e) => { form.date = e.detail.value }

const addTransaction = async () => {
  if (!form.targetId || !form.amount) {
    toast.error('请完善信息')
    return
  }

  try {
    // 根据 type 确定 targetType
    const targetType = form.type === 'payment_to_merchant' ? 'merchant' : 'worker'
    await apiOps.insert('transactions', {
      type: form.type,
      targetId: form.targetId,
      targetType,
      amount: form.amount,
      date: form.date,
      note: form.note
    })
    await loadTransactions()
    toast.success('结账成功')
    form.amount = null
    form.note = ''
  } catch (e) {
    toast.error('结账失败')
  }
}

const deleteTransaction = (id) => {
  uni.showModal({
    title: '确认删除',
    content: '确定要删除此记录吗？',
    success: async (res) => {
      if (res.confirm) {
        try {
          await apiOps.delete('transactions', id)
          await loadTransactions()
          toast.success('删除成功')
        } catch (e) {
          toast.error('删除失败')
        }
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
.filter-section {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
  padding-bottom: 10px;
  border-bottom: 1px solid #f0f0f0;
}
.filter-label { color: #666; font-size: 14px; }
.filter-picker {
  background: #f5f5f5;
  padding: 5px 15px;
  border-radius: 4px;
  font-size: 14px;
  color: #333;
}
.title { font-weight: bold; margin-bottom: 10px; display: block; }
.record-item { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #f0f0f0; }
.record-item:last-child { border-bottom: none; }
.record-info { display: flex; flex-direction: column; }
.target { font-weight: bold; }
.date { color: #999; font-size: 12px; }
.record-right { display: flex; align-items: center; gap: 10px; }
.amount { color: #ff4d4f; font-weight: bold; }
.delete { color: #999; font-size: 12px; }
.loading { text-align: center; padding: 20px; color: #999; }
.loading-more { text-align: center; padding: 15px; color: #999; font-size: 14px; }
.no-more-data { text-align: center; padding: 15px; color: #999; font-size: 14px; }
</style>
