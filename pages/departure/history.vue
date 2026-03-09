<template>
	<view class="history-page">
		<view v-for="item in historyList" :key="item._id" class="history-item">
			<view class="history-header">
				<text class="modifier">{{ item.modifier_nickname || '未知' }}</text>
				<text class="time">{{ formatTime(item.created_at) }}</text>
			</view>
			<view class="history-content">
				<view v-for="(value, key) in item.changes" :key="key" class="change-item">
					<text class="field">{{ getFieldName(key) }}</text>
					<text class="old-value">{{ value.old }}</text>
					<text class="arrow">→</text>
					<text class="new-value">{{ value.new }}</text>
				</view>
			</view>
		</view>
		<view v-if="historyList.length === 0" class="empty">暂无修改历史</view>
	</view>
</template>

<script>
export default {
	data() {
		return {
			departureId: '',
			historyList: []
		}
	},
	onLoad(options) {
		this.departureId = options.id
		this.loadHistory()
	},
	methods: {
		async loadHistory() {
			const db = uniCloud.database()
			const res = await db.collection('departure_history').where({
				departure_id: this.departureId
			}).orderBy('created_at', 'desc').get()

			this.historyList = res.result?.data || []
		},
		formatTime(timestamp) {
			if (!timestamp) return ''
			const date = new Date(timestamp)
			return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')} ${String(date.getHours()).padStart(2,'0')}:${String(date.getMinutes()).padStart(2,'0')}`
		},
		getFieldName(key) {
			const fieldMap = {
				date: '日期',
				dailyQuote: '当日报价',
				departureWorkerId: '发车人员',
				loadingWorkerIds: '装车人员',
				oilFee: '油费',
				entryFee: '进门费',
				tollFee: '过路费',
				loadingFee: '装车费',
				unloadingFee: '卸车费',
				departureFee: '发车费',
				returnedBigBoxes: '回框大框',
				returnedSmallBoxes: '回框小框',
				note: '备注'
			}
			return fieldMap[key] || key
		}
	}
}
</script>

<style scoped>
.history-page { padding: 20rpx; }
.history-item { background: white; padding: 20rpx; margin-bottom: 20rpx; border-radius: 10rpx; }
.history-header { display: flex; justify-content: space-between; margin-bottom: 10rpx; }
.modifier { font-weight: bold; color: #333; }
.time { color: #999; font-size: 24rpx; }
.change-item { display: flex; align-items: center; font-size: 26rpx; padding: 8rpx 0; flex-wrap: wrap; }
.field { color: #666; min-width: 120rpx; }
.old-value { color: #e74c3c; margin: 0 10rpx; }
.arrow { color: #999; }
.new-value { color: #27ae60; margin: 0 10rpx; }
.empty { text-align: center; color: #999; padding: 60rpx; }
</style>
