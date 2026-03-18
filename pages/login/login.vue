<template>
  <view class="login-container">
    <view class="login-header">
      <text class="title">发车日记</text>
      <text class="subtitle">登录您的账号</text>
    </view>

    <view class="login-form">
      <view class="form-item">
        <text class="label">手机号</text>
        <input
          class="input"
          v-model="phone"
          type="number"
          placeholder="请输入手机号"
          maxlength="11"
        />
      </view>

      <view class="form-item" v-if="!showRoleSelect">
        <text class="label">邀请码</text>
        <input
          class="input"
          v-model="inviteCode"
          type="number"
          placeholder="请输入邀请码(选填)"
          maxlength="6"
        />
      </view>

      <!-- 角色选择 -->
      <view class="form-item" v-if="showRoleSelect">
        <text class="label">选择角色</text>
        <view class="role-list">
          <view
            v-for="role in roles"
            :key="role.value"
            class="role-item"
            :class="{ active: selectedRole === role.value }"
            @click="selectedRole = role.value"
          >
            <text class="role-name">{{ role.label }}</text>
            <text class="role-desc">{{ role.desc }}</text>
          </view>
        </view>
      </view>

      <view class="login-btn" @click="handleLogin">
        <text class="btn-text">{{ showRoleSelect ? '注册并登录' : '登录' }}</text>
      </view>

      <view class="tips" v-if="!showRoleSelect">
        <text class="tip-text">首次登录请输入邀请码，或选择角色注册</text>
      </view>
    </view>

    <!-- 提示信息 -->
    <view class="toast" v-if="message">
      <text class="toast-text">{{ message }}</text>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useUserStore, ROLES } from '@/store/user'

const userStore = useUserStore()

const phone = ref('')
const inviteCode = ref('')
const selectedRole = ref('')
const showRoleSelect = ref(false)
const message = ref('')

const roles = [
  { value: ROLES.MIDDLEMAN, label: '中间商', desc: '管理装发车人员和鸡场' },
  { value: ROLES.LOADER, label: '装发车', desc: '填写发车记录' },
  { value: ROLES.FARM, label: '鸡场', desc: '查看交易记录' }
]

// 检查是否已登录
onShow(() => {
  if (userStore.isLoggedIn) {
    uni.switchTab({
      url: '/pages/home/home'
    })
  }
})

const showMessage = (msg) => {
  message.value = msg
  setTimeout(() => {
    message.value = ''
  }, 2000)
}

const validatePhone = () => {
  if (!phone.value) {
    showMessage('请输入手机号')
    return false
  }
  if (phone.value.length !== 11) {
    showMessage('请输入正确的手机号')
    return false
  }
  return true
}

const handleLogin = async () => {
  if (!validatePhone()) return

  // 如果显示角色选择
  if (showRoleSelect.value) {
    if (!selectedRole.value) {
      showMessage('请选择角色')
      return
    }
    const result = await userStore.selectRole(phone.value, selectedRole.value)
    if (result.success) {
      uni.switchTab({
        url: '/pages/home/home'
      })
    } else {
      showMessage(result.message || '登录失败')
    }
    return
  }

  // 正常登录
  const result = await userStore.login(phone.value, inviteCode.value)

  if (result.success) {
    uni.switchTab({
      url: '/pages/home/home'
    })
  } else if (result.needSelectRole) {
    // 需要选择角色
    showRoleSelect.value = true
  } else {
    showMessage(result.message || '登录失败')
  }
}
</script>

<style lang="scss" scoped>
.login-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 120rpx 60rpx 60rpx;
}

.login-header {
  text-align: center;
  margin-bottom: 80rpx;

  .title {
    display: block;
    font-size: 56rpx;
    font-weight: bold;
    color: #fff;
    margin-bottom: 20rpx;
  }

  .subtitle {
    font-size: 28rpx;
    color: rgba(255, 255, 255, 0.8);
  }
}

.login-form {
  background: #fff;
  border-radius: 24rpx;
  padding: 60rpx 40rpx;
  box-shadow: 0 20rpx 60rpx rgba(0, 0, 0, 0.1);
}

.form-item {
  margin-bottom: 40rpx;

  .label {
    display: block;
    font-size: 28rpx;
    color: #333;
    margin-bottom: 16rpx;
    font-weight: 500;
  }

  .input {
    width: 100%;
    height: 88rpx;
    background: #f5f5f5;
    border-radius: 12rpx;
    padding: 0 24rpx;
    font-size: 28rpx;
    box-sizing: border-box;
  }
}

.role-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.role-item {
  padding: 24rpx;
  background: #f5f5f5;
  border-radius: 12rpx;
  border: 2rpx solid transparent;
  transition: all 0.3s;

  &.active {
    background: #f0f7ff;
    border-color: #007aff;
  }

  .role-name {
    display: block;
    font-size: 30rpx;
    font-weight: 500;
    color: #333;
    margin-bottom: 8rpx;
  }

  .role-desc {
    font-size: 24rpx;
    color: #999;
  }
}

.login-btn {
  width: 100%;
  height: 96rpx;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 40rpx;

  .btn-text {
    font-size: 32rpx;
    font-weight: 500;
    color: #fff;
  }
}

.tips {
  margin-top: 40rpx;
  text-align: center;

  .tip-text {
    font-size: 24rpx;
    color: #999;
  }
}

.toast {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(0, 0, 0, 0.7);
  padding: 24rpx 48rpx;
  border-radius: 12rpx;
  z-index: 1000;

  .toast-text {
    color: #fff;
    font-size: 28rpx;
  }
}
</style>
