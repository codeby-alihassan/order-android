import React, { useState } from 'react';
import { Lock, Store, KeyRound, AlertCircle, ArrowRight } from 'lucide-react';
import { verifyPassword } from '../services/authService';
import { AppSettings } from '../types';
import { Button } from '../components/common/Button';

interface LoginPageProps {
  settings: AppSettings;
  onLoginSuccess: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  settings,
  onLoginSuccess,
}) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setError('Please enter your admin password.');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const isValid = await verifyPassword(
        password.trim(),
        settings.adminPasswordHash,
        settings.adminPasswordSalt
      );

      if (isValid) {
        onLoginSuccess();
      } else {
        setError('Incorrect password. Please try again.');
      }
    } catch (err: any) {
      setError('Login verification failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      id="login-page"
      className="min-h-screen bg-slate-50 flex flex-col justify-between p-4 sm:p-6"
    >
      <div className="flex-1 flex flex-col justify-center max-w-sm w-full mx-auto">
        {/* Brand Banner */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-orange-600 text-white flex items-center justify-center font-black text-3xl shadow-md mx-auto mb-3">
            O
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Orderly
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            {settings.businessName || 'Mobile-First Point of Sale'}
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <div className="mb-5">
            <h2 className="text-base font-bold text-slate-900">Welcome Back</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Enter Owner / Admin password to access POS
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label
                htmlFor="admin-username"
                className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5"
              >
                Username
              </label>
              <input
                id="admin-username"
                type="text"
                defaultValue="admin"
                readOnly
                className="w-full px-4 py-3 bg-slate-100 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 cursor-default"
              />
            </div>

            <div>
              <label
                htmlFor="admin-password"
                className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5"
              >
                Admin Password
              </label>
              <div className="relative">
                <input
                  id="admin-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoFocus
                  required
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
                />
                <KeyRound className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5 pointer-events-none" />
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              isLoading={isLoading}
              rightIcon={<ArrowRight className="w-4 h-4" />}
              id="login-submit-btn"
            >
              Unlock Terminal
            </Button>
          </form>

          {/* Default Account Hint (Required by Prompt Section 7) */}
          {settings.isFirstLaunch && (
            <div className="mt-5 pt-4 border-t border-slate-100 bg-orange-50/60 -mx-6 -mb-6 p-4 rounded-b-3xl border-t border-orange-100">
              <p className="text-[11px] font-bold text-orange-900 uppercase tracking-wider">
                Default Credentials:
              </p>
              <p className="text-xs text-orange-800 mt-0.5 font-mono">
                Username: <strong className="font-bold">admin</strong> • Password: <strong className="font-bold">admin123</strong>
              </p>
              <p className="text-[10px] text-orange-700 mt-1">
                You can change this password in Settings after login.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Footer Offline Notice */}
      <div className="text-center py-4 text-[11px] text-slate-400">
        100% Offline • Secure Local Data • Capacitor Ready
      </div>
    </div>
  );
};
