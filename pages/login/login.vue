<template>
  <view class="login-container">
    <view class="login-header">
      <text class="title">发车日记</text>
      <text class="subtitle">{{ showSetPassword ? '设置密码' : '登录您的账号' }}</text>
    </view>

    <view class="login-form">
      <!-- 设置密码页面 -->
      <view v-if="showSetPassword">
        <view class="form-item">
          <text class="label">请输入密码</text>
          <input
            class="input"
            v-model="password"
            type="text"
            password
            placeholder="请输入6位以上密码"
            maxlength="20"
          />
        </view>
        <view class="form-item">
          <text class="label">请再次输入密码</text>
          <input
            class="input"
            v-model="confirmPassword"
            type="text"
            password
            placeholder="请再次输入密码"
            maxlength="20"
          />
        </view>
        <view class="login-btn" @click="handleSetPassword">
          <text class="btn-text">确认设置</text>
        </view>
      </view>

      <!-- 登录页面 -->
      <view v-else>
        <view class="form-item">
          <text class="label">手机号</text>
          <input
            class="input"
            v-model="phone"
            type="number"
            placeholder="请输入手机号"
            maxlength="11"
            @input="handlePhoneInput"
          />
        </view>

        <view class="form-item" v-if="loginType !== ''">
          <text class="label">{{ loginType === 'invite' ? '邀请码' : '密码' }}</text>
          <input
            class="input"
            v-model="inviteCode"
            :type="loginType === 'invite' ? 'number' : 'text'"
            :password="loginType !== 'invite'"
            :placeholder="loginType === 'invite' ? '请输入邀请码' : '请输入密码'"
            maxlength="20"
          />
        </view>

        <view class="login-btn" @click="handleLogin">
          <text class="btn-text">登录</text>
        </view>

        <view class="tips">
          <text class="tip-text" v-if="loginType === 'invite'">首次登录请输入邀请码</text>
          <text class="tip-text" v-else>请输入密码登录</text>
        </view>
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
import { validatePhone } from '@/utils/validate'

const userStore = useUserStore()

const phone = ref('')
const inviteCode = ref('')
const message = ref('')
const loginType = ref('') // 'invite' 或 'password'
const showSetPassword = ref(false)
const password = ref('')
const confirmPassword = ref('')
// 是否为完整正确的手机号
const phoneChecked = ref(false) // 是否已检查过手机号

// 监听手机号输入变化
const handlePhoneInput = async () => {
  // 当手机号达到11位时，检查是否已注册
  if (validatePhone(phone.value)) {
    const exists = await userStore.checkPhoneExists(phone.value)
    phoneChecked.value = true
    if (exists) {
      loginType.value = 'password'
    } else {
      loginType.value = 'invite'
    }
  } else {
    phoneChecked.value = false
    loginType.value = ''
    inviteCode.value = ''
  }
}

const roles = [
  { value: ROLES.MIDDLEMAN, label: '中间商', desc: '管理装发车人员和鸡场' },
  { value: ROLES.LOADER, label: '装发车', desc: '填写发车记录' },
  { value: ROLES.FARM, label: '鸡场', desc: '查看交易记录' }
]

// 检查是否已登录
onShow(() => {
  const userData = uni.getStorageSync('currentUser')
  // serStore.isLoggedIn
  if (userData) {
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

const validatePhoneInput = () => {
  if (!phone.value) {
    showMessage('请输入手机号')
    return false
  }
  if (!validatePhone(phone.value)) {
    showMessage('请输入正确的手机号')
    return false
  }
  return true
}

const handleLogin = async () => {
  if (!validatePhoneInput()) return

  // 检查是否只输入了手机号
  if (!inviteCode.value) {
    showMessage('请输入邀请码或密码')
    return
  }

  const result = await userStore.login(phone.value, inviteCode.value)

  if (result.success) {
    // 需要设置密码
    if (!result.user.password) {
      showSetPassword.value = true
    } else {
      uni.switchTab({
        url: '/pages/home/home'
      })
    }
  } else {
    // 登录失败，检查是否需要切换登录方式
    if (result.message === '请输入密码') {
      loginType.value = 'password'
      inviteCode.value = ''
    } else if (result.message === '请输入邀请码') {
      loginType.value = 'invite'
      inviteCode.value = ''
    }
    showMessage(result.message || '登录失败')
  }
}

const handleSetPassword = async () => {
  if (!password.value) {
    showMessage('请输入密码')
    return
  }
  if (password.value.length < 6) {
    showMessage('密码至少6位')
    return
  }
  if (password.value !== confirmPassword.value) {
    showMessage('两次密码不一致')
    return
  }

  const result = await userStore.setPassword(password.value)
  if (result.success) {
    uni.switchTab({
      url: '/pages/home/home'
    })
  } else {
    showMessage(result.message || '设置密码失败')
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
