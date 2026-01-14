import { fromCharCodeEx } from "./stringex";
import {BinaryStream} from "./BinaryStream";
import {GB2312Util} from './GB2312Util'
// import { js } from "cc-exports";

declare type Constructor<T = unknown> = new (...args: any[]) => T;

export namespace Protobuf {
    let default_charset = "UTF8";
    let declearFlag = false
    let _penddingDeclare : any[] = []
    let _mapId = 1
    let ClientInfo : any = null

    interface RegistField {
        type     : Function | string
        number   : number
        repeated?: number
        packed?  : number
        builtinType: string
        charset? : string

        builtinMapValueType ? : string
        mapValueType? : Function
    }

    const isFunction = (val: unknown): val is Function => typeof val === 'function'
    const isString = (val: unknown): val is string => typeof val === 'string'

    export function setClientInfo(info) {
        ClientInfo = ClientInfo || {};
        Object.assign(ClientInfo, info);
    }

    export function getClientInfo() {
        return ClientInfo
    }

    /**
     * 保存序列化后的对象列表，以备后续反解需要
    */
    export const SerializeBuffMap = new WeakMap<ArrayBuffer, string>()

    export class Message {
        private static _registerFieldArr : RegistField[] = []

        private static map_messages = {};
        private static map_messages_byctor = new WeakMap();
        
	    static FindByCtor(ctor):object{
            return Message.map_messages_byctor.get(ctor);
        }

        static Find(name:string): object | null {
            return Message.map_messages[name];
        }

        static Regist<T>(name:string,ctor : Constructor<T>, _def: Array<any>):string
	    static Regist(name:string,_def:Array<any>) : string
        static Regist<T>(name:string,ctorOrDef : Constructor<T> | Array<any>, _def?: Array<any>):string {
            if (_def) {
                // 类型注册
                this.map_messages[name] = { def: _def, con: ctorOrDef};
                // 类型
                if (!name.startsWith("PB_MAP_PAIR_")) {
                    this.map_messages_byctor.set(ctorOrDef as any,{ def: _def, con: ctorOrDef,name : name})
                }
            } else {
                // 老的注册方式
                this.map_messages[name] = { def: ctorOrDef, con: null};
            }

            return name;
        }

        static AddField(field : RegistField) {
            this._registerFieldArr.push(field)
        }

        static ClearFields() {
            this._registerFieldArr = []
        }

        static SetFields(fields : RegistField[]) {
            this._registerFieldArr = fields
        }

        static GetAllFields() {
            return this._registerFieldArr
        }
    };

    class TypeDescribe{
        base_type:string;
        wire_type:number;
        style:string;
        param:any;
        con: Constructor | null;

        private static map_types = {};

        constructor(type: string,
            base_type: string,
            wire_type: number,
            style: string = "prototype",
            param: any = null,
            con: Constructor | null = null)
        {
            this.base_type = base_type;
            this.wire_type = wire_type;
            this.style = style;
            this.param = param;
            this.con = con;

            TypeDescribe.map_types[type] = this;
        }

        static Find(type:string):TypeDescribe
        {
            return TypeDescribe.map_types[type];
        }
    };

    function GetTypeDescribe(type:string):TypeDescribe | null {
        let type_desc = TypeDescribe.Find(type);

        if(null != type_desc){
            return type_desc;
        }

        let p = type.indexOf("[");
        if(-1 != p){
            let q = type.indexOf("]", p);
            if(-1 == q){
                console.error("type string \"" + type + "\" can not find ']'!");
                return null;
            }

            let base_type = type.substring(0, p) + type.substring(q + 1, type.length);
            let base_desc = GetTypeDescribe(base_type);
            if(null == base_desc){
                return null;
            }

            let packed = type.substring(p + 1, q);
            
            return new TypeDescribe(type, base_type, base_desc.wire_type, "repeated", packed);
        }

        switch(type){
            case "bool":
            case "int32":
            case "int64":
            case "uint32":
            case "uint64":
            case "sint32":
            case "sint64":
                return new TypeDescribe(type, type, 0);
            case "fixed64":
            case "sfixed64":
            case "double":
                return new TypeDescribe(type, type, 1);
            case "fixed32":
            case "sfixed32":
            case "float":
                return new TypeDescribe(type, type, 5);
            case "string":
            case "bytes":
                return new TypeDescribe(type, type, 2);
        };

        let message = Message.Find(type);
        if(null != message){
            for (let i=0; i<message["def"].length; i++) {
                let member_desc = GetTypeDescribe(message["def"][i].type);
                if(null == member_desc){
                    return null;
                }
            }

            return new TypeDescribe(type, type, 2, "message", message["def"],message["con"]);
        }

        return null;
    }

