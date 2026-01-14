// import { Config } from '../../../config'
import {TCConnect} from './websocket/network'
// import {MCConnect} from './nativesocket/network'
// import {deserialize} from '../utils/functions'
// import { DEV, JSB } from 'internal:constants'
// import { Serializer } from '../../../libs/serialize/Serializer'
// import eventcenter from "../../../core/event/eventcenter"
import { Pipeline } from '../../base/pipeline'
import { Task } from '../../base/task'
// import { BinaryStream } from '../../../libs/serialize/BinaryStream'
// import { Protobuf } from '../../../libs/serialize/protobuf'
// import { isArray } from '../../../core/base/helper'
// import additionConfig from '../../../core/config/additionconfig/additionconfig'
// import { FunctionKeys } from '../../../core/config/additionconfig/additionconfigkey'
import { Config } from '@/config/config'
import { ServerMode } from '@/define/define'
import { BinaryStream, Protobuf, Serializer } from '@/libs/serialize'
import { isArray } from '@/base/helper'


const ERROR_INFOMATION = 60031

/**
 * @zh
 * 通用网络层
 */
export class Socket {
    static idseed = 1
    static mpHost = ""
    static mpPort = 0
    private static _socketNameDic : Record<string,Socket> = {}
    
    private id = -1
    private name : string = ""
    private host : string = ""
    private port : number = 0
    private connectedTimes = 0
    private isParallel = false

    protected websocket : TCConnect | null = null
    // protected mcsocket : MCConnect | null = null
    private connectTimer : number | undefined = undefined
    private connectTimeoutCallback? : Function

    private _requestSendPipe = new Pipeline('requestSend', []);
    private _requestRecvPipe = new Pipeline('requestRecv', []);
    private _requestNtfyPipe = new Pipeline('requestNtfy', []);

    constructor(name,isParallel?) {
        this.id = Socket.idseed++
        this.name = name
        this.isParallel = isParallel
        Socket._socketNameDic[name] = this

        // if (JSB) {
        //     this.mcsocket = new MCConnect(name,isParallel)
        // } else {

        // }

        let isSocketUseSSL = (Config.serverMode == ServerMode.Formal)

        // 先关闭下，正式公共代理也不支持wss
        // if (DEV) {
        // }
        isSocketUseSSL = false

        this.websocket = new TCConnect(name, isSocketUseSSL, true, true,isParallel)

        this._requestRecvPipe.append(this.requestRecvPreprocess.bind(this)).append(this.requestRecvHandler.bind(this))
        this._requestSendPipe.append(this.requestSendProcess.bind(this))
        this._requestNtfyPipe.append(this.requestNtfyHandler.bind(this))
    }

    getId() {
        return this.id
    }

    getName() {
        return this.name
    }

    getHostInfo() {
        if (!this.host) {
            return ""
        }

        return `${this.host}:${this.port}`
    }

    isProxySupported() { 
        return false
    }

    isNeedAutoConnect() {
		let socket = this.websocket

        if (!socket) {
            return false
        }

        return socket.isNeedAutoConnect()
	}

    getConnectedTimes() {
        return this.connectedTimes
    }

    connect(host: string, port: number, fnConnOky?: Function, fnSockErr?: Function, bAutoConnect?) {
        let socket = this.websocket

        if (!socket) {
            return
        }

        this.host = host
        this.port = port

        if (this.isProxySupported()) {
            host = Socket.mpHost
            port = Socket.mpPort
        }

        console.log("LogTag.Socket",`make connect ${this.name} ${host}:${port} use share proxy:${this.isProxySupported()}`)
        this.startConnectTimer(fnSockErr)
        socket.connect(host,port,(params)=> {
            console.log("LogTag.Socket",`${this.name} socket on connected ok`);
            // eventcenter.emit(GameEvent.SocketConnected,this,this.name)

            if (this.isProxySupported()) {
                // this.sendServerInfoToProxy()
            }

            this.connectedTimes++
            this.onConnected()

            if (fnConnOky) {
                fnConnOky(params)
                fnConnOky = undefined
            }
        },(errcode) => {
            console.log("LogTag.Socket",`${this.name} socket on disconnected error:${errcode}`)

            // if (this.name == 'room') {
            //     eventcenter.emit(GameEvent.RoomDisconnected,errcode)
            // } else if (this.name == 'game') {
            //     eventcenter.emit(GameEvent.GameDisconnected,errcode)
            // }

            if (fnSockErr) {
                fnSockErr(errcode)
                fnSockErr = undefined
            }

            this.stopConnectTimer()
            // eventcenter.emit(GameEvent.SocketDisconnected,this,this.name)
        },bAutoConnect)
    }

