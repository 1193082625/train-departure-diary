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
          <text>当日报价</text>
          <view class="flex-end">
            <input v-model.number="form.dailyQuote" type="digit" placeholder="请输入" />
            <text class="ml-4">（元/框）</text>
          </view>
        </view>
        <view class="form-item">
          <text>本趟小框斤数</text>
          <view class="flex-end">
            <input v-model.number="form.smallBoxWeight" type="digit" placeholder="请输入" />
            <text class="ml-4">（斤/框）</text>
          </view>
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
          <view class="checkbox-group max-width-220">
            <uni-data-checkbox multiple v-model="form.loadingWorkerIds" :localdata="loadingWorkerOptions"></uni-data-checkbox>
          </view>
        </view>
      </view>

      <!-- 鸡场装车信息 -->
      <view class="section">
        <text class="section-title">鸡场装车信息</text>
        <!-- 标题 -->
         <view class="merchant-title">
          <text class="w-96">鸡场</text>
          <text>大框</text>
          <text>小框</text>
          <text>斤数</text>
          <view class="w-22"></view>
          </view>
        <view v-for="(detail, index) in form.merchantDetails" :key="index" class="merchant-item">
          <picker :range="merchantOptions" :range-key="'name'" @change="(e) => onMerchantChange(index, e)">
            <view class="merchant-select">{{ detail.merchantName || '选择鸡场' }}</view>
          </picker>
          <view class="merchant-inputs">
            <input v-model.number="detail.bigBoxes" type="number" placeholder="大框" />
            <input v-model.number="detail.smallBoxes" type="number" placeholder="小框" />
            <input v-model.number="detail.weight" type="number" placeholder="斤数" />
          </view>
          <text @click="removeMerchant(index)" class="remove">×</text>
        </view>
        <button @click="addMerchant" class="add-merchant">+ 添加鸡场</button>
      </view>

      <!-- 库房装车信息 -->
      <view class="section">
        <text class="section-title">库房装车信息</text>
        <view class="depot-title">
          <text>大框</text>
          <text>小框</text>
          <text>大箱</text>
          <text>小箱</text>
        </view>
        <view class="depot-row">
          <input v-model.number="form.depotBigBoxes" type="number" placeholder="大框" />
          <input v-model.number="form.depotSmallBoxes" type="number" placeholder="小框" />
          <input v-model.number="form.depotCartonBoxesBig" type="number" placeholder="大箱" />
          <input v-model.number="form.depotCartonBoxesSmall" type="number" placeholder="小箱" />
        </view>
      </view>

      <!-- 货车装车信息 -->
      <view class="section">
        <text class="section-title">装车排数</text>
        <view class="truck-title">
          <text>排号</text>
          <text>大框</text>
          <text>小框</text>
          <text>大箱</text>
          <text>小箱</text>
          <text></text>
        </view>
        <view v-for="(row, index) in form.truckRows" :key="index" class="truck-row">
          <text>第{{ index + 1 }}排</text>
          <input v-model.number="row.bigBoxes" type="number" placeholder="大框" />
          <input v-model.number="row.smallBoxes" type="number" placeholder="小框" />
          <input v-model.number="row.cartonBoxesBig" type="number" placeholder="大箱" />
          <input v-model.number="row.cartonBoxesSmall" type="number" placeholder="小箱" />
          <text @click="removeTruckRow(index)" class="remove">×</text>
        </view>
        <button @click="addTruckRow" class="add-row">+ 添加排数</button>
      </view>

      <!-- 留货信息 -->
      <view class="section">
        <text class="section-title">留货数量</text>
        <view class="form-item">
          <text>留货大框</text>
          <view class="flex-end">
            <text class="result-value">{{ calculated.reservedBigBoxesTotal }}</text>
            <text class="ml-4">框</text>
          </view>
        </view>
        <view class="form-item">
          <text>留货小框</text>
          <view class="flex-end">
            <text class="result-value">{{ calculated.reservedSmallBoxesTotal }}</text>
            <text class="ml-4">框</text>
          </view>
        </view>
      </view>

      <!-- 回框信息 -->
      <view class="section">
        <text class="section-title">回框信息</text>
        <view class="form-item">
          <text>回框大框</text>
          <view class="flex-end">
            <input v-model.number="form.returnedBigBoxes" type="number" placeholder="0" />
            <text class="ml-4">框</text>
          </view>
        </view>
        <view class="form-item">
          <text>回框小框</text>
          <view class="flex-end">
            <input v-model.number="form.returnedSmallBoxes" type="number" placeholder="0" />
            <text class="ml-4">框</text>
          </view>
        </view>
      </view>

      <!-- 备注 -->
      <view class="section">
        <text class="section-title">备注</text>
        <textarea v-model="form.note" placeholder="请输入备注" class="note-input" />
      </view>

      <!-- 费用信息 -->
      <view class="section">
        <text class="section-title">费用（元）</text>
        <view class="form-item">
          <text>油费</text>
          <view class="flex-end">
            <input v-model.number="form.oilFee" type="digit" placeholder="0" />
            <text class="ml-4">（元）</text>
          </view>
        </view>
        <view class="form-item">
          <text>进门费</text>
          <view class="flex-end">
            <input v-model.number="form.entryFee" type="digit" placeholder="0" />
            <text class="ml-4">（元）</text>
          </view>
        </view>
        <view class="form-item">
          <text>过路费</text>
          <view class="flex-end">
            <input v-model.number="form.tollFee" type="digit" placeholder="0" />
            <text class="ml-4">（元）</text>
          </view>
        </view>
        <view class="form-item">
          <text>装车费</text>
          <view class="flex-end">
            <input v-model.number="form.loadingFee" type="digit" placeholder="0" />
            <text class="ml-4">（元）</text>
          </view>
        </view>
        <view class="form-item">
          <text>卸车费</text>
          <view class="flex-end">
            <input v-model.number="form.unloadingFee" type="digit" placeholder="0" />
            <text class="ml-4">（元）</text>
          </view>
        </view>
        <view class="form-item">
          <text>发车费</text>
          <view class="flex-end">
            <input v-model.number="form.departureFee" type="digit" placeholder="0" />
            <text class="ml-4">（元）</text>
          </view>
        </view>
      </view>

      <!-- 计算结果 - 【针对中间商可见】 -->
      <view class="section result">
        <text class="section-title">计算结果</text>
        <view class="flex-start mb-10">
          本次共拉（<text class="font-bold">{{ calculated.allMerchantWeight }} 斤数</text>）
        </view>
        <view class="flex-start">
          <text class="w-pre25 font-bold">{{ calculated.merchantBigTotal }} 大框</text>
          <text class="w-pre25 font-bold">{{ calculated.merchantSmallTotal }} 小框</text>
          <text class="w-pre25 font-bold">{{ calculated.merchantUnitOfWeightTotal }} 斤</text>
        </view>
        <view class="flex-start mt-15 mb-10">
          货车共装（<text class="font-bold">{{ calculated.truckWeightTotal }} 斤数</text>）
        </view>
        <view class="flex-start">
          <text class="w-pre25 font-bold">{{ calculated.truckBig }} 大框</text>
          <text class="w-pre25 font-bold">{{ calculated.truckSmall }} 小框</text>
          <text class="w-pre25 font-bold">{{ calculated.truckCartonBoxesBig }} 大箱</text>
          <text class="w-pre25 font-bold">{{ calculated.truckCartonBoxesSmall }} 小箱</text>
        </view>
        <view class="flex-start mt-15 mb-10">
          回框数量合计
        </view>
        <view class="flex-start">
          <text class="w-pre25 font-bold">{{calculated.totalBigBoxes  < 0 ? '欠' : ''}}{{ calculated.totalBigBoxes }} 大框</text>
          <text class="w-pre25 font-bold">{{calculated.totalSmallBoxes  < 0 ? '欠' : ''}}{{ calculated.totalSmallBoxes }} 小框</text>
        </view>
        <!-- <view class="result-item">
          <text>本次共拉大框</text>
          <text class="result-value">{{ calculated.merchantBigTotal }} 框</text>
        </view>
        <view class="result-item">
          <text>本次共拉小框</text>
          <text class="result-value">{{ calculated.merchantSmallTotal }} 框</text>
        </view>
        <view class="result-item">
          <text>本次共拉斤数</text>
          <text class="result-value">{{ calculated.merchantUnitOfWeightTotal }} 斤</text>
        </view>
        <view class="result-item">
          <text>货车共装大框</text>
          <text class="result-value">{{ calculated.truckBig }} 框</text>
        </view>
        <view class="result-item">
          <text>货车共装小框</text>
          <text class="result-value">{{ calculated.truckSmall }} 框</text>
        </view>
        <view class="result-item">
          <text>货车共装大箱</text>
          <text class="result-value">{{ calculated.truckCartonBoxesBig }} 箱</text>
        </view>
        <view class="result-item">
          <text>货车共装小箱</text>
          <text class="result-value">{{ calculated.truckCartonBoxesSmall }} 箱</text>
        </view>
        <view class="result-item">
          <text>货车共装斤数</text>
          <text class="result-value">{{ calculated.truckWeightTotal }} 斤</text>
        </view> -->
        <!-- <view class="result-item">
          <text>大框数量合计</text>
          <text class="result-value">{{ calculated.totalBigBoxes }} 个</text>
        </view>
        <view class="result-item">
          <text>小框数量合计</text>
          <text class="result-value">{{ calculated.totalSmallBoxes }} 个</text>
        </view> -->

        <!-- 鸡场金额明细 -->
        <view v-if="calculated.merchantAmount.length > 0" class="result-subtitle">鸡场金额明细</view>
        <view v-for="(item, index) in calculated.merchantAmount" :key="index" class="calc-item">
          <text class="name">{{ item.name }}</text>
          <text class="result-value">¥{{ item.amount }}</text>
        </view>

        <!-- 新增：收货价、交货价、盈利 -->
        <view class="result-divider"></view>
        <view class="result-item highlight">
          <text>拉货成本</text>
          <text class="result-value">¥{{ calculated.totalReceivePrice }}</text>
        </view>
        <view class="result-item highlight">
          <text>留存合计</text>
          <text class="result-value">¥{{ calculated.reservedTotal }}</text>
        </view>
        <view class="result-item highlight">
          <text>交货应回款</text>
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
import { calculateMerchantCost } from '@/calc/index'

