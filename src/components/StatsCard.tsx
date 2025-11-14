import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  icon: LucideIcon;
  label: string;
  value: number;
  color: string;
  unreadCount?: number;
  onClick?: () => void;
}

export function StatsCard({ icon: Icon, label, value, color, unreadCount, onClick }: StatsCardProps) {
  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 md:p-6 hover:shadow-lg transition-all ${onClick ? 'cursor-pointer hover:scale-105 active:scale-100' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-center gap-3 md:gap-4">
        <div className={`p-2 md:p-3 rounded-lg ${color}`}>
          <Icon className="w-5 h-5 md:w-6 md:h-6 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 font-medium truncate">{label}</p>
          <p className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
          {unreadCount !== undefined && (
            <p className="text-sm font-medium mt-1" style={{ color: '#353d35' }}>
              {unreadCount} unread
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
