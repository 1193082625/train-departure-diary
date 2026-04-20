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
            <input v-model="form.dailyQuote" type="digit" placeholder="请输入" />
            <text class="ml-4">（元/框）</text>
          </view>
        </view>
        <view class="form-item">
          <text>本趟小框斤数</text>
          <view class="flex-end">
            <input v-model="form.smallBoxWeight" type="digit" placeholder="请输入" />
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
        <!-- 提示信息 -->
        <text class="section-tip">请先选择鸡场，并确保鸡场差额不为空</text>
        <!-- 标题 -->
         <view class="merchant-title">
          <text class="w-96">鸡场</text>
          <text>大框</text>
          <text>小框</text>
          <text>斤数</text>
          <view class="w-22"></view>
          </view>
        <view v-for="(detail, index) in form.merchantDetails" :key="index" class="merchant-item">
          <view class="merchant-select" @click="openMerchantSelector(index)">{{ detail.merchantName || '选择鸡场' }}</view>
          <view class="merchant-inputs">
            <input v-model="detail.bigBoxes" :disabled="!detail.merchantId || !detail.margin" type="number" placeholder="大框" />
            <input v-model="detail.smallBoxes" :disabled="!detail.merchantId || !detail.margin" type="number" placeholder="小框" />
            <input v-model="detail.weight" :disabled="!detail.merchantId || !detail.margin" type="digit" placeholder="斤数" />
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
          <input v-model="form.depotBigBoxes" type="number" placeholder="大框" />
          <input v-model="form.depotSmallBoxes" type="number" placeholder="小框" />
          <input v-model="form.depotCartonBoxesBig" type="number" placeholder="大箱" />
          <input v-model="form.depotCartonBoxesSmall" type="number" placeholder="小箱" />
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
          <input v-model="row.bigBoxes" type="number" placeholder="大框" />
          <input v-model="row.smallBoxes" type="number" placeholder="小框" />
          <input v-model="row.cartonBoxesBig" type="number" placeholder="大箱" />
          <input v-model="row.cartonBoxesSmall" type="number" placeholder="小箱" />
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
            <input v-model="form.returnedBigBoxes" type="number" placeholder="0" />
            <text class="ml-4">框</text>
          </view>
        </view>
        <view class="form-item">
          <text>回框小框</text>
          <view class="flex-end">
            <input v-model="form.returnedSmallBoxes" type="number" placeholder="0" />
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
            <input v-model="form.oilFee" type="digit" placeholder="0" />
            <text class="ml-4">（元）</text>
          </view>
        </view>
        <view class="form-item">
          <text>进门费</text>
          <view class="flex-end">
            <input v-model="form.entryFee" type="digit" placeholder="0" />
            <text class="ml-4">（元）</text>
          </view>
        </view>
        <view class="form-item">
          <text>过路费</text>
          <view class="flex-end">
            <input v-model="form.tollFee" type="digit" placeholder="0" />
            <text class="ml-4">（元）</text>
          </view>
        </view>
        <view class="form-item">
          <text>装车费</text>
          <view class="flex-end">
            <input v-model="form.loadingFee" type="digit" placeholder="0" />
            <text class="ml-4">（元）</text>
          </view>
        </view>
        <view class="form-item">
          <text>卸车费</text>
          <view class="flex-end">
            <input v-model="form.unloadingFee" type="digit" placeholder="0" />
            <text class="ml-4">（元）</text>
          </view>
        </view>
        <view class="form-item">
          <text>发车费</text>
          <view class="flex-end">
            <input v-model="form.departureFee" type="digit" placeholder="0" />
            <text class="ml-4">（元）</text>
          </view>
        </view>
      </view>

      <!-- 计算结果 - 【针对中间商可见】 -->
      <view class="section result">
        <text class="section-title">计算结果</text>
        <view class="flex-start mb-10">
          本次共拉 <text class="font-bold color-fa8c16 ml-4 mr-4">{{ calculated.allMerchantWeight }} </text> 斤
        </view>
        <view class="flex-start">
          <view class="w-pre25 font-bold">
            <text class="color-fa8c16">{{ calculated.merchantBigTotal }}</text> 大框</view>
          <view class="w-pre25 font-bold"><text class="color-fa8c16">{{ calculated.merchantSmallTotal }}</text> 小框</view>
          <view class="w-pre25 font-bold"><text class="color-fa8c16">{{ calculated.merchantWeightTotal }}</text> 斤</view>
        </view>
        <view class="flex-start mt-15 mb-10">
          货车共装 <text class="font-bold color-fa8c16 ml-4 mr-4">{{ calculated.truckWeightTotal }}</text> 斤
        </view>
        <view class="flex-start">
          <view class="w-pre25 font-bold"><text class="color-fa8c16">{{ calculated.truckBig }}</text> 大框</view>
          <view class="w-pre25 font-bold"><text class="color-fa8c16">{{ calculated.truckSmall }}</text> 小框</view>
          <view class="w-pre25 font-bold"><text class="color-fa8c16">{{ calculated.truckCartonBoxesBig }}</text> 大箱</view>
          <view class="w-pre25 font-bold"><text class="color-fa8c16">{{ calculated.truckCartonBoxesSmall }}</text> 小箱</view>
        </view>
        <view class="flex-start mt-15 mb-10">
          回框数量合计
        </view>
        <view class="flex flex-start gap-2">
          <view class="font-bold">
            {{calculated.totalBigBoxes  < 0 ? '欠' : ''}}
            <text class="ml-4 mr-4 font-bold color-fa8c16">{{ calculated.totalBigBoxes }}</text> 
            大框
          </view>
          <view class="font-bold">
            {{calculated.totalSmallBoxes  < 0 ? '欠' : ''}}
            <text class="ml-4 mr-4 font-bold color-fa8c16">{{ calculated.totalSmallBoxes }}</text> 
            小框
          </view>
        </view>

        <!-- 鸡场金额明细 -->
        <view v-if="isAdminOrMiddleman">
          <view v-if="calculated.merchantAmount.length > 0" class="result-subtitle">鸡场收货明细</view>
          <view v-for="(item, index) in calculated.merchantAmount" :key="index" class="calc-item">
            <text class="name">{{ item.name }}</text>
            <text class="result-value">¥{{ item.amount }}</text>
          </view>
        </view>

        <!-- 新增：收货价、交货价、盈利 -->
        <view v-if="isAdminOrMiddleman">
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
      </view>

      <view class="actions" v-if="showSaveButton">
        <button @click="saveRecord" :disabled="saveLoading" class="save-btn">保存</button>
      </view>
    </view>

    <!-- 鸡场选择弹窗 -->
    <MerchantSelector
      :visible="merchantSelectorVisible"
      :merchants="merchantOptions"
      :selected-merchant-ids="selectedMerchantIds"
      :current-merchant-id="currentEditingMerchantId"
      @update:visible="merchantSelectorVisible = $event"
      @confirm="onMerchantSelected"
    />
  </view>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useSettingsStore } from '@/store/settings'
