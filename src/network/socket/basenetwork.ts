// import { GameConfig } from '../../../gameconfig';
// import apputils from '../../../mcagent/apputils';

function empty () { }

declare type AnyFunction = Function;

export class CallbackInfo {
    public callback: AnyFunction = empty;
    public tag = -1
	public exclusive = false

    public set (callback: AnyFunction) {
        this.callback = callback || empty;
    }
}

export interface INotifyPostProcess {
	onNotifyPostProcess(reqID : number,body : ArrayBuffer)
}

export class BaseNetwork {
    protected ntfHandlersArr: Record<number,CallbackInfo[]> = {};
	protected filterNotifyIDs: number[] = []
	protected listNotifyPostProcess : INotifyPostProcess[] = []
    
    public tagPrefix() {
        return ""
    }

	/**
	 * 设置消息处理函数，和AddHandler不同，通过这个添加的处理函数是独占的
	 * @param requestId 
	 * @param cbHandler 
	 */
	public setHandler(requestId: number, cbHandler: any) {
		this.ntfHandlersArr[requestId] = this.ntfHandlersArr[requestId] || []

		let info = <CallbackInfo>{
			callback : cbHandler,
			tag : -1,
			exclusive : true,
		}

		this.ntfHandlersArr[requestId] = [info]
		return info
	}

	/**
	 * 添加消息处理函数，通过AddHander可以添加多个处理函数，如果消息已经被占用了，则返回注册失败
	 * @param requestId 
	 * @param cbHandler 
	 * @returns 
	 */
    public addHandler(requestId: number, cbHandler: any) {
		this.ntfHandlersArr[requestId] = this.ntfHandlersArr[requestId] || []
		let exists = false

		for (let i = 0; i < this.ntfHandlersArr[requestId].length; i++) {
			if (this.ntfHandlersArr[requestId][i].exclusive) {
				console.log(`add handler failed ${requestId} is exclusive`)
				return null
			}

			if (this.ntfHandlersArr[requestId][i].callback == cbHandler) {
				exists = true
			}
		}

		if (!exists) {
            let info = <CallbackInfo>{
                callback : cbHandler,
                tag : -1,
				exclusive : false,
            }

			this.ntfHandlersArr[requestId].push(info)
            return info
		}
	}

	/**
	 * 移除消息绑定，如果callback没传，则移除所有requestId对应的回调
	 * @param requestId 
	 * @param callback 
	 * @returns 
	 */
	public removeHandler(requestId: number,callback?) {
		if (!this.ntfHandlersArr[requestId]) {
			return
		}

		if (callback) {
			let handlers = this.ntfHandlersArr[requestId]

			for (let i = 0; i < handlers.length; i++) {
				if (handlers[i].callback == callback) {
					handlers.splice(i,1)
					break
				}
			}
		} else {
			delete this.ntfHandlersArr[requestId]
		}
	}

	public removeHandlers() {
		this.ntfHandlersArr = {}
	}

	public getNotifyHandlers() {
		return this.ntfHandlersArr
	}

	public setNotifyHandlers(list) {
		this.ntfHandlersArr = list
	}

	public removeHandlersByTag(tag : number) {
		for (let respondID in this.ntfHandlersArr) {
			let handlers = this.ntfHandlersArr[respondID]
			for (let i = handlers.length - 1; i >= 0; i--) {
				if (handlers[i].tag == tag) {
					handlers.splice(i,1)
				}
			}
		}
	}

	public removeHandlerByTag(respondID : number, tag : number) {
		let handlers = this.ntfHandlersArr[respondID]
		if (!handlers) {
			return
		}

		for (let i = handlers.length - 1; i >= 0; i--) {
			if (handlers[i].tag == tag) {
				handlers.splice(i,1)
			}
		}
	}

	public addFilterNotifyIDs(msgIDs: number[]) {
		for (let i = 0; i < msgIDs.length; i++) {
			if (this.filterNotifyIDs.indexOf(msgIDs[i]) != -1) {
				continue
			}

			this.filterNotifyIDs.push(msgIDs[i])
		}
	}
	
	/**
	 * 模拟通知消息
	 * @param ReqID 
	 * @param body 
	 */
	public simulateMessage(ReqID : number,body: ArrayBuffer) {
		this.handleMessage(ReqID,body)
	}

	public addProstProcess(handler : INotifyPostProcess) {
		if (this.listNotifyPostProcess.indexOf(handler) == -1) {
			this.listNotifyPostProcess.push(handler)
		}
	}

	protected handleMessage(ReqID, body: ArrayBuffer) {
		if (body == null) {
			console.log("LogTag.Socket","[%s] onNotifyMessage[%d] body = null", this.tagPrefix(), ReqID);
			return
		}

		// if (this.filterNotifyIDs.includes(ReqID) && (apputils.isPaused() || GameConfig.IsRefreshing)) {
		// 	console.log("LogTag.Socket","[%s] onNotifyMessage[%d] app on background, this notify will be droped", this.tagPrefix(), ReqID);
		// 	return
		// }

		console.log("LogTag.Socket","on notify->",ReqID)

        let processFlag = false
        const handlerArr = this.ntfHandlersArr[ReqID]

        if (handlerArr) {
            for (var i = 0; i < handlerArr.length; i++) {
                processFlag = true

                try {
                    handlerArr[i].callback(body)
                } catch(err) {
                    // showSomethingBad(err)
                }
            }
        }

        if (!processFlag) {
            console.log("LogTag.Socket","[%s] onNotifyMessage[%d] but handler not registered", this.tagPrefix(), ReqID);
        }
		
		for (var i = 0; i < this.listNotifyPostProcess.length; i++) {
			this.listNotifyPostProcess[i].onNotifyPostProcess(ReqID,body)
		}
	}
}

