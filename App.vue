<script>
	import { useUserStore } from '@/store/user'

	export default {
		onLaunch: function() {
			console.warn('当前组件仅支持 uni_modules 目录结构 ，请升级 HBuilderX 到 3.1.0 版本以上！')
			console.log('App Launch')

			// 检查登录状态
			const userStore = useUserStore()
			if (userStore.isLoggedIn) {
				userStore.checkLoginStatus()
			}

			// #ifdef MP-WEIXIN
			// 小程序检查更新
			const updateManager = uni.getUpdateManager()
			updateManager.onCheckForUpdate((res) => {
				if (res.hasUpdate) {
					updateManager.onUpdateReady(() => {
						uni.showModal({
							title: '更新提示',
							content: '新版本已经准备好，是否重启应用？',
							success: (res) => {
								if (res.confirm) {
									updateManager.applyUpdate()
								}
							}
						})
					})
				}
			})
			// #endif
		},
		onShow: function() {
			console.log('App Show')
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
