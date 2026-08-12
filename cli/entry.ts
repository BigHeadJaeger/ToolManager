import './shims'
import * as fs from 'fs'
import * as path from 'path'
import * as XLSX from 'xlsx'
import { Config, applyClientConfig, ClientInfo, ClientInfo_Debug } from '../src/config/config'
import { ServerMode } from '../src/define/define'
import { CommonInfo } from '../src/define/Info'
import { Protobuf } from '../src/libs/serialize'
import hallmodule from '../src/modules/hall/hallmodule'
import cpmodule from '../src/modules/cp/cpmodule'
import { Socket } from '../src/network/socket/socket'
import { JSONToExcelConverter } from '../src/modules/jsontoexcel'

/** CLI / 落盘目录名：inner | 888 | outer */
type FetchEnv = 'inner' | '888' | 'outer'

interface Credentials {
  userid: number
  username: string
  password: string
  hardid?: string
  uniqueid?: string
  channelid?: number
  channelkey?: string
  gameversion?: string
  groupid?: number
  appid?: number
}

function usage(): never {
  console.error(`Usage:
  node cp-fetch.cjs --appcode=<suffix> --gameid=<id> --module=<modulename> [--env=inner|888|outer] [--ope=info|config] [--userid=<uid>] [--credentials=<json>] [--aidoc-root=<path>]

  --env      inner (default) | 888 | outer   （888/outer 共用凭据里的 outer 账号）
  --ope=info   (default) player data; --userid required; stdout has full player JSON
  --ope=config module CP config; writes JSON (+ xlsx if __sheet_schemas__ present) under .config-cache

Example:
  node cp-fetch.cjs --appcode=lybw --gameid=450 --module=compensationv2 --userid=1030252
  node cp-fetch.cjs --appcode=lybw --gameid=450 --module=roomconfig --ope=config --env=888 --aidoc-root=D:\\ct\\aidoc
`)
  process.exit(2)
}

function parseArgs(argv: string[]) {
  const out: Record<string, string> = {}
  for (const a of argv) {
    if (!a.startsWith('--')) continue
    const eq = a.indexOf('=')
    if (eq < 0) usage()
    out[a.slice(2, eq)] = a.slice(eq + 1)
  }
  return out
}

function parseFetchEnv(raw?: string): FetchEnv {
  const v = (raw || 'inner').toLowerCase().trim()
  if (v === 'inner' || v === 'intranet' || v === 'test') return 'inner'
  if (v === '888' || v === 'preview') return '888'
  if (v === 'outer' || v === 'formal' || v === 'production' || v === 'prod') return 'outer'
  throw new Error(`unsupported --env=${raw}; use inner | 888 | outer`)
}

function toServerMode(env: FetchEnv): ServerMode {
  if (env === 'inner') return ServerMode.Test
  if (env === '888') return ServerMode.Preview
  return ServerMode.Formal
}

function parseCredObject(j: any, label: string): Credentials {
  if (!j || !j.userid || !j.username || !j.password) {
    throw new Error(`credentials missing ${label}.userid/username/password`)
  }
  return {
    userid: Number(j.userid),
    username: String(j.username),
    password: String(j.password),
    hardid: j.hardid,
    uniqueid: j.uniqueid,
    channelid: j.channelid != null ? Number(j.channelid) : undefined,
    channelkey: j.channelkey,
    gameversion: j.gameversion,
    groupid: j.groupid != null ? Number(j.groupid) : undefined,
    appid: j.appid != null ? Number(j.appid) : undefined,
  }
}

/** 支持 { inner, outer }；兼容旧版扁平字段（视为 inner）。888/outer 用 outer 账号。 */
function loadCredentialsForEnv(filePath: string, env: FetchEnv): Credentials {
  const raw = fs.readFileSync(filePath, 'utf8')
  const j = JSON.parse(raw)
  const needOuter = env === '888' || env === 'outer'

  if (j.inner || j.outer) {
    if (needOuter) {
      return parseCredObject(j.outer, 'outer')
    }
    return parseCredObject(j.inner || j, 'inner')
  }
  // legacy flat
  if (needOuter) {
    throw new Error(
      `credentials file needs "outer" account for --env=${env}: ${filePath}`
    )
  }
  return parseCredObject(j, 'inner(legacy)')
}

