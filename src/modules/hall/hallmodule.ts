import HallConnect from "./hallconnect";

class HallModule {
    public hallConnectTest:HallConnect;
    public hallConnect:HallConnect;
    constructor() {
        this.hallConnectTest = new HallConnect();
        this.hallConnect = new HallConnect();
    }
}

export default new HallModule();