const departureStore = useDepartureStore()
const merchantStore = useMerchantStore()
const workerStore = useWorkerStore()
const settingsStore = useSettingsStore()

const form = reactive({
  id: null,
  date: new Date().toISOString().split('T')[0], // 日期 YYYY-MM-DD
  dailyQuote: null, // 当日报价（元/斤）
  smallBoxWeight: null, // 本趟小框斤数
  merchantDetails: [], // 鸡场信息（一个记录可包含多个鸡场）
  depotBigBoxes: null, // 库房大框数
  depotSmallBoxes: null, // 库房小框数
  depotCartonBoxesBig: null, // 库房纸箱数
  depotCartonBoxesSmall: null, // 库房小箱数
  reservedBigBoxes: null, // 留货大框数
  reservedSmallBoxes: null, // 留货小框数  
  departureWorkerId: '', // 发车人员ID
  loadingWorkerIds: [], // 装车人员ID数组
  oilFee: 0, // 油费
  entryFee: 0, // 进门费
  tollFee: 0, // 过路费
  loadingFee: 0, // 装车费
  unloadingFee: 0, // 卸车费
  departureFee: 0, // 发车费
  truckRows: [], // 货车信息（一个记录可包含多个货车）
})

// 鸡场选项
const merchantOptions = computed(() => merchantStore.merchants)
// 发车人员选项
const departureWorkerOptions = computed(() => workerStore.departureWorkers)
// 装车人员选项
const loadingWorkerOptions = computed(() => workerStore.loadingWorkers.map(worker => ({
  text: worker.name,
  value: worker.id
})))

