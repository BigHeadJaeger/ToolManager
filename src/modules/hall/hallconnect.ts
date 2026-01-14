import { ClientInfo, ClientInfo_Debug } from "@/config/config";
import { ServerMode } from "@/define/define";
import { Socket } from "@/network/socket/socket";
import * as HallReqDef from '../../define/HallReqDef'
import { Protobuf } from "@/libs/serialize";
import { HallPB } from "@/define/HallPBStruct";
import { HallSocket } from "@/network/HallSocket";


export const FLAG_LOGON_USEDSDK             = 0x00008000;
export const FLAG_LOGON_SIMULATOR           = 0x00000020;
export const FLAG_LOGON_INTER               = 0x00001000;
export const FLAG_LOGON_HANDPHONE           = 0x00000800;



export default class HallConnect { 
    hallSocket: Socket | null = null
    serverMode: ServerMode = ServerMode.Formal
    okcb: Function = null;
    
    constructor() {
        this.hallSocket = new HallSocket()
    }

    loginHall(serverMode: ServerMode, callback:Function) {
        this.serverMode = serverMode;

        (this.hallSocket as HallSocket).serverMode = serverMode
        this.okcb = callback;
        if (!this.hallSocket.isConnected()) {
            if (this.hallSocket.getHostInfo() != "") {
                this.hallSocket.reconnect(this.onHallConnectOK.bind(this),this.onHallConnectError.bind(this))
            } else {
                this.hallSocket.connect(this.onHallConnectOK.bind(this),this.onHallConnectError.bind(this))
            }
        } else {
            this.loginUser()
        }
    }

    log(...args) {
        args.forEach((arg, index) => {
            if (typeof arg == "object") {
                args[index] = JSON.stringify(arg)
            }
        });
        console.log("[Log]", ...args);
    }

