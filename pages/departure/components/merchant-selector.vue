<template>
  <view v-if="visible" class="merchant-selector-mask" @click="onCancel">
    <view class="merchant-selector-modal" @click.stop>
      <view class="modal-header">
        <text class="modal-title">选择鸡场</text>
        <text class="modal-close" @click="onCancel">×</text>
      </view>
      <view class="merchant-grid">
        <view
          v-for="merchant in merchants"
          :key="merchant.id"
          :class="['merchant-btn', {
            'merchant-btn-selected': selectedMerchantId === merchant.id,
            'merchant-btn-disabled': isMerchantSelected(merchant.id)
          }]"
          @click="onMerchantClick(merchant)"
        >
          <text class="merchant-name">{{ merchant.name }}</text>
          <!-- <text class="merchant-margin">差额: {{ merchant.margin }}</text> -->
        </view>
      </view>
      <view class="modal-footer">
        <button class="btn-cancel" @click="onCancel">取消</button>
        <button class="btn-confirm" @click="onConfirm">确认</button>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  merchants: {
    type: Array,
    default: () => []
  },
  // 已选中的鸡场ID列表（用于置灰）
  selectedMerchantIds: {
    type: Array,
    default: () => []
  },
  // 当前行正在编辑的鸡场ID（用于回填时不把自己置灰）
  currentMerchantId: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:visible', 'confirm'])

// 本地选中状态
const selectedMerchantId = ref('')

// 检查鸡场是否已被选中（排除当前行）
const isMerchantSelected = (merchantId) => {
  if (merchantId === props.currentMerchantId) {
    return false
  }
  return props.selectedMerchantIds.includes(merchantId)
}

// 点击鸡场按钮
const onMerchantClick = (merchant) => {
  // 如果已选中或被禁用，不响应
  if (isMerchantSelected(merchant.id)) {
    return
  }
  selectedMerchantId.value = merchant.id
}

// 确认选择
const onConfirm = () => {
  const merchant = props.merchants.find(m => m.id === selectedMerchantId.value)
  if (merchant) {
    emit('confirm', { ...merchant })
  }
  closeModal()
}

// 取消
const onCancel = () => {
  closeModal()
}

// 关闭弹窗
const closeModal = () => {
  selectedMerchantId.value = ''
  emit('update:visible', false)
}

// 监听visible变化，重置选中状态
watch(() => props.visible, (newVal) => {
  if (!newVal) {
    selectedMerchantId.value = ''
  }
})
</script>

<style scoped>
.merchant-selector-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 999;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.merchant-selector-modal {
  width: 100%;
  max-height: 70vh;
  background: #fff;
  border-radius: 16px 16px 0 0;
  padding-bottom: env(safe-area-inset-bottom);
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  border-bottom: 1px solid #f0f0f0;
}

.modal-title {
  font-size: 16px;
  font-weight: bold;
}

.modal-close {
  font-size: 24px;
  color: #999;
  padding: 0 5px;
}

.merchant-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  padding: 15px 20px;
  overflow-y: auto;
  max-height: 50vh;
}

.merchant-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 15px 10px;
  background: #f5f5f5;
  border-radius: 8px;
  border: 2px solid transparent;
}

.merchant-btn-selected {
  background: #e6f4ff;
  border-color: #007aff;
}

.merchant-btn-disabled {
  background: #f0f0f0;
  opacity: 0.6;
}

.merchant-btn-disabled .merchant-name,
.merchant-btn-disabled .merchant-margin {
  color: #ccc;
}

.merchant-name {
  font-size: 14px;
  color: #333;
  margin-bottom: 4px;
  text-align: center;
}

.merchant-margin {
  font-size: 12px;
  color: #666;
}

.merchant-btn-selected .merchant-name {
  color: #007aff;
  font-weight: bold;
}

.merchant-btn-selected .merchant-margin {
  color: #007aff;
}

.modal-footer {
  display: flex;
  gap: 15px;
  padding: 15px 20px;
  border-top: 1px solid #f0f0f0;
}

.btn-cancel, .btn-confirm {
  flex: 1;
  height: 44px;
  line-height: 44px;
  border-radius: 8px;
  font-size: 16px;
}

.btn-cancel {
  background: #f5f5f5;
  color: #666;
}

.btn-confirm {
  background: #007aff;
  color: #fff;
}
</style>