import { useUserStore, ROLES } from '@/store/user'
import { departureApi, dailyQuoteApi, apiOps } from '@/api'
import { calculateMerchantCost } from '@/utils/calc'
import toast from '@/utils/toast'
import { debounce } from '@/utils/throttle'
import MerchantSelector from './components/merchant-selector.vue'

const settingsStore = useSettingsStore()
const userStore = useUserStore()

// 获取指定日期的报价（由后端过滤）
const getQuoteByDate = async (date) => {
  try {
    const res = await dailyQuoteApi.getByDate(date)
    // 后端返回格式: { success: true, data: [{ id, date, quote, ... }] }
    if (res && res.success && Array.isArray(res.data) && res.data.length > 0) {
      return res.data[0].quote
    }
    return null
  } catch (e) {
    console.error('获取日报价失败:', e)
    return null
  }
}

// 员工数据（本地管理）
const allWorkers = ref([])

const loadWorkers = async () => {
  try {
    const res = await apiOps.queryAll('workers')
    allWorkers.value = res.data || []
  } catch (e) {
    console.error('加载员工列表失败:', e)
    allWorkers.value = []
  }
}

// 鸡场数据（本地管理）
const merchants = ref([])

const loadMerchants = async () => {
  try {
    const res = await apiOps.queryAll('merchants')
    merchants.value = res.data || []
  } catch (e) {
    console.error('加载鸡场列表失败:', e)
    merchants.value = []
  }
}

