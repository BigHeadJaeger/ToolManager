import * as CRC32NS from 'crc-32'

// crc-32 是 CJS：`module.exports = CRC32`，无 default
const CRC32: any = (CRC32NS as any).default ?? CRC32NS
export default CRC32
