'use strict';
exports.main = async (event, context) => {
	const uniID = require('uni-id-common')
	const db = uniCloud.database()

	const { mobile, role, nickname, inviteCode, wxCode, code } = event

	try {
		let uid
		let token

		if (wxCode) {
			// 微信登录
			const loginRes = await uniID.loginWithWeixin(wxCode)
			if (loginRes.code === 0) {
				uid = loginRes.uid
				token = loginRes.token
			} else if (loginRes.code === 2) {
				// 新用户，需要创建
				const createRes = await uniID.createUser({
					wx_openid: {
						"mp-weixin": wxCode
					},
					nickname: nickname || '微信用户'
				})
				uid = createRes.uid
				const loginAfterCreate = await uniID.loginWithWeixin(wxCode)
				token = loginAfterCreate.token
			}
		} else if (mobile && code) {
			// 手机号验证码登录
			const loginRes = await uniID.loginWithMobileCode(mobile, code)
			if (loginRes.code === 2) {
				// 用户不存在，创建新用户
				const createRes = await uniID.registerUser({
					mobile,
					nickname: nickname || mobile.substring(7)
				})
				const loginAfterCreate = await uniID.loginWithMobileCode(mobile, code)
				uid = loginAfterCreate.uid
				token = loginAfterCreate.token
			} else {
				uid = loginRes.uid
				token = loginRes.token
			}
		} else {
			return { code: -1, msg: '参数错误' }
		}

		// 创建或更新用户扩展信息
		const userExtend = await db.collection('user_extend').where({
			user_id: uid
		}).get()

		if (userExtend.data.length === 0) {
			await db.collection('user_extend').add({
				user_id: uid,
				role: role || 'middleman',
				merchant_ids: [],
				created_at: Date.now()
			})
		}

		// 如果有邀请码，建立关联
		if (inviteCode) {
			const middleman = await db.collection('uni-id-users').where({
				invite_code: inviteCode
			}).get()

			if (middleman.data.length > 0) {
				await db.collection('user_relations').add({
					middleman_id: middleman.data[0]._id,
					target_id: uid,
					target_type: role === 'merchant' ? 'merchant' : 'worker',
					created_at: Date.now()
				})
			}
		}

		return { code: 0, data: { uid, token, role: role || 'middleman' } }
	} catch (e) {
		return { code: -1, msg: e.message }
	}
};
