export class Int64
{
    private _word0:number = 0;
    private _word1:number = 0;
    private _word2:number = 0;
    private _word3:number = 0;

    constructor(v: number = 0)
    {
        if (Number.MIN_SAFE_INTEGER>v || v>Number.MAX_SAFE_INTEGER) {
            console.error("v too big or too small",v);
        }
        
        if(v<0){
            v=-v-1;
            this.reset(~(v%4294967296.0), ~ Math.floor(v/4294967296.0));
        }
        else{
            this.reset(v%4294967296.0, Math.floor(v/4294967296.0));
        }
    }

    static uint32(v:number):number
    {
        v&=0xffffffff;
        if(v<0){
            v+=4294967296.0;
        }
        return v;
    }

    ldword():number
    {
        return Int64.uint32(this._word0 | this._word1<<16);
    }

    hdword():number
    {
        return Int64.uint32(this._word2 | this._word3<<16);
    }

    is_zero():boolean
    {
        return (this._word0 | this._word1 | this._word2 | this._word3)==0;
    }

    to_number():number
    {
        var high:number=this.hdword();
        var low:number=this.ldword();

        if (high & 0x80000000) {
            return -(Int64.uint32(~low) + Int64.uint32(~high)*4294967296.0 + 1);
        }
        else{
            return low + high*4294967296.0;
        }
    }

    reset(l:number,h:number)
    {
        this._word0=(l & 0x0000ffff);
        this._word1=(l>>16 & 0x0000ffff);
        this._word2=(h & 0x0000ffff);
        this._word3=(h>>16 & 0x0000ffff);
    }

    copy():Int64
    {
        var t=new Int64();
        t._word0=this._word0;
        t._word1=this._word1;
        t._word2=this._word2;
        t._word3=this._word3;
        return t;
    }

    ulshift(n:number):Int64
    {
        if(n<0){
            return this.urshift(-n);
        }

        var t=this.copy();

        while(n>=16)
        {
            t._word3=t._word2;
            t._word2=t._word1;
            t._word1=t._word0;
            t._word0=0;
            n-=16;
        }

        if(n>0)
        {
            t._word3=((t._word3<<n | t._word2>>(16-n)) & 0x0000ffff);
            t._word2=((t._word2<<n | t._word1>>(16-n)) & 0x0000ffff);
            t._word1=((t._word1<<n | t._word0>>(16-n)) & 0x0000ffff);
            t._word0=(t._word0<<n  & 0x0000ffff);
        }
     
        return t;
    }

    urshift(n:number):Int64
    {
        if(n<0){
            return this.ulshift(-n);
        }

        var t=this.copy();

        while(n>=16)
        {
            t._word0=t._word1;
            t._word1=t._word2;
            t._word2=t._word3;
            t._word3=0;
            n-=16;
        }

        if(n>0)
        {
            t._word0=((t._word0>>n | t._word1<<(16-n)) & 0x0000ffff);
            t._word1=((t._word1>>n | t._word2<<(16-n)) & 0x0000ffff);
            t._word2=((t._word2>>n | t._word3<<(16-n)) & 0x0000ffff);
            t._word3>>=n;
        }
     
        return t;
    }

    and(n:Int64):Int64
    {
        var t=this.copy();

        t._word0&=n._word0;
        t._word1&=n._word1;
        t._word2&=n._word2;
        t._word3&=n._word3;
     
        return t;
    }

    or(n:Int64):Int64
    {
        var t=this.copy();

        t._word0|=n._word0;
        t._word1|=n._word1;
        t._word2|=n._word2;
        t._word3|=n._word3;
     
        return t;
    }
}