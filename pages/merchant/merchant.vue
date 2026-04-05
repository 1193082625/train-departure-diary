<template>
  <!-- 鸡场管理页面 -->
  <view class="merchant-page">
    <view class="header">
      <text class="title">鸡场管理</text>
      <button v-if="userStore.isMiddleman" class="add-btn" size="mini" @click="showAddModal = true">+ 添加</button>
    </view>

    <view class="merchant-list">
      <!-- 按中间商分组展示（管理员视角） -->
      <uni-collapse v-if="userStore.isAdmin">
        <uni-collapse-item v-for="group in groupedMerchants" :key="group.id" :title="group.nickname || group.phone" :open="expandedGroups.has(group.id)" @toggle="toggleGroup(group.id)">
          <view v-for="merchant in group.merchants" :key="merchant.id" class="merchant-card">
            <view class="merchant-info">
              <text class="name">{{ merchant.name }}</text>
              <text class="phone">{{ merchant.phone }}</text>
            </view>
            <view class="merchant-margin">
              <text>差额: {{ merchant.margin }}元/框</text>
            </view>
            <view class="actions">
              <text @click="editMerchant(merchant)">编辑</text>
              <text @click="deleteMerchant(merchant.id)" class="delete">删除</text>
            </view>
          </view>
        </uni-collapse-item>
      </uni-collapse>

      <!-- 非管理员直接展示 -->
      <template v-else>
        <scroll-view scroll-y class="scroll-container" @scrolltolower="onLoadMore" :refresher-enabled="true" :refresher-triggered="merchantStore.refreshing" @refresherrefresh="onRefresh">
          <view v-for="merchant in merchantStore.filteredMerchants" :key="merchant.id" class="merchant-card">
            <view class="merchant-info">
              <text class="name">{{ merchant.name }}</text>
              <text class="phone">{{ merchant.phone }}</text>
            </view>
            <view class="merchant-margin">
              <text>差额: {{ merchant.margin }}元/框</text>
            </view>
            <view class="actions">
              <text @click="editMerchant(merchant)">编辑</text>
              <text @click="deleteMerchant(merchant.id)" class="delete">删除</text>
            </view>
          </view>
          <view v-if="merchantStore.loading && !merchantStore.refreshing" class="loading-tip">加载中...</view>
          <view v-if="!merchantStore.pagination.hasMore && merchantStore.filteredMerchants.length > 0" class="loading-tip">没有更多了</view>
        </scroll-view>
      </template>
    </view>

    <!-- 添加/编辑弹窗 -->
    <view v-if="showAddModal" class="modal-mask" @click="closeModal">
      <view class="modal" @click.stop>
        <text class="modal-title">{{ editingMerchant ? '编辑鸡场' : '添加鸡场' }}</text>
		<uni-forms :modelValue="form">
			<uni-forms-item label="姓名" name="name">
				<uni-easyinput type="text" v-model="form.name" placeholder="请输入姓名" />
			</uni-forms-item>
			<uni-forms-item label="手机号" name="phone">
				<uni-easyinput type="tel" v-model="form.phone" placeholder="请输入手机号" />
			</uni-forms-item>
			<uni-forms-item label="差额" name="margin">
				<uni-easyinput type="digit" v-model="form.margin" placeholder="差额（元/框）" />
			</uni-forms-item>
		</uni-forms>
        <view class="modal-actions">
          <button @click="closeModal">取消</button>
          <button @click="saveMerchant">保存</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { onShow, onHide } from '@dcloudio/uni-app'
import { useMerchantStore } from '@/store/merchant'
import { useUserStore } from '@/store/user'
import { subscribe } from '@/utils/eventBus'

const merchantStore = useMerchantStore()
const userStore = useUserStore()

let unsubscribe = null

onShow(() => {
  unsubscribe = subscribe('merchant:refresh', () => {
    merchantStore.loadMerchants(true)
  })
})

onHide(() => {
  if (unsubscribe) { unsubscribe(); unsubscribe = null }
})

const showAddModal = ref(false)
const editingMerchant = ref(null)
const form = reactive({
  name: '',
  phone: '',
  margin: null
})

// 分组展开状态
const expandedGroups = ref(new Set())

// 分组展示（管理员视角）
const groupedMerchants = computed(() => {
  const allMerchants = merchantStore.filteredMerchants
  const middlemen = userStore.middlemanList

  // 未选择中间商：显示所有分组
  return middlemen.map(mm => ({
    ...mm,
    merchants: allMerchants.filter(m => m.userId === mm.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  })).filter(g => g.merchants.length > 0)
})

// 切换分组展开状态
const toggleGroup = (groupId) => {
  if (expandedGroups.value.has(groupId)) {
    expandedGroups.value.delete(groupId)
  } else {
    expandedGroups.value.add(groupId)
  }
}

const editMerchant = (merchant) => {
  editingMerchant.value = merchant
  form.name = merchant.name
  form.phone = merchant.phone
  form.margin = merchant.margin
  showAddModal.value = true
}

const closeModal = () => {
  showAddModal.value = false
  editingMerchant.value = null
  form.name = ''
  form.phone = ''
  form.margin = null
}

const saveMerchant = () => {
  // 校验手机号格式
  if (!form.phone || !form.phone.match(/^1[3-9]\d{9}$/)) {
    uni.showToast({
      title: '请输入正确的手机号',
      icon: 'none'
    })
    return
  }
  // 校验差额必填
  if (!form.margin) {
    uni.showToast({
      title: '差额不能为空',
      icon: 'none'
    })
    return
  }
  const data = {
    name: form.name,
    phone: form.phone,
    margin: Number(form.margin) || 0
  }

  if (editingMerchant.value) {
    merchantStore.updateMerchant(editingMerchant.value.id, data)
  } else {
    merchantStore.addMerchant(data)
  }
  closeModal()
}

const deleteMerchant = (id) => {
  uni.showModal({
    title: '确认删除',
    content: '确定要删除此鸡场吗？',
    success: (res) => {
      if (res.confirm) {
        merchantStore.deleteMerchant(id)
      }
    }
  })
}

// 下拉刷新
const onRefresh = async () => {
  await merchantStore.loadMerchants(true)
}

// 上拉加载
const onLoadMore = () => {
  merchantStore.loadMore()
}
</script>

<style scoped>
.merchant-page { padding: 20px; }
.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.title { font-size: 20px; font-weight: bold; }
.add-btn { background: #007aff; color: #fff; padding: 8px 16px; border-radius: 4px; margin: 0;}
.merchant-card { background: #fff; padding: 15px; border-radius: 8px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; }
.merchant-info { display: flex; flex-direction: column; }
.name { font-size: 16px; font-weight: bold; }
.phone { color: #999; font-size: 14px; }
.merchant-margin { color: #fa8c16; font-size: 14px; }
.actions { display: flex; gap: 15px; }
.delete { color: #ff4d4f; }
.modal-mask { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; }
.modal { background: #fff; padding: 20px; border-radius: 8px; width: 80%; }
.modal-title { font-size: 18px; font-weight: bold; margin-bottom: 15px; display: block; }
.input { border: 1px solid #ddd; padding: 10px; border-radius: 4px; margin-bottom: 10px; width: 100%; box-sizing: border-box; }
.modal-actions { display: flex; gap: 10px; justify-content: flex-end; }
.loading-tip { text-align: center; color: #999; padding: 20px; }
.scroll-container { height: calc(100vh - 150px); }
</style>
