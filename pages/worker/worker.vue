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
        <view v-for="worker in filteredWorkers" :key="worker.id" class="worker-card">
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

    <!-- 加载状态 -->
    <view v-if="loading" class="loading">
      <text>加载中...</text>
    </view>

    <!-- 加载更多 -->
    <view v-if="loadingMore" class="loading-more">
      <text>加载更多...</text>
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
import { ref, reactive, computed, onMounted } from 'vue'
import { onShow, onHide, onReachBottom, onPullDownRefresh } from '@dcloudio/uni-app'
import { useUserStore, ROLES } from '@/store/user'
import { request } from '@/utils/api'
import { subscribe, publish } from '@/utils/eventBus'
import toast from '@/utils/toast'

const userStore = useUserStore()

let unsubscribe = null

onShow(() => {
  unsubscribe = subscribe('worker:refresh', () => {
    loadWorkers(1)
  })
  // 初始加载
  loadWorkers(1)
})

onHide(() => {
  if (unsubscribe) { unsubscribe(); unsubscribe = null }
})

// 上拉加载更多
onReachBottom(() => {
  if (!loadingMore.value && pagination.value.page < pagination.value.totalPages) {
    loadWorkers(pagination.value.page + 1, true)
  }
})

// 下拉刷新
onPullDownRefresh(() => {
  loadWorkers(1).then(() => {
    uni.stopPullDownRefresh()
  })
})

// 状态
const workers = ref([])
const loading = ref(false)
const loadingMore = ref(false)
const pagination = ref({
  page: 1,
  pageSize: 50,
  total: 0,
  totalPages: 0
})

// 直接调用分页接口，绕过缓存
// appendMode: true 时追加数据，false 时替换数据
const loadWorkers = async (page = 1, appendMode = false) => {
  if (appendMode) {
    loadingMore.value = true
  } else {
    loading.value = true
  }

  try {
    const res = await request(`/workers/list?page=${page}&pageSize=${pagination.value.pageSize}&sort=createdAt&order=desc`)
    const newData = res.data || []

    if (appendMode) {
      workers.value = [...workers.value, ...newData]
    } else {
      workers.value = newData
    }

    pagination.value.total = res.pagination?.total || 0
    pagination.value.totalPages = res.pagination?.totalPages || 0
    pagination.value.page = page
  } catch (e) {
    console.error('【Worker】加载员工列表失败:', e)
    toast.error('加载员工列表失败')
    if (!appendMode) {
      workers.value = []
    }
  } finally {
    loading.value = false
    loadingMore.value = false
  }
}

// 根据用户角色过滤员工
const filteredWorkers = computed(() => {
  const user = userStore.currentUser
  if (!user) return []

  if (user.role === ROLES.ADMIN) {
    return workers.value
  }

  if (user.role === ROLES.MIDDLEMAN) {
    return workers.value.filter(w => w.userId === user.id)
  }

  if (user.parentId) {
    return workers.value.filter(w => w.userId === user.parentId)
  }

  return []
})

// 分组展示（管理员视角）
const groupedWorkers = computed(() => {
  const middlemen = userStore.middlemanList
  return middlemen.map(mm => ({
    ...mm,
    workers: workers.value.filter(w => w.userId === mm.id).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
  })).filter(g => g.workers.length > 0)
})

// 切换分组展开状态
const expandedGroups = ref(new Set())
const toggleGroup = (groupId) => {
  if (expandedGroups.value.has(groupId)) {
    expandedGroups.value.delete(groupId)
  } else {
    expandedGroups.value.add(groupId)
  }
}

// 弹窗状态
const showAddModal = ref(false)
const editingWorker = ref(null)
const typeOptions = ['发车人员', '装车人员', '发车+装车']
const form = reactive({
  name: '',
  phone: '',
  typeIndex: 2
})
const typeMap = ['departure', 'loading', 'both']

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

const saveWorker = async () => {
  if (!form.name) {
    toast.error('请输入姓名')
    return
  }
  if (!form.phone || !form.phone.match(/^1[3-9]\d{9}$/)) {
    toast.error('请输入正确的手机号')
    return
  }

  const data = {
    name: form.name,
    phone: form.phone,
    type: typeMap[form.typeIndex],
    userId: userStore.currentUser?.id || null
  }

  try {
    if (editingWorker.value) {
      await request(`/workers/${editingWorker.value.id}`, {
        method: 'PUT',
        data: JSON.stringify(data)
      })
      toast.success('更新成功')
    } else {
      await request('/workers', {
        method: 'POST',
        data: JSON.stringify(data)
      })
      toast.success('添加成功')
    }
    closeModal()
    loadWorkers(pagination.value.page)
    publish('worker:refresh', null)
  } catch (e) {
    console.error('保存失败:', e)
    toast.error('保存失败')
  }
}

const deleteWorker = async (id) => {
  uni.showModal({
    title: '确认删除',
    content: '确定要删除此人员吗？',
    success: async (res) => {
      if (res.confirm) {
        try {
          await request(`/workers/${id}`, { method: 'DELETE' })
          toast.success('删除成功')
          loadWorkers(pagination.value.page)
          publish('worker:refresh', null)
        } catch (e) {
          console.error('删除失败:', e)
          toast.error('删除失败')
        }
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
.loading { text-align: center; padding: 20px; color: #999; }
.loading-more { text-align: center; padding: 15px; color: #999; font-size: 14px; }
.modal-mask { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; }
.modal { background: #fff; padding: 20px; border-radius: 8px; width: 80%; }
.modal-title { font-size: 18px; font-weight: bold; margin-bottom: 15px; display: block; }
.input { border: 1px solid #ddd; padding: 10px; border-radius: 4px; margin-bottom: 10px; width: 100%; box-sizing: border-box; }
.picker { border: 1px solid #ddd; padding: 10px; border-radius: 4px; margin-bottom: 10px; }
.modal-actions { display: flex; gap: 10px; justify-content: flex-end; }
</style>
