import { pbdecl } from "../decorators/protobufdecl"
import { Protobuf } from "../libs/serialize/protobuf"
import { PBStruct } from "../define/pbstruct"

export namespace HallPB {
	Protobuf.Declare("HallPB.LogOnUser",[
		{type:"int32",name:"userid"			,number:1},
		{type:"int32",name:"hallsvrid" 		,number:2},
		{type:"int32",name:"agentgroupid" 	,number:3},
		{type:"uint32",name:"ipaddr" 		,number:4},
		{type:"uint32",name:"logonflags" 	,number:5},
		{type:"int32",name:"tokenid" 		,number:6},
		{type:"string",name:"username" 		,number:7},	//要求gb编码,和v2/v3一致
		{type:"string",name:"password" 		,number:8},
		{type:"string",name:"hardid" 		,number:9},
		{type:"string",name:"volumeid" 		,number:10},	 
		{type:"string",name:"machineid" 	,number:11},
		{type:"string",name:"hashpwd" 		,number:12},	
		{type:"string",name:"rndkey" 		,number:13},
		{type:"uint32",name:"sysver" 		,number:14},     
		{type:"int32",name:"logonsvrid" 	,number:15}, 
		{type:"int32",name:"hallbuildno" 	,number:16},
		{type:"int32",name:"hallnetdelay" 	,number:17},	
		{type:"int32",name:"hallruncount" 	,number:18},
		{type:"int32",name:"gameid" 		,number:19},   //自身游戏id
		{type:"string",name:"gamever" 		,number:20},
		{type:"int32",name:"recommenderid" 	,number:21},   //推广码
		{type:"int32",name:"channelid" 		,number:22},   //渠道号
		{type:"string",name:"gamecode"		,number:23},
		{type:"int32",name:"recommgameid" 	,number:24},   //推荐游戏id
		{type:"string",name:"recommgamecode",number:25},
		{type:"string",name:"accesstoken" 	,number:26},		
		{type:"int32",name:"justforverify" 	,number:27},	//是否多重登陆,0否,1是
		
		{type:"string",name:"recommgamever" ,number:28},
		{type:"int32",name:"pkgtype" 		,number:29},	// 包体类型 [100	移动游戏单包 200	移动电玩城单包 1000 游戏合集包, 300	微信小游戏, 0	pc]
		{type:"string",name:"cuid" 			,number:30},

		{type:"string",name:"imsiid" 		,number:31},   // imsi,从SIM卡读取
		{type:"string",name:"simserialno" 	,number:32},   // sim卡序列号,从SIM卡读取
		
		{type:"string",name:"uniqueid"		,number:33},	// justforverify 为 true 时有效
		
		{type:"int32",name:"queryflags"		,number:34},	// 扩展QueryUserGameInfo
		{type:"string",name:"gsclientdata"  ,number:39},	// 新版gsclientdata
	])
	
	@pbdecl("HallPB.UserGameInfoMB")
	export class UserGameInfoMB {
		userid		= Protobuf.Optional(Protobuf.Int32,1)  	// 用户ID
		gameid		= Protobuf.Optional(Protobuf.Int32,2)  	// 游戏ID
		deposit		= Protobuf.Optional(Protobuf.Int32,3) 	 // 银子
		playerlevel	= Protobuf.Optional(Protobuf.Int32,4)  	// 级别
		score		= Protobuf.Optional(Protobuf.Int32,5)  	// 积分
		experience	= Protobuf.Optional(Protobuf.Int32,6)  	// 经验(分钟，已废弃)
		breakoff	= Protobuf.Optional(Protobuf.Int32,7)  	// 断线
		win			= Protobuf.Optional(Protobuf.Int32,8)  	// 赢
		loss		= Protobuf.Optional(Protobuf.Int32,9)	// 输
		standoff	= Protobuf.Optional(Protobuf.Int32,10) 	// 和
		bout		= Protobuf.Optional(Protobuf.Int32,11)  // 回合
		timecost	= Protobuf.Optional(Protobuf.Int32,12) 	// 花时(秒)
		salarytime	= Protobuf.Optional(Protobuf.Int32,13) 
		salarydeposit	= Protobuf.Optional(Protobuf.Int32,14)
		totalsalary		= Protobuf.Optional(Protobuf.Int32,15)
		flags		= Protobuf.Optional(Protobuf.Int32,16)	// 一些状态标记         
	}
	