// 选择的发车人员
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
  form.smallBoxWeight = settingsStore.smallBoxWeight || 29.5
}

// 计算结果 - 使用新公式
const calculated = computed(() => {
  // 大框斤数和小框斤数
  const smallWeight = form.smallBoxWeight // 本趟小框斤数

  // 本次共拉 
  const merchantBigTotal = form.merchantDetails.reduce((sum, m) => sum + (m.bigBoxes || 0), 0) // 本次共拉大框数量
  const merchantSmallTotal = form.merchantDetails.reduce((sum, m) => sum + (m.smallBoxes || 0), 0) // 本次共拉小框数量
  const merchantUnitOfWeightTotal = form.merchantDetails.reduce((sum, m) => sum + (m.weight || 0), 0) // 本次共拉斤数数量
  // 本次共拉斤数
  const allMerchantWeight = merchantBigTotal * settingsStore.receiptBigBoxWeight + merchantSmallTotal * smallWeight + merchantUnitOfWeightTotal


  // 货车共装
  const truckBig = form.truckRows.reduce((sum, r) => sum + (r.bigBoxes || 0), 0)
  const truckSmall = form.truckRows.reduce((sum, r) => sum + (r.smallBoxes || 0), 0)
  // 货车共装大箱
  const truckCartonBoxesBig = form.truckRows.reduce((sum, r) => sum + (r.cartonBoxesBig || 0), 0)
  // 货车共装小箱
  const truckCartonBoxesSmall = form.truckRows.reduce((sum, r) => sum + (r.cartonBoxesSmall || 0), 0)
  // 货车共装斤数
  const truckWeightTotal = truckBig * settingsStore.deliveryBigBoxWeight + truckSmall * smallWeight + truckCartonBoxesBig * settingsStore.depotCartonBoxesBig + truckCartonBoxesSmall * settingsStore.depotCartonBoxesSmall

  // 留货数量
  const reservedBigBoxesTotal = merchantBigTotal + form.depotBigBoxes - truckBig // 大框留货数量
  const reservedSmallBoxesTotal = merchantSmallTotal + form.depotSmallBoxes - truckSmall // 小框留货数量

  // 大框合计： 装车大框 - 回车大框
  const totalBigBoxes = (truckBig || 0) - (form.returnedBigBoxes || 0)
  // 小框合计： 装车小框 - 回车小框
  const totalSmallBoxes = (truckSmall || 0) - (form.returnedSmallBoxes || 0)

  // 费用合计
  const totalOilFee = form.oilFee || 0 // 油费
  const totalEntryFee = form.entryFee || 0 // 进门费
  const totalTollFee = form.tollFee || 0 // 过路费
  const totalLoadingFee = form.loadingFee || 0 // 装车费
  const totalUnloadingFee = form.unloadingFee || 0 // 卸车费
  const totalDepartureFee = form.departureFee || 0 // 发车费

  const { totalReceivePrice, totalDeliveryPrice, merchantAmount } = calculateMerchantCost({
    merchantDetails: form.merchantDetails, // 鸡场信息
    dailyQuote: form.dailyQuote, // 当日报价
    smallWeight: smallWeight, // 本趟小框斤数
    truckCartonBoxesBig: truckCartonBoxesBig, // 货车共装大箱
    truckCartonBoxesSmall: truckCartonBoxesSmall, // 货车共装小箱
  })

  // 最低差价： A: 差价4， B:差价是3
  const minMargin = Math.min(...form.merchantDetails.map(m => m.margin))
  // 留存单价 = (当日报价 - minMargin）/ 收货大框斤数
  const reservedPrice = (form.dailyQuote - minMargin) / settingsStore.receiptBigBoxWeight
  // 留存合计 = （留货大框 * 大框斤数 + 留货小框 * 小框斤数 + 鸡场散斤数）* 留存单价
  const reservedTotalWeight = reservedBigBoxesTotal * settingsStore.receiptBigBoxWeight + reservedSmallBoxesTotal * smallWeight + merchantUnitOfWeightTotal
  const reservedTotal = (reservedTotalWeight * reservedPrice).toFixed(2)

  // 本趟盈利 = 交货价 - 收货价 - 油费 - 进门费 - 过路费 - 装车费 - 卸车费 - 发车费
  const profit = (totalDeliveryPrice - totalReceivePrice - totalOilFee - totalEntryFee - totalTollFee - totalLoadingFee - totalUnloadingFee - totalDepartureFee).toFixed(2)

  return {
    merchantBigTotal, // 本次共拉大框数量
    merchantSmallTotal, // 本次共拉小框数量
    merchantUnitOfWeightTotal, // 本次共拉机场散斤数数量
    allMerchantWeight, // 本次共拉斤数
    truckBig, // 货车共装大框
    truckSmall, // 货车共装小框
    truckCartonBoxesBig, // 货车共装大箱
    truckCartonBoxesSmall, // 货车共装小箱
    reservedBigBoxesTotal, // 留货大框数量
    reservedSmallBoxesTotal, // 留货小框数量
    merchantAmount, // 鸡场金额明细
    totalReceivePrice, // 本趟合计收货价
    totalDeliveryPrice, // 本趟合计交货价
    profit, // 本趟盈利
    totalBigBoxes, // 大框合计
    totalSmallBoxes, // 小框合计
    truckWeightTotal, // 货车共装斤数
    reservedTotal, // 留存合计
  }
})