    loginUser() {
        if (!this.hallSocket) {
            return
        }
        
        // 登录来源参数，用于统计
        const recommGameID = 0
        const recommGameCode = ''
        const recommGameVer = ''
        //const packageType = 300

        this.serverMode

        
        let clientInfo;
        if (this.serverMode == ServerMode.Test) {
            clientInfo = ClientInfo_Debug
        } else {
            clientInfo = ClientInfo
        }

        const params = {
            // userid: clientInfo.userid,
            userid: -1,
            hallsvrid:0,
            agentgroupid: 6,
            ipaddr:0,
            logonflags:this.getLoginFlags(),
            tokenid:0,
            username: clientInfo.username,
            password: clientInfo.password,
            hardid: clientInfo.hardid,
            volumeid: '50A4C8bf98020000000000000000000',
            machineid: '50A4C8bf98020000000000000000000',
            hashpwd: "",
            rndkey:"",
            sysver:0,
            logonsvrid:0,
            hallbuildno: 20130822,
            hallnetdelay: 323,
            hallruncount: 0,
            gameid: 450,
            gamever:  clientInfo.gameversion,
            accesstoken: "",
            recommenderid: "",
            channelid: 1000001474,
            gamecode: clientInfo.appcode,
            recommgameid: recommGameID,
            recommgamecode: recommGameCode,
            justforverify: 0,
            recommgamever: recommGameVer,
            pkgtype: 110,
            cuid: "",
            imsiid: "50A4C8bf98020000000000000000000",
            simserialno: "50A4C8bf98020000000000000000000",
            uniqueid : "",
        }

        // deviceUtils.setCommonInfoMap()
        // let gsData = deviceUtils.getKPIClientData() 
        params['gsclientdata'] = '{}'

        this.log(params)

        // if (gsData) {
        // }

        // if (Config.serverMode != ServerMode.Formal) {
        //     console.log("LogTag.Login", "LoginHall params")
        //     CommonFunc.dump(params)
        // }

        
        
        this.hallSocket.sendRequest(HallReqDef.PB_LOGON_USER,"HallPB.LogOnUser", params, (responseID, data) => {
            if (responseID === HallReqDef.PB_LOGON_SUCCEEDED) {
                console.log("LogTag.Login", "login hall success")
                

                let ret = Protobuf.Deserialize(data, HallPB.LogOnSucceed);
                let userGameInfo: Record<string, any> = {};
                
                if (this.serverMode == ServerMode.Test) {
                    ClientInfo_Debug.uniqueid = ret.uniqueid
                } else {
                    ClientInfo.uniqueid = ret.uniqueid
                }

                if (ret.usergameinfo) {
                    userGameInfo = {
                        nDeposit: ret.usergameinfo.deposit,
                        nPlayerLevel: ret.usergameinfo.playerlevel,
                        nScore: ret.usergameinfo.score,
                        nExperience: ret.usergameinfo.experience,
                        nBreakOff: ret.usergameinfo.breakoff,
                        nWin: ret.usergameinfo.win,
                        nLoss: ret.usergameinfo.loss,
                        nStandOff: ret.usergameinfo.standoff,
                        nBout: ret.usergameinfo.bout,
                        nTimeCost: ret.usergameinfo.timecost,
                        nSalaryTime: ret.usergameinfo.salarytime,
                        nSalaryDeposit: ret.usergameinfo.salarydeposit,
                        nTotalSalary: ret.usergameinfo.totalsalary,
                        dwFlags: ret.usergameinfo.flags,
                    }
                }

                // let dataMap = {
                //     nUserID        : ret.userid,
                //     szUniqueID     : ret.uniqueid,
                //     nRegisterGroup : ret.registergroup,
                //     nUserType      : isPCLogin ? (GameReqDef.UT_HANDPC | ret.usertype) : ret.usertype,
                //     userGameInfo   : userGameInfo
                // }

                // if (ret.svrs && ret.svrs.length > 0) {
                //     let svr = ret.svrs[0]
                    
                //     // 如果有多个，按类型获取最合适的
                //     if (ret.svrs.length > 1) {
                //         if (MINIGAME) {
                //             svr = ret.svrs.find((x) => x.type == 1) || svr
                //         }
                //     }

                //     let gameMpHost = svr.ip != "" ? svr.ip : svr.www
                //     let gameMpPort = svr.port

                //     Socket.mpHost = gameMpHost
                //     Socket.mpPort = gameMpPort
                // } else {
                //     if (Config.serverMode == ServerMode.Formal) {
                //         Socket.mpHost = "publicmpsvr.youxi8848.com"
                //         Socket.mpPort = 31700
                //     }
                // }

                // businessUtils.setUserId(ret.userid)
                // businessUtils.setUserUniqueId(ret.uniqueid)

                // console.log("LogTag.Login","userid=",ret.userid)
                // console.log("LogTag.Login","uid=",ret.uniqueid)
                
                // // 注册时间戳
                // let regTimeStamp = this.getRegisterTimeStamp(ret.createday, ret.createhour);

                // dataCenter.dispatch({type : DataReduceType.InitLoginData,value : dataMap})
                // dataCenter.dispatch({type : DataReduceType.InitRegisterTimeStamp,value : regTimeStamp})
                // dataCenter.dispatch({type : DataReduceType.UpdateUserName,value : businessUtils.getUserName()})
                // dataCenter.dispatch({type : DataReduceType.UpdateNickName,value : businessUtils.getNickName() || businessUtils.getUserName()})

                // Protobuf.setClientInfo({
                //     appcode : businessUtils.getGameCode(),
                //     userid : businessUtils.getUserId(),
                //     username : businessUtils.getUserName(),
                //     nickname : businessUtils.getNickName(),
                //     hardid : deviceUtils.getHardID(),
                //     uniqueid : businessUtils.getUserUniqueId()
                // })

                // LocalCache.setInt(`${businessUtils.getUserName()}-lastUserId`,ret.userid)
                // this.status = b3.SUCCESS
                this?.okcb(true)
            } else {
                // this.status = b3.FAILURE
                // this.setOutputData({errorID:responseID})
                // this.setDebugInfo(`大厅登录失败 code:${responseID}`)

                console.log("LogTag.Login","loginhall failed response: " + responseID)
                this?.okcb(false)
            }
        })

    }

    private onHallConnectOK() {
        this.loginUser()
        console.log("LogTag.Login","hallConnectOK")
    }

    private onHallConnectError() {
        console.log("LogTag.Login","hallConnectFailed")
    }


    getLoginFlags() {
        let dwLogonFlags = 0;
        dwLogonFlags |= FLAG_LOGON_USEDSDK;
        if (this.serverMode == ServerMode.Test) {
            dwLogonFlags |= FLAG_LOGON_INTER;
        }
        return dwLogonFlags
    }


}