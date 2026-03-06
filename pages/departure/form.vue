<template>
  <view class="form-page">
    <view class="form-container">
      <!-- 基本信息 -->
      <view class="section">
        <text class="section-title">基本信息</text>
        <picker mode="date" :value="form.date" @change="onDateChange">
          <view class="form-item">
            <text>日期</text>
            <text class="value">{{ form.date }}</text>
          </view>
        </picker>
        <view class="form-item">
          <text>当日报价（元/框）</text>
          <input v-model.number="form.dailyQuote" type="digit" placeholder="请输入" />
        </view>
      </view>

      <!-- 人员信息 -->
      <view class="section">
        <text class="section-title">人员</text>
        <view class="form-item">
          <text>发车人员</text>
          <picker :range="departureWorkerOptions" :range-key="'name'" @change="onDepartureWorkerChange">
            <view class="picker-value">{{ selectedDepartureWorker?.name || '选择发车人员' }}</view>
          </picker>
        </view>
        <view class="form-item">
          <text>装车人员</text>
          <view class="checkbox-group">
            <uni-data-checkbox multiple v-model="form.loadingWorkerIds" :localdata="loadingWorkerOptions"></uni-data-checkbox>
          </view>
        </view>
      </view>

      <!-- 鸡场信息 -->
      <view class="section">
        <text class="section-title">鸡场信息</text>
        <view v-for="(detail, index) in form.merchantDetails" :key="index" class="merchant-item">
          <picker :range="merchantOptions" :range-key="'name'" @change="(e) => onMerchantChange(index, e)">
            <view class="merchant-select">{{ detail.merchantName || '选择鸡场' }}</view>
          </picker>
          <view class="merchant-inputs">
            <input v-model.number="detail.bigBoxes" type="number" placeholder="大框数" />
            <input v-model.number="detail.smallBoxes" type="number" placeholder="小框数" />
          </view>
          <text @click="removeMerchant(index)" class="remove">×</text>
        </view>
        <button @click="addMerchant" class="add-merchant">+ 添加鸡场</button>
      </view>

      <!-- 货车信息 -->
      <view class="section">
        <text class="section-title">货车信息</text>
        <view v-for="(row, index) in form.truckRows" :key="index" class="truck-row">
          <text>第{{ index + 1 }}排</text>
          <input v-model.number="row.bigBoxes" type="number" placeholder="大框" />
          <input v-model.number="row.smallBoxes" type="number" placeholder="小框" />
          <text @click="removeTruckRow(index)" class="remove">×</text>
        </view>
        <button @click="addTruckRow" class="add-row">+ 添加排数</button>
      </view>

      <!-- 留货信息 -->
      <view class="section">
        <text class="section-title">留货数量</text>
        <view class="form-item">
          <text>留货大框</text>
          <input v-model.number="form.reservedBigBoxes" type="number" placeholder="0" />
        </view>
        <view class="form-item">
          <text>留货小框</text>
          <input v-model.number="form.reservedSmallBoxes" type="number" placeholder="0" />
        </view>
      </view>

      <!-- 费用信息 -->
      <view class="section">
        <text class="section-title">费用（元）</text>
        <view class="form-item">
          <text>油费</text>
          <input v-model.number="form.oilFee" type="digit" placeholder="0" />
        </view>
        <view class="form-item">
          <text>进门费</text>
          <input v-model.number="form.entryFee" type="digit" placeholder="0" />
        </view>
        <view class="form-item">
          <text>过路费</text>
          <input v-model.number="form.tollFee" type="digit" placeholder="0" />
        </view>
        <view class="form-item">
          <text>装车费</text>
          <input v-model.number="form.loadingFee" type="digit" placeholder="0" />
        </view>
        <view class="form-item">
          <text>卸车费</text>
          <input v-model.number="form.unloadingFee" type="digit" placeholder="0" />
        </view>
        <view class="form-item">
          <text>发车费</text>
          <input v-model.number="form.departureFee" type="digit" placeholder="0" />
        </view>
      </view>

      <!-- 到货信息 -->
      <view class="section">
        <text class="section-title">回框信息</text>
        <view class="form-item">
          <text>回框大框</text>
          <input v-model.number="form.returnedBigBoxes" type="number" placeholder="0" />
        </view>
        <view class="form-item">
          <text>回框小框</text>
          <input v-model.number="form.returnedSmallBoxes" type="number" placeholder="0" />
        </view>
      </view>

      <!-- 备注 -->
      <view class="section">
        <text class="section-title">备注</text>
        <textarea v-model="form.note" placeholder="请输入备注" class="note-input" />
      </view>

      <!-- 计算结果 - 【针对中间商可见】 -->
      <view class="section result">
        <text class="section-title">计算结果</text>
        <view class="result-item">
          <text>本次共拉大框</text>
          <text class="result-value">{{ calculated.merchantBigTotal }}</text>
        </view>
        <view class="result-item">
          <text>本次共拉小框</text>
          <text class="result-value">{{ calculated.merchantSmallTotal }}</text>
        </view>
        <view class="result-item">
          <text>货车共装大框</text>
          <text class="result-value">{{ calculated.truckBig }}</text>
        </view>
        <view class="result-item">
          <text>货车共装小框</text>
          <text class="result-value">{{ calculated.truckSmall }}</text>
        </view>

        <!-- 鸡场金额明细 -->
        <view v-if="calculated.merchantAmount.length > 0" class="result-subtitle">鸡场金额明细</view>
        <view v-for="(item, index) in calculated.merchantAmount" :key="index" class="calc-item">
          <text class="name">{{ item.name }}</text>
          <text class="result-value">¥{{ item.amount }}</text>
        </view>

        <!-- 新增：收货价、交货价、盈利 -->
        <view class="result-divider"></view>
        <view class="result-item highlight">
          <text>收货价合计</text>
          <text class="result-value">¥{{ calculated.totalReceivePrice }}</text>
        </view>
        <view class="result-item highlight">
          <text>交货价合计</text>
          <text class="result-value">¥{{ calculated.totalDeliveryPrice }}</text>
        </view>
        <view class="result-item total">
          <view>本趟盈利</view>
          <view class="result-value profit">¥{{ calculated.profit }}</view>
        </view>
      </view>

      <view class="actions">
        <button @click="saveRecord" class="save-btn">保存</button>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useDepartureStore } from '@/store/departure'
