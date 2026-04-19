<template>
  <!-- 鸡场管理页面 -->
  <view class="merchant-page">
    <view class="header">
      <text class="title">鸡场管理</text>
      <button v-if="userStore.isMiddleman" class="add-btn" size="mini" @click="showAddModal = true">+ 添加</button>
    </view>

    <view class="merchant-list">
      <!-- 按中间商分组展示（管理员视角） -->
      <uni-collapse v-if="userStore.isAdmin">
        <uni-collapse-item v-for="group in groupedMerchants" :key="group.id" :title="group.nickname || group.phone" :open="expandedGroups.has(group.id)" @toggle="toggleGroup(group.id)">
          <view v-for="merchant in group.merchants" :key="merchant.id" class="merchant-card">
            <view class="merchant-info">
              <text class="name">{{ merchant.name }}</text>
              <text class="phone">{{ merchant.phone }}</text>
            </view>
            <view class="merchant-margin">
              <text>差额: {{ merchant.margin }}元/框</text>
            </view>
            <view class="actions">
              <text @click="editMerchant(merchant)">编辑</text>
              <text @click="deleteMerchant(merchant.id)" class="delete">删除</text>
            </view>
          </view>
        </uni-collapse-item>
      </uni-collapse>

      <!-- 非管理员直接展示 -->
      <template v-else>
        <view v-for="merchant in merchants" :key="merchant.id" class="merchant-card">
          <view class="merchant-info">
            <text class="name">{{ merchant.name }}</text>
            <text class="phone">{{ merchant.phone }}</text>
          </view>
          <view class="merchant-margin">
            <text>差额: {{ merchant.margin }}元/框</text>
          </view>
          <view class="actions">
            <text @click="editMerchant(merchant)">编辑</text>
            <!-- <text @click="deleteMerchant(merchant.id)" class="delete">删除</text> -->
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
      <text>加载中...</text>
    </view>

    <!-- 没有更多数据了 -->
    <view v-else-if="hasMore === false && merchants.length > 0" class="no-more-data">
      <text>没有更多数据了</text>
    </view>

    <!-- 添加/编辑弹窗 -->
    <view v-if="showAddModal" class="modal-mask" @click="closeModal">
      <view class="modal" @click.stop>
        <text class="modal-title">{{ editingMerchant ? '编辑鸡场' : '添加鸡场' }}</text>
		<uni-forms :modelValue="form">
			<uni-forms-item label="姓名" name="name">
				<uni-easyinput type="text" v-model="form.name" placeholder="请输入姓名" />
			</uni-forms-item>
			<uni-forms-item label="手机号" name="phone" v-if="!editingMerchant">
				<uni-easyinput type="tel" v-model="form.phone" placeholder="请输入手机号" />
			</uni-forms-item>
			<uni-forms-item label="差额" name="margin">
				<uni-easyinput type="digit" v-model="form.margin" placeholder="差额（元/框）" />
			</uni-forms-item>
		</uni-forms>
        <view class="modal-actions">
          <button @click="closeModal">取消</button>
          <button @click="saveMerchant" :disabled="saveLoading">保存</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, reactive, computed, onMounted, nextTick } from 'vue'
import { onShow, onHide, onReachBottom, onPullDownRefresh } from '@dcloudio/uni-app'
import { useUserStore } from '@/store/user'
import { request, invalidateCache } from '@/api'
import toast from '@/utils/toast'
import { debounce } from '@/utils/throttle'

const userStore = useUserStore()

onShow(() => {
  // 初始加载
  loadMerchants(1)
})

onMounted(async () => {
  if (userStore.users.length === 0) {
    await userStore.loadUsers()
  }
})

// 上拉加载更多
onReachBottom(() => {
  if (!loadingMore.value && pagination.value.page < pagination.value.totalPages) {
    loadMerchants(pagination.value.page + 1, true)
  }
})

// 下拉刷新
onPullDownRefresh(() => {
  loadMerchants(1).then(() => {
    uni.stopPullDownRefresh()
  })
})

// 状态
const merchants = ref([])
const loading = ref(false)
const loadingMore = ref(false)
const saveLoading = ref(false)
const pagination = ref({
  page: 1,
  pageSize: 15,
  total: 0,
  totalPages: 0
})

// 是否还有更多数据可加载
const hasMore = computed(() => {
  return pagination.value.page < pagination.value.totalPages
})

