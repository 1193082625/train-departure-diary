<template>
  <!-- 个人盈利统计页面 -->
  <LoaderProfitContent v-if="userStore.isLoader" />
  <UserStatsContent v-else />
</template>

<script setup>
import { useUserStore } from '@/store/user'
import UserStatsContent from './components/UserStatsContent.vue'
import LoaderProfitContent from './components/LoaderProfitContent.vue'

const userStore = useUserStore()
</script>
