/**
 * 代替String.fromCharCode因为有长度限制。
 * @param code 
 */
export function fromCharCodeEx(codes : Array<number>) {
    let chunk = 32 * 1024
    let i
    let strData = ""

    for (i = 0; i < codes.length / chunk; i++) {
        strData += String.fromCharCode.apply(null, codes.slice(i * chunk, (i + 1) * chunk))
    }

    if (i * chunk < codes.length) {
        strData += String.fromCharCode.apply(null, codes.slice(i * chunk))
    }

    return strData
}