    reconnect(fnConnOky?: Function, fnSockErr?: Function) {
        let socket = this.websocket

        if (!socket) {
            return
        }

        console.log("LogTag.Socket",`make reconnect ${this.name} ${socket.getHostUrl()}`)
        this.startConnectTimer(fnSockErr)
        socket.reconnect((params) => {
            console.log("LogTag.Socket",`${this.name} socket on reconnected ok`);
            // eventcenter.emit(GameEvent.SocketConnected,this,this.name)

            if (this.isProxySupported()) {
                // this.sendServerInfoToProxy()
            }

            this.connectedTimes++
            this.onConnected()

            if (fnConnOky) {
                fnConnOky(params)
            }
        }, (errcode) => {
            console.log("LogTag.Socket",`${this.name} socket on reconnected error:${errcode}`);

            if (fnSockErr) {
                fnSockErr(errcode)
            }

            this.stopConnectTimer()
        });
    }

    protected onConnected() {
        this.stopConnectTimer()
    }

    setConnectCallback(fnConnOky?: Function, fnSockErr?: Function) {
        let socket = this.websocket

        if (!socket) {
            return
        }

        socket.setConnectCallback(fnConnOky,fnSockErr)
    }

    /**
     * @ignore
     */
    openPulse(requestId: number, interval: number, body: ArrayBuffer | null = null, bEcho: boolean | undefined = undefined, cbhandler: any = null) {
        let socket = this.websocket

        if (!socket) {
            return
        }
        
        socket.openPulse(requestId,interval, body, bEcho, cbhandler)
    }

    close() {
        if (this.connectTimer) {
            if (this.connectTimeoutCallback) {
                this.connectTimeoutCallback(-1)
            }
        }

        this.closeSocket()

        if (this.websocket) {
            this.websocket.removeHandlers()
        }

        // if (this.mcsocket) {
        //     this.mcsocket.removeHandlers()
        // }
    }

    closeSocket() {
        if (this.websocket) {
            this.websocket.close()
        }

        // if (this.mcsocket) {
        //     this.mcsocket.close()
        // }

        this.stopConnectTimer()
    }

    /**
     * 关闭当前所有的socket连接
     */
    static closeAll() {
        for (let k in this._socketNameDic) {
            console.log("LogTag.Socket","socket closeAll",k)

            let s = this._socketNameDic[k]
            s.close()
        }
    }

    static disconnectAll() {
        for (let k in this._socketNameDic) {
            let s = this._socketNameDic[k]
            console.log("LogTag.Socket","socket closeAllWithNotify",k)

            let callback = s.getDisconnectCallback()

            if (callback) {
                callback()
            }

            s.closeSocket()
        }
    }

