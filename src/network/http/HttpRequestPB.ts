// import { ALIPAY, BUILD, HTML5, JSB, MINIGAME, NATIVE } from "internal:constants";
import { DefaultHttpTimeout, HttpStatus, ServerHostInfo } from "./HttpDef";
// import businessutils from "../../../mcagent/businessutils";
// import { deserializepb } from "../utils/functions";
// import { Config } from "../../../config";
// import dataCenter from "../../../core/data/datacenter";
// import { ServerMode } from "../../../core/define";
// import userCache from "../../cache/file/usercache";

import { aesjs } from "../../libs/crypt";
import {Base64} from "../../libs/base64";
import { Protobuf } from "@/libs/serialize";
import { ServerMode } from "@/define/define";
import { CommonInfo} from "@/define/Info";
import { Config } from "@/config/config";


let modulePatt = /\((.+?)\)/g;
let hostPatt = /http:\/\/(.+?)\//g;



// 本机登录服务器地址
const localLogonAddress = ""

// 活动服地址
const debugLogonAddress   = "http://192.168.1.125:65505"
const previewLogonAddress = "http://47.114.124.159:65505"
const formalLogonAddress = "https://modsvr3.youxi8848.com:65505"

declare type Constructor<T = unknown> = new (...args: any[]) => T;

export function deserializepb(buf: ArrayBuffer | null, type: string) : any 
export function deserializepb<T>(buf: ArrayBuffer | null, ctor: Constructor<T>) : T
export function deserializepb<T>(buf: ArrayBuffer | null, typeOrCtor: string | Constructor<T>) : any {
    typeOrCtor = typeof (typeOrCtor) == 'string' ? typeOrCtor : <string>typeOrCtor['__pbname'];
    return Protobuf.Deserialize(buf, typeOrCtor)
}

export class HttpRequestPB {
    static requestSeqId = 0

    hosts : Record<string,ServerHostInfo> = {}

    setHostInfo(name:any,host:any,port:any) {
        this.hosts[name] = {
            host : host,
            port : port + 1      //httpport = tcpport + 1
        }
    }

    getHostInfo(name:any) {
        return this.hosts[name]
    }

    isHostInfoGet() {
        let hostcount = Object.keys(this.hosts).length
        if (hostcount > 0) {
            return true
        }

        return false
    }

    clearHost() {
        this.hosts = {}
    }

    getModule(url : string) {
        if (modulePatt.test(url)) {
            let module = url.match(modulePatt)![0].slice(1,-1)
            return module
        }

        return ""
    }