    //array to unicode
    export function ToString(bs:BinaryStream, src_charset:string) : string | null {
        let codes = new Array<number>();
        bs.SetPos(0);

        if("UTF8" == src_charset){//utf8 to unicode

            for(let i=0; i<bs.GetLength(); i++)
            {
                let c = bs.ReadUInt8();
                if(0 == c){
                    break;
                }

                let unicode = 0;
                let bytes = 0;
                if (0 <= c && c <= 0x7F) {
                    unicode = (c & 0x7F);
                    codes.push(unicode);
                    continue;
                }
                else if (0xC0 <= c && c <= 0xDF) {
                    unicode = (c & 0x1F);
                    bytes = 1;
                }
                else if (0xE0 <= c && c <= 0xEF) {
                    unicode = (c & 0x0F);
                    bytes = 2;
                }
                else if (0xF0 <= c && c <= 0xF7) {
                    unicode = (c & 0x07);
                    bytes = 3;
                }
                else if (0xF8 <= c && c <= 0xFB) {
                    unicode = (c & 0x03);
                    bytes = 4;
                }
                else if (0xFC <= c && c <= 0xFD) {
                    unicode = (c & 0x01);
                    bytes = 5;
                }
                else {
                    console.error("not legitimate utf8!");
                    return null;
                }

                for (let j = 1; j <= bytes; j++) {
                    if (i+j >= bs.GetLength()) {
                        console.error("not legitimate utf8!");
                        return null
                    }
                    c = bs.ReadUInt8();
                    if ((c >> 6) != 2) {
                        console.error("not legitimate utf8!");
                        return null
                    }
                    unicode = ((unicode << 6) | (c & 0x3F));
                }

                if (unicode <= 0xFFFF) {
                    codes.push(unicode);
                }
                else if (unicode <= 0xEFFFF) {
                    codes.push(0xD800 + (unicode >> 10) - 0x40);  // high
                    codes.push(0xDC00 + (unicode & 0x03FF));      // low
                }
                else {
                    console.error("not legitimate utf8!");
                    return null;
                }

                i += bytes;
            }

            return fromCharCodeEx(codes);
        }

        if("GB2312" == src_charset){//gb2312 to unicode

            for(let i=0; i<bs.GetLength(); i++)
            {
                let c = bs.ReadUInt8();
                if(0 == c){
                    break;
                }

                let unicode = c;
                if (c > 0x7f) {
                    i++;
                    if(i >= bs.GetLength()){
                        console.error("not legitimate gb2312!");
                        return null;
                    }

                    c = ((c << 8) + bs.ReadUInt8()); 
                    unicode = GB2312Util.GetUnicodeByGB2312(c);
                }

                codes.push(unicode);
            }
            return fromCharCodeEx(codes);
        }

        if("UNICODE" == src_charset){

            for(let i=0; i<bs.GetLength(); i+=2)
            {
                codes.push(bs.ReadUInt16());
            }
            return fromCharCodeEx(codes);
        }

        return null;
    }

