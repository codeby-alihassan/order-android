import { AppSettings } from '../types';
import { getRecordById, putRecord, clearStore, StoreName } from '../database/indexedDB';
import { createDefaultSettings } from '../database/seedData';
import { hashPassword, verifyPassword, generateSalt } from './authService';

const SETTINGS_KEY = 'current_settings';
export const CLEAN_DB_MIGRATION_KEY = 'orderly_clean_db_migrated_v2';

export async function getSettings(): Promise<AppSettings> {
  let settings = await getRecordById<AppSettings>('settings', SETTINGS_KEY);
  if (!settings) {
    settings = await createDefaultSettings();
    await putRecord('settings', settings);
  }
  return settings;
}

export async function updateSettings(updates: Partial<AppSettings>): Promise<AppSettings> {
  const current = await getSettings();
  const updated: AppSettings = {
    ...current,
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  await putRecord('settings', updated);
  return updated;
}

export async function changeAdminPassword(
  currentPass: string,
  newPass: string
): Promise<{ success: boolean; message: string }> {
  const settings = await getSettings();

  const isCurrentValid = await verifyPassword(
    currentPass,
    settings.adminPasswordHash,
    settings.adminPasswordSalt
  );

  if (!isCurrentValid) {
    return { success: false, message: 'Current password is incorrect.' };
  }

  if (!newPass || newPass.trim().length < 6) {
    return { success: false, message: 'New password must be at least 6 characters.' };
  }

  const newSalt = await generateSalt(16);
  const newHash = await hashPassword(newPass.trim(), newSalt);

  await updateSettings({
    adminPasswordHash: newHash,
    adminPasswordSalt: newSalt,
    isFirstLaunch: false,
  });

  return { success: true, message: 'Password updated successfully!' };
}

/**
 * Wipes all demo/sample business data across all transactional and inventory stores.
 */
export async function clearAllDemoBusinessData(): Promise<void> {
  const businessStores: StoreName[] = [
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
  ];

  for (const store of businessStores) {
    await clearStore(store);
  }
}

/**
 * Initializes the app database with clean business data.
 * Guarantees that any existing demo data in the browser is purged while preserving
 * the default admin credentials (admin / admin123).
 */
export async function initAppDatabase(): Promise<AppSettings> {
  let settings = await getSettings();

  // One-time automatic cleanup to wipe any legacy demo data stored in the browser's IndexedDB
  if (localStorage.getItem(CLEAN_DB_MIGRATION_KEY) !== 'true') {
    await clearAllDemoBusinessData();

    // Reset demo business settings placeholders if present, keeping credentials untouched
    if (
      settings.businessAddress === '104 Market Avenue, Suite 2B' ||
      settings.businessName === 'Orderly Mart'
    ) {
      settings = await updateSettings({
        businessName: 'Orderly POS',
        businessAddress: '',
        phoneNumber: '',
        taxPercentage: 0,
      });
    }

    localStorage.setItem(CLEAN_DB_MIGRATION_KEY, 'true');
  }

  return settings;
}
