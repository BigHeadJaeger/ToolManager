/**
 * CP 配置：Excel ↔ JSON 互转 CLI（逻辑来自 src/modules/jsontoexcel.ts）
 */
import * as fs from 'fs'
import * as path from 'path'
import * as XLSX from 'xlsx'
import {
  FlexibleExcelToJSONConverter,
  JSONToExcelConverter,
} from '../src/modules/jsontoexcel'

type Mode = 'to-json' | 'to-xlsx'

function usage(): never {
  console.error(`Usage:
  node json-xlsx.cjs --to-json  --in=<xlsx> [--out=<json>]
  node json-xlsx.cjs --to-xlsx  --in=<json> [--out=<xlsx>]

Naming (CP tianqi_common 约定):
  Excel 文件名常为: <中文名>@<module>_<appcode>@cp@tianqi_common.xlsx
  默认 JSON 输出: <module>_<appcode>.json（取 @ 第二段）
  JSON→Excel 优先用 __sheet_schemas__._fileName 作为 xlsx 名
`)
  process.exit(2)
}

function parseArgs(argv: string[]) {
  const out: Record<string, string> = {}
  let mode: Mode | undefined
  for (const a of argv) {
    if (a === '--to-json') {
      mode = 'to-json'
      continue
    }
    if (a === '--to-xlsx' || a === '--to-excel') {
      mode = 'to-xlsx'
      continue
    }
    if (!a.startsWith('--')) continue
    const eq = a.indexOf('=')
    if (eq < 0) usage()
    out[a.slice(2, eq)] = a.slice(eq + 1)
  }
  return { mode, ...out } as Record<string, string> & { mode?: Mode }
}

function defaultJsonOutFromXlsx(xlsxPath: string): string {
  const base = path.basename(xlsxPath)
  const parts = base.split('@')
  if (parts.length >= 2 && parts[1]) {
    return path.join(path.dirname(xlsxPath), `${parts[1]}.json`)
  }
  return xlsxPath.replace(/\.[^.]+$/i, '.json')
}

function defaultXlsxOutFromJson(jsonPath: string, jsonData: any): string {
  const fileName = jsonData?.__sheet_schemas__?._fileName
  if (fileName) {
    const name = String(fileName).toLowerCase().endsWith('.xlsx')
      ? String(fileName)
      : `${fileName}.xlsx`
    return path.join(path.dirname(jsonPath), name)
  }
  return jsonPath.replace(/\.jsonc?$/i, '.xlsx')
}

function main() {
  const args = parseArgs(process.argv.slice(2))
  const input = args.in || args.input
  if (!args.mode || !input) usage()

  const inPath = path.resolve(input)
  if (!fs.existsSync(inPath)) {
    throw new Error(`input not found: ${inPath}`)
  }

  if (args.mode === 'to-json') {
    const converter = new FlexibleExcelToJSONConverter({
      autoTypeInference: true,
      arraySeparator: '|',
      skipEmptyRows: true,
    })
    const retJson = converter.convertFile(inPath)
    const outPath = path.resolve(args.out || defaultJsonOutFromXlsx(inPath))
    fs.mkdirSync(path.dirname(outPath), { recursive: true })
    fs.writeFileSync(outPath, JSON.stringify(retJson, null, 4) + '\n', 'utf8')
    const result = {
      ok: true,
      mode: 'to-json',
      in: inPath,
      out: outPath,
      bytes: fs.statSync(outPath).size,
      topKeys: Object.keys(retJson || {}),
      fileName: retJson?.__sheet_schemas__?._fileName ?? null,
    }
    process.stdout.write(JSON.stringify(result, null, 2) + '\n')
    return
  }

  // to-xlsx
  let fileContent = fs.readFileSync(inPath, 'utf8')
  const nullIndex = fileContent.indexOf('\0')
  if (nullIndex !== -1) {
    fileContent = fileContent.substring(0, nullIndex)
  }
  const jsonData = JSON.parse(fileContent)
  const converter = new JSONToExcelConverter({
    arraySeparator: '|',
    array2DSeparator: ';',
  })
  const workbook = converter.convert(jsonData)
  const outPath = path.resolve(args.out || defaultXlsxOutFromJson(inPath, jsonData))
  fs.mkdirSync(path.dirname(outPath), { recursive: true })
  XLSX.writeFile(workbook, outPath)
  const result = {
    ok: true,
    mode: 'to-xlsx',
    in: inPath,
    out: outPath,
    bytes: fs.statSync(outPath).size,
    fileName: jsonData?.__sheet_schemas__?._fileName ?? null,
  }
  process.stdout.write(JSON.stringify(result, null, 2) + '\n')
}

try {
  main()
} catch (err) {
  const msg = err instanceof Error ? err.message : String(err)
  process.stderr.write(JSON.stringify({ ok: false, error: msg }) + '\n')
  process.exit(1)
}
