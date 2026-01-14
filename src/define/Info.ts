
export class CommonInfo {
    static info: any = {}

    static test = "aaaaaaaaaa"

    static setClientInfo(_info:any) {
        this.info = _info
    }

    static getUserID() {
        return this.info.userid
    }

    static getUserUniqueId() {
        return this.info.uniqueid
    }

    static getUserName() {
        return this.info.username
    }

    static getNickName() {
        return this.info.nickname
    }

    static setTest(value) {
        this.test = value
    }

    static getTest() {
        return this.test
    }
}
