import { defineStore } from 'pinia'

interface UserState {
	token: string
	userId: string
	role: 'middleman' | 'worker' | 'merchant'
	nickname: string
	mobile: string
	relatedMiddlemen: any[]
	relatedWorkers: any[]
	relatedMerchants: any[]
}

export const useUserStore = defineStore('user', {
	state: (): UserState => ({
		token: uni.getStorageSync('token') || '',
		userId: uni.getStorageSync('userId') || '',
		role: (uni.getStorageSync('userRole') as 'middleman' | 'worker' | 'merchant') || '',
		nickname: uni.getStorageSync('nickname') || '',
		mobile: uni.getStorageSync('mobile') || '',
		relatedMiddlemen: [],
		relatedWorkers: [],
		relatedMerchants: []
	}),

	getters: {
		isLoggedIn: (state) => !!state.token,
		isMiddleman: (state) => state.role === 'middleman',
		isWorker: (state) => state.role === 'worker',
		isMerchant: (state) => state.role === 'merchant'
	},

	actions: {
		async login(token: string, userId: string, role: string, nickname: string, mobile: string) {
			this.token = token
			this.userId = userId
			this.role = role as 'middleman' | 'worker' | 'merchant'
			this.nickname = nickname
			this.mobile = mobile

			uni.setStorageSync('token', token)
			uni.setStorageSync('userId', userId)
			uni.setStorageSync('userRole', role)
			uni.setStorageSync('nickname', nickname)
			uni.setStorageSync('mobile', mobile)

			await this.loadRelations()
		},

		async loadRelations() {
			if (!this.userId) return

			const db = uniCloud.database()

			if (this.role === 'middleman') {
				const [workersRes, merchantsRes] = await Promise.all([
					db.collection('user_relations').where({
						middleman_id: this.userId,
						target_type: 'worker'
					}).get(),
					db.collection('user_relations').where({
						middleman_id: this.userId,
						target_type: 'merchant'
					}).get()
				])

				this.relatedWorkers = workersRes.data
				this.relatedMerchants = merchantsRes.data
			} else {
				const res = await db.collection('user_relations').where({
					target_id: this.userId
				}).get()

				this.relatedMiddlemen = res.data
			}
		},

		logout() {
			this.token = ''
			this.userId = ''
			this.role = '' as any
			this.nickname = ''
			this.mobile = ''
			this.relatedMiddlemen = []
			this.relatedWorkers = []
			this.relatedMerchants = []

			uni.removeStorageSync('token')
			uni.removeStorageSync('userId')
			uni.removeStorageSync('userRole')
			uni.removeStorageSync('nickname')
			uni.removeStorageSync('mobile')

			uni.reLaunch({ url: '/pages/login/login' })
		},

		async checkLoginStatus() {
			const token = uni.getStorageSync('token')
			if (!token) return false

			try {
				const res = await uniCloud.callFunction({
					name: 'get-user-info',
					data: { token }
				})

				if (res.result.code === 0) {
					this.userId = res.result.data.userId
					this.role = res.result.data.role
					this.mobile = res.result.data.mobile
					this.nickname = res.result.data.nickname
					await this.loadRelations()
					return true
				} else {
					this.logout()
					return false
				}
			} catch(e) {
				this.logout()
				return false
			}
		}
	}
})
