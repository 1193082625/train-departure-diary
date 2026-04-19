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
          <!-- <text class="tip-text" v-else>请输入密码登录</text> -->
        </view>

        <!-- 协议同意 -->
        <view class="agreement-row">
          <checkbox-group @change="onAgreementChange">
            <label class="agreement-label">
              <checkbox :checked="agreedToAgreement" color="#667eea" style="transform: scale(0.8)" />
              <text class="agreement-text">我已阅读并同意</text>
            </label>
          </checkbox-group>
          <view class="agreement-links">
            <text class="link" @click="showUserAgreement">《用户服务协议》</text>
            <text class="link" @click="showPrivacyPolicy">《隐私政策》</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 提示信息 -->
    <view class="toast" v-if="message">
      <text class="toast-text">{{ message }}</text>
    </view>

    <!-- 用户服务协议弹窗 -->
    <view class="agreement-popup" v-if="showAgreementPopup === 'user'" @click="closePopup">
      <view class="popup-content" @click.stop>
        <view class="popup-header">
          <text class="popup-title">用户服务协议</text>
          <text class="popup-close" @click="closePopup">×</text>
        </view>
        <scroll-view class="popup-body" scroll-y>
          <view class="policy-content">
            <text class="policy-text">一、服务说明\n\n本应用"发车日记"是一款面向家禽运输行业的车辆调度和交易记录管理工具。\n\n二、用户信息收集\n\n为提供完整服务，我们会收集以下用户信息：\n1. 手机号：用于账号注册和登录验证\n2. 密码：用于账号安全验证\n3. 昵称：用于显示用户身份\n4. 员工信息：姓名、电话、类型\n5. 商户信息：名称、联系人、电话、地址\n6. 交易记录：发车记录、费用信息等\n\n三、信息使用目的\n\n收集的信息仅用于：\n1. 提供用户身份验证服务\n2. 管理员工和商户信息\n3. 记录和分析交易数据\n4. 改进产品功能和服务质量\n\n四、信息存储\n\n用户信息存储在加密的云端数据库中，我们承诺采取合理的安全措施保护用户数据。\n\n五、用户权利\n\n用户有权查看、修改或删除个人信息，如需帮助请联系客服。\n\n六、协议更新\n\n我们保留随时更新本协议的权利，更新后的协议将在应用内公布。</text>
          </view>
        </scroll-view>
        <view class="popup-footer">
          <view class="popup-btn" @click="agreeAndClose('user')">
            <text>我已阅读并同意</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 隐私政策弹窗 -->
    <view class="agreement-popup" v-if="showAgreementPopup === 'privacy'" @click="closePopup">
      <view class="popup-content" @click.stop>
        <view class="popup-header">
          <text class="popup-title">隐私政策</text>
          <text class="popup-close" @click="closePopup">×</text>
        </view>
        <scroll-view class="popup-body" scroll-y>
          <view class="policy-content">
            <text class="policy-text">一、信息收集\n\n我们收集您主动提供的信息，包括：\n• 手机号码（用于账号注册和登录）\n• 密码（用于账号安全验证）\n• 昵称（用于显示用户身份）\n• 员工信息（姓名、电话、类型）\n• 商户信息（名称、联系人、电话、地址）\n• 业务数据（发车记录、交易信息等）\n\n二、信息使用\n\n我们仅使用收集的信息用于：\n1. 提供核心功能服务\n2. 保障账号安全\n3. 优化用户体验\n4. 合法的商业用途\n\n三、信息共享\n\n我们承诺不会出售、出租或以其他方式向第三方披露您的个人信息，但以下情况除外：\n• 获得您的明确同意\n• 根据法律法规的要求\n• 保护我们的合法权益\n\n四、信息安全\n\n我们采用行业标准的安全措施保护您的数据，包括数据加密、访问控制等。\n\n五、用户权利\n\n您有权：\n• 访问您的个人信息\n• 更正不准确的信息\n• 删除您的个人信息\n• 撤回同意\n\n如有任何问题，请联系我们。</text>
          </view>
        </scroll-view>
        <view class="popup-footer">
          <view class="popup-btn" @click="agreeAndClose('privacy')">
            <text>我已阅读并同意</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useUserStore, ROLES } from '@/store/user'
