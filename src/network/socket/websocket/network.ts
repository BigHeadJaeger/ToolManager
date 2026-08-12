// import { js, _RF } from 'cc-exports';
import { BinaryStream, Serializer } from '@/libs/serialize';
import pako from '../../../libs/zlib/pako.min.js'
import { BaseNetwork } from '../basenetwork';
import { aesjs, CRC32 } from '@/libs/crypt';
import { SocketErrType } from '@/define/define';


// 所有消息都有的的头部结构体
Serializer.Declare("MSG_HEADER", [
	{ name: "MsgType", type: "int" },
	{ name: "ReqID", type: "int" },
	{ name: "SesID", type: "int" },
	{ name: "Echo", type: "BOOL" },
])

export namespace TCNet {

	export const PACK_HEAD_SIZE = 14; // 协议包头大小

	export const PROT_HEAD_SIZE = 16; // 消息包头大小

	export const PACK_HEAD_VER = 3; // 协议包头版本号

	export const RESP_WAIT_TIME = 10000; // 默认等待回应的消息的超时时间

	export const EN_LITTLE_ENDIAN = true; //使用小端字节序

	// 包标记
	export enum EPackFlag {
		Crypt = 1 << 0,
		Compress = 1 << 1,
	}
}

/** AES 解密后可能带填充；尝试剥离后再 inflate */
function inflateAfterCrypt(data: Uint8Array, wasCrypt: boolean): Uint8Array {
	const attempts: Uint8Array[] = [data]
	if (wasCrypt && data.byteLength > 0) {
		try {
			attempts.push(aesjs.padding.pkcs7.strip(data))
		} catch {
			/* ignore */
		}
		// 服务端填充不一定是标准 PKCS7；尝试去掉 1..16 字节尾部
		const maxTrim = Math.min(16, data.byteLength - 2)
		for (let n = 1; n <= maxTrim; n++) {
			attempts.push(data.subarray(0, data.byteLength - n))
		}
	}
	let lastErr: any = new Error('inflate failed')
	for (const buf of attempts) {
		try {
			const out = pako.inflate(buf)
			if (out && out.byteLength >= 0) {
				return out
			}
		} catch (e) {
			lastErr = e
		}
	}
	throw lastErr
}

export class TCNetMod {

	// 自增因子
	public static SessionIncr = 0;

	/**
	 * 
	 * @param tmpl 结构对应名称
	 * @param obj  编码后的二进制数据[失败返回null]
	 */
	public static EnStruct(tmpl: any, obj: any): ArrayBuffer | null {
		const stream = new BinaryStream()
		if (!Serializer.Serialize(obj, tmpl, stream)) return null
		return stream.GetBuffer()
	}

	/**
	 * 
	 * @param tmpl 结构对应名称[非变长时使用,否则使用BinaryStream]
	 * @param buf  结构的二进制数据
	 */
	public static DeStruct(tmpl: string, buf: ArrayBuffer): any {
		return Serializer.Deserialize(new BinaryStream(buf), tmpl)
	}


	/**
	* 构造消息对象
	*/
	public static MakeRequest(requestId: number, needEcho: boolean, body: ArrayBuffer | null): [ArrayBuffer | null, number] {

		// 序列化reqHead
		// 序列化data
		// 再合并数据
		const head = {}
		// {"ReqID":0,"Echo":0,"SesID":0,"MsgType":0}

		// 1 RequestID
		head["ReqID"] = requestId

		// 2 NeedEcho
		head["Echo"] = needEcho ? 1 : 0

		// 3 SessionID
		head["SesID"] = TCNetMod.MakeSessionId()

		// 4 MsgType [request or response]
		head["MsgType"] = 0

		const stream = new BinaryStream(null)
		if (!Serializer.Serialize(head, "MSG_HEADER", stream)) return [null, 0]

		// 5 Body
		if (body != null) {
			const dv = new Uint8Array(body)
			for (let i = 0; i < body.byteLength; i++) {
				stream.WriteUInt8(dv[i])
			}
		}

		return [stream.GetBuffer(), head["SesID"]]
	}

	/**
	 * 构造等待回应
	 */
	public static MakeRespUnit(reqId: number, sesId: number, dataBuf: ArrayBuffer, cbHandler: any, sendTime:number): any {
		const resp = { ReqID: reqId, SesID: sesId, DataBuf: dataBuf, Handler: cbHandler, Timerid: 0, SendTime: sendTime}
		return resp
	}

