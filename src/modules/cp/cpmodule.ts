import httpRequestPB from '@/network/http/HttpRequestPB';
import { BinaryStream, Protobuf } from '@/libs/serialize';
import { HallPB } from '@/define/HallPBStruct';
import { HttpStatus } from '@/network/http/HttpDef';
import { pbdecl } from '@/decorators/protobufdecl';
import { PBStruct } from '@/define/pbstruct';
import { aesjs } from '@/libs/crypt';
import { CommonInfo } from '@/define/Info';
import { ClientInfo, ClientInfo_Debug, Config } from '@/config/config';
import CommonFunc from '@/utils/commonfunc';

@pbdecl("CPPB.Request")
class Request {
    id    = Protobuf.Optional(Protobuf.Int32,1)  // 消息ID
    data  = Protobuf.Optional(Protobuf.Bytes,2) // 数据
}

// 通用CP请求信息
@pbdecl("CPPB.GameClientReq")
class GameClientReq {
    src	= Protobuf.Optional(PBStruct.Source,1)
    req = Protobuf.Optional(Request, 2)
    info = Protobuf.Optional(Protobuf.String,3) //模块名
}

// 通用CP回应信息
@pbdecl("CPPB.GameClientResp")
class GameClientResp {
    errs = Protobuf.Repeated(PBStruct.ErrorInfo, 1)
    resp = Protobuf.Optional(Request, 2)
}

class CPModule {
    constructor() {
        console.log("CPModule constructor");
    }


    reset() {
        httpRequestPB.clearHost()
    }

    wait_initialize() {
        return new Promise<boolean>((resolve, reject) => {
            this.initialize((res) => {
                setTimeout(() => {
                    resolve(res)
                }, 1000);
            })
        })
    }

    initialize(callback?:Function) {
        if (!httpRequestPB.isHostInfoGet()) {
            if (Config.serverMode == 2) {
                CommonInfo.setClientInfo(ClientInfo_Debug)
            } else {
                CommonInfo.setClientInfo(ClientInfo)
            }
            Protobuf.setClientInfo(CommonInfo.info)

            let url = `http://192.168.1.26/api/mod(logon)/get_server`
            let data = Protobuf.Serialize(new HallPB.GetServerReq)

            httpRequestPB.postWithUrl(url,data,(errorCode,respone)=> {
                console.log("xxxxx");
                if (errorCode == HttpStatus.OK) {
                    let serverList = Protobuf.Deserialize(respone, HallPB.GetServerResp)

                    serverList.list.forEach((server) => {
                        httpRequestPB.setHostInfo(server.name,server.host,server.port)
                    })
                    callback?.(true)
                } else {
                    callback?.(false)
                }
            })
        }
    }

    reqCP(reqname: string, params: Record<string, any>, callback?:Function, modname?:string) {
        let reqParams = {
            req: reqname
        }

        for (const key in params) {
            reqParams[key] = params[key]
        }

        this.client_request(modname, (res) => {
            if (!CommonFunc.isEmptyObject(res?.data)) {
                callback?.(true, res?.data);
            } else {
                callback?.(false);
            }
        }, reqParams)
    }

    getCPServerHttpBase(): string {
        return "http://192.168.1.26"
    }

    client_request(szModuleName:string, callback: any, extendParam:any, nMsgID:number = 0) {
        let sendData = new GameClientReq
        
        sendData.req = {id:nMsgID, data: new BinaryStream(aesjs.utils.utf8.toBytes(JSON.stringify(extendParam)).buffer)}
        sendData.info = szModuleName
        httpRequestPB.postWithUrl(this.getCPServerHttpBase() + "/api/mod(cp)/client_request", Protobuf.Serialize(sendData), (code, rspdata) => {
            if (code !== 0) {
                callback(null);
                return;
            }
            
            let tmp = Protobuf.Deserialize(rspdata, GameClientResp)
            let bs = new BinaryStream(tmp.resp.data?.GetBuffer())
            let jsonStr = Protobuf.ToString(bs,"UTF8")
            if (!jsonStr) {
                callback(null);
                return
            }
            callback({id:tmp.resp.id, data:JSON.parse(jsonStr)});
        },{
            name : szModuleName,
            req  : extendParam?.req
        })
    }
}


export default new CPModule();