import { validatePhone } from '@/utils/validate'
import request from '@/api/request'
import toast from '@/utils/toast'

const userStore = useUserStore()

const phone = ref('')
const inviteCode = ref('')
const message = ref('')
const loginType = ref('') // 'invite' 或 'password'
const showSetPassword = ref(false)
const password = ref('')
const confirmPassword = ref('')
const loginLoading = ref(false) // 是否为完整正确的手机号
const phoneChecked = ref(false) // 是否已检查过手机号
const agreedToAgreement = ref(false) // 是否同意协议
const showAgreementPopup = ref('') // 显示协议弹窗 '' | 'user' | 'privacy'

// 监听手机号输入变化
const handlePhoneInput = async () => {
  // 当手机号达到11位时，检查是否已注册
  if (validatePhone(phone.value)) {
    // checkPhoneExists 内部会确保数据库就绪
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

// 协议勾选
const onAgreementChange = (e) => {
  agreedToAgreement.value = e.detail.value.length > 0
}

// 显示用户服务协议
const showUserAgreement = () => {
  showAgreementPopup.value = 'user'
}

// 显示隐私政策
const showPrivacyPolicy = () => {
  showAgreementPopup.value = 'privacy'
}

// 关闭弹窗
const closePopup = () => {
  showAgreementPopup.value = ''
}

// 同意并关闭
const agreeAndClose = (type) => {
  agreedToAgreement.value = true
  closePopup()
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

  // 检查是否同意协议
  if (!agreedToAgreement.value) {
    showMessage('请先阅读并同意用户协议和隐私政策')
    return
  }

  loginLoading.value = true
  toast.loading('登录中...')

  const result = await userStore.login(phone.value, inviteCode.value)

  loginLoading.value = false
  toast.hideLoading()

  if (result.success) {
    // 需要设置密码（首次登录的新用户或未设置密码的用户）
    if (result.needSetPassword) {
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

  loginLoading.value = true
  toast.loading('设置中...')

  const result = await userStore.setPassword(password.value)

  loginLoading.value = false
  toast.hideLoading()

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

.agreement-row {
  margin-top: 30rpx;
  display: flex;
  flex-direction: column;
  align-items: center;

  .agreement-label {
    display: flex;
    align-items: center;
    justify-content: center;

    .agreement-text {
      font-size: 24rpx;
      color: #666;
    }
  }

  .agreement-links {
    display: flex;
    gap: 10rpx;
    margin-top: 8rpx;

    .link {
      font-size: 24rpx;
      color: #667eea;
    }
  }
}

.agreement-popup {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 999;
  display: flex;
  align-items: center;
  justify-content: center;

  .popup-content {
    width: 90%;
    max-height: 80vh;
    background: #fff;
    border-radius: 24rpx;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .popup-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 30rpx;
    border-bottom: 1rpx solid #eee;

    .popup-title {
      font-size: 32rpx;
      font-weight: bold;
      color: #333;
    }

    .popup-close {
      font-size: 50rpx;
      color: #999;
      line-height: 1;
    }
  }

  .popup-body {
    flex: 1;
    padding: 30rpx;
    max-height: 50vh;
    box-sizing: border-box;

    .policy-content {
      .policy-text {
        font-size: 26rpx;
        color: #666;
        line-height: 1.8;
        white-space: pre-wrap;
      }
    }
  }

  .popup-footer {
    padding: 60rpx 30rpx 30rpx;
    border-top: 1rpx solid #eee;

    .popup-btn {
      width: 100%;
      height: 88rpx;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 44rpx;
      display: flex;
      align-items: center;
      justify-content: center;

      text {
        font-size: 28rpx;
        color: #fff;
      }
    }
  }
}
</style>
