/**
 * Node 运行时垫片：WebSocket + XMLHttpRequest（供大厅登录与 CP HTTP 使用）
 */
import http from 'http'
import https from 'https'
import { URL } from 'url'
import WebSocket from 'ws'

;(globalThis as any).WebSocket = WebSocket

// ToolManager config 会读写 localStorage
class MemoryStorage {
  private store = new Map<string, string>()
  getItem(key: string) {
    return this.store.has(key) ? this.store.get(key)! : null
  }
  setItem(key: string, value: string) {
    this.store.set(String(key), String(value))
  }
  removeItem(key: string) {
    this.store.delete(key)
  }
  clear() {
    this.store.clear()
  }
  key(i: number) {
    return Array.from(this.store.keys())[i] ?? null
  }
  get length() {
    return this.store.size
  }
}
;(globalThis as any).localStorage = new MemoryStorage()

class NodeXMLHttpRequest {
  readyState = 0
  status = 0
  response: ArrayBuffer | null = null
  responseType = ''
  timeout = 0
  onreadystatechange: (() => void) | null = null
  ontimeout: (() => void) | null = null
  onerror: ((ev?: any) => void) | null = null

  private _method = 'GET'
  private _url = ''
  private _headers: Record<string, string> = {}
  private _responseHeaders: Record<string, string> = {}
  private _aborted = false
  private _timer: NodeJS.Timeout | null = null

  open(method: string, url: string) {
    this._method = method
    this._url = url
    this.readyState = 1
  }

  setRequestHeader(name: string, value: string) {
    this._headers[name] = value
  }

  getResponseHeader(name: string): string | null {
    if (!name) return null
    const key = String(name).toLowerCase()
    const v = this._responseHeaders[key]
    return v != null ? v : null
  }

  send(body?: ArrayBuffer | Uint8Array | null) {
    const u = new URL(this._url)
    const isHttps = u.protocol === 'https:'
    const lib = isHttps ? https : http
    const payload =
      body == null
        ? undefined
        : Buffer.from(body instanceof ArrayBuffer ? new Uint8Array(body) : body)

    const req = lib.request(
      {
        protocol: u.protocol,
        hostname: u.hostname,
        port: u.port || (isHttps ? 443 : 80),
        path: u.pathname + u.search,
        method: this._method,
        headers: {
          ...this._headers,
          ...(payload ? { 'Content-Length': String(payload.length) } : {}),
        },
      },
      (res) => {
        this._responseHeaders = {}
        for (const [k, v] of Object.entries(res.headers)) {
          if (v == null) continue
          this._responseHeaders[k.toLowerCase()] = Array.isArray(v) ? v.join(', ') : String(v)
        }
        const chunks: Buffer[] = []
        res.on('data', (c) => chunks.push(c))
        res.on('end', () => {
          if (this._aborted) return
          if (this._timer) clearTimeout(this._timer)
          const buf = Buffer.concat(chunks)
          this.status = res.statusCode || 0
          this.response = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
          this.readyState = 4
          this.onreadystatechange?.()
        })
      }
    )

    req.on('error', (err) => {
      if (this._aborted) return
      if (this._timer) clearTimeout(this._timer)
      this.status = 0
      this.readyState = 4
      this.onerror?.(err)
      this.onreadystatechange?.()
    })

    if (this.timeout > 0) {
      this._timer = setTimeout(() => {
        this._aborted = true
        req.destroy()
        this.ontimeout?.()
      }, this.timeout)
    }

    if (payload) req.write(payload)
    req.end()
  }
}

;(globalThis as any).XMLHttpRequest = NodeXMLHttpRequest
;(globalThis as any).window = (globalThis as any).window || globalThis