    public postWithUrl(url : string,data:any, callback:any,options ?: {name : string, req? : string}) {
        // 如果是在调试环境下，默认使用125地址
        if (Config.serverMode == ServerMode.Test) {
            url = url.replace("192.168.1.26", "192.168.1.125")
            Config.encrypted = 0
        } else {
            Config.encrypted = 1
        }

        let startTime = new Date().getTime()

        var tcallback = (errorID : number,data? : any) => {
            try {
                if (errorID == HttpStatus.OK) {
                    let costTime = new Date().getTime() - startTime

                    if (costTime >= 3000) {
                        console.log("LogTag.Socket",`postWithUrl ${url} cost time ${costTime}`)
                    }
                }

                callback && callback(errorID,data)
                callback = null
            } catch(err) {
                // showSomethingBad(err)
            }
        }

        let module = this.getModule(url)
        if (module) {
            if (module == "logon") {
                let host = url.match(hostPatt)
    
                if (host) {
                    url = url.replace(host[0],this.getLoginSvr() + '/')
                }
            } else {
                let hostInfo = this.hosts[module]

                if (!hostInfo) {
                    if (Config.serverMode != ServerMode.Test) {
                        console.log("LogTag.Socket",`HttpRequestPB failed module:${module} not found`)
                        tcallback && tcallback(-1)
                        return
                    }
                } else {
                    let host = url.match(hostPatt)
    
                    if (host) {
                        let useHttps = false

                        // if (MINIGAME || (HTML5 && BUILD)) {
                        // if (true) {
                        //     if (Config.serverMode == ServerMode.Formal) {
                        //         useHttps = true
                        //     }
                        // }

                        if (useHttps) {
                            url = url.replace(host[0],`https://${hostInfo.host}:${hostInfo.port}/`)
                        } else {
                            url = url.replace(host[0],`http://${hostInfo.host}:${hostInfo.port}/`)
                        }
                    }
                }

                // 特殊处理下panel服务区userId为0的情况
                // if (module == "panel") {
                //     let v = deserializepb(data,"HallPB.ReqPanelInfo")

                //     if (v && v.userId == 0) {
                //         if (tcallback) {
                //             setTimeout(() => {
                //                 tcallback(HttpStatus.ERROR);    
                //             },0);
                //         }

                //         return
                //     }
                // }
            }
        }

        let sid = HttpRequestPB.requestSeqId++
        if (options) {
            console.log("LogTag.Socket",`postpb name:${options.name} ${url}${options.req ? "/" + options.req : ""} sid:${sid}`)
        } else {
            console.log("LogTag.Socket",`postpb ${url} sid:${sid}`)
        }
        
        var xhr = new XMLHttpRequest();
        xhr.responseType = "arraybuffer"

        let encryptKeyArr:any
        let decryptKeyArr:any

        xhr.onreadystatechange = function () {
            if (xhr.readyState == (XMLHttpRequest.DONE || 4)) {
                try {
                    if (Config.serverMode == ServerMode.Test) {
                        console.log("LogTag.Socket",`postWithUrl ${url} response sid:${sid} status ${xhr.status}`)
                    }
    
                    if (xhr.status >= 200 && xhr.status < 300) {
                        var response = xhr.response
    
                        if (decryptKeyArr && xhr.getResponseHeader("Encrypted")) {
                            let aes = new aesjs.ModeOfOperation.cbc(decryptKeyArr,decryptKeyArr)
                            response = aes.decrypt(new Uint8Array(response))
    
                            if (response) {
                                response = aesjs.padding.pkcs7.strip(response).buffer
                            }
                        }
    
                        if (xhr.status != 202) {
                            if (tcallback) {
                                tcallback(HttpStatus.OK,response);
                            }
                        } else {
                            console.log("LogTag.Socket",`${url} post error ${xhr.status}`)
                            let errorInfoArr = deserializepb(response,"HallPB.ErrorInfoOnly").err
                            
                            if (errorInfoArr && errorInfoArr.length > 0) {
                                let lastErrorInfo = errorInfoArr[0]
    
                                console.log("LogTag.Socket","code:",lastErrorInfo.code)
                                console.log("LogTag.Socket","errMsg:",lastErrorInfo.errMsg)
                                console.log("LogTag.Socket","line:",lastErrorInfo.line)
                            } else {
                                console.log("LogTag.Socket",`${url} response ${response}`)
                            }
                            
                            //lv special case
                            if (tcallback) {
                                tcallback(HttpStatus.ERROR,response);
                            }
                        }
                    }
                    else {
                        console.log("LogTag.Socket",`http request failed url:${url} sid:${sid} code:${xhr.status} response:${response}`)

                        if (xhr.status == 400) {    
                            // console.log("LogTag.Socket",this.getUserUniqueId())
                            console.log("LogTag.Socket",aesjs.utils.utf8.fromBytes(encryptKeyArr))
                            console.log("LogTag.Socket",aesjs.utils.utf8.fromBytes(new Uint8Array(data)))

                            // showSomethingBad(undefined,"!!!!找lv联调下，加密出错了")
                        }

                        if (tcallback) {
                            tcallback(HttpStatus.ERROR);
                        }
                    }
                } catch(e) {
                    console.log("LogTag.Socket",`http request exception url:${url} sid:${sid}`)
                    console.log("LogTag.Socket",e)
                    // showSomethingBad(e)
                }
            }
        };
        xhr.ontimeout = function () {
            console.log("LogTag.Socket",url + " on timeout");
            if (tcallback) {
                tcallback(HttpStatus.Timeout);
            }
        }
        xhr.onerror = function (event) {
            console.log("LogTag.Socket",url + ` on error ${event}`);
            if (tcallback) {
                tcallback(HttpStatus.ERROR);
            }
        };
        xhr.open("POST", url);
        // xhr.setRequestHeader("Access-Control-Allow-Origin", "*");
        // if (NATIVE) {
        // if (false) {
        //     xhr.setRequestHeader("Accept-Encoding", "gzip");
        // }

        if (Config.encrypted) {
            let key = CommonInfo.getUserUniqueId().substring(0, 16)
                
            xhr.setRequestHeader("Encrypted", CommonInfo.getUserID().toString())
            xhr.setRequestHeader("Token", "@" + Base64.encode(CommonInfo.getUserUniqueId()))

            decryptKeyArr = aesjs.utils.utf8.toBytes(key)
            let aes = new aesjs.ModeOfOperation.cbc(decryptKeyArr,decryptKeyArr)
            data = aes.encrypt(aesjs.padding.pkcs7.pad(new Uint8Array(data))).buffer
        }

        // if (ALIPAY) {
        if (false) {
            xhr.setRequestHeader("Base64", "1")
            data = {
                base64Data : Base64.encodeArray(new Uint8Array(data))
            }
        }

        // note: In Internet Explorer, the timeout property may be set only after calling the open()
        // method and before calling the send() method.        
        xhr.timeout = DefaultHttpTimeout;// 5 seconds for timeout
        xhr.send(data);
    }

    getLoginSvr() {
        // 测试地址
        if (localLogonAddress) {
            return localLogonAddress
        }

        // 优先使用服务器返回的地址
        if (this.hosts["logon"]) {
            let info = this.hosts["logon"]
            let url = `${Config.serverMode == ServerMode.Formal ? "https" : "http"}://${info.host}:${info.port}`
            return url
        }

        // 使用缓存的地址
        // let address = this.getCacheLoginSvr() 

        // if (address) {
        //     return address
        // }

        // 使用默认地址
        return this.getDefaultLoginSvr()
    }

    getCacheLoginSvr() {
        // let address = userCache.getString(`LogonAddress_${Config.serverMode}`)
        // return address || ""
    }

    getDefaultLoginSvr() {
        switch(Config.serverMode) {
            case ServerMode.Formal:
                return formalLogonAddress
            case ServerMode.Preview:
                return previewLogonAddress
        }

        return debugLogonAddress
    }



    // getUserID() {
    //     return 244136453
    // }

    // getUserUniqueId() {
    //     return "601dfa46f9af054592603e6330d302"
    // }
}

const httpRequestPB = new HttpRequestPB();
// globalThis.httpRequestPB = httpRequestPB
export default httpRequestPB