// 根据日期自动带出报价
const loadQuoteByDate = (date) => {
  // 优先从 localStorage 的 dailyQuotes 读取
  const manualQuotes = uni.getStorageSync('dailyQuotes') || {}
  if (manualQuotes[date]) {
    form.dailyQuote = manualQuotes[date]
    return
  }

  // 其次从发车记录中查找
  const records = departureStore.getRecordsByDate(date)
  const recordQuote = records.find(r => r.dailyQuote)?.dailyQuote
  if (recordQuote) {
    form.dailyQuote = recordQuote
  }
}

const onDateChange = (e) => {
  form.date = e.detail.value
  // 日期变化时自动带出报价
  loadQuoteByDate(e.detail.value)
}
const onDepartureWorkerChange = (e) => { form.departureWorkerId = departureWorkerOptions.value[e.detail.value]?.id || '' }

const addMerchant = () => {
  form.merchantDetails.push({ merchantId: '', merchantName: '', bigBoxes: null, smallBoxes: null })
}

const removeMerchant = (index) => { form.merchantDetails.splice(index, 1) }

const onMerchantChange = (index, e) => {
  const merchant = merchantOptions.value[e.detail.value]
  form.merchantDetails[index].merchantId = merchant.id
  form.merchantDetails[index].merchantName = merchant.name
  form.merchantDetails[index].margin = merchant.margin
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

  const record = {
    ...form,
    ...calculated.value,
    getMoney: parseFloat(calculated.value.profit)
  }

  if (form.id) {
    departureStore.updateRecord(form.id, record)
  } else {
    departureStore.addRecord(record)
  }

  // 保存当日报价到本地存储（自动填充）
  if (form.dailyQuote) {
    const manualQuotes = uni.getStorageSync('dailyQuotes') || {}
    manualQuotes[form.date] = form.dailyQuote
    uni.setStorageSync('dailyQuotes', manualQuotes)
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
    console.log('数据返显', record);

    if (record) {
      Object.assign(form, record)
      console.log('打印form数据', form);
    }
  } else {
    // 非编辑模式，自动带出当日报价
    loadQuoteByDate(form.date)
  }
})
</script>

