<template>
  <view class="feedback-container">
    <view class="form-card">
      <!-- 标题 -->
      <view class="form-item">
        <text class="label">标题</text>
        <input
          class="input"
          v-model="formData.title"
          placeholder="请输入问题标题"
          placeholder-class="placeholder"
        />
      </view>

      <!-- 类型 -->
      <view class="form-item">
        <text class="label">类型</text>
        <picker
          :value="typeIndex"
          :range="typeOptions"
          range-key="label"
          @change="onTypeChange"
        >
          <view class="picker-value">
            <text>{{ typeOptions[typeIndex].label }}</text>
            <image class="arrow-icon" src="/static/svg/arrow-right.svg" mode="aspectFit"></image>
          </view>
        </picker>
      </view>

      <!-- 优先级 -->
      <view class="form-item">
        <text class="label">优先级</text>
        <picker
          :value="priorityIndex"
          :range="priorityOptions"
          range-key="label"
          @change="onPriorityChange"
        >
          <view class="picker-value">
            <text>{{ priorityOptions[priorityIndex].label }}</text>
            <image class="arrow-icon" src="/static/svg/arrow-right.svg" mode="aspectFit"></image>
          </view>
        </picker>
      </view>

      <!-- 描述 -->
      <view class="form-item">
        <text class="label">描述</text>
        <textarea
          class="textarea"
          v-model="formData.description"
          placeholder="请详细描述您的问题或建议..."
          placeholder-class="placeholder"
          :maxlength="500"
        />
        <text class="word-count">{{ formData.description.length }}/500</text>
      </view>

      <!-- 提交按钮 -->
      <view class="submit-btn" @click="handleSubmit">
        <text class="submit-text">提交反馈</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, reactive } from 'vue'
import toast from '@/utils/toast'

const typeOptions = [
  { label: '问题', value: 'issue' },
  { label: '需求', value: 'feature' }
]

const priorityOptions = [
  { label: '低', value: 'low' },
  { label: '中', value: 'medium' },
  { label: '高', value: 'high' }
]

const typeIndex = ref(0)
const priorityIndex = ref(0)

const formData = reactive({
  title: '',
  description: ''
})

const onTypeChange = (e) => {
  typeIndex.value = e.detail.value
}

const onPriorityChange = (e) => {
  priorityIndex.value = e.detail.value
}

const handleSubmit = async () => {
  if (!formData.title.trim()) {
    toast.show('请输入标题')
    return
  }
  if (!formData.description.trim()) {
    toast.show('请输入描述')
    return
  }

  const feedback = {
    title: formData.title.trim(),
    type: typeOptions[typeIndex.value].value,
    priority: priorityOptions[priorityIndex.value].value,
    description: formData.description.trim(),
    createTime: Date.now()
  }

  console.log('提交反馈:', feedback)
  toast.show('反馈已提交，感谢您的建议')

  // 重置表单
  formData.title = ''
  formData.description = ''
  typeIndex.value = 0
  priorityIndex.value = 0
}
</script>

<style lang="scss" scoped>
.feedback-container {
  min-height: 100vh;
  background: #f5f5f5;
  padding: 30rpx;
}

.form-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 0 30rpx;
}

.form-item {
  padding: 32rpx 0;
  border-bottom: 1rpx solid #f0f0f0;

  &:last-of-type {
    border-bottom: none;
  }

  .label {
    display: block;
    font-size: 28rpx;
    color: #333;
    font-weight: 500;
    margin-bottom: 20rpx;
  }

  .input {
    width: 100%;
    height: 80rpx;
    background: #f5f5f5;
    border-radius: 12rpx;
    padding: 0 24rpx;
    font-size: 28rpx;
    color: #333;
    box-sizing: border-box;
  }

  .textarea {
    width: 100%;
    height: 240rpx;
    background: #f5f5f5;
    border-radius: 12rpx;
    padding: 24rpx;
    font-size: 28rpx;
    color: #333;
    box-sizing: border-box;
    position: relative;
  }

  .word-count {
    display: block;
    text-align: right;
    font-size: 24rpx;
    color: #999;
    margin-top: 12rpx;
  }

  .picker-value {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    height: 80rpx;
    background: #f5f5f5;
    border-radius: 12rpx;
    padding: 0 24rpx;
    box-sizing: border-box;

    text {
      font-size: 28rpx;
      color: #333;
    }

    .arrow-icon {
      width: 32rpx;
      height: 32rpx;
    }
  }
}

.placeholder {
  color: #999;
}

.submit-btn {
  margin-top: 60rpx;
  margin-bottom: 60rpx;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 44rpx;
  padding: 28rpx;
  text-align: center;

  .submit-text {
    font-size: 32rpx;
    color: #fff;
    font-weight: 500;
  }
}
</style>