    //unicode to array
    export function FromString(s:string, des_charset:string):BinaryStream | null {
        let bs = new BinaryStream();

        if("UTF8" == des_charset){//unicode to utf8

            for(let i=0; i<s.length; i++){

                let unicode = (s.charCodeAt(i) & 0xffff);

                if (unicode >= 0xD800 && unicode <= 0xDFFF)
                {
                    if (unicode >= 0xDC00) {
                        console.error("not legitimate unicode!");
                        return null;
                    }

                    i++;
                    if (!(i < s.length)) {
                        console.error("not legitimate unicode!");
                        return null;
                    }

                    let unicode2 = (s.charCodeAt(i) & 0xffff);
                    if (!(unicode2 >= 0xDC00 && unicode2 <= 0xDFFF)) {
                        console.error("not legitimate unicode!");
                        return null;
                    }
                    unicode = (unicode2 & 0x03FF) + (((unicode & 0x03FF) + 0x40) << 10);
                }

                if(unicode <= 0x0000007f) {
                    bs.WriteUInt8(unicode);
                }
                else if (unicode <= 0x000007FF) {
                    bs.WriteUInt8(unicode >> 6 | 0xC0);
                    bs.WriteUInt8(unicode & 0x3F | 0x80);
                }
                else if (unicode <= 0x0000FFFF) {
                    bs.WriteUInt8(unicode >> 12 | 0xE0);
                    bs.WriteUInt8(unicode >> 6 & 0x3F | 0x80);
                    bs.WriteUInt8(unicode & 0x3F | 0x80);
                }
                else if (unicode <= 0x001FFFFF) {
                    bs.WriteUInt8(unicode >> 18 | 0xF0);
                    bs.WriteUInt8(unicode >> 12 & 0x3F | 0x80);
                    bs.WriteUInt8(unicode >> 6 & 0x3F | 0x80);
                    bs.WriteUInt8(unicode & 0x3F | 0x80);
                }
                else if (unicode <= 0x03FFFFFF) {
                    bs.WriteUInt8(unicode >> 24 | 0xF8);
                    bs.WriteUInt8(unicode >> 18 & 0x3F | 0x80);
                    bs.WriteUInt8(unicode >> 12 & 0x3F | 0x80);
                    bs.WriteUInt8(unicode >> 6 & 0x3F | 0x80);
                    bs.WriteUInt8(unicode & 0x3F | 0x80);
                }
                else if (unicode <= 0x7FFFFFFF) {
                    bs.WriteUInt8(unicode >> 30 | 0xFC);
                    bs.WriteUInt8(unicode >> 24 & 0x3F | 0x80);
                    bs.WriteUInt8(unicode >> 18 & 0x3F | 0x80);
                    bs.WriteUInt8(unicode >> 12 & 0x3F | 0x80);
                    bs.WriteUInt8(unicode >> 6 & 0x3F | 0x80);
                    bs.WriteUInt8(unicode & 0x3F | 0x80);
                }
                else{
                    console.error("not legitimate unicode!");
                    return null;
                }
            }
            return bs;
        }

        if("GB2312" == des_charset){//unicode to gb2312

            for(let i=0; i<s.length; i++){

                let unicode = (s.charCodeAt(i) & 0xffff);
                if (unicode <= 0x7F) {
                    let c = unicode;
                    bs.WriteUInt8(c);
                }
                else{
                    var c = GB2312Util.GetGB2312ByUnicode(unicode);
                    bs.WriteUInt8(c >> 8 & 0xFF);
                    bs.WriteUInt8(c & 0xFF);
                }
            }
            return bs;
        }

        if("UNICODE" == des_charset){
            for(let i=0; i<s.length; i++){
                let unicode = (s.charCodeAt(i) & 0xffff);
                bs.WriteUInt16(unicode);
            }
            return bs;
        }
        return null;
    }

    function ZigZag32(v:number):number
    {
        return ((v<<1)^((v>>31)&1)) & 0xffffffff;
    }
    function InvZigZag32(v:number):number
    {
        return (v >>> 1) ^ (0 - (v & 1)) & 0xffffffff;
    }
    function ZigZag64(v:number):number
    {
        return ((v>>1) ^ ((v>>63)&1));
    }
    function InvZigZag64(v:number):number
    {
        return (v >>> 1) ^ (0 - (v & 1));
    }
    function MakeSigned32(v:number):number{
        return (v>2147483647.0?v-4294967296.0:v);
    }
    function MakeSigned64(v:number):number{
        return (v>9223372036854775807.0?v-18446744073709551616.0:v);
    }

