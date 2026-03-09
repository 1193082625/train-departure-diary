<template>
	<view class="login-container">
		<view class="logo-section">
			<image class="logo" src="/static/logo.png" mode="aspectFit" />
			<text class="app-name">发车日记</text>
		</view>

		<view class="form-section">
			<!-- 小程序微信登录 -->
			<button
				v-if="platform === 'mp-weixin'"
				class="login-btn weixin"
				open-type="getPhoneNumber"
				@getphonenumber="handleWeixinLogin"
			>
				微信用户一键登录
			</button>

			<!-- App 微信登录 -->
			<button
				v-if="platform === 'app-plus'"
				class="login-btn weixin"
				@click="handleAppWeixinLogin"
			>
				微信授权登录
			</button>

			<!-- App 手机号登录 -->
			<!-- v-if="platform === 'app-plus'" -->
			<button
				class="login-btn phone"
				@click="showPhoneLogin = true"
			>
				手机号验证码登录
			</button>
		</view>

		<!-- 手机号登录弹窗 -->
		<view v-if="showPhoneLogin" class="modal-mask" @click="showPhoneLogin = false">
			<view class="modal-content" @click.stop>
				<text class="modal-title">手机号登录</text>
				<input
					v-model="phoneForm.mobile"
					class="input"
					type="number"
					placeholder="请输入手机号"
					maxlength="11"
				/>
				<view class="code-row">
					<input
						v-model="phoneForm.code"
						class="input code-input"
						type="number"
						placeholder="请输入验证码"
						maxlength="6"
					/>
					<button
						class="code-btn"
						:disabled="countdown > 0"
						@click="sendCode"
					>
						{{ countdown > 0 ? `${countdown}s` : '获取' }}
					</button>
				</view>

				<view class="role-section">
					<text class="role-label">选择角色：</text>
					<radio-group @change="roleChange">
						<label class="role-option">
							<radio value="middleman" :checked="phoneForm.role === 'middleman'" />
							<text>中间商</text>
						</label>
						<label class="role-option">
							<radio value="worker" :checked="phoneForm.role === 'worker'" />
							<text>装发车</text>
						</label>
						<label class="role-option">
							<radio value="merchant" :checked="phoneForm.role === 'merchant'" />
							<text>鸡场</text>
						</label>
					</radio-group>
				</view>

				<button class="submit-btn" @click="handlePhoneLogin">登录</button>
			</view>
		</view>

		<!-- 完善信息弹窗 -->
		<view v-if="showBindModal" class="modal-mask">
			<view class="modal-content">
				<text class="modal-title">完善信息</text>
				<input
					v-model="bindForm.nickname"
					class="input"
					placeholder="请输入昵称"
				/>

				<view v-if="phoneForm.role === 'worker'" class="role-section">
					<text class="role-label">工作类型：</text>
					<radio-group @change="workerTypeChange">
						<label class="role-option">
							<radio value="departure" :checked="bindForm.workerType === 'departure'" />
							<text>发车</text>
						</label>
						<label class="role-option">
							<radio value="loading" :checked="bindForm.workerType === 'loading'" />
							<text>装车</text>
						</label>
						<label class="role-option">
							<radio value="both" :checked="bindForm.workerType === 'both'" />
							<text>发车+装车</text>
						</label>
					</radio-group>
				</view>

				<input
					v-if="phoneForm.role === 'merchant'"
					v-model="bindForm.merchantName"
					class="input"
					placeholder="请输入鸡场名称"
				/>

				<view v-if="inviteCode" class="invite-info">
					<text>邀请码：{{ inviteCode }}</text>
				</view>

				<button class="submit-btn" @click="handleRegister">完成</button>
			</view>
		</view>
	</view>
</template>

