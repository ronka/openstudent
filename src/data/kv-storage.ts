import Storage from 'expo-sqlite/kv-store';

export function getItemSync(key: string): string | null {
  return Storage.getItemSync(key);
}

export function setItemSync(key: string, value: string): void {
  Storage.setItemSync(key, value);
}

export function removeItemSync(key: string): void {
  Storage.removeItemSync(key);
}
