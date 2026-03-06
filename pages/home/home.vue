<template>
  <view class="home-page">
    <view class="stats-cards">
      <view class="stat-card" @click="openSettingsPopup">
        <text class="stat-label">参数设置</text>
        <text class="stat-value icon">⚙️</text>
      </view>
      <view class="stat-card">
        <text class="stat-label">今日收入</text>
        <text class="stat-value">¥{{ todayStats.income }}</text>
      </view>
    </view>

    <view class="quick-actions">
      <view class="action-btn" @click="goToDeparture">
        <text class="icon">🚚</text>
        <text>发车记录</text>
      </view>
      <view class="action-btn" @click="goToTransaction">
        <text class="icon">💰</text>
        <text>单次结账</text>
      </view>
    </view>

    <view class="recent-records">
      <view class="section-title-wrapper">
        <text class="section-title">今日记录</text>
        <text class="section-title-value" v-if="todayStats.count > 0">共{{ todayStats.count }}次</text>
      </view>
      <view v-for="record in todayRecords" :key="record.id" class="record-item">
        <view class="record-info">
          <text>{{ record.merchantDetails.map(m => m.merchantName).join(', ') || '未选择商户' }}</text>
          <text class="record-profit" v-if="record.getMoney">盈利: ¥{{ record.getMoney.toFixed(2) }}</text>
        </view>
      </view>
      <view v-if="todayRecords.length === 0" class="empty">暂无记录</view>
    </view>

    <!-- 参数设置弹窗 -->
    <uni-popup ref="settingsPopup" type="bottom" @change="popupChange">
      <view class="settings-popup">
        <view class="popup-header">
          <text class="popup-title">参数设置</text>
          <text class="popup-close" @click="settingsPopup.close()">×</text>
        </view>
        <view class="popup-content">
          <view class="settings-group">
            <text class="group-title">斤数设置</text>
            <view class="form-item">
              <text>大框斤数</text>
              <input v-model.number="settingsForm.bigBoxWeight" type="number" placeholder="请输入" />
            </view>
            <view class="form-item">
              <text>小框斤数</text>
              <input v-model.number="settingsForm.smallBoxWeight" type="number" placeholder="请输入" />
            </view>
          </view>

          <view class="settings-group">
            <text class="group-title">费用设置（元）</text>
            <view class="form-item">
              <text>装车费</text>
              <input v-model.number="settingsForm.loadingFee" type="digit" placeholder="请输入" />
            </view>
            <view class="form-item">
              <text>卸车费</text>
              <input v-model.number="settingsForm.unloadingFee" type="digit" placeholder="请输入" />
            </view>
            <view class="form-item">
              <text>过路费</text>
              <input v-model.number="settingsForm.tollFee" type="digit" placeholder="请输入" />
            </view>
            <view class="form-item">
              <text>进门费</text>
              <input v-model.number="settingsForm.entryFee" type="digit" placeholder="请输入" />
            </view>
            <view class="form-item">
              <text>油费</text>
              <input v-model.number="settingsForm.oilFee" type="digit" placeholder="请输入" />
            </view>
          </view>
        </view>
        <button @click="saveSettings" class="save-btn">保存设置</button>
      </view>
    </uni-popup>
  </view>
</template>

<script setup>
import { ref, computed, reactive, onMounted, watch } from 'vue'
import { useDepartureStore } from '@/store/departure'
import { useSettingsStore } from '@/store/settings'

const departureStore = useDepartureStore()
const settingsStore = useSettingsStore()

const settingsPopup = ref(null)

const settingsForm = reactive({
  bigBoxWeight: 45,
  smallBoxWeight: 29.5,
  loadingFee: 300, // 装车费
  unloadingFee: 200, // 卸车费
  tollFee: 50, // 过路费
  entryFee: 50, // 进门费
  oilFee: 50, // 油费
})

const todayRecords = computed(() => departureStore.getTodayRecords())