    /**
     * 往服务器发送一个请求。发送请求流程可以自定义发送时的数据，通过getRequestPipeline 可以插入自己的处理流程，并在内部填充需要的数据
     * @param requestId 
     * @param encodeType 
     * @param encodeData 
     * @param cbHandler 
     */
    sendRequest(requestId: number, encodeType : string,encodeData : Record<string,any>, cbHandler: (respondID : number, data : BinaryStream) => void)
    sendRequest(requestId: number, encodeType : string[],encodeData : Record<string,any>[], cbHandler: (respondID : number, data : BinaryStream) => void)
    /**
     * 往服务器发送一个请求。数据无法定制
     * @param requestId 
     * @param body 
     * @param cbHandler 
     */
    sendRequest(requestId: number, body: ArrayBuffer, cbHandler: (respondID : number, data : BinaryStream) => void)
    sendRequest(requestId: number, bodyOrEncodeType: ArrayBuffer | string | string[], cbHandlerOrEncodeData: ((respondID : number, data : BinaryStream) => void) | Record<string,any> | Record<string,any>[],_callback? : (respondID : number, data : BinaryStream) => void) {
        let socket = this.websocket

        if (!socket) {
            return
        }

        let body : ArrayBuffer | null = null
        let encodeType : string | string[]
        let encodeData : any | any[]
        let callback : any

        if (bodyOrEncodeType instanceof ArrayBuffer) {
            body = bodyOrEncodeType
            callback = cbHandlerOrEncodeData
        } else {
            encodeType = bodyOrEncodeType
            encodeData = cbHandlerOrEncodeData
            callback   = _callback

            let task = Task.create({
                input : encodeData,
                options: {
                    requestId : requestId,
                    encodeType : encodeType
                }
            })

            this._requestSendPipe.sync(task)

            if (task.isFinish) {
                body = task.output
            }
        }

        if (body == null) {
            return
        }

        socket.sendRequest(requestId, body, (responseID, data) => {
            const stream = new BinaryStream(data)
            stream.InitVarints(data ? data.byteLength : 0)
            
            let task = Task.create({
                input : stream,
                options: {
                    requestId : requestId,
                    responseID : responseID,
                    callback : callback,
                }
            })

            this._requestRecvPipe.sync(task)
        })
    }

    /**
     * 发送1个通知给服务器，不像request会有对应的回调函数，流程也无法自定义。
     * @param requestId 
     * @param body 
     * @returns 
     */
    sendNotify(requestId: number, body: ArrayBuffer) {
        let socket = this.websocket

        if (!socket) {
            return
        }

        socket.sendNotify(requestId,body)
    }

    /**
     * 设置消息的处理函数，和AddHandler不同的是，SetHandler会清空之前注册的所有处理函数，并且后续无法
     * 通过AddHandler来添加额外的处理消息处理函数
     * @param respondID 
     * @param callback 
     * @param clearAll 是否清除之前的注册函数，默认为false,和addHandler效果一致
     * @returns 
     */
    setHandler(respondID: number, callback: Function,clearAll? : boolean) {
        let socket = this.websocket

        if (!socket) {
            return null
        }

        if (clearAll) {
            //return socket.setHandler(respondID,callback)
            return socket.setHandler(respondID, (data) => {
                this.execNtfyPipelineTask(respondID, data, callback)
            })
        } else {
            return this.addHandler(respondID,callback)
        }
    }

    /**
     * 添加消息处理函数，同一个respondID可以拥有多个响应函数
     * @param respondID 
     * @param callback 
     * @returns 
     */
    addHandler(respondID: number, callback: Function) {
        let socket = this.websocket

        if (!socket) {
            return null
        }

        //return socket.addHandler(respondID,callback)
        return socket.addHandler(respondID, (data) => {
            this.execNtfyPipelineTask(respondID, data, callback)
        })
    }

    /**
     * 
     * @param respondID 
     * @returns 
     * @deprecated 次接口已经废弃，实现等同于removeHandler
     */
    delHandler(respondID: number) {
        let socket = this.websocket

        if (!socket) {
            return
        }

		socket.removeHandler(respondID)
	}

    addFilterNotifyIDs(msgIDs: number[]) {
        let socket = this.websocket

        if (!socket) {
            return
        }

        socket.addFilterNotifyIDs(msgIDs)
    }

    addHandlerOnce(requestId: number, cbHandler: any) {
		this.addHandler(requestId, (...params)=>{
			cbHandler(...params);
			this.removeHandler(requestId,cbHandler);
		});
	}

	removeHandler(respondID: number,callback?) {
        let socket = this.websocket

        if (!socket) {
            return
        }

        socket.removeHandler(respondID,callback)
    }

    /**
     * 内部使用
     * 移除当前插件内的一个注册消息
     * @param respondID 
     * @param tag 
     * @returns 
     * @internal
     */
    removeHandlerByTag(respondID: number,tag : number) {
        let socket = this.websocket
        if (!socket) {
            return
        }

        socket.removeHandlerByTag(respondID,tag)
    }

    /**
     * 内部使用
     * 移除当前插件的所有注册消息
     * @param tag 
     * @returns 
     */
    removeHandlersByTag(tag : number) {
        let socket = this.websocket
        if (!socket) {
            return
        }

        socket.removeHandlersByTag(tag)
    }

