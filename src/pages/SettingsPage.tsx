import React, { useState, useRef } from 'react';
import {
  Building2,
  Lock,
  Database,
  FileSpreadsheet,
  RotateCcw,
  Smartphone,
  LogOut,
  CheckCircle2,
  AlertCircle,
  Download,
  Upload,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { AppSettings } from '../types';
import { updateSettings } from '../services/settingsService';
import { verifyPassword, hashNewPassword } from '../services/authService';
import {
  exportDatabaseToJson,
  importDatabaseFromJson,
  exportProductsToExcel,
  exportSalesToExcel,
  exportCustomersToExcel,
  exportSuppliersToExcel,
  exportExpensesToExcel,
  exportCounterHistoryToExcel,
} from '../services/backupService';
import { clearEntireDatabase } from '../database/indexedDB';
import { seedDatabase } from '../database/seedData';
import { getProducts } from '../services/productService';
import { getSales } from '../services/saleService';
import { getCustomers } from '../services/customerService';
import { getSuppliers } from '../services/supplierService';
import { getExpenses } from '../services/expenseService';
import { Button } from '../components/common/Button';
import { ConfirmDialog } from '../components/common/ConfirmDialog';

interface SettingsPageProps {
  settings: AppSettings;
  onSettingsUpdated: (newSettings: AppSettings) => void;
  onLogout: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  settings,
  onSettingsUpdated,
  onLogout,
}) => {
  // Accordion state
  const [openSection, setOpenSection] = useState<string>('profile');

  // Business Profile Form
  const [businessName, setBusinessName] = useState(settings.businessName);
  const [address, setAddress] = useState(settings.address || '');
  const [phone, setPhone] = useState(settings.phone || '');
  const [currency, setCurrency] = useState(settings.currency);
  const [taxPercentage, setTaxPercentage] = useState(settings.taxPercentage.toString());
  const [invoicePrefix, setInvoicePrefix] = useState(settings.invoicePrefix);
  const [profileSuccess, setProfileSuccess] = useState(false);

  // Security Form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  // Reset & Import States
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const toggleSection = (id: string) => {
    setOpenSection(openSection === id ? '' : id);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const tax = parseFloat(taxPercentage);
      const updated = await updateSettings({
        businessName: businessName.trim(),
        businessAddress: address.trim(),
        address: address.trim(),
        phoneNumber: phone.trim(),
        phone: phone.trim(),
        currency: currency.trim() || '$',
        taxPercentage: isNaN(tax) || tax < 0 ? 0 : tax,
        invoicePrefix: invoicePrefix.trim().toUpperCase() || 'ORD-',
      });
      onSettingsUpdated(updated);
      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 3000);
    } catch (err: any) {
      alert('Failed to save profile: ' + err?.message);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(false);

    if (!currentPassword) {
      setPasswordError('Please enter your current password.');
      return;
    }
    if (newPassword.length < 4) {
      setPasswordError('New password must be at least 4 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }

    try {
      const isValid = await verifyPassword(
        currentPassword,
        settings.adminPasswordHash,
        settings.adminPasswordSalt
      );
      if (!isValid) {
        setPasswordError('Current password is incorrect.');
        return;
      }

      const { hash, salt } = await hashNewPassword(newPassword);
      const updated = await updateSettings({
        adminPasswordHash: hash,
        adminPasswordSalt: salt,
        isFirstLaunch: false,
      });

      onSettingsUpdated(updated);
      setPasswordSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordSuccess(false), 3000);
    } catch (err: any) {
      setPasswordError('Failed to change password: ' + err?.message);
    }
  };

  const handleExportJson = async () => {
    try {
      await exportDatabaseToJson();
    } catch (err: any) {
      alert('Backup export failed: ' + err?.message);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm('Importing a backup will replace your current data. Are you sure you wish to continue?')) {
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    try {
      setImportStatus('Restoring database...');
      await importDatabaseFromJson(file);
      setImportStatus('Backup restored successfully! Refreshing...');
      setTimeout(() => {
        window.location.reload();
      }, 1200);
    } catch (err: any) {
      alert('Failed to restore backup: ' + err?.message);
      setImportStatus(null);
    }
  };

  const handleResetDatabase = async () => {
    try {
      await clearEntireDatabase();
      setIsResetConfirmOpen(false);
      window.location.reload();
    } catch (err: any) {
      alert('Failed to reset: ' + err?.message);
    }
  };

  // Direct Excel Exports
  const handleExportProducts = async () => {
    const prods = await getProducts();
    await exportProductsToExcel(prods, settings.currency);
  };

  const handleExportSales = async () => {
    const sls = await getSales();
    await exportSalesToExcel(sls, settings.currency);
  };

  const handleExportCustomers = async () => {
    const custs = await getCustomers();
    await exportCustomersToExcel(custs, settings.currency);
  };

  const handleExportSuppliers = async () => {
    const sups = await getSuppliers();
    await exportSuppliersToExcel(sups, settings.currency);
  };

  const handleExportExpenses = async () => {
    const exps = await getExpenses();
    await exportExpensesToExcel(exps, settings.currency);
  };

  return (
    <div id="settings-page" className="p-4 space-y-4 max-w-md mx-auto pb-24">
      <div>
        <h2 className="text-base font-bold text-slate-900">System Settings</h2>
        <p className="text-xs text-slate-500">Configure business profile & security</p>
      </div>

      {/* Accordion 1: Business Profile */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
        <button
          type="button"
          onClick={() => toggleSection('profile')}
          className="w-full p-4 flex items-center justify-between text-left font-bold text-xs text-slate-900 hover:bg-slate-50 cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-orange-600" />
            <span>Store Profile & Currency</span>
          </div>
          {openSection === 'profile' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {openSection === 'profile' && (
          <form onSubmit={handleSaveProfile} className="p-4 pt-0 border-t border-slate-100 space-y-3 text-xs">
            {profileSuccess && (
              <div className="p-2.5 bg-emerald-50 text-emerald-800 rounded-xl flex items-center gap-1.5 mt-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>Store profile updated successfully!</span>
              </div>
            )}

            <div className="mt-3">
              <label className="block font-semibold text-slate-700 mb-1">Business Name *</label>
              <input
                type="text"
                required
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Currency Symbol *</label>
                <input
                  type="text"
                  required
                  placeholder="$"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tax Rate (%)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={taxPercentage}
                  onChange={(e) => setTaxPercentage(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Store Phone</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium focus:bg-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Invoice Prefix</label>
                <input
                  type="text"
                  value={invoicePrefix}
                  onChange={(e) => setInvoicePrefix(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono uppercase font-bold focus:bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Store Address</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium focus:bg-white"
              />
            </div>

            <Button type="submit" variant="primary" size="sm" fullWidth id="save-profile-btn">
              Save Profile Changes
            </Button>
          </form>
        )}
      </div>

      {/* Accordion 2: Security & Password */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
        <button
          type="button"
          onClick={() => toggleSection('security')}
          className="w-full p-4 flex items-center justify-between text-left font-bold text-xs text-slate-900 hover:bg-slate-50 cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-orange-600" />
            <span>Admin Security & Password</span>
          </div>
          {openSection === 'security' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {openSection === 'security' && (
          <form onSubmit={handleChangePassword} className="p-4 pt-0 border-t border-slate-100 space-y-3 text-xs">
            {passwordError && (
              <div className="p-2.5 bg-rose-50 text-rose-700 rounded-xl mt-2">
                {passwordError}
              </div>
            )}
            {passwordSuccess && (
              <div className="p-2.5 bg-emerald-50 text-emerald-800 rounded-xl flex items-center gap-1.5 mt-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>Password changed securely!</span>
              </div>
            )}

            <div className="mt-3">
              <label className="block font-semibold text-slate-700 mb-1">Current Password</label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">New Password</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Confirm New</label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white"
                />
              </div>
            </div>

            <Button type="submit" variant="primary" size="sm" fullWidth id="update-password-btn">
              Update Admin Password
            </Button>
          </form>
        )}
      </div>

      {/* Accordion 3: JSON Backup & Restore */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
        <button
          type="button"
          onClick={() => toggleSection('backup')}
          className="w-full p-4 flex items-center justify-between text-left font-bold text-xs text-slate-900 hover:bg-slate-50 cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-orange-600" />
            <span>Database Backup & Restore</span>
          </div>
          {openSection === 'backup' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {openSection === 'backup' && (
          <div className="p-4 pt-0 border-t border-slate-100 space-y-3 text-xs">
            {importStatus && (
              <div className="p-2.5 bg-blue-50 text-blue-800 rounded-xl mt-2 font-medium">
                {importStatus}
              </div>
            )}
            <p className="text-slate-500 mt-3">
              Export an offline JSON snapshot of your entire database (products, sales, customers, counter history) or restore a previous backup.
            </p>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={handleExportJson}
                leftIcon={<Download className="w-3.5 h-3.5" />}
                id="export-json-btn"
              >
                Export Backup (JSON)
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => fileInputRef.current?.click()}
                leftIcon={<Upload className="w-3.5 h-3.5" />}
                id="import-json-btn"
              >
                Restore JSON
              </Button>
            </div>
            <input
              type="file"
              ref={fileInputRef}
              accept=".json"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
        )}
      </div>

      {/* Accordion 4: Direct One-Click Excel Reports */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
        <button
          type="button"
          onClick={() => toggleSection('excel')}
          className="w-full p-4 flex items-center justify-between text-left font-bold text-xs text-slate-900 hover:bg-slate-50 cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Excel Spreadsheets Export</span>
          </div>
          {openSection === 'excel' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {openSection === 'excel' && (
          <div className="p-4 pt-0 border-t border-slate-100 space-y-2 text-xs">
            <p className="text-slate-500 mt-3 mb-2">
              Export specific domain datasets directly into Microsoft Excel (.xlsx) files.
            </p>

            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm" onClick={handleExportSales}>
                Export Sales (.xlsx)
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportProducts}>
                Export Catalog (.xlsx)
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportCustomers}>
                Export Customers (.xlsx)
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportSuppliers}>
                Export Suppliers (.xlsx)
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportExpenses}>
                Export Expenses (.xlsx)
              </Button>
              <Button variant="outline" size="sm" onClick={() => exportCounterHistoryToExcel(settings.currency)}>
                Counter History (.xlsx)
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Accordion 5: Database Reset */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
        <button
          type="button"
          onClick={() => toggleSection('danger')}
          className="w-full p-4 flex items-center justify-between text-left font-bold text-xs text-slate-900 hover:bg-slate-50 cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <RotateCcw className="w-4 h-4 text-rose-600" />
            <span>Database Reset</span>
          </div>
          {openSection === 'danger' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {openSection === 'danger' && (
          <div className="p-4 pt-0 border-t border-slate-100 space-y-3 text-xs">
            <p className="text-slate-500 mt-3">
              Reset your local storage database to a clean starting state.
            </p>

            <div>
              <Button
                variant="danger"
                size="sm"
                fullWidth
                onClick={() => setIsResetConfirmOpen(true)}
                id="reset-database-btn"
              >
                Reset Database
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Accordion 6: Mobile & Capacitor Info */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
        <button
          type="button"
          onClick={() => toggleSection('mobile')}
          className="w-full p-4 flex items-center justify-between text-left font-bold text-xs text-slate-900 hover:bg-slate-50 cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-sky-600" />
            <span>Mobile APK & Offline Specs</span>
          </div>
          {openSection === 'mobile' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {openSection === 'mobile' && (
          <div className="p-4 pt-0 border-t border-slate-100 space-y-2 text-xs text-slate-600">
            <p className="mt-3">
              Orderly is architected mobile-first and 100% offline using IndexedDB and native touch handling.
            </p>
            <p className="font-mono text-[11px] bg-slate-100 p-2.5 rounded-xl text-slate-800">
              npm run build<br />
              npx cap add android<br />
              npx cap sync android<br />
              npx cap open android
            </p>
          </div>
        )}
      </div>

      {/* Logout Button */}
      <div className="pt-2">
        <Button
          variant="outline"
          size="md"
          fullWidth
          onClick={onLogout}
          leftIcon={<LogOut className="w-4 h-4" />}
          id="settings-logout-btn"
        >
          Lock POS Terminal (Log Out)
        </Button>
      </div>

      {/* Confirmation Dialogs */}
      <ConfirmDialog
        isOpen={isResetConfirmOpen}
        onClose={() => setIsResetConfirmOpen(false)}
        onConfirm={handleResetDatabase}
        title="Reset Entire Database"
        message="This will permanently delete all sales, products, customers, suppliers, expenses, and counter sessions from your browser/device. Are you completely sure?"
        confirmLabel="Wipe Database"
        isDestructive
      />
    </div>
  );
};
