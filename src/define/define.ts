export const ERROR_CODE = {
    TOKEN_ERROR: 401,
    LOGIN_ERROR: 1001,
}

export enum ServerMode {
    Formal,
    Preview,
    Test
}

export enum SocketErrType {
    OnClose = 0,
    InitNull = 1,
    InitError = 2,
    RunError = 3,
}

export const GAME_REQ_BASE       = 50000;
export const MOBILE_REQ_BASE = 30000;

export const PB_LOGON_USER     				= 113001
export const PB_LOGON_SUCCEEDED           	= 113002