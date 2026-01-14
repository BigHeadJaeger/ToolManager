import { pbdecl } from "../decorators/protobufdecl"
import { Protobuf } from "../libs/serialize/protobuf"

export namespace PBStruct {
	@pbdecl("HallPB.ClientInfo")
	export class ClientInfo {
		gameid 		= Protobuf.Optional(Protobuf.Int32,1)
		appcode 	= Protobuf.Optional(Protobuf.String,2)
		userid 		= Protobuf.Optional(Protobuf.Int32,4)
		username 	= Protobuf.Optional(Protobuf.String,5)
		hardid 		= Protobuf.Optional(Protobuf.String,6)
		uniqueid 	= Protobuf.Optional(Protobuf.String,7)
		channelid 	= Protobuf.Optional(Protobuf.Int32,8)
		gameversion = Protobuf.Optional(Protobuf.String,9)
		groupid 	= Protobuf.Optional(Protobuf.Int32,10)
		appid 		= Protobuf.Optional(Protobuf.Int32,11)
		channelkey 	= Protobuf.Optional(Protobuf.String,12)
		templateversion = Protobuf.Optional(Protobuf.String,13)
		nickname    = Protobuf.Optional(Protobuf.String,14)
		pluginname  = Protobuf.Optional(Protobuf.String,17)
		pluginversion = Protobuf.Optional(Protobuf.String,18)

		subgameid 		= Protobuf.Optional(Protobuf.Int32,21)
		subappcode 	= Protobuf.Optional(Protobuf.String,22)
		subgameversion = Protobuf.Optional(Protobuf.String,23)
		
		sdkname = Protobuf.Optional(Protobuf.String,26)
	}

	@pbdecl("HallPB.Source")
	export class Source {
		client	= Protobuf.Optional(ClientInfo,1)
		mods	= Protobuf.Repeated(Protobuf.String,2)
	}

    @pbdecl("HallPB.ErrorInfo")
    export class ErrorInfo {
        code    = Protobuf.Optional(Protobuf.Int32,1)  // 错误ID
        errMsg  = Protobuf.Optional(Protobuf.String,2) // 错误消息
        line    = Protobuf.Optional(Protobuf.Int32,3)
    }
	
    @pbdecl("HallPB.ErrorInfoOnly")
    export class ErrorInfoOnly {
        err = Protobuf.Repeated(ErrorInfo,1)
    }
}