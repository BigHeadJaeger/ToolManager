
export let DefaultHttpTimeout = 15000

export interface ServerHostInfo {
    host : string
    port : number
}

export enum HttpStatus {
    OK = 0,
    ERROR = -1,
    Timeout = -2
}