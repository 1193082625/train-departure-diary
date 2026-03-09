'use strict';
exports.main = async (event, context) => {
	const db = uniCloud.database()

	// user_extend - 用户扩展信息
	await db.createCollection('user_extend').catch(e => {})

	// user_relations - 用户关联关系
	await db.createCollection('user_relations').catch(e => {})

	// merchants - 鸡场（添加 user_id）
	await db.createCollection('merchants').catch(e => {})

	// workers - 人员（添加 user_id）
	await db.createCollection('workers').catch(e => {})

	// departures - 发车记录（添加 user_id, creator_id, middleman_id）
	await db.createCollection('departures').catch(e => {})

	// transactions - 交易记录（添加 user_id, from_user_id, to_user_id）
	await db.createCollection('transactions').catch(e => {})

	// departure_history - 修改历史
	await db.createCollection('departure_history').catch(e => {})

	// 添加索引
	const dbCommand = db.command

	// merchants 索引
	const merchantsColl = db.collection('merchants')
	await merchantsColl.createIndex({ user_id: 1 })

	// workers 索引
	const workersColl = db.collection('workers')
	await workersColl.createIndex({ user_id: 1 })

	// departures 索引
	const departuresColl = db.collection('departures')
	await departuresColl.createIndex({ user_id: 1 })
	await departuresColl.createIndex({ creator_id: 1 })
	await departuresColl.createIndex({ middleman_id: 1 })

	// transactions 索引
	const transactionsColl = db.collection('transactions')
	await transactionsColl.createIndex({ from_user_id: 1 })
	await transactionsColl.createIndex({ to_user_id: 1 })

	// user_relations 索引
	const relationsColl = db.collection('user_relations')
	await relationsColl.createIndex({ middleman_id: 1 })
	await relationsColl.createIndex({ target_id: 1 })

	return { code: 0, msg: '数据库初始化完成' }
};