	/**
	 * 保存暂时不会发送的请求
	 */
	public static MakeCacheReqUnit(reqId: number, dataBuf: ArrayBuffer | null, bEcho: boolean | undefined = undefined, cbHandler: any = null) {
		return { ReqID: reqId, DataBuf: dataBuf, Echo: bEcho,  Handler: cbHandler}
	}

	/**
	 * 生成SessionId
	 */
	public static MakeSessionId() { return ++TCNetMod.SessionIncr }

	/**
	 * 合并字节数组并返回新字节数组
	 */
	public static MergeArrayBuff(first: Uint8Array, ...rest: Uint8Array[]): Uint8Array {

		let totalBytes = first.byteLength, offset = 0

		for (let i = 0; i < rest.length; i++) {
			totalBytes += rest[i].byteLength
		}
		const retbuff = new Uint8Array(totalBytes)
		retbuff.set(first, offset); offset += first.byteLength
		for (let x = 0; x < rest.length; offset += rest[x].byteLength, x++) {
			retbuff.set(rest[x], offset)
		}
		return retbuff
	}
}

export class TCConnect extends BaseNetwork{

	private ws: WebSocket | null = null;

	private enSSL = false;

	private enCrypto = false;

	private enCompress = false;

	private hostUrl = "";

	private tagName = "NET_";

	private params: any = null;

	private connected = false;

	private pulseTimerId : number | undefined;
	private respQueue: Array<any> = [];

	private aesKey: Array<number> = [6, 14, 1, 7, 16, 8, 3, 2, 13, 2, 19, 15, 11, 4, 5, 10];

	private aesCtr: any = null;

	private fnConnOky: Function | null = null;

	private fnSockErr: Function | null = null;

	private bAutoConnect = false;

	private offlineMsgQue: Array<any> = [];	//自动重连的情况下，离线发送的消息会被缓存在该队列中，链接成周发送
	private pulseRequestId = -1

	private lastActiveTime = 0
	private isParallel = false

	/**
	 * 
	 * @param tagname 命个名，打日志的时候使用的前缀
	 * @param ssl 启用ssl
	 * @param crypt 启用crypto
	 * @param compres 启用compres
	 * @param params 业务层自定义数据
	 */
	public constructor(tagname: string, ssl: boolean, crypt: boolean, compres: boolean,isParallel,params: any = null) {
		super()

		this.enSSL = ssl;
		this.enCrypto = crypt;
		this.enCompress = compres;
		this.tagName = tagname;
		this.isParallel = isParallel
		this.params = params;
		this.aesCtr = new aesjs.ModeOfOperation.ecb(this.aesKey);
	}

	/**
	 * 
	 * @param host 目标主机
	 * @param port 目标端口
	 * @param fnConnOky 连接成功时的回调
	 * @param fnSockErr 连接错误时的回调
	 * @param bAutoConnect 是否在发送消息的时候自动重连，并且在重连成功之后自动发送
	 */
	public connect(host: string, port: number, fnConnOky: any, fnSockErr: any, bAutoConnect = false) {
		this.hostUrl = (this.enSSL ? "wss://" : "ws://") + host + ":" + port;
		this.fnConnOky = fnConnOky;
		this.fnSockErr = fnSockErr;
		this.bAutoConnect = bAutoConnect;

		if (this.ws != null) {
			fnSockErr(SocketErrType.InitNull)
			return
		}

		this.initSocket();
	}

	public isNeedAutoConnect() {
		return this.bAutoConnect
	}

	/**
	 * 发送通知
	 * @param requestId 请求协议号
	 * @param body 二进制消息体
	 */
	public sendNotify(requestId: number, body: ArrayBuffer) {
		this.sendMessage(requestId, body, false)
	}

	/**
	 * 发送请求
	 * @param requestId 请求协议号
	 * @param body 二进制消息体
	 * @param cbHandler 请求回调(reqId:number,body:ArrayBuffer)
	 */
	public sendRequest(requestId: number, body: ArrayBuffer, cbHandler: any) {
		this.sendMessage(requestId, body, true, cbHandler)
	}

