import { Int64 } from "./Int64";


export class BinaryStream{
    private buff:Uint8Array | null;
    private view:DataView;
    private length:number = 0;
    private _initVarints?:any

    private get pos () {
        return this._pos;
    }
    private set pos(value) {
        this._pos = value
    }

    private _pos:number = 0;

    constructor(arr: ArrayBuffer | BinaryStream | null = null){
        this.buff = null;

        if(null == arr){
            this.buff = new Uint8Array(64);
            arr = this.buff.buffer;

            this.view = new DataView(arr)
            this.length = 0
            this.pos = 0
        }
        else{
            if (arr instanceof ArrayBuffer) {
                this.length = arr.byteLength;
                this.view = new DataView(arr);
                this.pos = 0;
            } else {
                let bs : BinaryStream = arr
                this.view = bs.view
                this.length = bs.length  
                this.buff = bs.buff

                let overrideProto = Object.create(BinaryStream.prototype)
                Object.defineProperty(overrideProto,"pos",{  
                    get : function() {
                        return bs._pos
                    },

                    set : function(value) {
                        bs._pos = value
                    }
                })
                Object.setPrototypeOf(this,overrideProto)
            }
        }
    }

    private ReSize(target_length:number){

        if(target_length <= this.length){
            return;
        }

        if(target_length <= this.view.byteLength){
            this.length = target_length;
            return;
        }

        var buff_length = this.view.byteLength;
        while(target_length > buff_length){
            buff_length *= 2;
        }

        var buff = new Uint8Array(buff_length);
        for(var i=0; i<this.length; i++){
            buff[i] = this.view.getUint8(i);
        }

        this.buff = buff;
        this.view = new DataView(this.buff.buffer);
        this.length = target_length;
    }

    GetPos():number{
        return this.pos;
    }
    SetPos(pos:number){
        this.pos = pos;
    }

    GetLength():number{
        return this.length;
    }

    GetBuffer():ArrayBuffer{
        return this.view.buffer.slice(0, this.length);
    }

    ReadInt8():number{
        var v = this.view.getInt8(this.pos);
        this.pos += 1;
        return v;
    }
    ReadUInt8():number{
        var v = this.view.getUint8(this.pos);
        this.pos += 1;
        return v;
    }
    ReadInt16():number{
        var v = this.view.getInt16(this.pos, true);
        this.pos += 2;
        return v;
    }
    ReadUInt16():number{
        var v = this.view.getUint16(this.pos, true);
        this.pos += 2;
        return v;
    }
    ReadInt32():number{
        var v = this.view.getInt32(this.pos, true);
        this.pos += 4;
        return v;
    }
    ReadUInt32():number{
        var v = this.view.getUint32(this.pos, true);
        this.pos += 4;
        return v;
    }
    ReadInt64():number{
        var low = this.view.getUint32(this.pos, true);
        var high = this.view.getInt32(this.pos + 4, true);
        this.pos += 8;

        var v=new Int64();
        v.reset(low,high);
        return v.to_number();
    }
    ReadUInt64():number{
        var low = this.view.getUint32(this.pos, true);
        var high = this.view.getUint32(this.pos + 4, true);
        this.pos += 8;

        var v=new Int64();
        v.reset(low,high);
        return v.to_number();
    }
    ReadFloat32():number{
        var v = this.view.getFloat32(this.pos, true);
        this.pos += 4;
        return v;
    }
    ReadFloat64():number{
        var v = this.view.getFloat64(this.pos, true);
        this.pos += 8;
        return v;
    }
    ReadVarints():number
    {
        if (this._initVarints !== undefined) {
            let t = this._initVarints
            this._initVarints = undefined
            return t
        } else {
            var v = new Int64();
        
            for (var i = 0; true; i += 7)
            {
                var t = this.ReadUInt8();
                
                var w = new Int64(t & 0x7f);
                v = v.or(w.ulshift(i));
    
                if (0==(t & 0x80)) {
                    break;
                }
            }
            return v.to_number();
        }
    }

    InitVarints(v:any) {
        this._initVarints = v
    }

    ReadStream():BinaryStream
    {
        var l=this.ReadVarints();
        var bs = new BinaryStream();
        for (var i=0; i<l; i++) {
            bs.WriteUInt8(this.ReadUInt8());
        }
        return bs;
    }

    WriteInt8(v:number){
        this.ReSize(this.pos + 1);
        this.view.setInt8(this.pos, v);
        this.pos += 1;
    }
    WriteUInt8(v:number){
        this.ReSize(this.pos + 1);
        this.view.setUint8(this.pos, v);
        this.pos += 1;
    }
    WriteInt16(v:number){
        this.ReSize(this.pos + 2);
        this.view.setInt16(this.pos, v, true);
        this.pos += 2;
    }
    WriteUInt16(v:number){
        this.ReSize(this.pos + 2);
        this.view.setUint16(this.pos, v, true);
        this.pos += 2;
    }
    WriteInt32(v:number){
        this.ReSize(this.pos + 4);
        this.view.setInt32(this.pos, v, true);
        this.pos += 4;
    }
    WriteUInt32(v:number){
        this.ReSize(this.pos + 4);
        this.view.setUint32(this.pos, v, true);
        this.pos += 4;
    }
    WriteInt64(v:number){
        this.ReSize(this.pos + 8);

        var t=new Int64(v);
        this.view.setUint32(this.pos, t.ldword(), true);
        this.view.setUint32(this.pos + 4, t.hdword(), true);
        
        this.pos += 8;
    }
    WriteUInt64(v:number){
        this.ReSize(this.pos + 8);
       
        var t=new Int64(v);
        this.view.setUint32(this.pos, t.ldword(), true);
        this.view.setUint32(this.pos + 4, t.hdword(), true);

        this.pos += 8;
    }
    WriteFloat32(v:number){
        this.ReSize(this.pos + 4);
        this.view.setFloat32(this.pos, v, true);
        this.pos += 4;
    }
    WriteFloat64(v:number){
        this.ReSize(this.pos + 8);
        this.view.setFloat64(this.pos, v, true);
        this.pos += 8;
    }
    WriteVarints(v:number)
    {
        var t=new Int64(v);
        var w=new Int64(0x7f);

        do
        {
            var b = t.and(w).ldword();
            t=t.urshift(7);
            if(!t.is_zero()){
                b |= 0x80;
            }

            this.WriteUInt8(b);

        }while(!t.is_zero());
    }
    WriteStream(bs:BinaryStream | ArrayBuffer)
    {
        if (bs instanceof ArrayBuffer) {
            bs = new BinaryStream(bs);
        }

        this.WriteVarints(bs.GetLength());
        bs.SetPos(0);
        for(var i=0;i<bs.GetLength();i++){
            this.WriteUInt8(bs.ReadUInt8());
        }
    }

    WriteBytes(bs:BinaryStream | ArrayBuffer) {
        if (bs instanceof ArrayBuffer) {
            const data = new Uint8Array(bs)

            for (var i = 0; i < data.byteLength; i++) {
                this.WriteUInt8(data[i]);
            }
        } else {
            bs.SetPos(0);
            for(var i=0;i<bs.GetLength();i++){
                this.WriteUInt8(bs.ReadUInt8());
            }
        }
    }
};

// globalThis.BinaryStream = BinaryStream
