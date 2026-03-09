'use strict';
exports.main = async (event, context) => {
	const uniID = require('uni-id-common')
	const db = uniCloud.database()

	const { token } = event
	if (!token) {
		return { code: 1, msg: '缺少token' }
	}

	const res = await uniID.verifyToken(token)
	if (res.code !== 0) {
		return res
	}

	// 获取用户扩展信息
	const userExtend = await db.collection('user_extend').where({
		user_id: res.uid
	}).get()

	return {
		code: 0,
		data: {
			userId: res.uid,
			role: userExtend.data[0]?.role || 'middleman',
			mobile: res.mobile,
			nickname: res.nickname
		}
	}
};