import { useMerchantStore } from '@/store/merchant'
import { useWorkerStore } from '@/store/worker'
import { useSettingsStore } from '@/store/settings'

const departureStore = useDepartureStore()
const merchantStore = useMerchantStore()
const workerStore = useWorkerStore()
const settingsStore = useSettingsStore()

const form = reactive({
  id: null,
  date: new Date().toISOString().split('T')[0],
  dailyQuote: 0,
  merchantDetails: [],
  reservedBigBoxes: 0,
  reservedSmallBoxes: 0,
  departureWorkerId: '',
  loadingWorkerIds: [],
  oilFee: 0,
  entryFee: 0,
  tollFee: 0,
  loadingFee: 0,
  unloadingFee: 0,
  departureFee: 0,
  truckRows: [],
  arrivalBigBoxes: 0,
  arrivalSmallBoxes: 0,
  returnedBigBoxes: 0,
  returnedSmallBoxes: 0,
  note: ''
})

const merchantOptions = computed(() => merchantStore.merchants)
const departureWorkerOptions = computed(() => workerStore.departureWorkers)
const loadingWorkerOptions = computed(() => workerStore.loadingWorkers.map(worker => ({
  text: worker.name,
  value: worker.id
})))

const selectedDepartureWorker = computed(() =>
  workerStore.getWorkerById(form.departureWorkerId)
)

// 从设置中加载默认值
const loadDefaultSettings = () => {
  form.oilFee = settingsStore.oilFee || 0
  form.entryFee = settingsStore.entryFee || 0
  form.tollFee = settingsStore.tollFee || 0
  form.loadingFee = settingsStore.loadingFee || 0
  form.unloadingFee = settingsStore.unloadingFee || 0
  form.departureFee = settingsStore.departureFee || 0
}