    export const Bool     = function() : boolean{ return false}
    export const Int32    = function() : number { return 0}
    export const Int64    = function() : number { return 0};
    export const UInt32   = function() : number { return 0};
    export const UInt64   = function() : number { return 0};
    export const SInt32   = function() : number { return 0};
    export const SInt64   = function() : number { return 0};
    export const Fixed32  = function() : number { return 0};
    export const Fixed64  = function() : number { return 0};
    export const SFixed32 = function() : number { return 0};
    export const SFixed64 = function() : number { return 0};
    export const String   = function() : string { return ""};
    export const GBString = function() : string { return ""};
    export const Bytes    = function() : BinaryStream { return <any>undefined};
    export const Float    = function() : number { return 0};
    export const Double   = function() : number { return 0};

    const LocalTypes = [Bool,Int32,Int64,UInt32,UInt64,SInt32,SInt64,Fixed32,Fixed64,SFixed32,SFixed64,String,GBString,Bytes,Float,Double]

    export function Optional<T>(ctor: Constructor<T>, num: number) : T
    export function Optional<T>(func: ((...args: any[]) => T), num: number) : T
    export function Optional<T>(ctorOrFunc: ((...args: any[]) => T) | Constructor<T> , num: number) : T {
        if (declearFlag) {
            let t : any = { type: ctorOrFunc, number: num, repeated: 0,packed: 0,builtinType : BuildinType(ctorOrFunc) }
            if (ctorOrFunc === GBString as Function) {
                t.charset = "GB2312"
            }

            Message.AddField(t)
        }

        if (LocalTypes.indexOf(ctorOrFunc as any) != -1) {
            //@ts-ignore
            return ctorOrFunc()
        } else {
            return undefined as any
        }
    }

    export function Repeated<T>(ctor: Constructor<T>, num: number) : T[]
    export function Repeated<T>(func: ((...args: any[]) => T), num: number) : T[]
    export function Repeated<T>(ctorOrFunc: ((...args: any[]) => T) | Constructor<T> , num: number) : T[] {
        if (declearFlag) {
            Message.AddField({ type: ctorOrFunc, number: num, repeated: 1,packed: 0,builtinType : BuildinType(ctorOrFunc) })
        }

        return [] as any
    }
    
    export function Map<T1 extends string | number,T2>(con1: ((...args: any[]) => T1), con2: ((...args: any[]) => T2), num: number): Record<T1,T2>
    export function Map<T1 extends string | number,T2>(con1: ((...args: any[]) => T1), func2: Constructor<T2>, num: number): Record<T1,T2>
    export function Map<T1 extends string | number,T2>(con1: ((...args: any[]) => T1), con2OrFunc: Constructor<T2> | ((...args: any[]) => T2), num: number): Record<T1,T2> {
        class PB_MAP_PAIR<T1, T2> {
            key   = Optional(con1, 1)
            value = Optional(con2OrFunc as any, 2)
        }

        let fields = Message.GetAllFields().slice(0)
        
        let mapClassName = `PB_MAP_PAIR_${_mapId++}`
        Declare(mapClassName,PB_MAP_PAIR)

        Message.ClearFields()
        Message.SetFields(fields)
        declearFlag = true

        if (declearFlag) {
            Message.AddField({ type: mapClassName, number: num, repeated: 1,packed: 2,builtinType : BuildinType(PB_MAP_PAIR),builtinMapValueType:BuildinType(con2OrFunc), mapValueType : con2OrFunc })
        }

        return {} as any
    }

    function BuildinType(con: Function):string {
        switch (con) {
            case Bool: return "bool";
            case Int32: return "int32";
            case Int64: return "int64";
            case UInt32: return "uint32";
            case UInt64: return "uint64";
            case SInt32: return "sint32";
            case SInt64: return "sint64";
            case Fixed32: return "fixed32";
            case Fixed64: return "fixed64";
            case SFixed32: return "sfixed32";
            case SFixed64: return "sfixed64";
            case Float: return "float";
            case Double: return "double";
            case String: return "string";
            case GBString : return "string";
            case Bytes: return "bytes";
        };

        return "";
    }

