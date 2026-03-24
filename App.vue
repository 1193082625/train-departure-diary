<script>
	import { useUserStore } from '@/store/user'

	// 会话有效期：7 天（毫秒）
	const SESSION_EXPIRY = 7 * 24 * 60 * 60 * 1000

	// 检查会话是否过期
	const isSessionExpired = () => {
		const loginTime = uni.getStorageSync('loginTime')
		// 无登录时间记录，说明是旧用户迁移，视为有效会话
		if (!loginTime) return false

		const now = Date.now()
		const diff = now - loginTime
		return diff > SESSION_EXPIRY
	}

	export default {
		onLaunch: function() {
			console.warn('当前组件仅支持 uni_modules 目录结构 ，请升级 HBuilderX 到 3.1.0 版本以上！')
			console.log('App Launch')

			// 初始化用户store
			const userStore = useUserStore()
		},
		onShow: function() {
			console.log('App Show')

			// 检查登录状态 - 直接从本地存储读取
			const userData = uni.getStorageSync('currentUser')
			if (!userData) {
				// 未登录，跳转到登录页
				uni.reLaunch({
					url: '/pages/login/login'
				})
				return
			}

			// 检查会话是否过期
			if (isSessionExpired()) {
				// 会话过期，清除登录状态并跳转到登录页
				uni.removeStorageSync('currentUser')
				uni.removeStorageSync('loginTime')
				uni.reLaunch({
					url: '/pages/login/login'
				})
			} else if (!uni.getStorageSync('loginTime') && userData) {
				// 兼容旧用户：没有 loginTime 但有 currentUser，设置登录时间
				uni.setStorageSync('loginTime', Date.now())
			}
		},
		onHide: function() {
			console.log('App Hide')
		}
	}
</script>

<style lang="scss">
	/*每个页面公共css */
	@import '@/uni_modules/uni-scss/index.scss';
	/* #ifndef APP-NVUE */
	@import '@/static/styles/customicons.css';
	@import '@/static/styles/common.css';
	@import '@/static/styles/utils.scss';
	// 设置整个项目的背景色
	page {
		background-color: #f5f5f5;
	}

	/* #endif */
	.example-info {
		font-size: 14px;
		color: #333;
		padding: 10px;
	}
</style>
