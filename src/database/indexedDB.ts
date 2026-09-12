/**
 * IndexedDB Database Service Layer for Orderly POS
 * Manages all local persistent tables/stores.
 */

const DB_NAME = 'orderly_pos_db';
const DB_VERSION = 1;

export const STORE_NAMES = [
  'settings',
  'products',
  'customers',
  'suppliers',
  'purchases',
  'purchase_items',
  'sales',
  'sale_items',
  'expenses',
  'counter_sessions',
  'counter_movements',
  'stock_adjustments',
  'customer_transactions',
  'supplier_transactions',
] as const;

export type StoreName = (typeof STORE_NAMES)[number];

let dbInstance: IDBDatabase | null = null;
let dbInitPromise: Promise<IDBDatabase> | null = null;

export function getDB(): Promise<IDBDatabase> {
  if (dbInstance) {
    return Promise.resolve(dbInstance);
  }

  if (dbInitPromise) {
    return dbInitPromise;
  }

  dbInitPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = (event.target as IDBOpenDBRequest).result;

      STORE_NAMES.forEach((storeName) => {
        if (!db.objectStoreNames.contains(storeName)) {
          const store = db.createObjectStore(storeName, { keyPath: 'id' });

          // Indexes for fast lookup where relevant
          if (storeName === 'sales' || storeName === 'purchases' || storeName === 'expenses') {
            store.createIndex('by_date', 'date', { unique: false });
          }
          if (storeName === 'counter_movements') {
            store.createIndex('by_session', 'sessionId', { unique: false });
          }
          if (storeName === 'customer_transactions') {
            store.createIndex('by_customer', 'customerId', { unique: false });
          }
          if (storeName === 'supplier_transactions') {
            store.createIndex('by_supplier', 'supplierId', { unique: false });
          }
        }
      });
    };

    request.onsuccess = (event: Event) => {
      dbInstance = (event.target as IDBOpenDBRequest).result;
      dbInstance.onclose = () => {
        dbInstance = null;
        dbInitPromise = null;
      };
      resolve(dbInstance);
    };

    request.onerror = (event: Event) => {
      dbInitPromise = null;
      console.error('IndexedDB open error:', (event.target as IDBOpenDBRequest).error);
      reject((event.target as IDBOpenDBRequest).error);
    };
  });

  return dbInitPromise;
}

export async function getAllRecords<T>(storeName: StoreName): Promise<T[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.getAll();

    request.onsuccess = () => resolve((request.result || []) as T[]);
    request.onerror = () => reject(request.error);
  });
}

export async function getRecordById<T>(storeName: StoreName, id: string): Promise<T | undefined> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.get(id);

    request.onsuccess = () => resolve(request.result as T | undefined);
    request.onerror = () => reject(request.error);
  });
}

export async function putRecord<T extends { id: string }>(storeName: StoreName, item: T): Promise<T> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.put(item);

    request.onsuccess = () => resolve(item);
    request.onerror = () => reject(request.error);
  });
}

export async function putManyRecords<T extends { id: string }>(storeName: StoreName, items: T[]): Promise<void> {
  if (items.length === 0) return;
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);

    for (const item of items) {
      store.put(item);
    }
  });
}

export async function deleteRecord(storeName: StoreName, id: string): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function clearStore(storeName: StoreName): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.clear();

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function exportAllStores(): Promise<Record<string, any[]>> {
  const backup: Record<string, any[]> = {};
  for (const store of STORE_NAMES) {
    backup[store] = await getAllRecords(store);
  }
  return backup;
}

export async function importAllStores(data: Record<string, any[]>): Promise<void> {
  for (const store of STORE_NAMES) {
    if (Array.isArray(data[store])) {
      await clearStore(store);
      await putManyRecords(store, data[store]);
    }
  }
}

export async function resetAllData(): Promise<void> {
  for (const store of STORE_NAMES) {
    if (store !== 'settings') {
      await clearStore(store);
    }
  }
}

export async function clearEntireDatabase(): Promise<void> {
  for (const store of STORE_NAMES) {
    await clearStore(store);
  }
}
