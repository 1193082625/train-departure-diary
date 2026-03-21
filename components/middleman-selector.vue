<template>
  <view v-if="userStore.isAdmin" class="middleman-selector">
    <view class="selector-label">当前中间商：</view>
    <picker mode="selector" :range="middlemanOptions" :range-key="'nickname'" :value="selectedIndex" @change="onMiddlemanChange">
      <view class="picker-value">
        {{ selectedMiddlemanName }}
      </view>
    </picker>
  </view>
</template>

<script setup>
import { computed } from 'vue'
import { useUserStore } from '@/store/user'

const userStore = useUserStore()

const middlemanOptions = computed(() => {
  const list = userStore.middlemanList || []
  return [...list.map(item => ({ id: item.id, nickname: item.nickname || item.phone }))]
})

const selectedIndex = computed(() => {
  const currentId = userStore.currentMiddlemanId
  const idx = middlemanOptions.value.findIndex(m => m.id === currentId)
  return idx >= 0 ? idx : 0
})

const selectedMiddlemanName = computed(() => {
  return middlemanOptions.value[selectedIndex.value]?.nickname || '全部'
})

const onMiddlemanChange = (e) => {
  const index = parseInt(e.detail.value)
  const selected = middlemanOptions.value[index]
  userStore.setCurrentMiddleman(selected.id)
}
</script>

<style scoped>
.middleman-selector {
  background: #fff;
  padding: 12px 15px;
  margin-bottom: 10px;
  border-radius: 8px;
  display: flex;
  align-items: center;
}
.selector-label { font-size: 14px; color: #666; margin-right: 10px; }
.picker-value {
  background: #f5f5f5;
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 14px;
  flex: 1;
}
</style>
