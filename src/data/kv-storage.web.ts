export function getItemSync(key: string): string | null {
  return window.localStorage.getItem(key);
}

export function setItemSync(key: string, value: string): void {
  window.localStorage.setItem(key, value);
}

export function removeItemSync(key: string): void {
  window.localStorage.removeItem(key);
}
