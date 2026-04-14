# 数据库设计 (MySQL 数据库)

## 数据表结构

| 表名               | 说明       | 主要字段                                                             |
| ------------------ | ---------- | -------------------------------------------------------------------- |
| `users`            | 用户表     | id, phone, nickname, password, role, inviteCode, parentId            |
| `merchants`        | 鸡场表     | id, name, margin, contact, phone, address, userId                   |
| `workers`          | 员工表     | id, name, type(departure/loading/both), phone, userId                |
| `departures`       | 发车记录表 | id, date, dailyQuote, merchantDetails(JSON), truckRows(JSON), userId |
| `invitation_codes` | 邀请码表   | id, code, type, creatorId, usedBy, workerInfo                       |
| `transactions`     | 交易记录表 | id, date, targetId, amount, type, userId                             |
| `settings`         | 设置表     | id, userId, 各种斤数和费用默认值                                     |
| `daily_quotes`     | 日报价表   | id, date, quote, userId                                              |

## 表详细结构

### users (用户表)

| 字段       | 类型   | 说明                               |
| ---------- | ------ | ---------------------------------- |
| id         | string | 用户 ID (UUID)                     |
| phone      | string | 手机号 (唯一)                      |
| nickname   | string | 昵称                               |
| password   | string | 密码                               |
| role       | string | 角色 (admin/middleman/loader/farm) |
| inviteCode | string | 用户的邀请码                       |
| invitedBy  | string | 使用的邀请码                       |
| parentId   | string | 上级用户 ID                        |
| workerId   | string | 关联的员工 ID                      |
| workerType | string | 员工类型 (departure/loading/both)  |
| createdAt  | string | 创建时间                           |

### merchants (鸡场表)

| 字段      | 类型   | 说明         |
| --------- | ------ | ------------ |
| id        | string | ID           |
| name      | string | 名称         |
| margin    | double | 利润/ margin |
| contact   | string | 联系人       |
| phone     | string | 电话         |
| address   | string | 地址         |
| note      | string | 备注         |
| userId    | string | 所属用户 ID  |
| createdAt | string | 创建时间     |

### workers (员工表)

| 字段      | 类型   | 说明                          |
| --------- | ------ | ----------------------------- |
| id        | string | ID                            |
| name      | string | 姓名                          |
| type      | string | 类型 (departure/loading/both) |
| phone     | string | 电话                          |
| note      | string | 备注                          |
| userId    | string | 所属用户 ID                   |
| createdAt | string | 创建时间                      |

### departures (发车记录表)

| 字段                  | 类型   | 说明                      |
| --------------------- | ------ | ------------------------- |
| id                    | string | ID                        |
| date                  | string | 日期                      |
| dailyQuote            | double | 日报价                    |
| merchantDetails       | string | 商户明细 (JSON)           |
| reservedBigBoxes      | int    | 预留大箱                  |
| reservedSmallBoxes    | int    | 预留小箱                  |
| reservedBigBoxesTotal | int    | 预留大箱合计              |
| reservedSmallBoxesTotal | int  | 预留小箱合计              |
| reservedTotal         | double | 预留合计                  |
| departureWorkerId     | string | 发车人员 ID               |
| loadingWorkerIds      | string | 装车人员 ID 列表 (JSON)   |
| fuelCost / oilFee     | double | 油费                      |
| entryFee              | double | 入场费                    |
| tollFee               | double | 过路费                    |
| loadingFee            | double | 装车费                    |
| unloadingFee          | double | 卸车费                    |
| departureFee          | double | 发车费                    |
| truckRows             | string | 车行 (JSON)               |
| truckBig              | int    | 车辆大箱                  |
| truckSmall            | int    | 车辆小箱                  |
| truckCartonBoxesBig   | int    | 车辆纸箱大箱              |
| truckCartonBoxesSmall | int    | 车辆纸箱小箱              |
| truckWeightTotal      | double | 车辆重量合计              |
| arrivalBigBoxes       | int    | 到达大箱                  |
| arrivalSmallBoxes     | int    | 到达小箱                  |
| returnedBigBoxes      | int    | 返回大箱                  |
| returnedSmallBoxes    | int    | 返回小箱                  |
| depotBigBoxes         | int    | 库存大箱                  |
| depotSmallBoxes       | int    | 库存小箱                  |
| depotCartonBoxesBig   | int    | 库存纸箱大箱              |
| depotCartonBoxesSmall | int    | 库存纸箱小箱              |
| smallBoxWeight        | double | 小箱重量                  |
| totalBigBoxes         | int    | 大箱合计                  |
| totalSmallBoxes       | int    | 小箱合计                  |
| merchantBigTotal      | int    | 商户大箱合计              |
| merchantSmallTotal     | int    | 商户小箱合计              |
| merchantWeightTotal   | double | 商户重量合计              |
| allMerchantWeight     | double | 商户总重量                |
| totalReceivePrice     | double | 收款金额合计              |
| totalDeliveryPrice    | double | 付金额合计                |
| merchantAmount        | string | 商户金额 (JSON)           |
| getMoney              | double | 收款金额                  |
| profit                | double | 利润                      |
| userId                | string | 用户 ID                   |
| note                  | string | 备注                      |
| createdAt             | string | 创建时间                  |

### invitation_codes (邀请码表)

| 字段        | 类型   | 说明                         |
| ----------- | ------ | ---------------------------- |
| id          | string | ID                           |
| code        | string | 邀请码 (6 位数字)            |
| type        | string | 类型 (middleman/loader/farm) |
| creatorId   | string | 创建者 ID                    |
| usedBy      | string | 使用者 ID                    |
| usedAt      | string | 使用时间                     |
| workerId    | string | 关联员工 ID                  |
| workerPhone | string | 员工手机号                   |
| workerName  | string | 员工姓名                     |
| workerType  | string | 员工类型                     |
| createdAt   | string | 创建时间                     |

### transactions (交易记录表)

| 字段       | 类型   | 说明     |
| ---------- | ------ | -------- |
| id         | string | ID       |
| date       | string | 日期     |
| targetId   | string | 目标 ID  |
| targetType | string | 目标类型 |
| amount     | double | 金额     |
| type       | string | 类型     |
| userId     | string | 用户 ID  |
| note       | string | 备注     |
| createdAt  | string | 创建时间 |

### settings (设置表)

| 字段                  | 类型   | 说明                   |
| --------------------- | ------ | ---------------------- |
| id                    | string | ID (UUID)              |
| userId                | string | 所属用户 ID (中间商 ID) |
| receiptBigBoxWeight   | double | 收货大箱重量 (默认 45) |
| deliveryBigBoxWeight  | double | 发货大箱重量 (默认 44) |
| smallBoxWeight        | double | 小箱重量 (默认 29.5)   |
| loadingFee            | double | 装车费                 |
| depotCartonBoxesBig   | double | 大箱斤数 (默认 43)     |
| depotCartonBoxesSmall | double | 小箱斤数 (默认 30)     |
| unloadingFee          | double | 卸车费                 |
| departureFee          | double | 发车费                 |
| tollFee               | double | 过路费                 |
| entryFee              | double | 入场费                 |
| oilFee                | double | 油费                   |

### daily_quotes (日报价表)

| 字段      | 类型   | 说明                   |
| --------- | ------ | ---------------------- |
| id        | string | ID (UUID)              |
| date      | string | 日期 (YYYY-MM-DD)       |
| quote     | double | 日报价                 |
| userId    | string | 所属用户 ID (中间商 ID) |
| createdAt | string | 创建时间               |