const departureWorkers = computed(() =>
  allWorkers.value.filter(w => w.type === 'departure' || w.type === 'both')
)

const loadingWorkers = computed(() =>
  allWorkers.value.filter(w => w.type === 'loading' || w.type === 'both')
)

const getWorkerById = (id) => allWorkers.value.find(w => w.id === id)

// 当前用户
const currentUser = computed(() => userStore.currentUser)
// 当前用户是否是装发车
const isLoader = computed(() => currentUser.value?.role === ROLES.LOADER)
// 当前用户是否是管理员或中间商
const isAdminOrMiddleman = computed(() => {
  const role = currentUser.value?.role
  return role === ROLES.ADMIN || role === ROLES.MIDDLEMAN
})

const form = reactive({
  id: null,
  userId: null, // 记录创建者ID
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

// 鸡场选择弹窗状态
const merchantSelectorVisible = ref(false)
const currentEditingMerchantIndex = ref(-1)
const saveLoading = ref(false)
const initLoading = ref(false)
const currentEditingMerchantId = computed(() => {
  if (currentEditingMerchantIndex.value >= 0 && currentEditingMerchantIndex.value < form.merchantDetails.length) {
    return form.merchantDetails[currentEditingMerchantIndex.value].merchantId || ''
  }
  return ''
})

// 已选中鸡场ID列表（用于弹窗置灰）
const selectedMerchantIds = computed(() =>
  form.merchantDetails
    .filter(m => m.merchantId)
    .map(m => m.merchantId)
)

// 打开鸡场选择弹窗
const openMerchantSelector = (index) => {
  currentEditingMerchantIndex.value = index
  merchantSelectorVisible.value = true
}

// 鸡场选择确认
const onMerchantSelected = (merchant) => {
  if (currentEditingMerchantIndex.value >= 0) {
    form.merchantDetails[currentEditingMerchantIndex.value].merchantId = merchant.id
    form.merchantDetails[currentEditingMerchantIndex.value].merchantName = merchant.name
    form.merchantDetails[currentEditingMerchantIndex.value].margin = merchant.margin
  }
}

// 是否显示保存按钮
// 规则：管理员/中间商始终显示；装发车只显示自己创建的记录
const showSaveButton = computed(() => {
  // 管理员或中间商，始终显示
  if (isAdminOrMiddleman.value) {
    return true
  }
  // 装发车：只显示自己创建的记录
  if (isLoader.value) {
    // 新增记录显示
    if (!form.id) {
      return true
    }
    // 编辑记录：只显示自己创建的
    // return form.userId === currentUser.value?.id
    // 装发车角色创建后只允许查看不允许删除
    return false
  }
  return true
})

// 鸡场选项（根据角色过滤）
const merchantOptions = computed(() => merchants.value)
// 发车人员选项
const departureWorkerOptions = computed(() => departureWorkers.value)
// 装车人员选项
const loadingWorkerOptions = computed(() => loadingWorkers.value.map(worker => ({
  text: worker.name,
  value: worker.id
})))

// 选择的发车人员
const selectedDepartureWorker = computed(() =>
  getWorkerById(form.departureWorkerId)
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
  const smallWeight = Number(form.smallBoxWeight) // 本趟小框斤数

  // 本次共拉 
  const merchantBigTotal = form.merchantDetails.reduce((sum, m) => sum + (Number(m.bigBoxes) || 0), 0) // 本次共拉大框数量
  const merchantSmallTotal = form.merchantDetails.reduce((sum, m) => sum + (Number(m.smallBoxes) || 0), 0) // 本次共拉小框数量
  const merchantWeightTotal = form.merchantDetails.reduce((sum, m) => sum + (Number(m.weight) || 0), 0) // 本次共拉斤数数量
  // 本次共拉斤数
  const allMerchantWeight = merchantBigTotal * Number(settingsStore.receiptBigBoxWeight) + merchantSmallTotal * smallWeight + merchantWeightTotal


  // 货车共装
  const truckBig = form.truckRows.reduce((sum, r) => sum + (Number(r.bigBoxes) || 0), 0)
  const truckSmall = form.truckRows.reduce((sum, r) => sum + (Number(r.smallBoxes) || 0), 0)
  // 货车共装大箱
  const truckCartonBoxesBig = form.truckRows.reduce((sum, r) => sum + (Number(r.cartonBoxesBig) || 0), 0)
  // 货车共装小箱
  const truckCartonBoxesSmall = form.truckRows.reduce((sum, r) => sum + (Number(r.cartonBoxesSmall) || 0), 0)
  // 货车共装斤数
  const truckWeightTotal = truckBig * Number(settingsStore.deliveryBigBoxWeight) + truckSmall * smallWeight + truckCartonBoxesBig * Number(settingsStore.depotCartonBoxesBig) + truckCartonBoxesSmall * Number(settingsStore.depotCartonBoxesSmall)


  // 交货应回款
  const totalDeliveryPriceBig = (Number(form.dailyQuote) - 1) * truckBig
  const totalDeliveryPriceSmall = Number(form.dailyQuote - 1) / Number(settingsStore.deliveryBigBoxWeight) * Number(smallWeight) * truckSmall
  //  大箱应回款 = （今日报价 + 8）/ 交货大框斤数 * 默认大箱斤数 * 数量
  const totalDeliveryPriceCartonBoxesBig = (Number(form.dailyQuote) + 8) / settingsStore.deliveryBigBoxWeight * settingsStore.depotCartonBoxesBig  * truckCartonBoxesBig
  //  小箱应回款 = （今日报价 + 5）/ 交货大框斤数 * 默认小箱斤数 * 数量
  const totalDeliveryPriceBoxesSmall = (Number(form.dailyQuote) + 5) / settingsStore.deliveryBigBoxWeight * settingsStore.depotCartonBoxesSmall   * truckCartonBoxesSmall
  const totalDeliveryPrice = (totalDeliveryPriceBig + totalDeliveryPriceSmall + totalDeliveryPriceCartonBoxesBig + totalDeliveryPriceBoxesSmall).toFixed(2)

  // 留货数量
  const reservedBigBoxesTotal = merchantBigTotal + Number(form.depotBigBoxes) - truckBig // 大框留货数量
  const reservedSmallBoxesTotal = merchantSmallTotal + Number(form.depotSmallBoxes) - truckSmall // 小框留货数量

  // 大框合计： 装车大框 - 回车大框
  const totalBigBoxes = (truckBig || 0) - (Number(form.returnedBigBoxes) || 0)
  // 小框合计： 装车小框 - 回车小框
  const totalSmallBoxes = (truckSmall || 0) - (Number(form.returnedSmallBoxes) || 0)

  // 费用合计
  const totalOilFee = Number(form.oilFee) || 0 // 油费
  const totalEntryFee = Number(form.entryFee) || 0 // 进门费
  const totalTollFee = Number(form.tollFee) || 0 // 过路费
  const totalLoadingFee = Number(form.loadingFee) || 0 // 装车费
  const totalUnloadingFee = Number(form.unloadingFee) || 0 // 卸车费
  const totalDepartureFee = Number(form.departureFee) || 0 // 发车费

  const { totalReceivePrice, merchantAmount } = calculateMerchantCost({
    merchantDetails: form.merchantDetails, // 鸡场信息
    dailyQuote: Number(form.dailyQuote), // 当日报价
    smallWeight: smallWeight, // 本趟小框斤数
    truckCartonBoxesBig: truckCartonBoxesBig, // 货车共装大箱
    truckCartonBoxesSmall: truckCartonBoxesSmall, // 货车共装小箱
    merchants: merchants.value, // 鸡场列表
  })

  // 最低差价： A: 差价4， B:差价是3
  const minMargin = form.merchantDetails.length > 0 ? Math.min(...form.merchantDetails.map(m => m.margin)) : 0
  // 留存单价 = (当日报价 - minMargin）/ 收货大框斤数
  const reservedPrice = (Number(form.dailyQuote) - minMargin) / Number(settingsStore.receiptBigBoxWeight)
  // 留存合计 = （留货大框 * 大框斤数 + 留货小框 * 小框斤数 + 鸡场散斤数）* 留存单价
  const reservedTotalWeight = reservedBigBoxesTotal * Number(settingsStore.deliveryBigBoxWeight) + reservedSmallBoxesTotal * smallWeight + merchantWeightTotal
  const reservedTotal = Number(((reservedTotalWeight || 0) * (reservedPrice || 0)).toFixed(2))
  
  
  // 大箱成本 = （当日报价 - 2） / 45 * 43 * 大箱数量
  const costCartonBoxesBig = (form.dailyQuote - 2) / settingsStore.receiptBigBoxWeight * settingsStore.depotCartonBoxesBig * truckCartonBoxesBig
  // 小箱成本 = （当日报价 - 2） / 45 * 30 * 小箱数量
  const costCartonBoxesSmall = (form.dailyQuote - 2) / settingsStore.receiptBigBoxWeight * settingsStore.depotCartonBoxesSmall * truckCartonBoxesSmall

  // 本趟盈利 = 交货价 + 留存合计 - 收货价 - 大箱成本 - 小箱成本 - 油费 - 进门费 - 过路费 - 装车费 - 卸车费 - 发车费
  const profit = Number((Number(totalDeliveryPrice) + reservedTotal - totalReceivePrice - costCartonBoxesBig - costCartonBoxesSmall - totalOilFee - totalEntryFee - totalTollFee - totalLoadingFee - totalUnloadingFee - totalDepartureFee).toFixed(2))
  
  return {
    merchantBigTotal, // 本次共拉大框数量
    merchantSmallTotal, // 本次共拉小框数量
    merchantWeightTotal, // 本次共拉鸡场散斤数数量
    allMerchantWeight, // 本次共拉斤数
    truckBig, // 货车共装大框
    truckSmall, // 货车共装小框
    truckCartonBoxesBig, // 货车共装大箱
    truckCartonBoxesSmall, // 货车共装小箱
    reservedBigBoxesTotal, // 留货大框数量
    reservedSmallBoxesTotal, // 留货小框数量
    merchantAmount, // 鸡场金额明细
    totalReceivePrice, // 本趟合计收货价
    totalDeliveryPrice: Number(totalDeliveryPrice), // 本趟合计交货价
    profit, // 本趟盈利
    totalBigBoxes, // 大框合计
    totalSmallBoxes, // 小框合计
    truckWeightTotal, // 货车共装斤数
    reservedTotal, // 留存合计
  }
})

// 根据日期自动带出报价
const loadQuoteByDate = async (date) => {
  // 优先从云端日报价表读取
  const manualQuote = await getQuoteByDate(date)
  if (manualQuote) {
    form.dailyQuote = manualQuote
    return
  }
}

const onDateChange = (e) => {
  form.date = e.detail.value
  // 日期变化时自动带出报价
  loadQuoteByDate(e.detail.value)
}
const onDepartureWorkerChange = (e) => { form.departureWorkerId = departureWorkerOptions.value[e.detail.value]?.id || '' }

const addMerchant = () => {
  form.merchantDetails.push({ merchantId: '', merchantName: '', margin: null, bigBoxes: null, smallBoxes: null, weight: null })
}

const removeMerchant = (index) => { form.merchantDetails.splice(index, 1) }

const addTruckRow = () => { form.truckRows.push({ rowNumber: form.truckRows.length + 1, bigBoxes: null, smallBoxes: null }) }
const removeTruckRow = (index) => { form.truckRows.splice(index, 1) }

const saveRecord = debounce(async () => {
  // 添加校验
  if (!form.dailyQuote) {
    toast.error('请填写当日报价')
    return
  }

  if (form.dailyQuote <= 0) {
    toast.error('当日报价不能低于0元')
    return
  }
  if (form.merchantDetails.length === 0) {
    toast.error('请添加鸡场')
    return
  }
  if (form.truckRows.length === 0) {
    toast.error('请添加货车排数')
    return
  }
  // 发车人不能为空
  if (!form.departureWorkerId) {
    toast.error('请选择发车人员')
    return
  }
  // 装车人不能为空
  if (form.loadingWorkerIds.length === 0) {
    toast.error('请选择装车人员')
    return
  }
  // 留货数量为负数时禁止提交
  if (calculated.value.reservedBigBoxesTotal < 0 || calculated.value.reservedSmallBoxesTotal < 0) {
    toast.error('留货数量为负数，请检查信息是否正确')
    return
  }

  // 将所有null改为0，字符串数字转为真正的数字
  const formData = { ...form }
  const numberFields = ['dailyQuote', 'smallBoxWeight', 'depotBigBoxes', 'depotSmallBoxes', 'depotCartonBoxesBig', 'depotCartonBoxesSmall', 'reservedBigBoxes', 'reservedSmallBoxes', 'oilFee', 'entryFee', 'tollFee', 'loadingFee', 'unloadingFee', 'departureFee', 'returnedBigBoxes', 'returnedSmallBoxes']
  Object.keys(formData).forEach(key => {
    if (formData[key] === null) {
      formData[key] = 0
    } else if (numberFields.includes(key) && typeof formData[key] === 'string') {
      formData[key] = Number(formData[key]) || 0
    }
  })
  // 处理 truckRows 中的数字字段
  formData.truckRows = formData.truckRows.map(row => ({
    ...row,
    bigBoxes: Number(row.bigBoxes) || 0,
    smallBoxes: Number(row.smallBoxes) || 0,
    cartonBoxesBig: Number(row.cartonBoxesBig) || 0,
    cartonBoxesSmall: Number(row.cartonBoxesSmall) || 0
  }))
  // 处理 merchantDetails 中的数字字段
  formData.merchantDetails = formData.merchantDetails.map(m => ({
    ...m,
    bigBoxes: Number(m.bigBoxes) || 0,
    smallBoxes: Number(m.smallBoxes) || 0,
    weight: Number(m.weight) || 0
  }))
  const record = {
    ...formData,
    ...calculated.value,
    getMoney: parseFloat(calculated.value.profit),
    dailyQuote: Number(form.dailyQuote) || 0
  }

  saveLoading.value = true
  toast.loading('保存中...')

  try {
    if (form.id) {
      await departureApi.update(form.id, record)
    } else {
      await departureApi.create(record)
    }

    uni.navigateBack()
  } catch (e) {
    console.error('保存失败:', e)
    toast.error('保存失败，请重试')
  } finally {
    saveLoading.value = false
    toast.hideLoading()
  }
}, 1000)

onMounted(async () => {
  initLoading.value = true
  // 加载中间商的settings（loader角色需要等settings加载完成）
  await settingsStore.loadSettings()
  // 加载默认设置
  loadDefaultSettings()
  // 加载员工数据
  await loadWorkers()
  // 加载鸡场数据
  await loadMerchants()

  // 检查是否有编辑ID
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1]
  const options = currentPage.options || {}

  if (options.id) {
    // 根据ID获取记录详情
    const res = await departureApi.getById(options.id)
    if (res && res.success && res.data) {
      Object.assign(form, res.data)
    }
  } else {
    // 非编辑模式，自动带出当日报价
    loadQuoteByDate(form.date)
  }
  initLoading.value = false
})
</script>

<style scoped>
.color-fa8c16 { color: #fa8c16; }
.form-page { padding: 15px; padding-bottom: 50px; }
.section { background: #fff; border-radius: 8px; padding: 15px; margin-bottom: 15px; }
.section-title { font-size: 16px; font-weight: bold; margin-bottom: 10px; display: block; }
.section-tip { font-size: 12px; color: #999; margin-bottom: 10px; display: block; }
.form-item { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #f0f0f0; }
.form-item:last-child { border-bottom: none; }
.form-item input { text-align: right; width: 150px; }
.value, .picker-value { color: #999; }
.merchant-title { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #f0f0f0; margin-bottom: 10px; }
.merchant-title text { flex: 1; text-align: center; }
.merchant-item { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
.merchant-select { background: #f5f5f5; padding: 8px; border-radius: 4px; min-width: 80px; cursor: pointer; }
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