// 直接调用分页接口，绕过缓存
// appendMode: true 时追加数据，false 时替换数据
let lastScrollHeight = 0
const loadMerchants = async (page = 1, appendMode = false) => {
  if (appendMode) {
    loadingMore.value = true
    // 保存当前内容高度
    const query = uni.createSelectorQuery().select('.merchant-list')
    query.boundingClientRect((rect) => {
      if (rect) {
        lastScrollHeight = rect.height
      }
    }).exec()
  } else {
    loading.value = true
  }

  try {
    const res = await request(`/merchants/list?page=${page}&pageSize=${pagination.value.pageSize}&sort=createdAt&order=desc`)
    const newData = res.data || []

    if (appendMode) {
      merchants.value = [...merchants.value, ...newData]
      // DOM 更新后恢复滚动位置
      nextTick(() => {
        const newQuery = uni.createSelectorQuery().select('.merchant-list')
        newQuery.boundingClientRect((rect) => {
          if (rect && lastScrollHeight > 0) {
            uni.pageScrollTo({
              scrollTop: rect.height - lastScrollHeight,
              duration: 0
            })
          }
        }).exec()
      })
    } else {
      merchants.value = newData
    }

    pagination.value.total = res.pagination?.total || 0
    pagination.value.totalPages = res.pagination?.totalPages || 0
    pagination.value.page = page
  } catch (e) {
    console.error('【Merchant】加载商户列表失败:', e)
    toast.error('加载商户列表失败')
    if (!appendMode) {
      merchants.value = []
    }
  } finally {
    loading.value = false
    loadingMore.value = false
  }
}

// 分组展示（管理员视角）
const groupedMerchants = computed(() => {
  const middlemen = userStore.middlemanList
  return middlemen.map(mm => ({
    ...mm,
    merchants: merchants.value.filter(m => m.userId === mm.id).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
  })).filter(g => g.merchants.length > 0)
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
const editingMerchant = ref(null)
const form = reactive({
  name: '',
  phone: '',
  margin: null
})

const editMerchant = (merchant) => {
  editingMerchant.value = merchant
  form.name = merchant.name
  form.phone = merchant.phone
  form.margin = merchant.margin
  showAddModal.value = true
}

const closeModal = () => {
  showAddModal.value = false
  editingMerchant.value = null
  form.name = ''
  form.phone = ''
  form.margin = null
}

const saveMerchant = debounce(async () => {
  // 校验手机号格式
  if (!form.phone || !form.phone.match(/^1[3-9]\d{9}$/)) {
    toast.error('请输入正确的手机号')
    return
  }
  // 校验差额必填
  if (!form.margin) {
    toast.error('差额不能为空')
    return
  }

  const data = {
    name: form.name,
    phone: form.phone,
    margin: Number(form.margin) || 0,
    userId: userStore.currentUser?.id || null
  }

  saveLoading.value = true
  toast.loading('保存中...')

  try {
    if (editingMerchant.value) {
      await request(`/merchants/${editingMerchant.value.id}`, {
        method: 'PUT',
        data: JSON.stringify(data)
      })
      toast.success('更新成功')
    } else {
      await request('/merchants', {
        method: 'POST',
        data: JSON.stringify(data)
      })
      toast.success('添加成功')
    }
    closeModal()
    loadMerchants(pagination.value.page)
    invalidateCache('merchants')
  } catch (e) {
    console.error('保存失败:', e)
  } finally {
    saveLoading.value = false
    toast.hideLoading()
  }
}, 1500)

const deleteMerchant = async (id) => {
  uni.showModal({
    title: '确认删除',
    content: '确定要删除此鸡场吗？',
    success: async (res) => {
      if (res.confirm) {
        try {
          await request(`/merchants/${id}`, { method: 'DELETE' })
          toast.success('删除成功')
          loadMerchants(pagination.value.page)
          invalidateCache('merchants')
        } catch (e) {
          console.error('删除失败:', e)
        }
      }
    }
  })
}
</script>

<style scoped>
.merchant-page { padding: 20px; }
.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.title { font-size: 20px; font-weight: bold; }
.add-btn { background: #007aff; color: #fff; padding: 8px 16px; border-radius: 4px; margin: 0;}
.merchant-card { background: #fff; padding: 15px; border-radius: 8px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; }
.merchant-info { display: flex; flex-direction: column; }
.name { font-size: 16px; font-weight: bold; }
.phone { color: #999; font-size: 14px; }
.merchant-margin { color: #fa8c16; font-size: 14px; }
.actions { display: flex; gap: 15px; }
.delete { color: #ff4d4f; }
.loading { text-align: center; padding: 20px; color: #999; }
.loading-more { text-align: center; padding: 15px; color: #999; font-size: 14px; }
.no-more-data { text-align: center; padding: 15px; color: #999; font-size: 14px; }
.modal-mask { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; }
.modal { background: #fff; padding: 20px; border-radius: 8px; width: 80%; }
.modal-title { font-size: 18px; font-weight: bold; margin-bottom: 15px; display: block; }
.input { border: 1px solid #ddd; padding: 10px; border-radius: 4px; margin-bottom: 10px; width: 100%; box-sizing: border-box; }
.modal-actions { display: flex; gap: 10px; justify-content: flex-end; }
</style>
