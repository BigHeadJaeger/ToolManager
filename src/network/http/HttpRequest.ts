// import { NATIVE } from "internal:constants";
import { DefaultHttpTimeout, HttpStatus } from "./HttpDef";

export class HttpRequest {
    public initParam(params:any) {
        params = params || {}
        return params
    }

    public httpGets(url:any, callback? : (errorID : number,data? : any) => void,headers?:any,timeout?:any) {
        if (!url.endsWith(".map")) {
            console.log("LogTag.Socket","httpGets",url)
        }
        
        var tcallback = (errorID : number,data? : any) => {
            try {
                callback && callback(errorID,data)
                callback = undefined
            } catch(err) {
                // showSomethingBad(err)
            }
        }
        
        var xhr = new XMLHttpRequest();

        xhr.onreadystatechange = function () {
            if (xhr.readyState == (XMLHttpRequest.DONE || 4)) {
                if (xhr.status >= 200 && xhr.status < 300) {
                    var respone = xhr.responseText;

                    if (tcallback) {
                        tcallback(HttpStatus.OK,respone);
                    }
                }
                else {
                    if (tcallback) {
                        console.log("LogTag.Socket","onreadystatechange status code",xhr.status);
                        tcallback(HttpStatus.ERROR);
                    }
                }
            }
        };
        xhr.ontimeout = function () {
            console.log("LogTag.Socket",url + " timeout");

            if (tcallback) {
                tcallback(HttpStatus.Timeout);
            }
        }
        xhr.onerror = function (event) {
            console.log("LogTag.Socket",url + " error");
            console.log("LogTag.Socket",event);

            if (tcallback) {
                tcallback(HttpStatus.ERROR);
            }
        };

        xhr.open("GET", url);

        // if (NATIVE) {
        if (false) {
            xhr.setRequestHeader("Accept-Encoding", "gzip");
        }

        if (headers) {
            for (let key in headers) {
                xhr.setRequestHeader(key, headers[key]);
            }
        }

        if (!timeout) {
            timeout = DefaultHttpTimeout
        }

        // note: In Internet Explorer, the timeout property may be set only after calling the open()        
        // method and before calling the send() method. 
        xhr.timeout = timeout;// 5 seconds for timeout 
        xhr.send();
    }

    public httpPost(url:any, params:any, callback? : (errorID : number,data? : any) => void, headers?:any,timeout?:any) {
        // console.log("LogTag.Socket","httpPost",url)

        var tcallback = (errorID : number,data? : any) => {
            try {
                callback && callback(errorID,data)
                callback = undefined
            } catch(err) {
                console.log("LogTag.Socket",err)
            }
        }

        var xhr = new XMLHttpRequest();
        
        xhr.onreadystatechange = function () {
            if (xhr.readyState == (XMLHttpRequest.DONE || 4)) {
                if (xhr.status >= 200 && xhr.status < 300) {
                    var respone = xhr.responseText;
                    
                    if (tcallback) {
                        tcallback(HttpStatus.OK,respone);
                    }
                }
                else {
                    if (tcallback) {
                        console.log("LogTag.Socket","onreadystatechange status code",xhr.status);
                        tcallback(HttpStatus.ERROR);
                    }
                }
            }
        };
        xhr.ontimeout = function () {
            console.log("LogTag.Socket",url + " timeout");

            if (tcallback) {
                tcallback(HttpStatus.Timeout);
            }
        }
        xhr.onerror = function (event) {
            console.log("LogTag.Socket",url + " error");
            console.log("LogTag.Socket",event);

            if (tcallback) {
                tcallback(HttpStatus.ERROR);
            }
        };
        xhr.open("POST", url);
        // xhr.setRequestHeader("Access-Control-Allow-Origin", "*");
        // if (NATIVE) {
        if (false) {
            xhr.setRequestHeader("Accept-Encoding", "gzip");
        }

        if (headers) {
            for (let key in headers) {
                xhr.setRequestHeader(key, headers[key]);
            }
        }

        if (!timeout) {
            timeout = DefaultHttpTimeout
        }

        // note: In Internet Explorer, the timeout property may be set only after calling the open()
        // method and before calling the send() method.        
        xhr.timeout = timeout;// 5 seconds for timeout
        xhr.send(params);
    }

    public getTime() {
        var d = new Date();
        let time = d.getTime()
        return time
    }

    public parcelDataList(dataList:any) {
        var s='',name, key;
        for(var p in dataList) {
            if(dataList[p] == null) {return null;}
            if(dataList.hasOwnProperty(p)) { name = p };
            key = dataList[p];
            s += "&" + name + "=" + encodeURIComponent(key);
        };
        return s.substring(1,s.length);
    };

    public unParcelDataList(str:any) {
        let params:any = {}
        let arr = str.split("&");

        for (let i = 0; i < arr.length; i++) {
            let num = arr[i].indexOf("=");

            if (num > 0) {
                let name = arr[i].substring(0, num);
                let value = arr[i].substr(num + 1);

                params[name] = value;
            }
        }

        return params;
    }

    public getCompleteUrl(url:any, dataList:any) {
        this.initParam(dataList)

        return url + "?" + this.parcelDataList(dataList)
    }
}

export default new HttpRequest();