// 计算结果 - 使用新公式
const calculated = computed(() => {
  const bigWeight = settingsStore.bigBoxWeight || 50
  const smallWeight = settingsStore.smallBoxWeight || 30

  // 鸡场大框总数
  const merchantBigTotal = form.merchantDetails.reduce((sum, m) => sum + (m.bigBoxes || 0), 0)
  const merchantSmallTotal = form.merchantDetails.reduce((sum, m) => sum + (m.smallBoxes || 0), 0)

  // 货车共装
  const truckBig = form.truckRows.reduce((sum, r) => sum + (r.bigBoxes || 0), 0) - form.reservedBigBoxes
  const truckSmall = form.truckRows.reduce((sum, r) => sum + (r.smallBoxes || 0), 0) - form.reservedSmallBoxes

  // 费用合计
  const totalOilFee = form.oilFee || 0
  const totalEntryFee = form.entryFee || 0
  const totalTollFee = form.tollFee || 0
  const totalLoadingFee = form.loadingFee || 0
  const totalUnloadingFee = form.unloadingFee || 0
  const totalDepartureFee = form.departureFee || 0

  // 按鸡场计算金额 - 使用新公式
  let merchantAmount = []
  let totalReceivePrice = 0  // 收货价合计
  let totalDeliveryPrice = 0 // 交货价合计

  form.merchantDetails.forEach(detail => {
    const merchant = merchantStore.getMerchantById(detail.merchantId)
    if (merchant && form.dailyQuote) {
      const merchantMargin = merchant.margin || 0

      // 收货价 = (当日报价 - 鸡场margin) / 45 × 大框斤数 × 本次共拉大框数量 + (当日报价 - 鸡场margin) / 45 × 小框斤数 × 本次共拉小框数量
      const receiveBig = (form.dailyQuote - merchantMargin) / 45 * bigWeight * detail.bigBoxes
      const receiveSmall = (form.dailyQuote - merchantMargin) / 45 * smallWeight * detail.smallBoxes
      const receivePrice = receiveBig + receiveSmall
      totalReceivePrice += receivePrice

      // 交货价 = (当日报价 - 1) × 本次共拉大框数量 + (当日报价 - 鸡场margin) / 44 × 小框斤数 × 本次共拉小框数量
      const deliveryBig = (form.dailyQuote - 1) * detail.bigBoxes
      const deliverySmall = (form.dailyQuote - merchantMargin) / 44 * smallWeight * detail.smallBoxes
      const deliveryPrice = deliveryBig + deliverySmall
      totalDeliveryPrice += deliveryPrice

      merchantAmount.push({
        name: merchant.name,
        amount: receivePrice.toFixed(2),
        receivePrice: receivePrice.toFixed(2),
        deliveryPrice: deliveryPrice.toFixed(2)
      })
    }
  })

  // 本趟盈利 = 交货价 - 收货价 - 油费 - 进门费 - 过路费 - 装车费 - 卸车费 - 发车费
  const profit = totalDeliveryPrice - totalReceivePrice - totalOilFee - totalEntryFee - totalTollFee - totalLoadingFee - totalUnloadingFee - totalDepartureFee

  return {
    truckBig,
    truckSmall,
    merchantBigTotal,
    merchantSmallTotal,
    merchantAmount,
    totalReceivePrice: totalReceivePrice.toFixed(2),
    totalDeliveryPrice: totalDeliveryPrice.toFixed(2),
    profit: profit.toFixed(2)
  }
})

const onDateChange = (e) => { form.date = e.detail.value }
const onDepartureWorkerChange = (e) => { form.departureWorkerId = departureWorkerOptions.value[e.detail.value]?.id || '' }

const addMerchant = () => {
  form.merchantDetails.push({ merchantId: '', merchantName: '', bigBoxes: null, smallBoxes: null })
}

const removeMerchant = (index) => { form.merchantDetails.splice(index, 1) }

const onMerchantChange = (index, e) => {
  const merchant = merchantOptions.value[e.detail.value]
  form.merchantDetails[index].merchantId = merchant.id
  form.merchantDetails[index].merchantName = merchant.name
}

