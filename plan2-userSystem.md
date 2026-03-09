用户系统设计方案

一、系统架构

1.1 技术选型

- 前端框架: UniApp (Vue 3)
- 云数据库: uniCloud (阿里云)
- 用户认证: uniID

  1.2 数据模型

用户表 (uni-id-users)

{
\_id: ObjectId
username: string # 手机号
mobile: string # 手机号
wx_openid: object # 微信 openid
role: string # 角色: 'middleman' | 'worker' | 'merchant'
nickname: string # 昵称/名称
avatar: string # 头像
created_at: timestamp
updated_at: timestamp
}

权限配置

┌────────┬──────────┬──────────┬──────────┬─────────────┬─────────────┐
│ 角色 │ 发车记录 │ 鸡场管理 │ 人员管理 │ 结账-按人员 │ 结账-按鸡场 │
├────────┼──────────┼──────────┼──────────┼─────────────┼─────────────┤
│ 中间商 │ 全部 │ ✓ │ ✓ │ ✓ │ ✓ │
├────────┼──────────┼──────────┼──────────┼─────────────┼─────────────┤
│ 装发车 │ 仅自己 │ ✗ │ ✗ │ ✓(仅自己) │ ✗ │
├────────┼──────────┼──────────┼──────────┼─────────────┼─────────────┤
│ 鸡场 │ 仅关联 │ ✗ │ ✗ │ ✗ │ ✗ │
└────────┴──────────┴──────────┴──────────┴─────────────┴─────────────┘

---

二、登录流程

2.1 首次进入程序

判断平台
├─ 小程序: 调用 wx.getUserProfile 获取用户信息 + wx.getPhoneNumber
获取手机号
├─ App 微信: 微信授权登录 -> 获取手机号
└─ App 其他: 手机号+验证码登录
│
▼
检查用户是否已注册
├─ 已注册: 登录成功 -> 根据角色跳转对应首页
└─ 未注册: 跳转注册页面 -> 选择角色 -> 注册

2.2 注册流程（仅首次）

- 选择角色（中间商/装发车/鸡场）
- 鸡场角色需额外绑定鸡场 ID

---

三、各角色首页展示

3.1 中间商首页

- 今日收入统计
- 快捷操作：发车记录、鸡场管理、人员管理、单次结账
- 今日发车记录列表
- 参数设置入口

  3.2 装发车首页

- 今日收入统计（仅显示自己参与的趟次）
- 快捷操作：发车记录（只能添加）、单次结账（仅按人员结账）
- 今日发车记录列表（仅自己）
- 收入明细：本趟自己应得 = 装车费(150) + 发车费(200)，根据参与角色计算

  3.3 鸡场首页

- 今日统计（与自己相关的发车记录汇总）
- 快捷操作：无管理权限
- 发车统计列表（仅关联鸡场的记录）
- 收入明细：显示该鸡场的盈利（差额 × 斤数）

---

四、发车记录权限控制

4.1 装发车角色

- 添加记录时：发车人员、装车人员默认选中自己，不可修改
- 查看记录时：仅显示自己参与的记录
- 编辑记录时：仅可编辑自己创建的记录

  4.2 鸡场角色

- 发车记录页面：隐藏（无权限）
- 如需查看：通过"我的鸡场"页面查看关联统计

---

五、结账页面改造

5.1 装发车角色

- 隐藏"按鸡场结账" Tab
- "按人员结账"只显示自己
- 结账金额自动计算（按角色参与情况）

  5.2 鸡场角色

- 隐藏结账入口（无权限）

---

六、数据迁移方案

1. 创建默认用户（手机号：15369375170，角色：中间商）
2. 将现有 merchants、workers 数据添加 userId 字段关联到该用户
3. 将现有 departureRecords、transactions 添加 userId 字段
4. 迁移完成后，原有数据访问逻辑不变，只增加 userId 过滤条件

---

七、数据库表结构

新增表

用户扩展信息 (user_extend)

{
\_id: ObjectId
user_id: ObjectId # 关联 uni-id-users
role: string # middleman | worker | merchant
merchant_ids: string[] # 鸡场角色时，关联的鸡场 ID 列表
}

鸡场表改造 (merchants)

{
\_id: ObjectId
user_id: ObjectId # 所属用户
name: string
phone: string
margin: number
created_at: timestamp
}

人员表改造 (workers)

{
\_id: ObjectId
user_id: ObjectId # 所属用户
name: string
phone: string
type: departure | loading | both
created_at: timestamp
}

发车记录改造 (departures)

{
\_id: ObjectId
user_id: ObjectId # 创建者
date: string
...
}

用户系统实现计划

For Claude: REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement
this plan task-by-task.

Goal: 为发车日记应用添加用户系统，支持多角色登录、权限控制和数据隔离

Architecture: 基于 uniCloud + uniID
实现用户认证和数据关联，采用中间商-装发车/鸡场多对多关系设计

Tech Stack: UniApp (Vue 3), uniCloud (阿里云), uniID

---

准备工作

Task 1: 开通 uniCloud 服务

Step 1: 在 HBuilderX 中开通 uniCloud

1.  打开项目 train-departure-diary
2.  顶部菜单: 发行 -> 开通 uniCloud
3.  选择阿里云 -> 免费配额
4.  确定开通

Step 2: 创建云函数目录

在项目根目录创建 cloudfunctions/ 文件夹