<style scoped>
.form-page { padding: 15px; padding-bottom: 50px; }
.section { background: #fff; border-radius: 8px; padding: 15px; margin-bottom: 15px; }
.section-title { font-size: 16px; font-weight: bold; margin-bottom: 10px; display: block; }
.form-item { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #f0f0f0; }
.form-item:last-child { border-bottom: none; }
.form-item input { text-align: right; width: 150px; }
.value, .picker-value { color: #999; }
.merchant-title { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #f0f0f0; margin-bottom: 10px; }
.merchant-title text { flex: 1; text-align: center; }
.merchant-item { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
.merchant-select { background: #f5f5f5; padding: 8px; border-radius: 4px; min-width: 80px; }
.merchant-inputs { display: flex; gap: 10px; flex: 1; }
.merchant-inputs input { flex: 1; background: #f5f5f5; padding: 8px; border-radius: 4px; }
.remove { color: #ff4d4f; font-size: 20px; padding: 5px; }
.add-merchant, .add-row { background: #f5f5f5; color: #007aff; margin-top: 10px; }
.depot-title { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #f0f0f0; margin-bottom: 10px; }
.depot-title text { flex: 1; text-align: center; }
.depot-row { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
.depot-row input { flex: 1; background: #f5f5f5; padding: 8px; border-radius: 4px; text-align: center; }
.truck-title { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #f0f0f0; margin-bottom: 10px; }
.truck-title text { flex: 1; text-align: center; }
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
.max-width-220 { max-width: 236px; }
</style>