	@pbdecl("HallPB.GameMPSvr")
	export class GameMPSvr {
		userid		= Protobuf.Optional(Protobuf.Int32,1) 	//索引，无意义
		gameid		= Protobuf.Optional(Protobuf.Int32,2)	// 游戏id
		status 		= Protobuf.Optional(Protobuf.Int32,3)	// 0表示隐藏  1 表示有效
		options 	= Protobuf.Optional(Protobuf.Int32,4)	//0x00000001 表示内测区
		port 		= Protobuf.Optional(Protobuf.Int32,5)	
		ip 			= Protobuf.Optional(Protobuf.String,6)	//1.1.1.1 ip地址
		www 		= Protobuf.Optional(Protobuf.String,7)	//// xxx.youxi8848.com 域名地址 
		type        = Protobuf.Optional(Protobuf.Int32,8)   // 类型： 0 ：移动  1：微信小游戏  2：PC
		subtype     = Protobuf.Optional(Protobuf.Int32,9)   // 保留
	}
	
	@pbdecl("HallPB.LogOnSucceed")
	export class LogOnSucceed {
		userid 			= Protobuf.Optional(Protobuf.Int32,1)
		nicksex 		= Protobuf.Optional(Protobuf.Int32,2)
		portrait 		= Protobuf.Optional(Protobuf.Int32,3)
		usertype 		= Protobuf.Optional(Protobuf.Int32,4)
		clothingid 		= Protobuf.Optional(Protobuf.Int32,5)
		registergroup 	= Protobuf.Optional(Protobuf.Int32,6)
		downloadgroup 	= Protobuf.Optional(Protobuf.Int32,7)
		agentgroupid 	= Protobuf.Optional(Protobuf.Int32,8)
		expiration 		= Protobuf.Optional(Protobuf.Int32,9)
		memberlevel 	= Protobuf.Optional(Protobuf.Int32,10)
		hallid 			= Protobuf.Optional(Protobuf.Int32,11)
		username 		= Protobuf.Optional(Protobuf.String,12)
		nickname 		= Protobuf.Optional(Protobuf.String,13)
		uniqueid 		= Protobuf.Optional(Protobuf.String,14)
		imtoken 		= Protobuf.Optional(Protobuf.String,15)
		idcard 			= Protobuf.Optional(Protobuf.String,16)
		usergameinfo 	= Protobuf.Optional(UserGameInfoMB,17)
		svrs 			= Protobuf.Repeated(GameMPSvr,18)
		createday 		= Protobuf.Optional(Protobuf.Int32,19)
		createhour 		= Protobuf.Optional(Protobuf.Int32,20)
	}
	
	@pbdecl("HallPB.LiQuanExchInfo")
	export class LiQuanExchInfo {
		userid 		= Protobuf.Optional(Protobuf.Int32,1)
		num 		= Protobuf.Optional(Protobuf.Int32,2)		 	// 本次操作的礼券数量
		srctype 	= Protobuf.Optional(Protobuf.Int32,3)		 	// 来源类型(1-奖励 2-兑换 3-过期 4-消耗)
		srcid 		= Protobuf.Optional(Protobuf.Int32,4)			// 活动id
		serialno	= Protobuf.Optional(Protobuf.String,5)			// 订单号
		createtime	= Protobuf.Optional(Protobuf.Int64,6)			// 记录产生时间ms
		desc		= Protobuf.Optional(Protobuf.String,7)			// 描述 utf8
		left 		= Protobuf.Optional(Protobuf.Int32,8)			// 当前用户兑换券数量
		expire 		= Protobuf.Optional(Protobuf.Int32,9)			// 过期时间 如20190501
	}
	
	@pbdecl("HallPB.GetServerReq")
	export class GetServerReq {
		src	= Protobuf.Optional(PBStruct.Source,1)
	}
	
