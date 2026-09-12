import React from 'react';

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon?: React.ReactNode;
  variant?: 'default' | 'orange' | 'emerald' | 'amber' | 'blue' | 'rose';
  onClick?: () => void;
  id?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  variant = 'default',
  onClick,
  id,
}) => {
  const borderStyles = {
    default: 'border-slate-200 hover:border-slate-300',
    orange: 'border-orange-200 bg-orange-50/40 hover:border-orange-300',
    emerald: 'border-emerald-200 bg-emerald-50/40 hover:border-emerald-300',
    amber: 'border-amber-200 bg-amber-50/40 hover:border-amber-300',
    blue: 'border-sky-200 bg-sky-50/40 hover:border-sky-300',
    rose: 'border-rose-200 bg-rose-50/40 hover:border-rose-300',
  };

  const iconColors = {
    default: 'text-slate-600 bg-slate-100',
    orange: 'text-orange-600 bg-orange-100',
    emerald: 'text-emerald-600 bg-emerald-100',
    amber: 'text-amber-600 bg-amber-100',
    blue: 'text-sky-600 bg-sky-100',
    rose: 'text-rose-600 bg-rose-100',
  };

  return (
    <div
      id={id}
      onClick={onClick}
      className={`bg-white rounded-2xl p-4 border transition-all ${borderStyles[variant]} ${
        onClick ? 'cursor-pointer active:scale-[0.99]' : ''
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-slate-500 tracking-tight uppercase">
          {title}
        </span>
        {icon && (
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${iconColors[variant]}`}>
            {icon}
          </div>
        )}
      </div>

      <div className="mt-2.5">
        <h4 className="text-2xl font-bold text-slate-900 tracking-tight">{value}</h4>
        {subtitle && (
          <p className="text-xs text-slate-500 mt-1 font-medium">{subtitle}</p>
        )}
      </div>
    </div>
  );
};
