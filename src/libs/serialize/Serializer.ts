
import { fromCharCodeEx } from "./stringex";
import {BinaryStream} from "./BinaryStream";
import { GB2312Util } from "./GB2312Util";

export namespace Serializer{
    const default_charset = "GB2312";
    export class Struct{
        private static map_structs = {};
        private static map_callback = {};

        static Find(name:string):Array<any>{
            return Struct.map_structs[name];
        }

        static FindDeserializeCallback(name:string):any{
            return Struct.map_callback[name]
        }

        static Regist(name:string, def:Array<any>,onDeserialized ? :(obj : any,bs : BinaryStream) => object){
            Struct.map_structs[name] = def;
            Struct.map_callback[name] = onDeserialized
        }
    }

    class Constant{
        private static map_consts = {};

        static Find(name:string):any{
            return Constant.map_consts[name];
        }

        static Regist(name:string, def:any){
            Constant.map_consts[name] = def;
        }
    }

    /**
     * 注册消息结构体
     * @param name 
     * @param def 
     * @param onDeserialize 消息反序列化回调，提供自定义解析功能
     */
    export function Declare(name:string, def:any,onDeserialize?){
        if(Array.isArray(def)){
            Struct.Regist(name, def,onDeserialize);
        }
        else{
            Constant.Regist(name, def);
        }

        TypeDescribe.ClearType(name)
    }

    class TypeDescribe{

        base_type:string;
        align:number;
        style:string;
        param:any;

        private static map_types = {};

        constructor(type:string,
            base_type:string,
            align:number,
            style = "Number",
            param:any = null)
        {
            this.base_type = base_type;
            this.align = align;
            this.style = style;
            this.param = param;

            TypeDescribe.map_types[type] = this;
        }

        static Find(type:string):TypeDescribe
        {
            return TypeDescribe.map_types[type];
        }

        static ClearType(type:string) {
            delete TypeDescribe.map_types[type]
        }
    }

    export function GetTypeDescribe(type:string):TypeDescribe | null {

        const type_desc = TypeDescribe.Find(type);
        if(null != type_desc){
            return type_desc;
        }

        const p = type.indexOf("[");
        if(-1 != p){
            const q = type.indexOf("]", p);
            if(-1 == q){
                console.error("type string \"" + type + "\" can not find ']'!");
                return null;
            }

            const base_type = type.substring(0, p) + type.substring(q + 1, type.length);
            const base_desc = GetTypeDescribe(base_type);
            if(null == base_desc){
                return null;
            }

            const length_str = type.substring(p + 1, q);
            let length = Constant.Find(length_str);
            if(null == length){
                length = parseInt(type.substring(p + 1, q));
                
                if (isNaN(length)){
                    console.error("type string \"" + type + "\" symbol \"" + length_str + "\"undefined!");
                    return null;
                }
            }
            if(length <= 0){
                console.error("type string \"" + type + "\" array length must be positive!");
                return null;
            }
            return new TypeDescribe(type, base_type, base_desc.align, "Array", length);
        }

        switch(type){
            case "bool":
            case "char":
            case "int8_t":
            case "TCHAR":
                return new TypeDescribe(type, "Int8", 1);
            case "unsigned char":
            case "uint8_t":
            case "BYTE":
                return new TypeDescribe(type, "UInt8", 1);
            case "short":
            case "wchar_t":
            case "int16_t":
                return new TypeDescribe(type, "Int16", 2);
            case "unsigned short":
            case "uint16_t":
            case "WORD":
                return new TypeDescribe(type, "UInt16", 2);
            case "int":
            case "long":
            case "int32_t":
            case "BOOL":
                return new TypeDescribe(type, "Int32", 4);
            case "unsigned int":
            case "unsigned long":
            case "uint32_t":
            case "DWORD":
                return new TypeDescribe(type, "UInt32", 4);
            case "long long":
            case "__int64":
            case "int64_t":
                return new TypeDescribe(type, "Int64", 8);
            case "unsigned long long": 
            case "unsigned __int64":
            case "uint64_t":
            case "QWORD":
                return new TypeDescribe(type, "UInt64", 8);
            case "float":
                return new TypeDescribe(type, "Float32", 4);
            case "double":
                return new TypeDescribe(type, "Float64", 8);
        }

        const struct_def = Struct.Find(type);
        if(null != struct_def){

            let align = 1;
            for (let i=0; i<struct_def.length; i++) {
                const member_desc = GetTypeDescribe(struct_def[i].type);
                if(null == member_desc){
                    return null;
                }
                if(member_desc.align > align){
                    align = member_desc.align;
                }
            }

            return new TypeDescribe(type, type, align, "Struct", struct_def);
        }

        return null;
    }


    //array to unicode
    export function ToString(arr:Array<number>, src_charset:string):string | null {

        const codes = new Array<number>();

        if("UTF8" == src_charset){//utf8 to unicode

            for(let i=0; i<arr.length; i++){
                if(0 == arr[i]){
                    break;
                }

                var c = (arr[i] & 0xff);
                var unicode = 0;
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
                    if (i+j >= arr.length) {
                        console.error("not legitimate utf8!");
                    }
                    c = (arr[i+j] & 0xff);
                    if ((c >> 6) != 2) {
                        console.error("not legitimate utf8!");
                    }
                    unicode = ((unicode << 6) | (c & 0x3F));
                }

                codes.push(unicode);
                i += bytes;
            }

            return fromCharCodeEx(codes);
        }

