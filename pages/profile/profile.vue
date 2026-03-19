<template>
  <view class="profile-container">
    <!-- 用户信息 -->
    <view class="user-card">
      <view class="avatar">
        <text class="avatar-text">{{ avatarText }}</text>
      </view>
      <view class="user-info">
        <text class="nickname">{{ currentUser?.nickname || '未设置昵称' }}</text>
        <text class="role-tag">{{ roleName }}</text>
      </view>
      <view class="phone">{{ currentUser?.phone }}</view>
    </view>

    <!-- 菜单列表 -->
    <view class="menu-list">
      <!-- 邀请码管理 - 中间商和管理员可见 -->
      <view class="menu-item" @click="goToInvitation" v-if="canGenerateCode">
        <view class="menu-left">
          <text class="menu-icon">&#xe7ee;</text>
          <text class="menu-text">邀请码管理</text>
        </view>
        <text class="arrow" decode>&gt;</text>
      </view>

      <!-- 我的邀请码 -->
      <view class="menu-item" @click="showMyCode">
        <view class="menu-left">
          <text class="menu-icon">&#xe7ef;</text>
          <text class="menu-text">我的邀请码</text>
        </view>
        <view class="code-display">
          <text>{{ currentUser?.inviteCode || '无' }}</text>
          <text class="arrow" decode>&gt;</text>
        </view>
      </view>

      <!-- 修改密码 -->
      <view class="menu-item" @click="changePassword">
        <view class="menu-left">
          <text class="menu-icon">&#xe7e1;</text>
          <text class="menu-text">修改密码</text>
        </view>
        <text class="arrow" decode>&gt;</text>
      </view>

      <!-- 编辑资料 -->
      <view class="menu-item" @click="editProfile">
        <view class="menu-left">
          <text class="menu-icon">&#xe7f0;</text>
          <text class="menu-text">编辑资料</text>
        </view>
        <text class="arrow" decode>&gt;</text>
      </view>
    </view>

    <!-- 退出登录 -->
    <view class="logout-btn" @click="handleLogout">
      <text class="logout-text">退出登录</text>
    </view>

    <!-- 提示信息 -->
    <view class="toast" v-if="message">
      <text class="toast-text">{{ message }}</text>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useUserStore, ROLE_NAMES, ROLES } from '@/store/user'

const userStore = useUserStore()
const message = ref('')

const currentUser = computed(() => userStore.currentUser)
const roleName = computed(() => currentUser.value?.role ? ROLE_NAMES[currentUser.value.role] : '未设置')

const avatarText = computed(() => {
  const nickname = currentUser.value?.nickname || currentUser.value?.phone || '?'
  return nickname.charAt(0).toUpperCase()
})

// 是否可以生成邀请码
const canGenerateCode = computed(() => {
  return userStore.isAdmin || userStore.isMiddleman
})

const showMessage = (msg) => {
  message.value = msg
  setTimeout(() => {
    message.value = ''
  }, 2000)
}

const goToInvitation = () => {
  uni.navigateTo({
    url: '/pages/profile/invitation'
  })
}

const showMyCode = () => {
  if (currentUser.value?.inviteCode) {
    uni.showModal({
      title: '我的邀请码',
      content: currentUser.value.inviteCode,
      showCancel: false,
      success: () => {
        // 复制到剪贴板
        uni.setClipboardData({
          data: currentUser.value.inviteCode,
          success: () => {
            uni.showToast({ title: '已复制' })
          }
        })
      }
    })
  } else {
    showMessage('暂无邀请码')
  }
}

const editProfile = () => {
  uni.showModal({
    title: '编辑资料',
    placeholderText: '请输入昵称',
    editable: true,
    success: (res) => {
      if (res.confirm && res.value) {
        userStore.updateUser({ nickname: res.value })
        showMessage('昵称已更新')
      }
    }
  })
}

const changePassword = () => {
  uni.showModal({
    title: '修改密码',
    placeholderText: '请输入原密码',
    editable: true,
    success: async (res) => {
      console.log('修改密码结果:', res);
      
      if (res.confirm && res.value) {
        const oldPassword = res.value
        // 弹出输入新密码
        uni.showModal({
          title: '输入新密码',
          placeholderText: '请输入新密码（6位以上）',
          editable: true,
          success: async (res2) => {
            console.log(222);
            
            if (res2.confirm && res2.value) {
              const newPassword = res2.value
              if (newPassword.length < 6) {
                showMessage('密码至少6位')
                return
              }
              const result = await userStore.changePassword(oldPassword, newPassword)
              if (result.success) {
                showMessage('密码修改成功')
              } else {
                showMessage(result.message || '修改失败')
              }
            }
          }
        })
      }
    }
  })
}

const handleLogout = () => {
  uni.showModal({
    title: '提示',
    content: '确定要退出登录吗？',
    success: (res) => {
      if (res.confirm) {
        userStore.logout()
        uni.reLaunch({
          url: '/pages/login/login'
        })
      }
    }
  })
}
</script>

<style lang="scss" scoped>
.profile-container {
  min-height: 100vh;
  background: #f5f5f5;
  padding: 30rpx;
}

.user-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 24rpx;
  padding: 60rpx 40rpx;
  text-align: center;
  margin-bottom: 30rpx;

  .avatar {
    width: 140rpx;
    height: 140rpx;
    background: rgba(255, 255, 255, 0.3);
    border-radius: 50%;
    margin: 0 auto 30rpx;
    display: flex;
    align-items: center;
    justify-content: center;

    .avatar-text {
      font-size: 56rpx;
      font-weight: bold;
      color: #fff;
    }
  }

  .user-info {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 20rpx;
    margin-bottom: 16rpx;

    .nickname {
      font-size: 36rpx;
      font-weight: 500;
      color: #fff;
    }

    .role-tag {
      font-size: 22rpx;
      color: #fff;
      background: rgba(255, 255, 255, 0.2);
      padding: 6rpx 16rpx;
      border-radius: 20rpx;
    }
  }

  .phone {
    font-size: 26rpx;
    color: rgba(255, 255, 255, 0.8);
  }
}

.menu-list {
  background: #fff;
  border-radius: 16rpx;
  overflow: hidden;
}

.menu-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 32rpx;
  border-bottom: 1rpx solid #f0f0f0;

  &:last-child {
    border-bottom: none;
  }

  .menu-left {
    display: flex;
    align-items: center;
    gap: 20rpx;

    .menu-icon {
      font-size: 40rpx;
      color: #007aff;
    }

    .menu-text {
      font-size: 28rpx;
      color: #333;
    }
  }

  .arrow {
    font-size: 28rpx;
    color: #999;
  }

  .code-display {
    display: flex;
    align-items: center;
    gap: 10rpx;
    font-size: 28rpx;
    color: #333;
  }
}

.logout-btn {
  margin-top: 60rpx;
  background: #fff;
  border-radius: 16rpx;
  padding: 32rpx;
  text-align: center;

  .logout-text {
    font-size: 28rpx;
    color: #f56c6c;
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
