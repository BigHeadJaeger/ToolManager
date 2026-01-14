export const enum ReactiveFlags {
    SKIP = '__v_skip',
    IS_REACTIVE = '__v_isReactive',
    IS_READONLY = '__v_isReadonly',
    RAW = '__v_raw'
  }
  
  export interface Target {
    [ReactiveFlags.SKIP]?: boolean
    [ReactiveFlags.IS_REACTIVE]?: boolean
    [ReactiveFlags.IS_READONLY]?: boolean
    [ReactiveFlags.RAW]?: any
  }

export function toRaw<T>(observed: T): T {
    const raw = observed && (observed as Target)[ReactiveFlags.RAW]
    return raw ? toRaw(raw) : observed
}

export default class CommonFunc {
    public static isEmptyObject(e) {
        e = toRaw(e)
        
        let t;
        for (t in e)
            return false;

        return true;
    }
}