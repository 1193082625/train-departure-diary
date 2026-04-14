<!-- 快捷操作 -->
<template>
    <!-- 快捷操作 -->
    <view class="stats-cards" :class="{ 'stats-cards-all': userStore.isLoader }">
      <view class="action-btn" @click="openSettingsPopup" v-if="userStore.isAdmin || userStore.isMiddleman">
        <text class="icon">⚙️</text>
        <text>参数设置</text>
      </view>
      <view class="action-btn" @click="goToDeparture">
        <text class="icon">🚚</text>
        <text>发车记录</text>
      </view>
      <view class="action-btn" @click="goToMerchant" v-if="userStore.isAdmin || userStore.isMiddleman">
        <text class="icon">🐔</text>
        <text>鸡场管理</text>
      </view>
      <view class="action-btn" @click="goToWorker" v-if="userStore.isAdmin || userStore.isMiddleman">
        <text class="icon">👤</text>
        <text>人员管理</text>
      </view>
      <view class="action-btn" @click="goToTransaction" v-if="userStore.isAdmin || userStore.isMiddleman">
        <text class="icon">💰</text>
        <text>单次结账</text>
      </view>
    </view>
    
    <!-- 参数设置弹窗 -->
    <uni-popup ref="settingsPopup" type="bottom" @change="popupChange">
      <view class="settings-popup">
        <view class="popup-header">
          <text class="popup-title">参数设置</text>
          <text class="popup-close" @click="settingsPopup.close()">×</text>
        </view>
        <view class="popup-content">
          <uni-collapse accordion  v-model="collapseValue">
            <uni-collapse-item title="斤数设置（斤）">
              <view class="settings-group">
                <view class="form-item">
                  <text>收货大框斤数</text>
                  <input v-model="settingsForm.receiptBigBoxWeight" type="digit" placeholder="请输入" />
                </view>
                <view class="form-item">
                  <text>交货大框斤数</text>
                  <input v-model="settingsForm.deliveryBigBoxWeight" type="digit" placeholder="请输入" />
                </view>
                <view class="form-item">
                  <text>默认小框斤数</text>
                  <input v-model="settingsForm.smallBoxWeight" type="digit" placeholder="请输入" />
                </view>
                <view class="form-item">
                  <text>默认大箱斤数</text>
                  <input v-model="settingsForm.depotCartonBoxesBig" type="digit" placeholder="请输入" />
                </view>
                <view class="form-item">
                  <text>默认小箱斤数</text>
                  <input v-model="settingsForm.depotCartonBoxesSmall" type="digit" placeholder="请输入" />
                </view>
              </view>
            </uni-collapse-item>
            <uni-collapse-item title="费用设置（元）">
              <view class="settings-group">
                <view class="form-item">
                  <text>装车费</text>
                  <input v-model="settingsForm.loadingFee" type="digit" placeholder="请输入" />
                </view>
                <view class="form-item">
                  <text>卸车费</text>
                  <input v-model="settingsForm.unloadingFee" type="digit" placeholder="请输入" />
                </view>
                <view class="form-item">
                  <text>发车费</text>
                  <input v-model="settingsForm.departureFee" type="digit" placeholder="请输入" />
                </view>
                <view class="form-item">
                  <text>过路费</text>
                  <input v-model="settingsForm.tollFee" type="digit" placeholder="请输入" />
                </view>
                <view class="form-item">
                  <text>进门费</text>
                  <input v-model="settingsForm.entryFee" type="digit" placeholder="请输入" />
                </view>
                <view class="form-item">
                  <text>油费</text>
                  <input v-model="settingsForm.oilFee" type="digit" placeholder="请输入" />
                </view>
              </view>
            </uni-collapse-item>
          </uni-collapse>
        </view>
        <button @click="saveSettings" class="save-btn">保存设置</button>
      </view>
    </uni-popup>

</template>
<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useUserStore } from '@/store/user'
import { useSettingsStore } from '@/store/settings'
import toast from '@/utils/toast'

const userStore = useUserStore()
const settingsStore = useSettingsStore()

const settingsPopup = ref(null)
const collapseValue = ref(['0'])
const settingsForm = reactive({
  receiptBigBoxWeight: 45, // 收货大框斤数
  deliveryBigBoxWeight: 44, // 交货大框斤数
  smallBoxWeight: 29.5, // 默认小框斤数
  depotCartonBoxesBig: 43, // 默认大箱斤数
  depotCartonBoxesSmall: 30, // 默认小箱斤数
  loadingFee: 300, // 装车费
  unloadingFee: 200, // 卸车费
  departureFee: 200, // 发车费
  tollFee: 50, // 过路费
  entryFee: 50, // 进门费
  oilFee: 50, // 油费
})

const goToDeparture = () => uni.navigateTo({ url: '/pages/departure/departure' })
const goToMerchant = () => uni.navigateTo({ url: '/pages/merchant/merchant' })
const goToWorker = () => uni.navigateTo({ url: '/pages/worker/worker' })
const goToTransaction = () => uni.navigateTo({ url: '/pages/transaction/transaction' })

const openSettingsPopup = () => {
  settingsPopup.value.open('center')
}

const popupChange = (e) => {
  if (e.show) {
    // 弹窗打开时，加载当前设置
    settingsForm.receiptBigBoxWeight = settingsStore.receiptBigBoxWeight
    settingsForm.deliveryBigBoxWeight = settingsStore.deliveryBigBoxWeight
    settingsForm.smallBoxWeight = settingsStore.smallBoxWeight
    settingsForm.depotCartonBoxesBig = settingsStore.depotCartonBoxesBig
    settingsForm.depotCartonBoxesSmall = settingsStore.depotCartonBoxesSmall
    settingsForm.loadingFee = settingsStore.loadingFee
    settingsForm.unloadingFee = settingsStore.unloadingFee
    settingsForm.departureFee = settingsStore.departureFee
    settingsForm.tollFee = settingsStore.tollFee
    settingsForm.entryFee = settingsStore.entryFee
    settingsForm.oilFee = settingsStore.oilFee
  }
}

const saveSettings = () => {
  settingsStore.updateAllSettings({
    receiptBigBoxWeight: settingsForm.receiptBigBoxWeight,
    deliveryBigBoxWeight: settingsForm.deliveryBigBoxWeight,
    smallBoxWeight: settingsForm.smallBoxWeight,
    depotCartonBoxesBig: settingsForm.depotCartonBoxesBig,
    depotCartonBoxesSmall: settingsForm.depotCartonBoxesSmall,
    loadingFee: settingsForm.loadingFee,
    unloadingFee: settingsForm.unloadingFee,
    departureFee: settingsForm.departureFee,
    tollFee: settingsForm.tollFee,
    entryFee: settingsForm.entryFee,
    oilFee: settingsForm.oilFee
  })
  toast.success('设置已更新')
  settingsPopup.value.close()
}
</script>
<style scoped>
.stats-cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 20px; }
.stats-cards.stats-cards-all { grid-template-columns: repeat(1, 1fr); }
.stat-card { flex: 1; background: #fff; padding: 20px; border-radius: 8px; text-align: center; }
.action-btn { flex: 1; background: #fff; padding: 20px; border-radius: 8px; text-align: center; }
.icon { font-size: 30px; display: block; margin-bottom: 10px; }

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