const addTruckRow = () => { form.truckRows.push({ rowNumber: form.truckRows.length + 1, bigBoxes: null, smallBoxes: null }) }
const removeTruckRow = (index) => { form.truckRows.splice(index, 1) }

const saveRecord = () => {
  // 添加校验
  if (form.dailyQuote <= 0) {
    uni.showToast({
      title: '当日报价不能为0',
      icon: 'none'
    })
    return
  }
  if (form.merchantDetails.length === 0) {
    uni.showToast({
      title: '请添加鸡场',
      icon: 'none'
    })
    return
  }
  if (form.truckRows.length === 0) {
    uni.showToast({
      title: '请添加货车排数',
      icon: 'none'
    })
    return
  }
  // 发车人不能为空
  if (!form.departureWorkerId) {
    uni.showToast({
      title: '请选择发车人员',
      icon: 'none'
    })
    return
  }
  // 装车人不能为空
  if (form.loadingWorkerIds.length === 0) {
    uni.showToast({
      title: '请选择装车人员',
      icon: 'none'
    })
    return
  }

  const money = parseFloat(calculated.value.profit)

  // if(money <= 0) {
  //   uni.showToast({
  //     title: '本趟盈利为0，请检查是否存在错误输入',
  //     icon: 'none'
  //   })
  //   return
  // }

  const record = {
    ...form,
    merchantAmount: calculated.value.merchantAmount,
    totalReceivePrice: calculated.value.totalReceivePrice,
    totalDeliveryPrice: calculated.value.totalDeliveryPrice,
    getMoney: parseFloat(calculated.value.profit)
  }

  if (form.id) {
    departureStore.updateRecord(form.id, record)
  } else {
    departureStore.addRecord(record)
  }
  uni.navigateBack()
}

onMounted(() => {
  // 加载默认设置
  loadDefaultSettings()

  // 检查是否有编辑ID
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1]
  const options = currentPage.options || {}

  if (options.id) {
    const record = departureStore.records.find(r => r.id === options.id)
    if (record) {
      Object.assign(form, record)
    }
  }
})
</script>

<style scoped>
.form-page { padding: 15px; padding-bottom: 50px; }
.section { background: #fff; border-radius: 8px; padding: 15px; margin-bottom: 15px; }
.section-title { font-size: 16px; font-weight: bold; margin-bottom: 10px; display: block; }
.form-item { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #f0f0f0; }
.form-item input { text-align: right; width: 150px; }
.value, .picker-value { color: #999; }
.merchant-item { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
.merchant-select { background: #f5f5f5; padding: 8px; border-radius: 4px; min-width: 80px; }
.merchant-inputs { display: flex; gap: 10px; flex: 1; }
.merchant-inputs input { flex: 1; background: #f5f5f5; padding: 8px; border-radius: 4px; }
.remove { color: #ff4d4f; font-size: 20px; padding: 5px; }
.add-merchant, .add-row { background: #f5f5f5; color: #007aff; margin-top: 10px; }
.truck-row { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
.truck-row input { flex: 1; background: #f5f5f5; padding: 8px; border-radius: 4px; text-align: center; }
.checkbox-group { display: flex; flex-wrap: wrap; gap: 10px; }
.note-input { width: 100%; height: 80px; background: #f5f5f5; padding: 10px; border-radius: 4px; box-sizing: border-box; }
.result { background: #f6ffed; }
.result-item { display: flex; justify-content: space-between; padding: 8px 0; }
.result-value { font-weight: bold; }
.result-subtitle { font-size: 14px; color: #666; margin: 10px 0 5px; }
.calc-item { display: flex; justify-content: space-between; padding: 5px 0; font-size: 14px; }
.result-divider { height: 1px; background: #d9f7be; margin: 10px 0; }
.result-item.highlight { background: #fff7e6; padding: 10px; border-radius: 4px; margin: 5px 0; }
.result-item.highlight .result-value { color: #fa8c16; }
.total { border-top: 1px solid #d9f7be; margin-top: 10px; padding-top: 10px; font-size: 16px; }
.total .result-value { color: #52c41a; font-size: 18px; }
.profit { color: #52c41a !important; }
.actions { margin-top: 20px; }
.save-btn { background: #007aff; color: #fff; }
</style>