Step 3: 创建 uniCloud 控制台用户

1.  访问 https://unicloud.dcloud.net.cn/
2.  登录 -> 进入控制台
3.  创建服务空间 (名称: train-departure-diary)
4.  记住 spaceId 和 secret

---

阶段一：用户认证系统

Task 2: 配置 uniID

Files:

- Create: cloudfunctions/user-center/index.js
- Create: cloudfunctions/user-center/config.json
- Modify: manifest.json

Step 1: 创建 uniID 公共模块

// cloudfunctions/user-center/index.js
'use strict';
exports.main = async (event, context) => {
const uniID = require('uni-id'
const config = require('./config.json'
uniID.config = confi
return await uniID.publicApi(event, context
};

Step 2: 配置 uniID

// cloudfunctions/user-center/config.json
{
"passwordSecret":

                        "type": "hmac-sha25
                        "version"

        ]
        "tokenSecret": "your-token-secret-key"
        "tokenExpire": 7200
        "maxTokenPerUser": 10
        "autoSetInviteCode": false
        "forceInviteCode": false
        "app":
                "tokenExpire": 259200
                "oauth":
                        "weixin"
                                "appid": "your-weixin-app
                                "appsecret": "your-weixin-appsec

}

Step 3: 修改 manifest.json 添加 uniCloud 配置

// manifest.json 追加
"uniCloud": {
"cloudSecretKey": []
"callbackUrl": []
"spaceId": "your-space-id"
"clientSecret": "your-client-secret
}

---

Task 3: 创建用户相关云函数

Files:

- Create: cloudfunctions/get-user-info/index.js
- Create: cloudfunctions/create-user/index.js
- Create: cloudfunctions/bind-relation/index.js

Step 1: 获取用户信息云函数

// cloudfunctions/get-user-info/index.js
'use strict';
exports.main = async (event, context) => {
const uniID = require('uni-id'
const config = require('../user-center/config.json'
uniID.config = confi

        const { token } = even
        if (!token)
                return { code: 1, msg: '缺少token'


        const res = await uniID.checkToken(token
        if (res.code !== 0)
                return r


        // 获取用户扩展信息
        const db = uniCloud.database(
        const userExtend = await db.collection('user_extend').where(
                user_id: res.u
        }).get(

        return
                code:
                data:
                        userId: res.u
                        role: userExtend.data[0]?.role || 'middlema
                        mobile: res.mob

};

Step 2: 创建用户云函数

// cloudfunctions/create-user/index.js
'use strict';
exports.main = async (event, context) => {
const uniID = require('uni-id'
const config = require('../user-center/config.json'
uniID.config = confi

        const { mobile, role, nickname, inviteCode, wxCode } = even
        const db = uniCloud.database(

        try
                let u
                let tok

                if (wxCode)
                        // 微信登录创建用
                        const res = await uniID.loginWithWeixin(wxCo
                        if (res.code === 0
                                uid = res
                                token = res.t
                        } els
                                return

                } else
                        // 手机号注
                        const res = await uniID.registe
                                mob
                                password: 'default_password', // 首次设置后可
                                nickname: nickname || mobile.substrin

                        if (res.code !== 0 && res.code !== 2) { // code=2 表示用
                                return


                        // 登录获取to
                        const loginRes = await uniID.loginWithMobileCode(mobile,
                        uid = loginRes.
                        token = loginRes.to


                // 创建用户扩展信
                await db.collection('user_extend').add
                        user_id: u
                        role: role || 'worke
                        merchant_ids:
                        created_at: Date.no


                // 如果有邀请码，建立关
                if (inviteCode)
                        const middleman = await db.collection('uni-id-users').wh
                                invite_code: invite
                        }).ge

                        if (middleman.data.length > 0
                                await db.collection('user_relations').a
                                        middleman_id: middleman.data[0]
                                        target_id:
                                        target_type: role === 'merchant' ? 'merc
                                        created_at: Date.




                return { code: 0, data: { uid, token, role }
        } catch (e)
                return { code: -1, msg: e.message

};

Step 3: 绑定关联关系云函数

// cloudfunctions/bind-relation/index.js
'use strict';
exports.main = async (event, context) => {
const { middlemanId, targetId, targetType, action } = even
const uniID = require('uni-id'
const config = require('../user-center/config.json'
uniID.config = confi

        const db = uniCloud.database(
        const relationCollection = db.collection('user_relations'

        try
                if (action === 'bind')
                        // 检查是否已存在关
                        const exist = await relationCollection.wher
                                middleman_id: middlema
                                target_id: targ
                        }).ge

                        if (exist.data.length > 0
                                return { code: 1, msg: '关联已存在


                        await relationCollection.ad
                                middleman_id: middlema
                                target_id: targe
                                target_type: targetT
                                created_at: Date.n


                        // 更新用户的 invited
                        await db.collection('uni-id-users').doc(middlemanId).upd
                                invite_code: uniID.inviteCo

                } else if (action === 'unbind')
                        await relationCollection.wher
                                middleman_id: middlema
                                target_id: targ
                        }).remov


                return { code: 0
        } catch (e)
                return { code: -1, msg: e.message

};

---

阶段二：数据迁移

Task 4: 创建数据库 Schema

Files:

- Create: cloudfunctions/init-db/schema.json

Step 1: 创建数据库 Schema

// cloudfunctions/init-db/schema.json
{
"bson":
"user_extend":
"bsonType": "objec
"required": ["user_id", "role
"permission"
"read": t
"create": "auth.uid != nu
"update": "doc.user_id == auth.u
"delete": f

                        "properties"
                                "user_id": { "bsonType": "string
                                "role": { "bsonType": "string", "enum": ["middle
                                "merchant_ids": { "bsonType": "arra


                "user_relations":
                        "bsonType": "objec
                        "required": ["middleman_id", "target_id", "target_type
                        "permission"
                                "read": "doc.middleman_id == auth.u
                                "create": "auth.uid != nu
                                "update": fa
                                "delete": "doc.middleman_id == auth.

                        "properties"
                                "middleman_id": { "bsonType": "string
                                "target_id": { "bsonType": "string
                                "target_type": { "bsonType": "string", "enum": [


                "merchants":
                        "bsonType": "objec
                        "required": ["user_id", "name
                        "permission"
                                "read": t
                                "create": "auth.uid != nu
                                "update": "doc.user_id == auth.u
                                "delete": "doc.user_id == auth.

                        "properties"
                                "user_id": { "bsonType": "string
                                "name": { "bsonType": "string
                                "phone": { "bsonType": "string
                                "margin": { "bsonType": "doubl


                "workers":
                        "bsonType": "objec
                        "required": ["user_id", "name
                        "permission"
                                "read": t
                                "create": "auth.uid != nu
                                "update": "doc.user_id == auth.u
                                "delete": "doc.user_id == auth.

                        "properties"
                                "user_id": { "bsonType": "string
                                "name": { "bsonType": "string
                                "phone": { "bsonType": "string
                                "type": { "bsonType": "string", "enum": ["depart


                "departures":
                        "bsonType": "objec
                        "permission"
                                "read": "doc.middleman_id == auth.uid || doc.cre
                                "create": "auth.uid != nu
                                "update": "doc.creator_id == auth.u
                                "delete": "doc.creator_id == auth.

                        "properties"
                                "user_id": { "bsonType": "string
                                "creator_id": { "bsonType": "string
                                "middleman_id": { "bsonType": "strin


                "transactions":
                        "bsonType": "objec
                        "permission"
                                "read": "doc.from_user_id == auth.uid || doc.to_
                                "create": "auth.uid != nu
                                "update": "doc.from_user_id == auth.u
                                "delete": f

                        "properties"
                                "from_user_id": { "bsonType": "string
                                "to_user_id": { "bsonType": "strin


                "departure_history":
                        "bsonType": "objec
                        "required": ["departure_id", "modifier_id
                        "permission"
                                "read": "doc.middleman_id == auth.uid || doc.cre
                                "create": "auth.uid != nu
                                "update": fa
                                "delete": f

                        "properties"
                                "departure_id": { "bsonType": "string
                                "modifier_id": { "bsonType": "string
                                "modifier_role": { "bsonType": "string
                                "before_data": { "bsonType": "object
                                "after_data": { "bsonType": "object
                                "created_at": { "bsonType": "timestam

}

---

Task 5: 数据迁移脚本

Files:

- Create: cloudfunctions/migrate-data/index.js

Step 1: 创建迁移云函数

// cloudfunctions/migrate-data/index.js
'use strict';
exports.main = async (event, context) => {
const db = uniCloud.database(

        // 1. 创建默认中间商用户 (手机号: 15369375170
        const usersCollection = db.collection('uni-id-users'
        const userExtendCollection = db.collection('user_extend'

        // 检查是否已存在
        const existUser = await usersCollection.where(
                mobile: '1536937517
        }).get(

        let middlemanUi
        if (existUser.data.length === 0)
                // 创建用
                const uniID = require('uni-id
                const config = require('../user-center/config.json
                uniID.config = conf

                const createRes = await usersCollection.add
                        username: '1536937517
                        mobile: '1536937517
                        nickname: '中间商
                        register_date: Date.now
                        invite_code: 'MIDDLEMAN0

                middlemanUid = createRes.

                // 创建用户扩展信
                await userExtendCollection.add
                        user_id: middlemanU
                        role: 'middlema
                        merchant_ids:
                        created_at: Date.no

        } else
                middlemanUid = existUser.data[0]._


        // 2. 迁移鸡场数据
        const localMerchants = uni.getStorageSync('merchants') || [
        if (localMerchants.length > 0)
                const merchantsCollection = db.collection('merchants
                for (const m of localMerchants)
                        await merchantsCollection.ad
                                user_id: middleman
                                name: m.n
                                phone: m.ph
                                margin: m.mar
                                created_at: Date.n




        // 3. 迁移人员数据
        const localWorkers = uni.getStorageSync('workers') || [
        if (localWorkers.length > 0)
                const workersCollection = db.collection('workers
                for (const w of localWorkers)
                        await workersCollection.ad
                                user_id: middleman
                                name: w.n
                                phone: w.ph
                                type: w.t
                                created_at: Date.n




        // 4. 迁移发车记录
        const localDepartures = uni.getStorageSync('departureRecords') || [
        if (localDepartures.length > 0)
                const departuresCollection = db.collection('departures
                for (const d of localDepartures)
                        await departuresCollection.ad
                                .
                                user_id: middleman
                                creator_id: middleman
                                middleman_id: middleman
                                created_at: Date.n




        // 5. 迁移交易记录
        const localTransactions = uni.getStorageSync('transactions') || [
        if (localTransactions.length > 0)
                const transactionsCollection = db.collection('transactions
                for (const t of localTransactions)
                        await transactionsCollection.ad
                                .
                                user_id: middleman
                                from_user_id: middleman
                                to_user_id: middleman
                                created_at: Date.n




        return
                code:
                data:
                        middlemanU
                        merchantsCount: localMerchants.leng
                        workersCount: localWorkers.leng
                        departuresCount: localDepartures.leng
                        transactionsCount: localTransactions.len

};

---

阶段三：前端登录页面

Task 6: 创建登录页面

Files:

- Create: pages/login/login.vue
- Modify: pages.json

Step 1: 添加路由配置

// pages.json
{
"pages":

                        "path": "pages/login/logi
                        "style"
                                "navigationBarTitleText": "登
                                "navigationStyle": "cus


        ]
        "globalStyle":
                "navigationBarTextStyle": "black
                "navigationBarTitleText": "发车日记
                "navigationBarBackgroundColor": "#F8F8F8
                "backgroundColor": "#F8F8F

}

Step 2: 创建登录页面组件

 <!-- pages/login/login.vue -->
 <template>
        <view class="login-container"
                <view class="logo-section
                        <image class="logo" src="/static/logo.png" mode="aspectF
                        <text class="app-name">发车日记</te
                </vie

                <view class="form-section
                        <!-- 微信登录
                        <but
                                v-if="platform === 'mp-weix
                                class="login-btn wei
                                open-type="getPhoneNum
                                @getphonenumber="handleWeixinLo

                                <text class="btn-icon">微</t
                                微信用户一键
                        </butt

                        <!-- App 微信登录
                        <but
                                v-if="platform === 'app-pl
                                class="login-btn wei
                                @click="handleAppWeixinLo

                                <text class="btn-icon">微</t
                                微信授权
                        </butt

                        <!-- 手机号登录
                        <but
                                v-if="platform === 'app-pl
                                class="login-btn ph
                                @click="showPhoneLogin = t

                                <text class="btn-icon">📱</t
                                手机号验证码
                        </butt
                </vie

                <!-- 手机号登录弹窗 -
                <view v-if="showPhoneLogin" class="modal-mask" @click="showPhone

false">
<view class="modal-content" @click.st
<text class="modal-title">手机号登录</t
<i
v-model="phoneForm.mo
class="i
type="nu
placeholder="请输入手
maxlength

                                <view class="code-r
                                        <
                                                v-model="phoneForm
                                                class="input code-
                                                type="n
                                                placeholder="请输入验
                                                maxleng

                                        <b
                                                class="cod
                                                :disabled="countdow
                                                @click="sen

                                                {{ countdown > 0 ? `${countdown}
                                        </bu
                                </v

                                <!-- 角色选择
                                <view class="role-secti
                                        <text class="role-label">选择角色：</
                                        <radio-group @change="roleCha
                                                <label class="role-op
                                                        <radio value="middleman"
                                                        <text>中间商
                                                </
                                                <label class="role-op
                                                        <radio value="worker" :c
                                                        <text>装发车
                                                </
                                                <label class="role-op
                                                        <radio value="merchant"
                                                        <text>鸡场
                                                </
                                        </radio-g
                                </v

                                <button class="submit-btn" @click="handlePhoneLo
                        </vi
                </vie

                <!-- 首次登录绑定弹窗 -
                <view v-if="showBindModal" class="modal-mask
                        <view class="modal-conten
                                <text class="modal-title">完善信息</t
                                <i
                                        v-model="bindForm.nick
                                        class="i
                                        placeholder="请输入

                                <i
                                        v-if="bindForm.role === 'wor
                                        v-model="bindForm.worker
                                        class="i
                                        placeholder="请输入工作类型: departure/l

                                <view v-if="bindForm.role === 'worker'" class="r
                                        <text class="role-label">工作类型：</
                                        <radio-group @change="workerTypeCha
                                                <label class="role-op
                                                        <radio value="departure"
                                                        <text>发车
                                                </
                                                <label class="role-op
                                                        <radio value="loading" :
                                                        <text>装车
                                                </
                                                <label class="role-op
                                                        <radio value="both" :che
                                                        <text>发车+装车
                                                </
                                        </radio-g
                                </v

                                <view v-if="inviteCode" class="invite-in
                                        <text>邀请码：{{ inviteCode }}</
                                </v

                                <button class="submit-btn" @click="handleRegiste
                        </vi
                </vie
        </view

 </template>

 <script>
 export default {
        data()
                return
                        platform:
                        showPhoneLogin: fal
                        showBindModal: fal
                        countdown:
                        inviteCode:
                        phoneForm
                                mobile:
                                code:
                                role: 'middle

                        bindForm
                                nickname:
                                workerType: 'b


        }
        onLoad()
                // #ifdef MP-WEIX
                this.platform = 'mp-weixi
                // #end
                // #ifdef APP-PL
                this.platform = 'app-plu
                // #end

                // 检查是否已登
                const token = uni.getStorageSync('token
                if (token)
                        this.checkLoginStatu


                // 获取邀请码参
                const options = plus.runtime.argumen
                if (options)
                        tr
                                const params = JSON.parse(opti
                                this.inviteCode = params.inviteCode |
                        } catch(e)

        }
        methods:
                // 微信小程序登
                handleWeixinLogin(e)
                        if (e.detail.errMsg !== 'getPhoneNumber:ok') ret

                        uni.logi
                                provider: 'weix
                                success: async (loginRes)
                                        const res = await uniCloud.callFunct
                                                name: 'create-
                                                d
                                                        wxCode: loginRe
                                                        encryptedData: e.detail.
                                                        iv: e.de



                                        if (res.result.code ===
                                                this.handleLoginSuccess(res.resu
                                        } else if (res.result.code ===
                                                // 需要绑定
                                                this.showBindModal





                // App 微信登
                handleAppWeixinLogin()
                        uni.getUserInf
                                provider: 'weix
                                success: async (infoRes)
                                        const res = await uniCloud.callFunct
                                                name: 'create-
                                                d
                                                        nickname: infoRes.userIn
                                                        wxCode: infoR



                                        if (res.result.code ===
                                                this.handleLoginSuccess(res.resu





                // 发送验证
                async sendCode()
                        if (!/^1\d{10}$/.test(this.phoneForm.mobile)
                                uni.showToast({ title: '请输入正确手机号', icon:
                                re


                        const res = await uniCloud.callFunctio
                                name: 'send-verification-co
                                data: { mobile: this.phoneForm.mobi


                        if (res.result.code === 0
                                this.countdown
                                const timer = setInterval(()
                                        this.countd
                                        if (this.countdown <= 0) clearInterval(t
                                }, 1



                // 手机号登
                async handlePhoneLogin()
                        if (!/^1\d{10}$/.test(this.phoneForm.mobile)
                                uni.showToast({ title: '请输入正确手机号', icon:
                                re

                        if (!/^\d{6}$/.test(this.phoneForm.code)
                                uni.showToast({ title: '请输入6位验证码', icon:
                                re


                        const res = await uniCloud.callFunctio
                                name: 'login-with-co
                                dat
                                        mobile: this.phoneForm.mo
                                        code: this.phoneForm.
                                        role: this.phoneForm



                        if (res.result.code === 0
                                this.handleLoginSuccess(res.result.d
                        } else if (res.result.code === 2
                                // 新用户，需要完善
                                this.showBindModal =



                // 注册/完善信
                async handleRegister()
                        const res = await uniCloud.callFunctio
                                name: 'create-us
                                dat
                                        mobile: this.phoneForm.mo
                                        nickname: this.bindForm.nick
                                        role: this.phoneForm.
                                        workerType: this.bindForm.worker
                                        inviteCode: this.invit



                        if (res.result.code === 0
                                this.handleLoginSuccess(res.result.d



                // 登录成功处
                handleLoginSuccess(data)
                        uni.setStorageSync('token', data.tok
                        uni.setStorageSync('userId', data.u
                        uni.setStorageSync('userRole', data.ro

                        // 根据角色跳
                        this.navigateByRole(data.ro


                navigateByRole(role)
                        uni.switchTab({ url: '/pages/home/home'


 }
 </script>

 <style scoped>
 .login-container {
        min-height: 100vh
        padding: 100rpx 60rpx
        background: #f5f5f5
 }
 .logo-section {
        display: flex
        flex-direction: column
        align-items: center
        margin-bottom: 120rpx
 }
 .logo {
        width: 160rpx
        height: 160rpx
 }
 .app-name {
        font-size: 48rpx
        font-weight: bold
        margin-top: 20rpx
 }
 .form-section {
        display: flex
        flex-direction: column
        gap: 30rpx
 }
 .login-btn {
        display: flex
        align-items: center
        justify-content: center
        height: 100rpx
        border-radius: 50rpx
        font-size: 32rpx
 }
 .login-btn.weixin {
        background: #07c160
        color: white
 }
 .login-btn.phone {
        background: white
        color: #333
        border: 1rpx solid #ddd
 }
 .btn-icon {
        margin-right: 16rpx
        font-size: 36rpx
 }
 .modal-mask {
        position: fixed
        top: 0
        left: 0
        right: 0
        bottom: 0
        background: rgba(0,0,0,0.5)
        display: flex
        align-items: center
        justify-content: center
 }
 .modal-content {
        width: 600rpx
        padding: 60rpx
        background: white
        border-radius: 20rpx
 }
 .modal-title {
        font-size: 36rpx
        font-weight: bold
        display: block
        margin-bottom: 40rpx
 }
 .input {
        height: 80rpx
        padding: 0 20rpx
        border: 1rpx solid #ddd
        border-radius: 10rpx
        margin-bottom: 30rpx
 }
 .code-row {
        display: flex
        gap: 20rpx
 }
 .code-input {
        flex: 1
 }
 .code-btn {
        width: 240rpx
        height: 80rpx
        background: #07c160
        color: white
        font-size: 24rpx
 }
 .role-section {
        margin: 30rpx 0
 }
 .role-label {
        font-size: 28rpx
        color: #666
        display: block
        margin-bottom: 20rpx
 }
 .role-option {
        display: inline-flex
        align-items: center
        margin-right: 30rpx
 }
 .submit-btn {
        height: 90rpx
        background: #07c160
        color: white
        border-radius: 45rpx
        font-size: 32rpx
 }
 .invite-info {
        padding: 20rpx
        background: #f5f5f5
        border-radius: 10rpx
        margin-bottom: 30rpx
        text-align: center
 }
 </style>

---

阶段四：用户状态管理

Task 7: 创建用户 Store

Files:

- Create: store/user.js

Step 1: 创建用户状态管理

// store/user.js
import { defineStore } from 'pinia'

export const useUserStore = defineStore('user', {
state: () => (
token: uni.getStorageSync('token') || '
userId: uni.getStorageSync('userId') || '
role: uni.getStorageSync('userRole') || '', // middleman | worke
nickname: uni.getStorageSync('nickname') || '
mobile: uni.getStorageSync('mobile') || '
// 关联的中间商列表（装发车/鸡场角色
relatedMiddlemen: [
// 关联的装发车/鸡场列表（中间商角色
relatedWorkers: [
relatedMerchants:
})

        getters:
                isLoggedIn: (state) => !!state.toke
                isMiddleman: (state) => state.role === 'middleman
                isWorker: (state) => state.role === 'worker
                isMerchant: (state) => state.role === 'merchant
                canAddDeparture: (state) =>
                        // 中间商可以直接添
                        if (state.role === 'middleman') return t
                        // 装发车角色只能添加记录（需要选择中间商
                        if (state.role === 'worker') return t
                        return fa

        }

        actions:
                async login(token, userId, role, nickname, mobile)
                        this.token = to
                        this.userId = use
                        this.role = r
                        this.nickname = nickn
                        this.mobile = mob

                        uni.setStorageSync('token', tok
                        uni.setStorageSync('userId', user
                        uni.setStorageSync('userRole', ro
                        uni.setStorageSync('nickname', nickna
                        uni.setStorageSync('mobile', mobi

                        // 加载关联数
                        await this.loadRelation


                async loadRelations()
                        if (!this.userId) ret

                        const db = uniCloud.databas

                        if (this.role === 'middleman'
                                // 获取关联的装发车和
                                const [workersRes, merchantsRes] = await Promise
                                        db.collection('user_relations').wh
                                                middleman_id: this.u
                                                target_type: 'w
                                        }).g
                                        db.collection('user_relations').wh
                                                middleman_id: this.u
                                                target_type: 'mer
                                        }).


                                this.relatedWorkers = workersRes.
                                this.relatedMerchants = merchantsRes.
                        } els
                                // 获取关联的中
                                const res = await db.collection('user_relations'
                                        target_id: this.u
                                }).g

                                this.relatedMiddlemen = res.



                logout()
                        this.token =
                        this.userId =
                        this.role =
                        this.nickname =
                        this.mobile =
                        this.relatedMiddlemen =
                        this.relatedWorkers =
                        this.relatedMerchants =

                        uni.removeStorageSync('toke
                        uni.removeStorageSync('userI
                        uni.removeStorageSync('userRol
                        uni.removeStorageSync('nicknam
                        uni.removeStorageSync('mobil

                        uni.reLaunch({ url: '/pages/login/login'


                async checkLoginStatus()
                        const token = uni.getStorageSync('toke
                        if (!token) return fa

                        tr
                                const res = await uniCloud.callFuncti
                                        name: 'get-user-i
                                        data: { to


                                if (res.result.code ===
                                        this.userId = res.result.data.u
                                        this.role = res.result.data
                                        this.mobile = res.result.data.m
                                        await this.loadRelati
                                        return
                                } el
                                        this.log
                                        return

                        } catch(e
                                this.logo
                                return f

})

---

阶段五：首页改造

Task 8: 改造首页按角色显示

Files:

- Modify: pages/home/home.vue

Step 1: 修改首页逻辑

// 在现有 data 中添加
userRole: '',
relatedMiddlemen: [],

// onShow 生命周期
onShow() {
const userStore = useUserStore(
this.userRole = userStore.rol

        if (!userStore.isLoggedIn)
                uni.reLaunch({ url: '/pages/login/login'
                retu


        // 根据角色加载不同数据
        this.loadData(

},

methods: {
loadData()
if (this.userRole === 'middleman')
// 中间商：加载全部数
this.loadAllDat
} else if (this.userRole === 'worker')
// 装发车：只加载自己的数
this.loadWorkerDat
} else if (this.userRole === 'merchant')
// 鸡场：只加载关联的数
this.loadMerchantDat

        }

        loadWorkerData()
                const userStore = useUserStore
                const db = uniCloud.database

                // 获取自己创建的发车记
                db.collection('departures').where
                        creator_id: userStore.use
                }).orderBy('date', 'desc').limit(50).get().then(res =>
                        this.todayRecords = res.d
                        this.calculateTodayIncom

}

Step 2: 装发车收入计算

calculateTodayIncome() {
// 费用常量
const LOADING_FEE = 15
const DEPARTURE_FEE = 20

        this.todayRecords.forEach(record =>
                let income =
                const userStore = useUserStore

                // 检查是否是发车人
                if (record.departureWorkerId === userStore.userId)
                        income += DEPARTURE_


                // 检查是否是装车人
                if (record.loadingWorkerIds &

record.loadingWorkerIds.includes(userStore.userId)) {
income += LOADING\_

                record.myIncome = inco
        }

        // 汇总今日收入
        this.todayIncome = this.todayRecords.reduce((sum, r) => sum + (r.myIncom

0), 0)
}

---

阶段六：发车记录权限控制

Task 9: 改造发车表单权限控制

Files:

- Modify: pages/departure/form.vue

Step 1: 添加中间商选择

data() {
return
// 新
showMiddlemanPicker: fals
middlemanList: [
selectedMiddleman: nul
// ... 现有数

},

onLoad(options) {
const userStore = useUserStore(
this.userRole = userStore.rol
this.userId = userStore.userI

        if (this.userRole === 'worker')
                // 加载关联的中间商列
                this.loadRelatedMiddlemen

},

methods: {
async loadRelatedMiddlemen()
const userStore = useUserStore
const db = uniCloud.database

                const res = await db.collection('user_relations').where
                        target_id: userStore.use
                }).get

                // 获取中间商详细信
                const middlemanIds = res.data.map(r => r.middleman_i
                if (middlemanIds.length > 0)
                        const usersRes = await db.collection('uni-id-users').whe
                                _id: db.command.in(middleman
                        }).ge

                        this.middlemanList = usersRes.d
                        // 默认选中第一
                        if (this.middlemanList.length > 0
                                this.selectedMiddleman = this.middlemanLis


        }

        // 装发车角色：发车人员默认选中自己
        initWorkerForm()
                const userStore = useUserStore

                // 发车人员默认选中自己，不可修
                this.formData.departureWorkerId = userStore.user

                // 装车人员可以手动选
                this.formData.loadingWorkerIds = [userStore.userI
        }

        // 表单提交
        async submitForm()
                const userStore = useUserStore

                if (this.userRole === 'worker')
                        if (!this.selectedMiddleman
                                uni.showToast({ title: '请选择中间商', icon: 'no
                                re


                        this.formData.middleman_id = this.selectedMiddleman.
                        this.formData.creator_id = userStore.use


                // 提交到数据
                // .

}

Step 2: 模板修改

 <!-- 中间商选择（装发车角色可见） -->
 <view v-if="userRole === 'worker'" class="form-item">
        <text class="label">选择中间商 *</text
        <picke
                :range="middlemanLis
                range-key="nicknam
                @change="middlemanChang

                <view class="picker-value
                        {{ selectedMiddleman?.nickname || '请选择中间商'
                </vie
        </picker

 </view>

 <!-- 发车人员（装发车角色不可修改） -->
 <view class="form-item">
        <text class="label">发车人员 *</text
        <picke
                v-if="userRole === 'middleman
                :range="workerLis
                range-key="nam
                @change="departureWorkerChang

                <view class="picker-value
                        {{ getWorkerName(formData.departureWorkerId)
                </vie
        </picker
        <view v-else class="picker-value readonly"
                {{ userStore.nickname }}（不可修改
        </view

 </view>

---

Task 10: 添加发车记录修改历史

Files:

- Create: pages/departure/history.vue
- Modify: pages/departure/form.vue

Step 1: 创建历史记录页面

 <!-- pages/departure/history.vue -->
 <template>
        <view class="history-page"
                <view class="history-item" v-for="item in historyList" :key="ite
                        <view class="history-heade
                                <text class="modifier">{{ item.modifier_nickname
                                <text class="time">{{ formatTime(item.created_at
                        </vi
                        <view class="history-conten
                                <view class="change-item" v-for="(value, key) in
                                        <text class="field">{{ key }}:</
                                        <text class="old-value">{{ value.old }}<
                                        <text class="arrow">→</
                                        <text class="new-value">{{ value.new }}<
                                </v
                        </vi
                </vie
        </view
 </template>

 <script>
 export default {
        data()
                return
                        departureId:
                        historyList:

        }
        onLoad(options)
                this.departureId = options.
                this.loadHistory
        }
        methods:
                async loadHistory()
                        const db = uniCloud.databas
                        const res = await db.collection('departure_history').whe
                                departure_id: this.departu
                        }).orderBy('created_at', 'desc').ge

                        this.historyList = res.d

                formatTime(timestamp)
                        const date = new Date(timesta
                        return `${date.getFullYear()}-${date.getMonth()+1}-${dat
 ${date.getHours()}:${date.getMinutes()}`


 }
 </script>

 <style scoped>
 .history-page {
        padding: 20rpx
 }
 .history-item {
        background: white
        padding: 20rpx
        margin-bottom: 20rpx
        border-radius: 10rpx
 }
 .history-header {
        display: flex
        justify-content: space-between
        margin-bottom: 10rpx
 }
 .modifier {
        font-weight: bold
        color: #333
 }
 .time {
        color: #999
        font-size: 24rpx
 }
 .change-item {
        display: flex
        align-items: center
        font-size: 26rpx
        padding: 8rpx 0
 }
 .field {
        color: #666
        width: 160rpx
 }
 .old-value {
        color: #e74c3c
 }
 .arrow {
        margin: 0 10rpx
        color: #999
 }
 .new-value {
        color: #27ae60
 }
 </style>

Step 2: 修改发车表单添加历史记录

// 在 updateDeparture 方法中添加
async updateDeparture() {
const db = uniCloud.database(
const userStore = useUserStore(

        // 获取修改前的数据
        const oldRes = await db.collection('departures').doc(this.formData._id).
        const oldData = oldRes.data[0

        // 更新数据
        const updateData = { ...this.formData
        delete updateData._i

        await db.collection('departures').doc(this.formData._id).update(
                ...updateDat
                updated_at: Date.now
        }

        // 记录修改历史
        await db.collection('departure_history').add(
                departure_id: this.formData._i
                modifier_id: userStore.userI
                modifier_role: userStore.rol
                before_data: oldDat
                after_data: this.formDat
                changes: this.calculateChanges(oldData, this.formData
                created_at: Date.now
        }

},

calculateChanges(oldData, newData) {
const changes = {
const fields = ['date', 'dailyQuote', 'departureWorkerId', 'loadingWorke
'oilFee']

        fields.forEach(field =>
                const oldVal = JSON.stringify(oldData[field
                const newVal = JSON.stringify(newData[field
                if (oldVal !== newVal)
                        changes[field] = { old: oldData[field], new: newData[fie

        }

        return change

}

---

阶段七：结账页面权限控制

Task 11: 改造结账页面

Files:

- Modify: pages/statistics/statistics.vue

Step 1: 权限控制

data() {
return
userRole: '
activeTab: 0, // 0: 按人员, 1: 按鸡
// .

},

onShow() {
const userStore = useUserStore(
this.userRole = userStore.rol

        // 根据角色设置默认Ta
        if (this.userRole === 'worker')
                // 装发车：只能看到按人员结账，默认选中自
                this.activeTab =
                this.selectedWorkerId = userStore.user
                this.canChangePerson = fal
        } else if (this.userRole === 'merchant')
                // 鸡场：只能看到按鸡场结账，默认选中自
                this.activeTab =
                this.canChangePerson = fal
        } else
                // 中间商：可以看到全
                this.canChangePerson = tr


        this.loadData(

},

methods: {
tabChange(index)
if (this.userRole === 'worker' && index === 1) retu
if (this.userRole === 'merchant' && index === 0) retu
this.activeTab = ind

}

Step 2: 模板修改

 <!-- Tab栏 -->
 <view class="tabs">
        <vie
                class="ta
                :class="{ active: activeTab === 0, disabled: userRole === 'merch
                @click="tabChange(0

                按人
        </view
        <vie
                class="ta
                :class="{ active: activeTab === 1, disabled: userRole === 'worke
                @click="tabChange(1

                按鸡
        </view

 </view>

 <!-- 人员选择（装发车角色禁用） -->

<picker
v-if="canChangePerson
:range="workerList
@change="workerChange

>

        <view class="selected-value">{{ selectedWorkerName }}</view

 </picker>
 <view v-else class="selected-value readonly">
        {{ userStore.nickname }}（不可切换）
 </view>

---

阶段八：TabBar 权限控制

Task 12: 根据角色显示/隐藏 TabBar

Files:

- Modify: pages.json

Step 1: 动态设置 TabBar

// App.vue 或 store 中的初始化逻辑
async function initTabBar() {
const userStore = useUserStore(
const role = userStore.rol

        const pages = getCurrentPages(
        const currentPage = pages[pages.length - 1
        const route = currentPage.$page?.route || '

        // 隐藏不需要的页面入口
        if (role === 'worker')
                // 隐藏鸡场和人员管
                uni.hideTabBarRedDot({ index: 2 }) // 鸡
                uni.hideTabBarRedDot({ index: 3 }) // 人
        } else if (role === 'merchant')
                // 隐藏发车、鸡场、人员、结
                uni.hideTabBarRedDot({ index: 1
                uni.hideTabBarRedDot({ index: 2
                uni.hideTabBarRedDot({ index: 3
                uni.hideTabBarRedDot({ index: 4

}

// 更好的方案：使用页面栈控制
// 在需要权限控制的页面 onLoad 中检查
onLoad() {
const userStore = useUserStore(

        if (userStore.isMerchant)
                uni.showToast({ title: '无权限访问', icon: 'none'
                setTimeout(() => uni.navigateBack(), 150

}

---

验证步骤

验证 1: 用户登录

# 1. 运行项目

cd train-departure-diary
npm run dev:mp-weixin # 或 hbuilderX 运行

# 2. 测试流程

- 首次打开应跳转到登录页
- 小程序：点击微信登录 -> 获取手机号 -> 选择角色
- App：点击微信登录或手机号登录 -> 选择角色

# 3. 验证数据

- 检查 uniCloud 控制台用户表是否有新用户
- 检查 user_extend 表角色是否正确

验证 2: 权限控制

# 中间商角色

- [ ] 可以在首页看到全部功能入口
- [ ] 可以添加发车记录（发车人员可选）
- [ ] 可以查看所有发车记录
- [ ] 可以进入鸡场管理
- [ ] 可以进入人员管理
- [ ] 结账页面两个 Tab 都可见

# 装发车角色

- [ ] 首页只显示发车记录入口
- [ ] 添加发车记录时：发车人员默认是自己不可修改，装车人员可选
- [ ] 添加发车记录时：必须选择中间商
- [ ] 只显示自己参与的发车记录
- [ ] 结账页面只显示【按人员】Tab，默认选中自己不可切换

# 鸡场角色

- [ ] 首页只显示统计信息
- [ ] 无发车记录权限
- [ ] 无鸡场管理权限
- [ ] 无人员管理权限
- [ ] 结账页面只显示【按鸡场】Tab，默认选中自己不可切换

验证 3: 数据隔离

# 创建多个中间商测试

- 中间商 A 添加装发车 a1、a2
- 中间商 B 添加装发车 b1、b2

# 验证

- 装发车 a1 应该能看到为中间商 A 和 B 创建的记录
- 中间商 A 只能看到装发车 a1、a2 的记录
- 中间商 B 只能看到装发车 b1、b2 的记录
