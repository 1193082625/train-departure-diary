<template>
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
</template>
<script setup>
import { ref, onMounted } from 'vue'
import { useUserStore } from '@/store/user'
import { departureApi } from '@/api'
const userStore = useUserStore()

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

// 加载日历数据
const loadCalendarRecords = async () => {
  if (!selectedWorkerId.value) {
    calendarRecords.value = []
    return
  }
  try {
    const res = await departureApi.getWorkerCalendar(
      selectedWorkerId.value,
      props.dateRange.start,
      props.dateRange.end
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
const onMonthSwitch = () => {
  // 月份切换时重新加载日历数据
  loadCalendarRecords()
}

onMounted(() => {
    initCalendarRange()
})
</script>