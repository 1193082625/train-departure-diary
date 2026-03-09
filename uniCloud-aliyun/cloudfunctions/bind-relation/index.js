'use strict';
exports.main = async (event, context) => {
	const { middlemanId, targetId, targetType, action } = event
	const db = uniCloud.database()
	const relationCollection = db.collection('user_relations')

	try {
		if (action === 'bind') {
			const exist = await relationCollection.where({
				middleman_id: middlemanId,
				target_id: targetId
			}).get()

			if (exist.data.length > 0) {
				return { code: 1, msg: '关联已存在' }
			}

			await relationCollection.add({
				middleman_id: middlemanId,
				target_id: targetId,
				target_type: targetType,
				created_at: Date.now()
			})
		} else if (action === 'unbind') {
			await relationCollection.where({
				middleman_id: middlemanId,
				target_id: targetId
			}).remove()
		}

		return { code: 0 }
	} catch (e) {
		return { code: -1, msg: e.message }
	}
};
