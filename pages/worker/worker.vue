<template>
  <view class="worker-page">
    <view class="header">
      <text class="title">人员管理</text>
      <button v-if="userStore.isMiddleman" class="add-btn" size="mini" @click="showAddModal = true">+ 添加</button>
    </view>

    <view class="worker-list">
      <!-- 按中间商分组展示（管理员视角） -->
      <uni-collapse v-if="userStore.isAdmin">
        <uni-collapse-item v-for="group in groupedWorkers" :key="group.id" :title="group.nickname || group.phone" :open="expandedGroups.has(group.id)" @toggle="toggleGroup(group.id)">
          <view v-for="worker in group.workers" :key="worker.id" class="worker-card">
            <view class="worker-info">
              <text class="name">{{ worker.name }}</text>
              <text class="phone">{{ worker.phone }}</text>
            </view>
            <view class="worker-type">
              <text v-if="worker.type === 'departure'" class="tag departure">发车</text>
              <text v-else-if="worker.type === 'loading'" class="tag loading">装车</text>
              <text v-else class="tag both">发车+装车</text>
            </view>
            <view class="actions">
              <text @click="editWorker(worker)">编辑</text>
              <text @click="deleteWorker(worker.id)" class="delete">删除</text>
            </view>
          </view>
        </uni-collapse-item>
      </uni-collapse>

      <!-- 非管理员直接展示 -->
      <template v-else>
        <view v-for="worker in workerStore.filteredWorkers" :key="worker.id" class="worker-card">
          <view class="worker-info">
            <text class="name">{{ worker.name }}</text>
            <text class="phone">{{ worker.phone }}</text>
          </view>
          <view class="worker-type">
            <text v-if="worker.type === 'departure'" class="tag departure">发车</text>
            <text v-else-if="worker.type === 'loading'" class="tag loading">装车</text>
            <text v-else class="tag both">发车+装车</text>
          </view>
          <view class="actions">
            <text @click="editWorker(worker)">编辑</text>
            <text @click="deleteWorker(worker.id)" class="delete">删除</text>
          </view>
        </view>
      </template>
    </view>

    <!-- 添加/编辑弹窗 -->
    <view v-if="showAddModal" class="modal-mask" @click="closeModal">
      <view class="modal" @click.stop>
        <text class="modal-title">{{ editingWorker ? '编辑人员' : '添加人员' }}</text>
		<uni-forms :modelValue="form">
			<uni-forms-item label="姓名" name="name">
				<uni-easyinput type="text" v-model="form.name" placeholder="请输入姓名" />
			</uni-forms-item>
			<uni-forms-item label="手机号" name="phone">
				<uni-easyinput type="tel" v-model="form.phone" placeholder="请输入手机号" />
			</uni-forms-item>
			<uni-forms-item label="工作内容" name="typeIndex">
				<picker :range="typeOptions" @change="onTypeChange">
				  <view class="picker">{{ typeOptions[form.typeIndex] }}</view>
				</picker>
			</uni-forms-item>
		</uni-forms>
        <view class="modal-actions">
          <button @click="closeModal">取消</button>
          <button @click="saveWorker">保存</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { onShow, onHide } from '@dcloudio/uni-app'
import { useWorkerStore } from '@/store/worker'
import { useUserStore } from '@/store/user'
import { subscribe } from '@/utils/eventBus'

const workerStore = useWorkerStore()
const userStore = useUserStore()

let unsubscribe = null

onShow(() => {
  unsubscribe = subscribe('worker:refresh', () => {
    workerStore.loadWorkers()
  })
})

onHide(() => {
  if (unsubscribe) { unsubscribe(); unsubscribe = null }
})

const showAddModal = ref(false)
const editingWorker = ref(null)
const typeOptions = ['发车人员', '装车人员', '发车+装车']
const form = reactive({
  name: '',
  phone: '',
  typeIndex: 2
})

const typeMap = ['departure', 'loading', 'both']

// 分组展开状态
const expandedGroups = ref(new Set())

// 分组展示（管理员视角）
const groupedWorkers = computed(() => {
  const allWorkers = workerStore.filteredWorkers
  const middlemen = userStore.middlemanList

  // 未选择中间商：显示所有分组
  return middlemen.map(mm => ({
    ...mm,
    workers: allWorkers.filter(w => w.userId === mm.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  })).filter(g => g.workers.length > 0)
})

// 切换分组展开状态
const toggleGroup = (groupId) => {
  if (expandedGroups.value.has(groupId)) {
    expandedGroups.value.delete(groupId)
  } else {
    expandedGroups.value.add(groupId)
  }
}

const editWorker = (worker) => {
  editingWorker.value = worker
  form.name = worker.name
  form.phone = worker.phone
  form.typeIndex = typeMap.indexOf(worker.type)
  showAddModal.value = true
}

const closeModal = () => {
  showAddModal.value = false
  editingWorker.value = null
  form.name = ''
  form.phone = ''
  form.typeIndex = 2
}

const saveWorker = () => {
  if (!form.name) {
    uni.showToast({
      title: '请输入姓名',
      icon: 'none'
    })
    return
  }
  if (!form.phone || !form.phone.match(/^1[3-9]\d{9}$/)) {
    uni.showToast({
      title: '请输入正确的手机号',
      icon: 'none'
    })
    return
  }
  const data = {
    name: form.name,
    phone: form.phone,
    type: typeMap[form.typeIndex]
  }

  if (editingWorker.value) {
    workerStore.updateWorker(editingWorker.value.id, data)
  } else {
    workerStore.addWorker(data)
  }
  closeModal()
}

const deleteWorker = (id) => {
  uni.showModal({
    title: '确认删除',
    content: '确定要删除此人员吗？',
    success: (res) => {
      if (res.confirm) {
        workerStore.deleteWorker(id)
      }
    }
  })
}

const onTypeChange = (e) => {
  form.typeIndex = parseInt(e.detail.value)
}
</script>

<style scoped>
.worker-page { padding: 20px; }
.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.title { font-size: 20px; font-weight: bold; }
.add-btn { background: #007aff; color: #fff; padding: 8px 16px; border-radius: 4px; margin: 0; }
.worker-card { background: #fff; padding: 15px; border-radius: 8px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; }
.worker-info { display: flex; flex-direction: column; }
.name { font-size: 16px; font-weight: bold; }
.phone { color: #999; font-size: 14px; }
.tag { padding: 2px 8px; border-radius: 4px; font-size: 12px; }
.departure { background: #e6f7ff; color: #007aff; }
.loading { background: #f6ffed; color: #52c41a; }
.both { background: #fff7e6; color: #fa8c16; }
.actions { display: flex; gap: 15px; }
.delete { color: #ff4d4f; }
.modal-mask { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; }
.modal { background: #fff; padding: 20px; border-radius: 8px; width: 80%; }
.modal-title { font-size: 18px; font-weight: bold; margin-bottom: 15px; display: block; }
.input { border: 1px solid #ddd; padding: 10px; border-radius: 4px; margin-bottom: 10px; width: 100%; box-sizing: border-box; }
.picker { border: 1px solid #ddd; padding: 10px; border-radius: 4px; margin-bottom: 10px; }
.modal-actions { display: flex; gap: 10px; justify-content: flex-end; }
</style>