    isConnected() {
        if (this.websocket) {
            return this.websocket.isConnected
        }

        // if (this.mcsocket) {
        //     return this.mcsocket.isConnected
        // }
        
        return false
    }

    getLastActiveTime() {
		let socket = this.websocket

        if (!socket) {
            return 0
        }

        return socket.getLastActiveTime()
	}

    /**
     * 获取发送管线
     * @returns 
     */
    getRequestSendPipeline() {
        return this._requestSendPipe
    }

    /**
     * 获取接收管线
     * @returns 
     */
    getRequestRecvPipeline() {
        return this._requestRecvPipe
    }

    /**
     * 获取通知管线
     * @returns 
     */
    getRequestNtfyPipeline() {
        return this._requestNtfyPipe
    }

    getDisconnectCallback() {
        let socket = this.websocket

        if (!socket) {
            return
        }

        return socket.getDisconnectCallback()
    }

    getNotifyHandlers() {
		let socket = this.websocket

        if (!socket) {
            return null
        }
        
        return socket.getNotifyHandlers()
	}

	setNotifyHandlers(list) {
        if (!list) {
            return
        }

		let socket = this.websocket
        if (!socket) {
            return
        }

        socket.setNotifyHandlers(list)
	}

    /**
	 * 模拟通知消息
	 * @param ReqID 
	 * @param body 
	 */
	public simulateMessage(ReqID : number,body: ArrayBuffer) {
		let socket = this.websocket

        if (!socket) {
            return
        }

        return socket.simulateMessage(ReqID,body)
	}

    private requestRecvPreprocess(task: Task) {
        let responseID = task.options!.responseID

        if (responseID === ERROR_INFOMATION){
            // const tipString = deserialize(task.input, "TCHAR[" + task.input.length + "]");
            // showToast(tipString,3)
        }

        task.output = task.input
    }

    private requestRecvHandler(task : Task) {
        let responseID = task.options!.responseID
        let callback = task.options!.callback
        
        try {
            callback(responseID, task.input)
        } catch(err) {
            console.log("LogTag.Socket",err)
            return true
        }

        task.output = task.input
    }

    private requestSendProcess(task : Task) {
        let encodeType = task.options!.encodeType

        if (isArray(encodeType)) {
            // 目前只支持Serializer序列化
            let bs = new BinaryStream()

            for (let i = 0; i < encodeType.length; i++) {
                Serializer.Serialize(task.input[i], encodeType[i], bs)
            }
            
            task.output = bs.GetBuffer()
        } else {
            if (Serializer.GetTypeDescribe(encodeType)) {
                let bs = new BinaryStream()
                Serializer.Serialize(task.input, encodeType, bs)
                task.output = bs.GetBuffer()
            } else {
                task.output = Protobuf.Serialize(task.input,encodeType)
            }
        }
    }

    private execNtfyPipelineTask(notifyID: number, data: ArrayBuffer, callback: Function) {
        // const stream = new BinaryStream(data)
        // stream.InitVarints(data ? data.byteLength : 0)
        
        let task = Task.create({
            input : data,
            options: {
                notifyID : notifyID,
                callback : callback,
            }
        })

        this._requestNtfyPipe.sync(task)
    }

    private requestNtfyHandler(task : Task) {
        let notifyID = task.options!.notifyID
        let callback = task.options!.callback

        try {
            callback(task.input)
        } catch(err) {
            console.log("LogTag.Socket",err)
            return true
        }

        task.output = task.input
    }

    private startConnectTimer(errorCallback) {
        if (this.connectTimer) {
            clearTimeout(this.connectTimer)
        }

        this.connectTimeoutCallback = errorCallback
        this.connectTimer = setTimeout(() => {
            this.connectTimer = undefined

            if (this.connectTimeoutCallback) {
                this.connectTimeoutCallback(-1)
                this.connectTimeoutCallback = undefined
            }
        },20000)
    }

    private stopConnectTimer() {
        if (this.connectTimer) {
            clearTimeout(this.connectTimer)
            this.connectTimer = undefined
            this.connectTimeoutCallback = undefined
        }
    }
}