	@pbdecl("HallPB.GetServerResp.Server")
	export class GetServerRespServer {
		name = Protobuf.Optional(Protobuf.String,1)
		host = Protobuf.Optional(Protobuf.String,2)
		port = Protobuf.Optional(Protobuf.Int32,3)
		maxversion = Protobuf.Optional(Protobuf.String,5)
	}
	
	@pbdecl("HallPB.GetServerResp")
	export class GetServerResp {
		list = Protobuf.Repeated(GetServerRespServer,2)
		time = Protobuf.Optional(Protobuf.Int32,3)
	}

	@pbdecl("HallPB.GetAreaInfoReq")
	export class GetAreaInfoReq {
		src	= Protobuf.Optional(PBStruct.Source,1)
		appcode = Protobuf.Optional(Protobuf.String,2)
	}

	@pbdecl("HallPB.GetAreaInfoResp")
	export class GetAreaInfoResp {
		errInfo = Protobuf.Repeated(PBStruct.ErrorInfo,1)
		info = Protobuf.Optional(Protobuf.String,2)
		subgameinfo = Protobuf.Optional(Protobuf.String,3)
	}

	@pbdecl("HallPB.GetGameCoinReq")
	export class GetGameCoinReq {
		src	= Protobuf.Optional(PBStruct.Source,1)
	}

	@pbdecl("HallPB.GetGameCoinResp")
	export class GetGameCoinResp {
		errInfo = Protobuf.Repeated(PBStruct.ErrorInfo,1)
		gamecoin = Protobuf.Optional(Protobuf.Int64,2)
	}

	// 面板里面的装饰信息
	@pbdecl("HallPB.UserEffect")
	export class UserEffect {
		userId		= Protobuf.Optional(Protobuf.Int32, 1)		// 用户ID
		tab			= Protobuf.Optional(Protobuf.String, 2)		// 标签页
		group		= Protobuf.Optional(Protobuf.String, 3)		// 部位
		propId		= Protobuf.Optional(Protobuf.Int32, 4)		// 装饰的道具
		deadline	= Protobuf.Optional(Protobuf.Int32, 5)		// 装扮过期时间
	}

	@pbdecl("HallPB.UserPanel") 
	export class UserPanel {
		userId		= Protobuf.Optional(Protobuf.Int32, 1)
		nickName 	= Protobuf.Optional(Protobuf.String, 2)
		prestige 	= Protobuf.Optional(Protobuf.Int32, 5)		// 声望
		effects		= Protobuf.Repeated(HallPB.UserEffect, 7)	// 装饰
		status 		= Protobuf.Optional(Protobuf.Int32, 8)		// 激活状态
	}

	@pbdecl("HallPB.Level") 
	export class Level {
		prestige	= Protobuf.Optional(Protobuf.Int32, 1)
		name 		= Protobuf.Optional(Protobuf.String, 2)
	}

	// 拉取面板信息
	@pbdecl("HallPB.ReqPanelInfo")
	export class ReqPanelInfo {
		src	= Protobuf.Optional(PBStruct.Source, 1)
		userId = Protobuf.Optional(Protobuf.Int32, 2)
	}

	@pbdecl("HallPB.RspPanelInfo")
	export class RspPanelInfo {
		errInfo 	= Protobuf.Repeated(PBStruct.ErrorInfo, 1)
		panelInfo 	= Protobuf.Optional(HallPB.UserPanel, 2)
		levels    	= Protobuf.Repeated(HallPB.Level, 3); 
	}

	// 拉取订阅信息
	@pbdecl("HallPB.ReqQuerySubcribeInfo")
	export class ReqQuerySubcribeInfo {
		src		= Protobuf.Optional(PBStruct.Source, 1)
		openId	= Protobuf.Optional(Protobuf.String, 2)
		tmpId 	= Protobuf.Optional(Protobuf.String, 3)
	}

	@pbdecl("HallPB.RspQuerySubcribeInfo")
	export class RspQuerySubcribeInfo {
		errInfo = Protobuf.Repeated(PBStruct.ErrorInfo, 1)
		state	= Protobuf.Optional(Protobuf.Int32, 2)
	}