function resolveAidocRoot(explicit?: string): string {
  if (explicit && explicit.trim()) {
    return path.resolve(explicit.trim())
  }
  const env = process.env.AIDOC_ROOT_ABS_PATH
  if (env && env.trim()) {
    return path.resolve(env.trim())
  }
  const marker = path.join('.cursor', 'skills', 'cp-data-fetch', 'scripts', 'dist')
  const norm = path.normalize(__dirname)
  const idx = norm.toLowerCase().lastIndexOf(marker.toLowerCase())
  if (idx >= 0) {
    return norm.slice(0, idx).replace(/[\\/]+$/, '') || path.resolve(norm, '..', '..', '..', '..')
  }
  throw new Error(
    'aidoc root unknown: pass --aidoc-root= or set AIDOC_ROOT_ABS_PATH (needed for ope=config cache path)'
  )
}

function configCachePath(
  aidocRoot: string,
  env: FetchEnv,
  appcode: string,
  moduleName: string
): string {
  return path.join(
    aidocRoot,
    '.config-cache',
    'cp',
    appcode,
    env,
    `${moduleName}_${appcode}.json`
  )
}

function writeConfigCache(filePath: string, config: unknown): { bytes: number } {
  const dir = path.dirname(filePath)
  fs.mkdirSync(dir, { recursive: true })
  const text = JSON.stringify(config, null, 2) + '\n'
  fs.writeFileSync(filePath, text, 'utf8')
  return { bytes: Buffer.byteLength(text, 'utf8') }
}

/** 含 __sheet_schemas__ 则可转表格（与 json-xlsx-convert 同源逻辑） */
function canConvertConfigToXlsx(config: unknown): boolean {
  if (!config || typeof config !== 'object') return false
  const schemas = (config as any).__sheet_schemas__
  if (!schemas || typeof schemas !== 'object') return false
  // 至少有一张业务 sheet 或 configData
  const keys = Object.keys(schemas).filter((k) => k !== '_fileName')
  return keys.length > 0
}

function configXlsxPath(jsonPath: string, config: any, moduleName: string, appcode: string): string {
  const dir = path.dirname(jsonPath)
  const fileName = config?.__sheet_schemas__?._fileName
  if (fileName) {
    const name = String(fileName).toLowerCase().endsWith('.xlsx')
      ? String(fileName)
      : `${fileName}.xlsx`
    return path.join(dir, name)
  }
  return path.join(dir, `${moduleName}_${appcode}.xlsx`)
}

function writeConfigXlsx(
  jsonPath: string,
  config: any,
  moduleName: string,
  appcode: string
): { xlsxPath: string; bytes: number } {
  const converter = new JSONToExcelConverter({
    arraySeparator: '|',
    array2DSeparator: ';',
  })
  const workbook = converter.convert(config)
  const xlsxPath = configXlsxPath(jsonPath, config, moduleName, appcode)
  fs.mkdirSync(path.dirname(xlsxPath), { recursive: true })
  XLSX.writeFile(workbook, xlsxPath)
  return { xlsxPath, bytes: fs.statSync(xlsxPath).size }
}

function loginHall(serverMode: ServerMode): Promise<boolean> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      console.error('[cp-fetch] hall login timeout')
      resolve(false)
    }, 30000)

    const connect =
      serverMode === ServerMode.Test
        ? hallmodule.hallConnectTest
        : hallmodule.hallConnect

    connect.loginHall(serverMode, (success: boolean) => {
      clearTimeout(timer)
      resolve(!!success)
    })
  })
}

function reqTest(
  ope: string,
  moduleName: string,
  appcode: string,
  uid: number | undefined
): Promise<any> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('reqtest timeout')), 30000)
    const body: Record<string, any> = {
      ope,
      modulename: moduleName,
      gamecode: appcode,
    }
    if (uid != null && Number.isFinite(uid) && uid > 0) {
      body.uid = uid
    }
    cpmodule.reqCP(
      'reqtest',
      body,
      (isOK: boolean, data?: any) => {
        clearTimeout(timer)
        if (!isOK) {
          reject(new Error('reqtest failed or empty response'))
          return
        }
        resolve(data)
      },
      'testtool'
    )
  })
}