    export function Declare<T>(name:string, def:Array<any>) : boolean
    export function Declare<T>(name:string, ctor: Constructor<T>) : boolean
    export function Declare<T>(name:string, ctorOrdef: Constructor<T> | Array<any>)  : boolean {
        if(!isFunction(ctorOrdef)){
            Message.Regist(name, ctorOrdef)
            return true
        } else {
            // 通过类注册
            declearFlag = true
            Message.ClearFields()
            let inst = new ctorOrdef();
            declearFlag = false

            let fields = Message.GetAllFields()
            let arr = new Array<object>();
            let propNames = Object.getOwnPropertyNames(inst);

            for (let i = 0; i < fields.length; i++)
            {
                let t = ""
       
                if (fields[i].builtinType) {
                    t = fields[i].builtinType;
                } else {
                    if (2 == fields[i].packed) {
                        // MAP
                        if (!fields[i].builtinMapValueType) {
                            let message = Message.FindByCtor(fields[i].mapValueType);

                            if (message == null) {
                                return false
                            }
                        }

                        t = fields[i].type as string
                    } else {
                        let message = Message.FindByCtor(fields[i].type);

                        if (message != null) {
                            t = message["name"]
                        } else {
                            return false
                        }
                    }
                }
    
                if (1 == fields[i].repeated) {
                    if (2 == fields[i].packed) {
                        t = t + "[map]";
                    }
                    else if (1 == fields[i].packed) {
                        t = t + "[packed]";
                    }
                    else {
                        t = t + "[]";
                    }
                }
    
                arr.push({
                    name: propNames[i],
                    type: t,
                    number: fields[i].number,
                    charset : fields[i].charset || null
                });
            }
    
            Message.Regist(name,ctorOrdef, arr);
            return true
        }
    }

    export function Deserialize<T>(bs: BinaryStream | ArrayBuffer | null, ctor: Constructor<T>, charset?: string) : T
    export function Deserialize(bs: BinaryStream | ArrayBuffer | null, type: string, charset?: string) : any 
    export function Deserialize<T>(bs: BinaryStream | ArrayBuffer | null, typeOrCtor: Constructor<T> | string, charset: string = default_charset) : any {
        if (bs == null) {
            bs = new ArrayBuffer(0);
        }

        if (bs instanceof ArrayBuffer) {
            const stream = new BinaryStream(bs)
            stream.InitVarints(bs.byteLength)

            bs = stream
        }

        let type = typeOrCtor as string

        // 传入的是类型对象
        if (isFunction(typeOrCtor)) {
            let message = Message.FindByCtor(typeOrCtor);
            type = message["name"]
        }

        let type_desc = GetTypeDescribe(type);
        if(null == type_desc){
            console.error("type describe \"" + type + "\" can not find!");
            return null;
        }

        if("repeated" == type_desc.style)
        {
            let packed = type_desc.param;

            if("packed" == packed)
            {
                let arr = new Array(0);

                let l=bs.ReadVarints();
                l+=bs.GetPos();

                while(bs.GetPos()<l) {
                    arr.push(Deserialize(bs, type_desc.base_type, charset));
                }
                
                return arr;
            }
            else if ("map" == packed)
            {
                return Deserialize(bs, type_desc.base_type, charset);
            }
            else
            {
                return Deserialize(bs, type_desc.base_type, charset);
            }

        }

        if("message" == type_desc.style)
        {
            let message_def = type_desc.param;
            let obj : any = type_desc.con ? new type_desc.con : new Object();

            let l = bs.ReadVarints();
			l += bs.GetPos();

            while (bs.GetPos() < l)
            {
                let tag = bs.ReadVarints();
                
                let find = false;
                for (let i=0; i<message_def.length; i++)
                {
                    let member_desc = GetTypeDescribe(message_def[i].type);
                  
                    let member_tag = (message_def[i].number << 3) | member_desc!.wire_type;
                    if ("repeated" == member_desc!.style && "packed" == member_desc!.param){
                        member_tag = (message_def[i].number << 3) | 2;
                    }

                    let charset2 = charset;
                    if(null != message_def[i].charset){
                        charset2 = message_def[i].charset;
                    }

                    if(tag == member_tag)
                    {
                        find = true;

                        if ("repeated" == member_desc!.style && "packed" != member_desc!.param)
                        {
                            if ("map" == member_desc!.param) {
                                if (null == obj[message_def[i].name]) {
                                    obj[message_def[i].name] = {};
                                }
                                let p : any = Deserialize(bs, message_def[i].type, charset2);
                                obj[message_def[i].name][p.key] = p.value;
                            }
                            else {

                                if (null == obj[message_def[i].name]) {
                                    obj[message_def[i].name] = new Array();
                                }
                                obj[message_def[i].name].push(Deserialize(bs, message_def[i].type, charset2));
                            }
                        }
                        else{
                            obj[message_def[i].name] = Deserialize(bs, message_def[i].type, charset2);
                        }
                        break;
                    }
                }

                if(!find)
                {
                    let data = new BinaryStream();

                    switch (tag & 0x7)
					{
					case 1:
                        data.WriteUInt64(bs.ReadUInt64());
						break;
					case 5:
						data.WriteUInt32(bs.ReadUInt32());
						break;
					case 0:
						data.WriteVarints(bs.ReadVarints());
						break;
					case 2:
						data = bs.ReadStream();
						break;
					}
                    if(null==obj["__undeclared"]){
                        obj["__undeclared"]=new Object();
                    }
					obj["__undeclared"][tag.toString()] = data;
                }
            }

            return obj;
        }
        
        if("prototype" == type_desc.style)
        {
            switch(type_desc.base_type){
                case "bool":    return bs.ReadInt8();    
                case "int32":   return MakeSigned32(bs.ReadVarints()); 
                case "int64":   return MakeSigned64(bs.ReadVarints()); 
                case "uint32":  return bs.ReadVarints(); 
                case "uint64":  return bs.ReadVarints(); 
                case "sint32":  return MakeSigned32(InvZigZag32(bs.ReadVarints()));
                case "sint64":  return MakeSigned64(InvZigZag64(bs.ReadVarints()));
                case "fixed32": return bs.ReadInt32();
                case "fixed64": return bs.ReadInt64();
                case "sfixed32":return MakeSigned32(InvZigZag32(bs.ReadInt32()));
                case "sfixed64":return MakeSigned64(InvZigZag64(bs.ReadInt64()));
                case "float":   return bs.ReadFloat32();
                case "double":  return bs.ReadFloat64();
                case "string":  return ToString(bs.ReadStream(), charset);
                case "bytes":   return bs.ReadStream();
            }
        }

        return null;
    }

