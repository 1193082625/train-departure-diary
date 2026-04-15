<template>
    <view class="mb-15">
        <uni-calendar
            v-if="userStore.isLoader"
            :insert="true"
            :date="currentDate"
            :start-date="calendarStart"
            :end-date="calendarEnd"
            :clear-date="true"
            :show-month="false"
            :selected="calendarRecords"
            @monthSwitch="onMonthSwitch"
        />
    </view>
</template>
<script setup>
import { ref, onMounted, watch, computed } from 'vue'
import { useUserStore } from '@/store/user'
import { departureApi } from '@/api'

const userStore = useUserStore()

// 获取当前装发车用户的 workerId
const currentWorkerId = computed(() => userStore.currentUser?.workerId || '')

// 日历数据
const calendarRecords = ref([])
const calendarStart = ref('')
const calendarEnd = ref('')
const currentDate = ref('')

// 获取日历的开始和结束日期
const initCalendarRange = () => {
  const today = new Date()
  const year = today.getFullYear()
  // 从年初开始
  calendarStart.value = `${year}-01-01`
  // 到年底
  calendarEnd.value = `${year}-12-31`
}

// 计算月份的开始和结束日期
const getMonthRange = (date) => {
  const d = new Date(date)
  const year = d.getFullYear()
  const month = d.getMonth() + 1
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`
  // 获取月份最后一天
  const lastDay = new Date(year, month, 0).getDate()
  const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
  return { start: startDate, end: endDate }
}

// 加载日历数据
const loadCalendarRecords = async (date) => {
  if (!currentWorkerId.value || !date) {
    calendarRecords.value = []
    return
  }
  try {
    const { start, end } = getMonthRange(date)
    const res = await departureApi.getWorkerCalendar(
      currentWorkerId.value,
      start,
      end
    )
    if (res.success && res.data) {
      calendarRecords.value = (res.data.personRecord || []).map(item => ({
        date: item.date,
        info: item.info
      }))
    }
  } catch (e) {
    console.error('加载日历数据失败:', e)
    calendarRecords.value = []
  }
}

// 月份切换
const onMonthSwitch = (e) => {
  // e.date 是切换后的日期字符串
  loadCalendarRecords(e.date)
}

onMounted(() => {
  initCalendarRange()
  // 初始化加载当月数据
  const today = new Date()
  currentDate.value = today.toISOString().split('T')[0]
  loadCalendarRecords(currentDate.value)
})

// 监听 currentUser 变化，确保 workerId 就绪后加载数据
watch(() => userStore.currentUser?.workerId, (newWorkerId) => {
  if (newWorkerId && currentDate.value) {
    loadCalendarRecords(currentDate.value)
  }
}, { immediate: true })
</script>