<script>
export default {
	data() {
		return {
			platform: '',
			showPhoneLogin: false,
			showBindModal: false,
			countdown: 0,
			inviteCode: '',
			phoneForm: {
				mobile: '',
				code: '',
				role: 'middleman'
			},
			bindForm: {
				nickname: '',
				workerType: 'both',
				merchantName: ''
			}
		}
	},
	onLoad(options) {
		// #ifdef MP-WEIXIN
		this.platform = 'mp-weixin'
		// #endif
		// #ifdef APP-PLUS
		this.platform = 'app-plus'
		// #endif

		// 检查是否已登录
		const token = uni.getStorageSync('token')
		if (token) {
			this.checkLoginStatus()
		}

		this.inviteCode = options.inviteCode || ''
	},
	methods: {
		handleWeixinLogin(e) {
			console.log('触发微信登录', e);
			if (e.detail.errMsg !== 'getPhoneNumber:ok') return
			console.log(11111);
			uni.login({
				provider: 'weixin',
				success: async (loginRes) => {
					console.log(22222);
					
					const res = await uniCloud.callFunction({
						name: 'create-user',
						data: {
							wxCode: loginRes.code,
							encryptedData: e.detail.encryptedData,
							iv: e.detail.iv
						}
					})

					if (res.result.code === 0) {
						this.handleLoginSuccess(res.result.data)
					} else if (res.result.code === 2 || res.result.msg?.includes('不存在')) {
						this.showBindModal = true
					}
				},
				fail: (err) => {
					console.log(33333, err);
				}
			})
		},

		handleAppWeixinLogin() {
			uni.getUserInfo({
				provider: 'weixin',
				success: async (infoRes) => {
					const res = await uniCloud.callFunction({
						name: 'create-user',
						data: {
							nickname: infoRes.userInfo.nickName,
							wxCode: infoRes.code
						}
					})

					if (res.result.code === 0) {
						this.handleLoginSuccess(res.result.data)
					}
				}
			})
		},

		async sendCode() {
			if (!/^1\d{10}$/.test(this.phoneForm.mobile)) {
				uni.showToast({ title: '请输入正确手机号', icon: 'none' })
				return
			}

			const res = await uniCloud.callFunction({
				name: 'send-verification-code',
				data: { mobile: this.phoneForm.mobile }
			})

			if (res.result.code === 0) {
				this.countdown = 60
				const timer = setInterval(() => {
					this.countdown--
					if (this.countdown <= 0) clearInterval(timer)
				}, 1000)
			}
		},

		async handlePhoneLogin() {
			if (!/^1\d{10}$/.test(this.phoneForm.mobile)) {
				uni.showToast({ title: '请输入正确手机号', icon: 'none' })
				return
			}
			if (!/^\d{6}$/.test(this.phoneForm.code)) {
				uni.showToast({ title: '请输入6位验证码', icon: 'none' })
				return
			}

			const res = await uniCloud.callFunction({
				name: 'create-user',
				data: {
					mobile: this.phoneForm.mobile,
					code: this.phoneForm.code,
					role: this.phoneForm.role,
					nickname: this.bindForm.nickname,
					inviteCode: this.inviteCode
				}
			})

			if (res.result.code === 0) {
				this.handleLoginSuccess(res.result.data)
			} else if (res.result.msg?.includes('不存在')) {
				this.showBindModal = true
			}
		},

		async handleRegister() {
			const data = {
				mobile: this.phoneForm.mobile,
				code: this.phoneForm.code,
				role: this.phoneForm.role,
				nickname: this.bindForm.nickname || this.phoneForm.mobile.substring(7),
				inviteCode: this.inviteCode
			}

			const res = await uniCloud.callFunction({
				name: 'create-user',
				data
			})

			if (res.result.code === 0) {
				this.handleLoginSuccess(res.result.data)
			}
		},

		handleLoginSuccess(data) {
			uni.setStorageSync('token', data.token)
			uni.setStorageSync('userId', data.uid)
			uni.setStorageSync('userRole', data.role)

			uni.switchTab({ url: '/pages/home/home' })
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
					uni.setStorageSync('userRole', res.result.data.role)
					uni.switchTab({ url: '/pages/home/home' })
					return true
				} else {
					this.logout()
					return false
				}
			} catch(e) {
				this.logout()
				return false
			}
		},

		logout() {
			uni.removeStorageSync('token')
			uni.removeStorageSync('userId')
			uni.removeStorageSync('userRole')
		},

		roleChange(e) {
			this.phoneForm.role = e.detail.value
		},

		workerTypeChange(e) {
			this.bindForm.workerType = e.detail.value
		}
	}
}
</script>

<style scoped>
.login-container {
	min-height: 100vh;
	padding: 100rpx 60rpx;
	background: #f5f5f5;
	display: flex;
	flex-direction: column;
	justify-content: center;
}
.logo-section {
	display: flex;
	flex-direction: column;
	align-items: center;
	margin-bottom: 80rpx;
}
.logo {
	width: 160rpx;
	height: 160rpx;
}
.app-name {
	font-size: 48rpx;
	font-weight: bold;
	margin-top: 20rpx;
}
.form-section {
	display: flex;
	flex-direction: column;
	gap: 30rpx;
}
.login-btn {
	height: 100rpx;
	border-radius: 50rpx;
	font-size: 32rpx;
	display: flex;
	align-items: center;
	justify-content: center;
}
.login-btn.weixin {
	background: #07c160;
	color: white;
}
.login-btn.phone {
	background: white;
	color: #333;
	border: 1rpx solid #ddd;
}
.modal-mask {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	background: rgba(0,0,0,0.5);
	display: flex;
	align-items: center;
	justify-content: center;
	z-index: 999;
}
.modal-content {
	width: 600rpx;
	padding: 60rpx;
	background: white;
	border-radius: 20rpx;
}
.modal-title {
	font-size: 36rpx;
	font-weight: bold;
	display: block;
	margin-bottom: 40rpx;
	text-align: center;
}
.input {
	height: 80rpx;
	padding: 0 20rpx;
	border: 1rpx solid #ddd;
	border-radius: 10rpx;
	margin-bottom: 30rpx;
	font-size: 28rpx;
}
.code-row {
	display: flex;
	gap: 20rpx;
	margin-bottom: 30rpx;
}
.code-input {
	flex: 1;
}
.code-btn {
	width: 200rpx;
	height: 80rpx;
	line-height: 80rpx;
	background: #07c160;
	color: white;
	font-size: 32rpx;
	border-radius: 10rpx;
}
.role-section {
	margin: 20rpx 0;
}
.role-label {
	font-size: 28rpx;
	color: #666;
	display: block;
	margin-bottom: 16rpx;
}
.role-option {
	display: inline-flex;
	align-items: center;
	margin-right: 30rpx;
	margin-bottom: 10rpx;
}
.submit-btn {
	height: 90rpx;
	line-height: 90rpx;
	background: #07c160;
	color: white;
	border-radius: 45rpx;
	font-size: 36rpx;
	margin-top: 30rpx;
}
.invite-info {
	padding: 20rpx;
	background: #f5f5f5;
	border-radius: 10rpx;
	margin-bottom: 20rpx;
	text-align: center;
	color: #666;
}
</style>