    export function Serialize(v:any) : ArrayBuffer
    export function Serialize(v:any, type:string) : ArrayBuffer
    export function Serialize(v:any, type?:string) : ArrayBuffer {
        const stream = new BinaryStream()

        if (!v) {
            return stream.ReadStream().GetBuffer()
        }

        if (!type) {
            // 传递的是类型,根据类型信息获取type
            let message = Message.FindByCtor(Object.getPrototypeOf(v).constructor);
            type = message["name"]
        }
        
        SerializeToStream(v,type!,stream)
        stream.SetPos(0)
        let buff = stream.ReadStream().GetBuffer()        
        SerializeBuffMap.set(buff,type!)
        return buff
    }

    export function SerializeToStream(v:any, type:string, bs:BinaryStream, charset:string = default_charset, member_tag:number = 0):boolean {
        let type_desc = GetTypeDescribe(type);

        if(null == type_desc){
            console.error("type describe \"" + type + "\" can not find!");
            return false;
        }

        // auto fill client data
        if (type_desc.param) {
            for (let i = 0; i < type_desc.param.length; i++) {
                if (type_desc.param[i].name == "src" && type_desc.param[i].type == "HallPB.Source") {
                    if (!v.src) {
                        v.src = {
                            client : ClientInfo,
                            mods : ["client"]
                        }
                    } else {
                        Object.assign(v.src.client, ClientInfo)
                    }
                    break
                }
            }
        }
        
        if("repeated" == type_desc.style)
        {
            let packed = type_desc.param;

            if(null == v){
                console.error("access null when serialize type \"" + type + "\"!");
                v = new Array(0);
            }

            if("packed" == packed)
            {
                let bs2 = new BinaryStream();

                for (let i=0; i<v.length; i++) 
                {          
                    if(!SerializeToStream(v[i], type_desc.base_type, bs2, charset)){
                        return false;
                    }
                }

                bs.WriteStream(bs2);
            } else if ("map" == packed) {
                for (const k in v) {
                    bs.WriteVarints(member_tag);
                    if (!SerializeToStream({key:k,value:v[k]} , type_desc.base_type, bs, charset)) {
                        return false;
                    }
                }
            }
            else
            {
                for (let i=0; i<v.length; i++) 
                {          
                    bs.WriteVarints(member_tag);
                    if(!SerializeToStream(v[i], type_desc.base_type, bs, charset)){
                        return false;
                    }
                }
            }

            return true;
        }

        if("message" == type_desc.style)
        {
            let message_def = type_desc.param;
            let bs2 = new BinaryStream();

            if(null == v){
                console.error("access null when serialize type \"" + type + "\"!");
                //v = new Object();
            }
            else
            {
                for (let i=0; i<message_def.length; i++)
                {
                    let member_desc = GetTypeDescribe(message_def[i].type);

                    let member=v[message_def[i].name];
                    if(null != member)
                    {
                        let charset2 = charset;
                        if(null != message_def[i].charset){
                            charset2 = message_def[i].charset;
                        }

                        let tag = (message_def[i].number << 3) | member_desc!.wire_type;

                        if ("repeated" != member_desc!.style){
                            bs2.WriteVarints(tag);
                        }
                        else if("packed" == member_desc!.param){
                            tag = (message_def[i].number << 3) | 2;
                            bs2.WriteVarints(tag);
                        }
                    
                        if(!SerializeToStream(v[message_def[i].name], message_def[i].type, bs2, charset2, tag)){
                            return false;
                        }
                    }
                }

                let undeclared = v["__undeclared"];
                if(null != undeclared)
                {
                    for(const key of Object.keys(undeclared))
                     {
                        let tag = parseInt(key);
                        bs2.WriteVarints(tag);

                        let data:BinaryStream = undeclared[key];
                        data.SetPos(0);

                        switch (tag & 0x7)
                        {
                        case 1:
                            bs2.WriteUInt64(data.ReadUInt64());
                            break;
                        case 5:
                            bs2.WriteUInt32(data.ReadUInt32());
                            break;
                        case 0:
                            bs2.WriteVarints(data.ReadVarints());
                        case 2:
                            bs2.WriteStream(data);
                            break;
                        }
                    }
                }
            }

            bs.WriteStream(bs2);
            return true;
        }
        
        if("prototype" == type_desc.style)
        {
            if(null == v)
            {
                console.error("access null when serialize type \"" + type + "\"!");
                return false;
            }
        
            switch(type_desc.base_type)
            {
                case "bool":    
                    bs.WriteInt8(v);    
                    return true;
                case "int32":   
                case "int64":
                case "uint32":
                case "uint64":  
                    bs.WriteVarints(v); 
                    return true;
                case "sint32":  bs.WriteVarints(ZigZag32(v)); return true;
                case "sint64":  bs.WriteVarints(ZigZag64(v)); return true;
                case "fixed32": bs.WriteUInt32(v);   return true;
                case "fixed64": bs.WriteUInt64(v);   return true;
                case "sfixed32":bs.WriteUInt32(ZigZag32(v));   return true;
                case "sfixed64":bs.WriteUInt64(ZigZag64(v));   return true;
                case "float":   bs.WriteFloat32(v); return true;
                case "double":  bs.WriteFloat64(v); return true;
                case "string":  bs.WriteStream(FromString(v, charset)!); return true;
                case "bytes":   bs.WriteStream(v);  return true;
            }
        }

        return false;
    }

    export function AddPendingDeclare(name : string,constructor ) {
        _penddingDeclare.push({name : name,ctor : constructor})
    }

    export function RefreshPendingDeclare() {
        while(_penddingDeclare.length > 0) {
            let flag = false

            for (let i = _penddingDeclare.length -1; i >= 0; i--) {
                if (Declare(_penddingDeclare[i].name,_penddingDeclare[i].ctor)) {
                    flag = true

                    _penddingDeclare.splice(i,1)
                }
            }

            if (!flag) {
                break
            }
        }
    }
}