const todayStats = computed(() => {
  const records = todayRecords.value
  console.log('todayRecords11',todayRecords.value);
  
  const totalIncome = records.reduce((sum, r) => {
    return sum + parseFloat(r.getMoney || 0)
  }, 0)
  return {
    count: records.length,
    income: totalIncome.toFixed(2)
  }
})

const goToDeparture = () => uni.switchTab({ url: '/pages/departure/departure' })
const goToTransaction = () => uni.navigateTo({ url: '/pages/transaction/transaction' })

const openSettingsPopup = () => {
  settingsPopup.value.open('center')
}

const popupChange = (e) => {
  if (e.show) {
    // 弹窗打开时，加载当前设置
    settingsForm.bigBoxWeight = settingsStore.bigBoxWeight
    settingsForm.smallBoxWeight = settingsStore.smallBoxWeight
    settingsForm.loadingFee = settingsStore.loadingFee
    settingsForm.unloadingFee = settingsStore.unloadingFee
    settingsForm.tollFee = settingsStore.tollFee
    settingsForm.entryFee = settingsStore.entryFee
    settingsForm.oilFee = settingsStore.oilFee
  }
}

const saveSettings = () => {
  settingsStore.updateAllSettings({
    bigBoxWeight: settingsForm.bigBoxWeight,
    smallBoxWeight: settingsForm.smallBoxWeight,
    loadingFee: settingsForm.loadingFee,
    unloadingFee: settingsForm.unloadingFee,
    tollFee: settingsForm.tollFee,
    entryFee: settingsForm.entryFee,
    oilFee: settingsForm.oilFee
  })
  uni.showToast({
    title: '设置已保存',
    icon: 'success'
  })
  settingsPopup.value.close()
}
</script>

<style scoped>
.home-page { padding: 20px; }
.stats-cards { display: flex; gap: 15px; margin-bottom: 20px; }
.stat-card { flex: 1; background: #fff; padding: 20px; border-radius: 8px; text-align: center; }
.stat-label { color: #999; font-size: 14px; display: block; }
.stat-value { color: #007aff; font-size: 24px; font-weight: bold; display: block; }
.stat-value.icon { font-size: 28px; }
.quick-actions { display: flex; gap: 15px; margin-bottom: 20px; }
.action-btn { flex: 1; background: #fff; padding: 20px; border-radius: 8px; text-align: center; }
.icon { font-size: 30px; display: block; margin-bottom: 10px; }
.recent-records { background: #fff; padding: 15px; border-radius: 8px; }
.section-title-wrapper { display: flex; justify-content: space-between; align-items: center; }
.section-title { font-weight: bold; margin-bottom: 10px; display: block;}
.section-title-value { color: #999; font-size: 14px; display: block; }
.record-item { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f0f0f0; }
.record-item:last-child { border-bottom: none; }
.record-info { display: flex; flex-direction: column; gap: 4px; }
.record-profit { color: #52c41a; font-size: 12px; }
.amount { color: #52c41a; font-weight: bold; }
.empty { color: #999; text-align: center; padding: 20px; }

/* 弹窗样式 */
.settings-popup { background: #fff; border-radius: 16px; padding-bottom: 20px; }
.popup-header { display: flex; justify-content: space-between; align-items: center; padding: 15px 20px; border-bottom: 1px solid #f0f0f0; }
.popup-title { font-size: 18px; font-weight: bold; }
.popup-close { font-size: 28px; color: #999; }
.popup-content { padding: 10px; overflow-y: auto; }
.settings-group { margin-bottom: 20px; }
.settings-group:last-child { margin-bottom: 0; }
.group-title { font-size: 14px; color: #999; margin-bottom: 10px; display: block; }
.form-item { display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid #f5f5f5; }
.form-item input { text-align: right; width: 150px; font-size: 14px; }
.save-btn { background: #007aff; color: #fff; width: 120px; }
</style>
