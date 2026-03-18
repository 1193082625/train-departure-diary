<script>
	import { initDB } from '@/utils/db'
	import { useUserStore } from '@/store/user'

	export default {
		onLaunch: function() {
			console.warn('当前组件仅支持 uni_modules 目录结构 ，请升级 HBuilderX 到 3.1.0 版本以上！')
			console.log('App Launch')

			// 初始化数据库
			initDB().then(() => {
				console.log('数据库初始化完成')
				// 初始化用户store（会创建测试数据）
				const userStore = useUserStore()
			}).catch(err => {
				console.error('数据库初始化失败:', err)
			})
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