	/**
	 * 发送消息[final]
	 * @param requestId 消息协议号
	 * @param body 二进制消息体
	 * @param bEcho 是否等待回应
	 * @param cbhandler 等待回应时的回调函数(reqId:number,body:ArrayBuffer)
	 */
	public sendMessage(requestId: number, body: ArrayBuffer | null, bEcho: boolean | undefined = undefined, cbhandler: any = null) {
		if (!this.isConnected) {
			if (this.bAutoConnect) {
				console.log("LogTag.Socket",`[${this.tagPrefix()}] sendMessage :${requestId}, require autoConnect`);

				if (requestId != this.pulseRequestId) {
					this.offlineMsgQue.push(TCNetMod.MakeCacheReqUnit(requestId, body, bEcho, cbhandler));
				}
				
				if (!this.ws) this.initSocket();
			} else {
				cbhandler && cbhandler(-1,null);
				console.log("LogTag.Socket",`[${this.tagPrefix()}] sendMessage :${requestId} while not connect`);
			}
			return;
		}

		if (bEcho == undefined) bEcho = false;

		const [databuf, sesId] = TCNetMod.MakeRequest(requestId, bEcho, body)
		if (databuf == null)
			console.log("LogTag.Socket",`[${this.tagPrefix()}] sendMessage databuf = null`);
			
		if (bEcho) {
			const timestamp =new Date().getTime();

			let respUnit = TCNetMod.MakeRespUnit(requestId, sesId, databuf!, cbhandler, timestamp)
			this.respQueue.push(respUnit)

			if (this.respQueue.length == 1 || this.isParallel) {
				this.sendRequestQue(this.isParallel ? respUnit : null)
			}
		} else {
			this.sendStruct(new Uint8Array(databuf!))
		}
	}

	/**
	 * 关闭Client
	 */
	public close() {
		console.log("LogTag.Socket",`[${this.tagPrefix()}] close self`)

		this.bAutoConnect = false
		this.fnConnOky = null
		this.fnSockErr = null

		if (this.pulseTimerId) {
			clearInterval(this.pulseTimerId);
			this.pulseTimerId = undefined;
		}

		if (this.ws == null) return
		this.clearSocketData();
	}

	/**
	 * 
	 * @param requestId 心跳协议号
	 * @param interval 心跳发送间隔ms
	 * @param tmpl  心跳结构模板名[可选]
	 * @param stObj 心跳结构数据[可选]
	 * @param bEcho 是否等待回应[可选]
	 * @param cbhandler 等待回应回调[可选]
	 */
	public openPulse(requestId: number, interval: number, body: ArrayBuffer | null = null, bEcho: boolean | undefined = undefined, cbhandler: any = null) {
		if (this.ws == null) return

		if (bEcho == undefined) bEcho = false;

		this.pulseRequestId = requestId

		if (this.pulseTimerId) {
			clearInterval(this.pulseTimerId);
			this.pulseTimerId = undefined;
		}
		this.pulseTimerId = setInterval(() => {
			this.sendMessage(requestId, body, bEcho, cbhandler)
		}, interval);
		this.sendMessage(requestId, body, bEcho, cbhandler)
	}

	/**
	 * tagPrefix
	 */
	public tagPrefix() {
		const data = new Date()
		return "NET_" + this.tagName + "_" + data.toLocaleTimeString()
	}

	public getDisconnectCallback() {
        return this.fnSockErr
    }
	
