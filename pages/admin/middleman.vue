<template>
  <view class="middleman-page">
    <!-- 标题栏 -->
    <view class="header">
      <text class="title">中间商管理</text>
      <text class="subtitle">管理员视角</text>
    </view>

    <!-- 中间商列表 -->
    <view class="list-container">
      <view class="list-header">
        <text class="list-title">中间商列表</text>
        <text class="list-count">共 {{ middlemanList.length }} 个</text>
      </view>

      <view class="middleman-list" v-if="middlemanList.length > 0">
        <view
          class="middleman-item"
          v-for="middleman in middlemanList"
          :key="middleman.id"
        >
          <view class="item-info">
            <view class="item-avatar">{{ getAvatarText(middleman) }}</view>
            <view class="item-details">
              <text class="item-name">{{ middleman.nickname || middleman.phone }}</text>
              <text class="item-phone">{{ middleman.phone }}</text>
            </view>
          </view>
          <view class="item-actions">
            <text class="action-btn delete" @click="confirmDelete(middleman)">删除</text>
          </view>
        </view>
      </view>

      <view class="empty-state" v-else>
        <text class="empty-text">暂无中间商</text>
      </view>
    </view>

    <!-- 提示信息 -->
    <view class="tip-box">
      <text class="tip-title">删除说明</text>
      <text class="tip-text">删除中间商会同时删除其关联的：</text>
      <text class="tip-text">• 装发车员工账号</text>
      <text class="tip-text">• 鸡场信息</text>
      <text class="tip-text">• 员工信息</text>
      <text class="tip-text">• 发车记录</text>
      <text class="tip-text">• 交易记录</text>
      <text class="tip-text">• 系统设置和日报价</text>
    </view>

    <!-- Toast 提示 -->
    <view class="toast" v-if="toast.show">
      <text class="toast-text">{{ toast.message }}</text>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useUserStore, ROLES } from '@/store/user'

const userStore = useUserStore()

// Toast 状态
const toast = ref({
  show: false,
  message: ''
})

// 中间商列表（所有中间商）
const middlemanList = computed(() => {
  return userStore.users.filter(u => u.role === ROLES.MIDDLEMAN).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
})

// 获取头像文字
const getAvatarText = (user) => {
  const name = user.nickname || user.phone || '?'
  return name.charAt(0).toUpperCase()
}

// 显示 Toast
const showToast = (message) => {
  toast.value = {
    show: true,
    message
  }
  setTimeout(() => {
    toast.value.show = false
  }, 2000)
}

// 确认删除
const confirmDelete = (middleman) => {
  uni.showModal({
    title: '确认删除',
    content: `确定要删除中间商"${middleman.nickname || middleman.phone}"吗？\n\n此操作将同时删除：\n• 装发车员工账号\n• 鸡场、员工、发车记录等\n• 此操作不可恢复！`,
    confirmText: '删除',
    confirmColor: '#f56c6c',
    success: async (res) => {
      if (res.confirm) {
        await deleteMiddleman(middleman)
      }
    }
  })
}

// 删除中间商
const deleteMiddleman = async (middleman) => {
  try {
    uni.showLoading({ title: '删除中...' })
    await userStore.deleteMiddleman(middleman.id)
    uni.hideLoading()
    showToast('删除成功')
  } catch (e) {
    uni.hideLoading()
    console.error('删除中间商失败:', e)
    showToast('删除失败')
  }
}

// 页面加载时刷新用户列表
onMounted(async () => {
  await userStore.loadUsers()
})
</script>

<style lang="scss" scoped>
.middleman-page {
  min-height: 100vh;
  background: #f5f5f5;
  padding: 30rpx;
}

.header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 24rpx;
  padding: 40rpx;
  margin-bottom: 30rpx;

  .title {
    font-size: 40rpx;
    font-weight: bold;
    color: #fff;
    display: block;
  }

  .subtitle {
    font-size: 24rpx;
    color: rgba(255, 255, 255, 0.8);
    margin-top: 8rpx;
    display: block;
  }
}

.list-container {
  background: #fff;
  border-radius: 16rpx;
  padding: 30rpx;
  margin-bottom: 30rpx;
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20rpx;
  padding-bottom: 20rpx;
  border-bottom: 1rpx solid #f0f0f0;

  .list-title {
    font-size: 32rpx;
    font-weight: bold;
    color: #333;
  }

  .list-count {
    font-size: 24rpx;
    color: #999;
  }
}

.middleman-list {
  .middleman-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 24rpx 0;
    border-bottom: 1rpx solid #f5f5f5;

    &:last-child {
      border-bottom: none;
    }
  }

  .item-info {
    display: flex;
    align-items: center;
    gap: 20rpx;
  }

  .item-avatar {
    width: 80rpx;
    height: 80rpx;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 32rpx;
    font-weight: bold;
    color: #fff;
  }

  .item-details {
    display: flex;
    flex-direction: column;
    gap: 8rpx;
  }

  .item-name {
    font-size: 28rpx;
    color: #333;
    font-weight: 500;
  }

  .item-phone {
    font-size: 24rpx;
    color: #999;
  }

  .item-actions {
    display: flex;
    gap: 16rpx;
  }

  .action-btn {
    font-size: 26rpx;
    padding: 8rpx 20rpx;
    border-radius: 8rpx;

    &.delete {
      color: #fff;
      background: #f56c6c;
    }
  }
}

.empty-state {
  padding: 60rpx 0;
  text-align: center;

  .empty-text {
    font-size: 28rpx;
    color: #999;
  }
}

.tip-box {
  background: #fff;
  border-radius: 16rpx;
  padding: 30rpx;

  .tip-title {
    font-size: 28rpx;
    font-weight: bold;
    color: #333;
    display: block;
    margin-bottom: 16rpx;
  }

  .tip-text {
    font-size: 24rpx;
    color: #666;
    display: block;
    line-height: 1.6;
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
