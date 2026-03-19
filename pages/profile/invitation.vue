<template>
  <view class="invitation-container">
    <!-- 生成邀请码 -->
    <view class="generate-card">
      <text class="card-title">生成邀请码</text>
      <view class="role-selector">
        <view
          v-for="role in roles"
          :key="role.value"
          class="role-btn"
          :class="{ active: selectedRole === role.value }"
          @click="selectedRole = role.value"
        >
          <text class="role-label">{{ role.label }}</text>
        </view>
      </view>
      <!-- 如果角色是装发车，则显示选择人员列表 -->
      <view class="user-list" v-if="selectedRole && selectedRole === ROLES.LOADER">
        <view class="user-item" :class="{ active: selectedDepartureWorker?.id === worker.id }" v-for="worker in departureWorkerOptions" :key="worker.id" @click="onDepartureWorkerChange(worker)">
          <text class="user-name">{{ worker.name }}</text>
        </view>
      </view>
      <view class="generate-btn" @click="handleGenerate">
        <text class="btn-text">生成邀请码</text>
      </view>
    </view>

    <!-- 邀请码列表 -->
    <view class="list-card">
      <text class="card-title">邀请码列表</text>
      <view class="code-list" v-if="codeList.length > 0">
        <view v-for="code in codeList" :key="code.id" class="code-item">
          <view class="code-info">
            <text class="code-value">{{ code.code }}</text>
            <text class="code-type">{{ getRoleName(code.type) }}</text>
            <text v-if="code.workerName" class="code-worker">{{ code.workerName }}({{ code.workerPhone }})</text>
          </view>
          <view class="code-status" :class="{ used: code.usedBy }">
            <text>{{ code.usedBy ? '已使用' : '未使用' }}</text>
          </view>
        </view>
      </view>
      <view class="empty" v-else>
        <text>暂无邀请码</text>
      </view>
    </view>

    <!-- 提示信息 -->
    <view class="toast" v-if="message">
      <text class="toast-text">{{ message }}</text>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useUserStore, ROLE_NAMES, ROLES } from '@/store/user'
import { useWorkerStore } from '@/store/worker'

const workerStore = useWorkerStore()
const userStore = useUserStore()
const selectedRole = ref(ROLES.LOADER)
const codeList = ref([])
const message = ref('')

const roles = [
  { value: ROLES.LOADER, label: '装发车' },
  // { value: ROLES.FARM, label: '鸡场' },
  { value: ROLES.MIDDLEMAN, label: '中间商' }
]

const selectedDepartureWorker = ref(null)
const departureWorkerOptions = computed(() => workerStore.departureWorkers.filter(worker => worker.phone !== userStore.currentUser.phone))
const onDepartureWorkerChange = (worker) => {
  selectedDepartureWorker.value = worker
}


const getRoleName = (type) => {
  return ROLE_NAMES[type] || type
}

const showMessage = (msg) => {
  message.value = msg
  setTimeout(() => {
    message.value = ''
  }, 2000)
}

const loadCodes = async () => {
  codeList.value = await userStore.getMyCodes()
}

const handleGenerate = async () => {
  // 如果是装发车角色，必须先选择员工
  if (selectedRole.value === ROLES.LOADER && !selectedDepartureWorker.value) {
    showMessage('请先选择员工')
    return
  }

  const workerInfo = selectedRole.value === ROLES.LOADER ? selectedDepartureWorker.value : null
  const code = await userStore.generateCode(selectedRole.value, workerInfo)
  if (code) {
    uni.showModal({
      title: '邀请码',
      content: `生成的邀请码：${code}`,
      showCancel: false,
      success: () => {
        uni.setClipboardData({
          data: code,
          success: () => {
            uni.showToast({ title: '已复制' })
          }
        })
      }
    })
    loadCodes()
  } else {
    showMessage('生成失败，请重试')
  }
}

onMounted(() => {
  workerStore.loadWorkers()
  loadCodes()
})
</script>

<style lang="scss" scoped>
.invitation-container {
  min-height: 100vh;
  background: #f5f5f5;
  padding: 30rpx;
}

.user-list {
  margin-bottom: 20rpx;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20rpx;
  .user-item {
    padding: 20rpx;
    background: #f5f5f5;
    border-radius: 12rpx;
    text-align: center;
    border: 2rpx solid transparent;
    display: flex;
    align-items: center;
    justify-content: center;
    &.active {
      background: #f0f7ff;
      border-color: #007aff;
    }
  }
}
.generate-card,
.list-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 30rpx;
  margin-bottom: 30rpx;
}

.card-title {
  font-size: 30rpx;
  font-weight: 500;
  color: #333;
  margin-bottom: 30rpx;
  display: block;
}

.role-selector {
  display: flex;
  gap: 20rpx;
  margin-bottom: 30rpx;
}

.role-btn {
  flex: 1;
  padding: 20rpx;
  background: #f5f5f5;
  border-radius: 12rpx;
  text-align: center;
  border: 2rpx solid transparent;

  &.active {
    background: #f0f7ff;
    border-color: #007aff;
  }

  .role-label {
    font-size: 26rpx;
    color: #333;
  }
}

.generate-btn {
  width: 100%;
  height: 88rpx;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 44rpx;
  display: flex;
  align-items: center;
  justify-content: center;

  .btn-text {
    font-size: 28rpx;
    font-weight: 500;
    color: #fff;
  }
}

.code-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.code-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx;
  background: #f9f9f9;
  border-radius: 12rpx;

  .code-info {
    display: flex;
    align-items: center;
    gap: 20rpx;

    .code-value {
      font-size: 32rpx;
      font-weight: 500;
      color: #333;
      letter-spacing: 4rpx;
    }

    .code-type {
      font-size: 22rpx;
      color: #fff;
      background: #007aff;
      padding: 4rpx 12rpx;
      border-radius: 8rpx;
    }

    .code-worker {
      font-size: 22rpx;
      color: #666;
    }
  }

  .code-status {
    font-size: 24rpx;
    color: #52c41a;

    &.used {
      color: #999;
    }
  }
}

.empty {
  text-align: center;
  padding: 60rpx;
  color: #999;
  font-size: 26rpx;
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