function applyCredToClientInfo(target: typeof ClientInfo, cred: Credentials, appcode: string, gameid: number) {
  target.appcode = appcode
  target.gameid = gameid
  target.userid = cred.userid
  target.username = cred.username
  target.nickname = cred.username
  target.password = cred.password
  if (cred.hardid) target.hardid = cred.hardid
  if (cred.uniqueid) target.uniqueid = cred.uniqueid
  if (cred.channelid != null) target.channelid = cred.channelid
  if (cred.channelkey) target.channelkey = cred.channelkey
  if (cred.gameversion) target.gameversion = cred.gameversion
  if (cred.groupid != null) target.groupid = cred.groupid
  if (cred.appid != null) target.appid = cred.appid
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const appcode = args.appcode
  const gameid = Number(args.gameid)
  const moduleName = args.module
  const ope = (args.ope || 'info').toLowerCase()
  const fetchEnv = parseFetchEnv(args.env)
  const serverMode = toServerMode(fetchEnv)
  const queryUserId = args.userid != null && args.userid !== '' ? Number(args.userid) : undefined
  const credPath =
    args.credentials ||
    path.join(__dirname, '..', '..', 'intranet-credentials.json')

  if (!appcode || !Number.isFinite(gameid) || gameid <= 0 || !moduleName) usage()
  if (ope !== 'info' && ope !== 'config') {
    throw new Error(`unsupported --ope=${ope}; use info or config`)
  }
  if (ope === 'info' && (queryUserId == null || !Number.isFinite(queryUserId) || queryUserId <= 0)) {
    usage()
  }

  const cred = loadCredentialsForEnv(path.resolve(credPath), fetchEnv)
  const isInner = fetchEnv === 'inner'

  Config.serverMode = serverMode
  // HttpRequestPB 也会按 Test 关加密；此处与之一致
  Config.encrypted = isInner ? 0 : 1

  if (isInner) {
    applyClientConfig('test', {
      appcode,
      gameid,
      userid: cred.userid,
      username: cred.username,
      password: cred.password,
    })
    applyCredToClientInfo(ClientInfo_Debug, cred, appcode, gameid)
    CommonInfo.setClientInfo(ClientInfo_Debug)
    Protobuf.setClientInfo(ClientInfo_Debug)
  } else {
    applyClientConfig('production', {
      appcode,
      gameid,
      userid: cred.userid,
      username: cred.username,
      password: cred.password,
    })
    applyCredToClientInfo(ClientInfo, cred, appcode, gameid)
    CommonInfo.setClientInfo(ClientInfo)
    Protobuf.setClientInfo(ClientInfo)
  }

  cpmodule.reset()

  const loginOk = await loginHall(serverMode)
  if (!loginOk) {
    throw new Error(`hall login failed (env=${fetchEnv})`)
  }

  // 登录写回 uniqueid 后同步
  const active = isInner ? ClientInfo_Debug : ClientInfo
  CommonInfo.setClientInfo(active)
  Protobuf.setClientInfo(active)

  const initOk = await cpmodule.wait_initialize()
  if (!initOk) {
    throw new Error(`cp initialize / get_server failed (env=${fetchEnv})`)
  }

  const data = await reqTest(ope, moduleName, appcode, queryUserId)

  const result: Record<string, any> = {
    ok: true,
    env: fetchEnv,
    ope,
    appcode,
    gameid,
    module: moduleName,
    loginUserid: cred.userid,
    uniqueid: active.uniqueid,
  }

  if (ope === 'info') {
    result.userid = queryUserId
    result.player = data?.player ?? null
  } else {
    const config = data?.config ?? null
    const aidocRoot = resolveAidocRoot(args['aidoc-root'])
    const configPath = configCachePath(aidocRoot, fetchEnv, appcode, moduleName)
    if (config == null) {
      result.configPath = configPath
      result.config = null
      result.errorHint =
        'server returned null config (module missing or testtool without ope=config?)'
    } else {
      const { bytes } = writeConfigCache(configPath, config)
      result.configPath = configPath
      result.configBytes = bytes
      result.configTopKeys =
        typeof config === 'object' && config ? Object.keys(config as object) : []

      if (canConvertConfigToXlsx(config)) {
        try {
          const xlsx = writeConfigXlsx(configPath, config, moduleName, appcode)
          result.xlsxPath = xlsx.xlsxPath
          result.xlsxBytes = xlsx.bytes
        } catch (e) {
          result.xlsxPath = null
          result.xlsxError = e instanceof Error ? e.message : String(e)
        }
      } else {
        result.xlsxPath = null
        result.xlsxSkipped = 'no __sheet_schemas__; skip excel convert'
      }
    }
  }

  process.stdout.write(JSON.stringify(result, null, 2) + '\n')

  try {
    Socket.closeAll()
  } catch {
    /* ignore */
  }
  process.exit(0)
}

main().catch((err) => {
  const msg = err instanceof Error ? err.message : String(err)
  process.stderr.write(JSON.stringify({ ok: false, error: msg }) + '\n')
  try {
    Socket.closeAll()
  } catch {
    /* ignore */
  }
  process.exit(1)
})
