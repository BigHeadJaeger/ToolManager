const MOBILE_REQ_BASE     = 30000;
const GAME_REQ_BASE       = 50000;
const TASK_REQ_BASE       = 115000;
// const GAME_REQ_BASE_EX    = 200000;
// const MOBILE_REQ_BASE_EX  = 300000;
// const GAME_REQ_INDIVIDUAL = 400000;

// 带回应的大厅心跳
export const MR_REQUEST_PULSE       = MOBILE_REQ_BASE + 3
// 获取服务器大厅IP供下次启动使用
export const GET_SERVERS            = MOBILE_REQ_BASE + 10
// 获取区域列表
export const GET_AREAS              = MOBILE_REQ_BASE + 11
// 获取某个区域下的房间列表
export const GET_ROOMS              = MOBILE_REQ_BASE + 12
// 登录大厅服务器
export const MR_LOGON_USER_V2       = MOBILE_REQ_BASE + 102
// 查询保险箱密码
export const GET_RNDKEY			    = MOBILE_REQ_BASE + 120
// 查询保险箱银子数
export const QUERY_SAFE_DEPOSIT	    = MOBILE_REQ_BASE + 161
// 从保险箱取银
export const MOVE_SAFE_DEPOSIT      = MOBILE_REQ_BASE + 180
// 存银到保险箱
export const TRANSFER_DEPOSIT       = MOBILE_REQ_BASE + 181
// 查询后备箱银子数
export const QUERY_BACKDEPOSIT	    = MOBILE_REQ_BASE + 164
// 从后备箱取银
export const TAKE_BACKDEPOSIT       = MOBILE_REQ_BASE + 184
// 存银到后备箱
export const SAVE_BACKDEPOSIT       = MOBILE_REQ_BASE + 185
// 查询用户游戏信息
export const QUERY_USER_GAMEINFO	= MOBILE_REQ_BASE + 162
// 查询会员信息
export const QUERY_MEMBERINFO	    = MOBILE_REQ_BASE + 165
// 查询用户断线续玩信息
export const MR_QUERY_DXXW_INFO  	= MOBILE_REQ_BASE + 166
// 查询用户通宝
export const MR_QUERY_TONGBAO     	= MOBILE_REQ_BASE + 190
// 查询配置的assistsvr ip port
export const MR_GET_ASSISTSVR       = MOBILE_REQ_BASE + 16
// 获取房间人数
export const GET_ROOMUSERS       = MOBILE_REQ_BASE + 14



// 获取服务器大厅IP的回应消息
export const GET_SERVERS_OK         = 80691
// 重复登录大厅的通知
export const KICKEDOFF_LOGONAGAIN   = GAME_REQ_BASE + 30103
// 管理员踢人
export const KICKEDOFF_BYADMIN      = GAME_REQ_BASE + 30104
//设备顶号
export const GR_KICKEDOFF_FORBIDTWOHALL = GAME_REQ_BASE + 30105
// 房间人数
export const GET_ROOMUSERS_OK       = 80702;
// 充值货币变化通知
export const GR_PAY_RESULT          = TASK_REQ_BASE + 600;
// 活动货币变化通知
export const GR_CURRENCY_EXCHANGE   = TASK_REQ_BASE + 601;

// 大厅通知的邮件刷新
export const GR_MAILSYS_NOTIFY      = GAME_REQ_BASE + 30998;


// PB登录
export const PB_LOGON_USER     				= 113001
export const PB_LOGON_SUCCEEDED           	= 113002

export enum TCY_CURRENCY {
    TCY_CURRENCY_DEPOSIT = 0,           // 银子
    TCY_CURRENCY_SCORE,                 // 积分
    TCY_CURRENCY_TONGBAO,               // 通宝
    TCY_CURRENCY_GAMECOIN,              // 游戏自定义货币
    TCY_CURRENCY_HAPPYCOIN,
    TCY_CURRENCY_MAX
}

export enum TCY_CURRENCY_CONTAINER {
	TCY_CURRENCY_CONTAINER_COFFER = 0,	//保险箱
	TCY_CURRENCY_CONTAINER_BACK,		//后备箱
	TCY_CURRENCY_CONTAINER_GAME,		//游戏
	TCY_CURRENCY_CONTAINER_MAX,
}