        if("GB2312" == src_charset){//gb2312 to unicode

            for(var i=0; i<arr.length; i++){
                if(0 == arr[i]){
                    break;
                }

                var c = (arr[i] & 0xff);
                var unicode = c;
                if (c > 0x7f) {
                    i++;
                    if(i >= arr.length){
                        console.error("not legitimate gb2312!");
                        return null;
                    }

					c = c + ((arr[i] & 0xff)<<8); 
                    unicode = GB2312Util.GetUnicodeByGB2312(c);
                }

                codes.push(unicode);
            }
            return fromCharCodeEx(codes);
        }

        if("UNICODE" == src_charset){
            return fromCharCodeEx(arr);
        }

        return null;
    }

    //unicode to array
    export function FromString(s:string, des_charset:string):Array<number> | null {

        const arr = new Array<number>();

        if("UTF8" == des_charset){//unicode to utf8

            for(var i=0; i<s.length; i++){

                var unicode = (s.charCodeAt(i) & 0xffff);
                if(unicode <= 0x0000007f) {
                    arr.push(unicode);
                }
                else if (unicode <= 0x000007FF) {
                    arr.push(unicode >> 6 | 0xC0);
                    arr.push(unicode & 0x3F | 0x80);
                }
                else if (unicode <= 0x0000FFFF) {
                    arr.push(unicode >> 12 | 0xE0);
                    arr.push(unicode >> 6 & 0x3F | 0x80);
                    arr.push(unicode & 0x3F | 0x80);
                }
                else if (unicode <= 0x001FFFFF) {
                    arr.push(unicode >> 18 | 0xF0);
                    arr.push(unicode >> 12 & 0x3F | 0x80);
                    arr.push(unicode >> 6 & 0x3F | 0x80);
                    arr.push(unicode & 0x3F | 0x80);
                }
                else if (unicode <= 0x03FFFFFF) {
                    arr.push(unicode >> 24 | 0xF8);
                    arr.push(unicode >> 18 & 0x3F | 0x80);
                    arr.push(unicode >> 12 & 0x3F | 0x80);
                    arr.push(unicode >> 6 & 0x3F | 0x80);
                    arr.push(unicode & 0x3F | 0x80);
                }
                else if (unicode <= 0x7FFFFFFF) {
                    arr.push(unicode >> 30 | 0xFC);
                    arr.push(unicode >> 24 & 0x3F | 0x80);
                    arr.push(unicode >> 18 & 0x3F | 0x80);
                    arr.push(unicode >> 12 & 0x3F | 0x80);
                    arr.push(unicode >> 6 & 0x3F | 0x80);
                    arr.push(unicode & 0x3F | 0x80);
                }
                else{
                    console.error("not legitimate unicode!");
                    return null;
                }
            }
            return arr;
        }

        if("GB2312" == des_charset){//unicode to gb2312

            for(var i=0; i<s.length; i++){

                var unicode = (s.charCodeAt(i) & 0xffff);
                if (unicode <= 0x7F) {
                    const c = unicode;
                    arr.push(c);
                }
                else{
                    const c = GB2312Util.GetGB2312ByUnicode(unicode);
                    arr.push(c & 0xFF);
					arr.push(c >> 8 & 0xFF);
                }
            }
            return arr;
        }

        if("UNICODE" == des_charset){
            for(var i=0; i<s.length; i++){
                var unicode = (s.charCodeAt(i) & 0xffff);
                arr.push(unicode);
            }
            return arr;
        }
        return null;
    }

    export function Deserialize(bs:BinaryStream, type:string, charset:string = default_charset):any {
        const type_desc = GetTypeDescribe(type);
        if(null == type_desc){
            console.error("type describe \"" + type + "\" can not find!");
            return null;
        }

        if("Array" == type_desc.style){
            const array_length = type_desc.param;
            const arr = new Array(array_length);

            for (var i=0; i<arr.length; i++) {
				if (bs.GetPos() >= bs.GetLength()) break;
                arr[i] = Deserialize(bs, type_desc.base_type, charset);
            }

            if("char" == type_desc.base_type || "TCHAR" == type_desc.base_type){
                return ToString(arr, charset);
            }
            if("wchar_t" == type_desc.base_type){
                return ToString(arr, "UNICODE");
            }

            return arr;
        }

        if("Struct" == type_desc.style){
            const struct_def = type_desc.param;
            let obj = new Object();

            const pos = bs.GetPos();
            for (var i=0; i<struct_def.length; i++) {
                const member_desc = GetTypeDescribe(struct_def[i].type);
                while((bs.GetPos() - pos) % member_desc!.align != 0){
                    bs.ReadUInt8();
                }

                let charset2 = charset;
                if(null != struct_def[i].charset){
                    charset2 = struct_def[i].charset;
                }
                obj[struct_def[i].name] = Deserialize(bs, struct_def[i].type, charset2);
            }

            while((bs.GetPos() - pos) % type_desc.align != 0){
                bs.ReadUInt8();
            }

            if(bs.GetPos() - pos == 0){
                bs.ReadUInt8();   //struct size at least 1 in c++
            }

            let deserializeCallback = Struct.FindDeserializeCallback(type_desc.base_type)

            if (deserializeCallback) {
                obj = deserializeCallback(obj,bs) || obj
            }

            return obj;
        }
        
        if("Number" == type_desc.style){
            switch(type_desc.base_type){
                case "Int8":    return bs.ReadInt8();
                case "UInt8":   return bs.ReadUInt8();
                case "Int16":   return bs.ReadInt16();
                case "UInt16":  return bs.ReadUInt16();
                case "Int32":   return bs.ReadInt32();
                case "UInt32":  return bs.ReadUInt32();
                case "Int64":   return bs.ReadInt64();
                case "UInt64":  return bs.ReadUInt64();
                case "Float32": return bs.ReadFloat32();
                case "Float64": return bs.ReadFloat64();
            }
        }

        return null;
    }

    export function Serialize(v:any, type:string, bs:BinaryStream, charset:string = default_charset):boolean {
        const type_desc = GetTypeDescribe(type);
        if(null == type_desc){
            console.error("type describe \"" + type + "\" can not find!");
            return false;
        }
        
        if("Array" == type_desc.style){
            const array_length = type_desc.param;

            if(null == v){
                v = new Array(array_length);
            }
            else{
                if("char" == type_desc.base_type || "TCHAR" == type_desc.base_type){
                    v = FromString(v, charset);
                    if(v.length >= array_length)
                    {
                        v[array_length-1] = 0
                    }
                }
                if("wchar_t" == type_desc.base_type){
                    v = FromString(v, "UNICODE");
                    if(v.length >= array_length)
                    {
                        v[array_length-1] = 0
                    }
                }  
            }
            for (var i=0; i<array_length; i++) {
                if(!Serialize(v[i], type_desc.base_type, bs, charset)){
                    return false;
                }
            }
            return true;
        }

        if("Struct" == type_desc.style){
            const struct_def = type_desc.param;

            if(null == v){
                v = new Object();
            }

            const pos = bs.GetPos();
            for (var i=0; i<struct_def.length; i++) {
                const member_desc = GetTypeDescribe(struct_def[i].type);
                while((bs.GetPos() - pos) % member_desc!.align != 0){
                    bs.WriteUInt8(0);
                }

                let charset2 = charset;
                if(null != struct_def[i].charset){
                    charset2 = struct_def[i].charset;
                }
                if(!Serialize(v[struct_def[i].name], struct_def[i].type, bs, charset2)){
                    return false;
                }
            }

            while((bs.GetPos() - pos) % type_desc.align != 0){
                bs.WriteUInt8(0);
            }

            if(bs.GetPos() - pos == 0){
                bs.WriteUInt8(0);   //struct size at least 1 in c++
            }
            return true;
        }
        
        if("Number" == type_desc.style){

            if(null == v){
                v = 0;
            }

            switch(type_desc.base_type){
                case "Int8":    bs.WriteInt8(v);    return true;
                case "UInt8":   bs.WriteUInt8(v);   return true;
                case "Int16":   bs.WriteInt16(v);   return true;
                case "UInt16":  bs.WriteUInt16(v);  return true;
                case "Int32":   bs.WriteInt32(v);   return true;
                case "UInt32":  bs.WriteUInt32(v);  return true;
                case "Int64":   bs.WriteInt64(v);   return true;
                case "UInt64":  bs.WriteUInt64(v);  return true;
                case "Float32": bs.WriteFloat32(v); return true;
                case "Float64": bs.WriteFloat64(v); return true;
            }
        }

        return false;
    }

    /*export function getStructSize(type:string): number {
        const type_desc = GetTypeDescribe(type);

        if(null == type_desc){
            console.error("type describe \"" + type + "\" can not find!");
            return 0;
        }

        if (type_desc.style != "Struct") {
            console.error("type describe \"" + type + "\" is not Struct!");
            return 0;
        }

        let totalSize = 0;
        const struct_def = type_desc.param;
        for (var i=0; i < struct_def.length; i++) {
            const member_desc = GetTypeDescribe(struct_def[i].type);
            if (member_desc) {
                if("Number" == member_desc.style){
                    switch(member_desc.base_type){
                        case "Int8":
                        case "UInt8":
                        case "Int16":
                        case "UInt16":
                        case "Int32":
                        case "UInt32":
                        case "Int64":
                        case "UInt64":
                        case "Float32":
                        case "Float64":
                            totalSize += member_desc.align;
                    }
                } else if ("Array" == member_desc.style) {
                    let len = member_desc.param || 1;
                    totalSize += member_desc.align * len;
                } else if ("Struct" == member_desc.style) {
                    totalSize += getStructSize(struct_def[i].type);
                }
            }
        }

        return totalSize;
    }*/

}