	/**
	 * 
	 */
	private handleResponse(reqId: number, head: any, body: ArrayBuffer | null) {
		if (this.respQueue.length == 0) {
			console.log("LogTag.Socket",`[${this.tagPrefix()}] onResponseMessage but respQueue.length = 0,ReqID:${reqId}`);
			return
		}

		const resp = this.respQueue.find((x) => x.SesID == head.SesID)

		if (!resp) {
			console.log("LogTag.Socket",`[${this.tagPrefix()}] onResponseMessage unknow ReqID sid mismatch:${reqId}`);
			return
		}

		const timeCost =new Date().getTime() - resp.SendTime
		if (timeCost > 100) {
			console.log("LogTag.Socket",`*****get response cost time:${timeCost}, ReqID:${resp.ReqID}`);
		}

		let index = this.respQueue.indexOf(resp)
		this.respQueue.splice(index,1)
		clearTimeout(resp.Timerid)

		if (body == null) {
			console.log("LogTag.Socket",`[${this.tagPrefix()}] onResponseMessage ReqID:${resp.ReqID} RespondID:[${reqId}] body = null`);
		}
		if (body && body.byteLength == 0) {
			console.log("LogTag.Socket",`[${this.tagPrefix()}] onResponseMessage ReqID:${resp.ReqID} RespondID:[${reqId}] body.byteLength = 0`);
		}

		if (this.respQueue.length > 0 && !this.isParallel) {
			this.sendRequestQue()
		}

		if (resp.Handler != undefined) resp.Handler(reqId, body)
	}
	/**
	 * 逐个发送等待回应的消息
	 */
	private sendRequestQue(resp?) {
		if (!resp) {
			resp = this.respQueue[0]
		}

		resp.Timerid = setTimeout(() => {
			console.log("LogTag.Socket",`[${this.tagPrefix()}] sendRequest[${resp.ReqID}] timeout.`);
			this.handleResponse(-1, {
				SesID : resp.SesID,
			}, null)
		}, TCNet.RESP_WAIT_TIME)

		this.sendStruct(new Uint8Array(resp.DataBuf))
	}
	
	private sendStruct(sentData: Uint8Array) {
		if (!this.ws) {
			return
		}

		// for Flags
		let hFlag = 0, offset = 0
		if (this.enCrypto) hFlag = (hFlag | TCNet.EPackFlag.Crypt)
		if (this.enCompress) hFlag = (hFlag | TCNet.EPackFlag.Compress)

		// for PackHead
		const headBuff = new ArrayBuffer(TCNet.PACK_HEAD_SIZE);
		const headView = new DataView(headBuff);
		headView.setUint16(offset, TCNet.PACK_HEAD_VER, TCNet.EN_LITTLE_ENDIAN ); offset += 2;
		headView.setUint32(offset, 0, TCNet.EN_LITTLE_ENDIAN); offset += 4;
		headView.setUint32(offset, sentData.byteLength, TCNet.EN_LITTLE_ENDIAN); offset += 4;
		headView.setUint32(offset, hFlag, TCNet.EN_LITTLE_ENDIAN)

		// for Compress
		if (this.enCompress) {
			sentData = pako.deflate(sentData);
		}

		// for Crypt
		if (this.enCrypto) {// 补0
			const sentDataEx = new Uint8Array(sentData.byteLength + (16 - (sentData.byteLength % 16)))
			sentDataEx.set(sentData)
			sentData = this.aesCtr.encrypt(sentDataEx);
		}

		sentData = TCNetMod.MergeArrayBuff(new Uint8Array(headBuff), sentData)
		const dataView = new DataView(sentData.buffer, sentData.byteOffset, sentData.byteLength);

		dataView.setUint32(2, CRC32.buf(sentData), TCNet.EN_LITTLE_ENDIAN);
		// 发 Uint8Array 本体，避免 Node 下 .buffer 带额外 offset/长度
		this.ws.send(sentData)
	}
	/**
	 * 清除套接字数据
	 */
	private clearSocketData() {
		console.log("clearSocketData",this.tagName)

		if (this.ws) {
			this.ws.onopen = () => {}
			this.ws.onmessage = () => {}
			this.ws.onerror = () => {}
			this.ws.onclose = () => {}
			this.ws.close();
		}
		
		this.ws = null;

		this.connected = false;

		for (let i = 0; i < this.respQueue.length; i++) {
			clearTimeout(this.respQueue[i].timerid)

			this.respQueue[i].Handler && this.respQueue[i].Handler(-1, undefined)
		}
		this.respQueue = []
	}
	/**
	 * 初始化套接字
	 */
	private initSocket() {
		this.ws = new WebSocket(this.hostUrl)
		
		this.ws.binaryType = 'arraybuffer';

		this.ws.onopen = (event: Event) => {
			if (!this.ws) {
				return
			}

			this.connected = true
			this.lastActiveTime = new Date().getTime()
			this.ws.binaryType = 'arraybuffer';
			console.log("LogTag.Socket",`${this.tagPrefix()} connect ${this.hostUrl} ok.`);

			if (this.fnConnOky) {
				this.fnConnOky(this.params)
			}
			
			if (this.bAutoConnect && this.offlineMsgQue.length > 0) { //自动重连的套接字链接成功后自动发送所有离线期间发送的请求
				while (this.offlineMsgQue.length > 0) {
					const message = this.offlineMsgQue.shift();
					this.sendMessage(message.ReqID, message.DataBuf, message.Echo, message.Handler);
				}
			}
		}

		this.ws.onmessage = (event: MessageEvent) => {
			this.lastActiveTime = new Date().getTime()
			// 统一成独立 ArrayBuffer（兼容浏览器 ArrayBuffer / Node Buffer / TypedArray）
			const raw = event.data
			let packet: ArrayBuffer
			if (raw instanceof ArrayBuffer) {
				packet = raw
			} else if (ArrayBuffer.isView(raw)) {
				const v = raw as ArrayBufferView
				packet = v.buffer.slice(v.byteOffset, v.byteOffset + v.byteLength)
			} else {
				console.log("LogTag.Socket",`${this.tagPrefix()} onmessage unsupported data type`);
				return
			}

			if (packet.byteLength <= TCNet.PACK_HEAD_SIZE) {
				console.log("LogTag.Socket",`${this.tagPrefix()} onmessage byteLength[${packet.byteLength}] <= PACK_HEAD_SIZE`);
				return
			}

			let offset = 0, dataView = new DataView(packet);
			let hVer = dataView.getUint16(offset, TCNet.EN_LITTLE_ENDIAN ); offset += 2;
			let hCrc = dataView.getUint32(offset, TCNet.EN_LITTLE_ENDIAN ); offset += 4;
			let hLen = dataView.getUint32(offset, TCNet.EN_LITTLE_ENDIAN ); offset += 4;
			let hFag = dataView.getUint32(offset, TCNet.EN_LITTLE_ENDIAN ); offset += 4;

			let recvData = new Uint8Array(packet.slice(offset))
			if (hFag & TCNet.EPackFlag.Crypt) {
				recvData = this.aesCtr.decrypt(recvData)
			}

			if (hFag & TCNet.EPackFlag.Compress) {
				recvData = inflateAfterCrypt(recvData, !!(hFag & TCNet.EPackFlag.Crypt))
			}

			// 必须按 view 的 byteOffset/length 截取，避免 TypedArray 共享底层 buffer 错位
			const payload = recvData.buffer.slice(recvData.byteOffset, recvData.byteOffset + recvData.byteLength)
			const head = TCNetMod.DeStruct("MSG_HEADER", payload)
			const body = new Uint8Array(payload).slice(TCNet.PROT_HEAD_SIZE)
			const bodyBuf = body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength)
			
			if (head.MsgType == 1) {
				this.handleMessage(head.ReqID, bodyBuf)
			} else {
				this.handleResponse(head.ReqID, head, bodyBuf)
			}
		}

