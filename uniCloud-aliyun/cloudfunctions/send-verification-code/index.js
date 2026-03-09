'use strict';
exports.main = async (event, context) => {
	const uniID = require('uni-id-common')

	const { mobile } = event

	try {
		const res = await uniID.sendMobileCode({
			mobile,
			templateId: 'default'
		})

		return { code: 0, msg: '发送成功' }
	} catch (e) {
		return { code: -1, msg: e.message }
	}
};
