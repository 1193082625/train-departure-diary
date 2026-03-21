<template>
  <!-- 鸡场管理页面 -->
  <view class="merchant-page">
    <view class="header">
      <text class="title">鸡场管理</text>
      <button class="add-btn" size="mini" @click="showAddModal = true">+ 添加</button>
    </view>

    <view class="merchant-list">
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
import { ref, reactive } from 'vue'
import { useMerchantStore } from '@/store/merchant'

const merchantStore = useMerchantStore()

const showAddModal = ref(false)
const editingMerchant = ref(null)
const form = reactive({
  name: '',
  phone: '',
  margin: null
})

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
</style>
