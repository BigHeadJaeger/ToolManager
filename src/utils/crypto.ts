// 使用简单的加密/解密方法，生产环境建议使用更安全的方案
export function encrypt(text: string): string {
  return btoa(text);
}

export function decrypt(text: string): string {
  return atob(text);
} 