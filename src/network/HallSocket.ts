// import { Socket } from "../../core/network/socket/socket";
// import { MOBILE_REQ_BASE } from "../../core/define";
// import { isString } from "../../core/base/helper";
// import Hsl from '../../mcagent/hslutils'
// import { SocketErrType } from "../../core/network/define";
// import appUtils from "../../mcagent/apputils";
import { MOBILE_REQ_BASE, ServerMode, SocketErrType } from "@/define/define";
import { isString } from "@/base/helper";
import { Socket } from './socket/socket';
import { Config } from "@/config/config";


const MR_REQUEST_PULSE = MOBILE_REQ_BASE + 3
/**
 * 大厅服务器连接
 */
export class HallSocket extends Socket {
    public serverMode: ServerMode = ServerMode.Formal
    constructor() {
        super("hall",true)

        // appUtils.addResumeCallback(`hallsocket_onresume`,(backgroundTime)=> {
        //     if (this.isConnected()) {
        //         // 超过5分钟立即断开
        //         // 大厅从后台切回来立刻发送心跳
        //         if (backgroundTime >= 300) {
        //             Socket.disconnectAll()
        //         } else {
        //             this.onConnected();
        //         }
        //     }
        // })
    }

    connect(fnConnOky?: Function, fnSockErr?: Function)
    connect(host: string, port: number, fnConnOky?: Function, fnSockErr?: Function) 
    connect(_hostOrfnConnOky: string | Function | undefined, _portOrFnConnErr: number | Function | undefined, _fnConnOkyOrErr?: Function | undefined, _fnSockErr?: Function | undefined) {
        if (isString(_hostOrfnConnOky)) {
            return super.connect(_hostOrfnConnOky,_portOrFnConnErr as number,_fnConnOkyOrErr,_fnSockErr,false)
        } else {
            let fnConnOky : any = _hostOrfnConnOky
            let fnSockErr : any = _portOrFnConnErr
            super.connect(this.getHallSvr().szServerIP,this.getHallSvr().nPort,fnConnOky,fnSockErr,false)
        }
    }

    protected onConnected() {
        super.onConnected()

        this.openPulse(MR_REQUEST_PULSE, 60 * 1000, undefined, true, (reqId) => {
            if (reqId == -1) {
                if (this.isConnected()) {
                    console.log("close socket on pulse timeout")
                    let callback = this.getDisconnectCallback()
                    this.closeSocket()

                    if (callback) {
                        callback(SocketErrType.RunError)
                    }
                }
            }
        })
    }

    getHallSvr() {
        if (this.serverMode == ServerMode.Formal) {
            return {
                nPort: 31626,
                szServerIP: "mH5.youxi8848.com"
            }
        }
        else if (this.serverMode == ServerMode.Preview) {
            return {
                nPort: 31626,
                szServerIP: "m888.youxi8848.com"
            }
        }
        else {
            return {
                nPort: 31626,
                szServerIP: "h5gametest.tcy365.com"
            }
        }
    }
}