	// 上报订阅信息
	@pbdecl("HallPB.ReqReportSubcribeInfo")
	export class ReqReportSubcribeInfo {
		src		= Protobuf.Optional(PBStruct.Source, 1)
		openId	= Protobuf.Optional(Protobuf.String, 2)
		tmpId 	= Protobuf.Optional(Protobuf.String, 3)
		post_time = Protobuf.Optional(Protobuf.Int32, 4)		// 控制订阅什么时候推送 为时间戳
	}

	@pbdecl("HallPB.RspReportSubcribeInfo")
	export class RspReportSubcribeInfo {
		errInfo = Protobuf.Repeated(PBStruct.ErrorInfo, 1)
		state	= Protobuf.Optional(Protobuf.Int32, 2)
	}

	// 钻石兑换
	@pbdecl("HallPB.GoodInfo")
	export class GoodInfo {
		id 			= Protobuf.Optional(Protobuf.Int32,1) 		// 商品ID
		price 		= Protobuf.Optional(Protobuf.Int64,2) 		// 商品价格
		propid 		= Protobuf.Optional(Protobuf.Int32,3) 		// 道具ID
		limittype 	= Protobuf.Optional(Protobuf.Int32,4) 		// 限购类型
		limittimes	= Protobuf.Optional(Protobuf.Int32,5) 		// 限购次数
		buytimes 	= Protobuf.Optional(Protobuf.Int32,6) 		// 今日已经购买次数
		tabtype 	= Protobuf.Optional(Protobuf.Int32,7) 		// 商品类型
	}

	@pbdecl("HallPB.ReqExchangeGameCoin")
	export class ReqExchangeGameCoin {
		src         = Protobuf.Optional(PBStruct.Source, 1)
        productId   = Protobuf.Optional(Protobuf.Int32, 2)       // 商品ID
        buyCount    = Protobuf.Optional(Protobuf.Int32, 3)       // 购买数量
	}


	// 使用道具
	@pbdecl("HallPB.ReqUseProp")
    export class ReqUseProp {
        src         = Protobuf.Optional(PBStruct.Source, 1)
        propId      = Protobuf.Optional(Protobuf.Int32, 2)        // 使用的道具ID
        propCount   = Protobuf.Optional(Protobuf.Int32, 3)        // 使用的道具数量
        targets     = Protobuf.Repeated(Protobuf.Int32, 4)        // 道具作用者的userId，背包中使用道具不需要填写
    }


	@pbdecl("HallPB.CreateServerKeyReq")
	export class CreateServerKeyReq {
		src         = Protobuf.Optional(PBStruct.Source, 1)
		id          = Protobuf.Optional(Protobuf.String, 4)
		timestamp 	= Protobuf.Optional(Protobuf.Int32,  5)
	}

	@pbdecl("HallPB.CreateServerKeyResp")
	export class CreateServerKeyResp {
		errInfo     = Protobuf.Repeated(PBStruct.ErrorInfo, 1)
		pubkey      = Protobuf.Optional(Protobuf.Bytes,2)
		challenge   = Protobuf.Optional(Protobuf.Bytes,3)
		p           = Protobuf.Optional(Protobuf.Bytes,4)
		g           = Protobuf.Optional(Protobuf.Bytes,5)
		key 		= Protobuf.Optional(Protobuf.String,6)
	}

	@pbdecl("HallPB.CommitClientKeyReq")
	export class CommitClientKeyReq
	{
		verify      = Protobuf.Optional(Protobuf.Bytes,2)
		pubkey   	= Protobuf.Optional(Protobuf.Bytes,3)
		id          = Protobuf.Optional(Protobuf.String, 4)
	}

	@pbdecl("HallPB.SendPluseReq")
	export class SendPluseReq {
		src         = Protobuf.Optional(PBStruct.Source, 1)
		sn          = Protobuf.Optional(Protobuf.Int32, 2)
		interval 	= Protobuf.Optional(Protobuf.Int32, 3)
	}

	@pbdecl("HallPB.SendPluseResp")
	export class SendPluseResp {
		src         = Protobuf.Optional(PBStruct.Source, 1)
		online_time = Protobuf.Optional(Protobuf.Int32, 2)
	}
}