		this.ws.onerror = (event: Event) => {
			this.clearSocketData();
			console.log("LogTag.Socket",`${this.tagPrefix()} onError from[${this.hostUrl}].`);

			if (this.fnSockErr) {
				this.fnSockErr(this.connected ? SocketErrType.RunError : SocketErrType.InitError);
			}
		}

		this.ws.onclose = (event: CloseEvent) => {
			this.clearSocketData();
			console.log("LogTag.Socket",`[${this.tagPrefix()}] onClose from[${this.hostUrl}] msg:${event?.code}.`);

			if (this.fnSockErr) {
				this.fnSockErr(SocketErrType.RunError)
			}
		}
	}

	public reconnect(fnConnOky?: Function, fnSockErr?: Function) {
		if (this.isConnected) {
			console.log("LogTag.Socket",`${this.tagPrefix()} try to reconnect while isConnected`);
		} else {
			this.setConnectCallback(fnConnOky, fnSockErr);
			this.initSocket();
		}
	}

	public setConnectCallback(fnConnOky?: Function, fnSockErr?: Function) {
		if (fnConnOky)
			this.fnConnOky = fnConnOky;
		if (fnSockErr)
			this.fnSockErr = fnSockErr;
	}

	public get isConnected() {
		return this.connected;
	}

	public getLastActiveTime() {
		return this.lastActiveTime
	}

	public getHostUrl() {
		return this.hostUrl;
	}

	public testCloseSocket() {
		if (this.ws) {
			this.ws.close()
		}
	}
}