import { LogOut, User as UserIcon, Plug } from 'lucide-react';
import { GmailUser } from '../types/gmail';

interface UserProfileProps {
  user: GmailUser;
  onLogout: () => void;
  onConnect?: () => void;
}

export function UserProfile({ user, onLogout, onConnect }: UserProfileProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 md:p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-3 md:gap-4 w-full sm:w-auto">
          {user.picture ? (
            <img
              src={user.picture}
              alt={user.name}
              className="w-12 h-12 md:w-16 md:h-16 rounded-full border-2 flex-shrink-0"
              style={{ borderColor: '#353d35' }}
            />
          ) : (
            <div className="w-12 h-12 md:w-16 md:h-16 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#e8ebe8' }}>
              <UserIcon className="w-6 h-6 md:w-8 md:h-8" style={{ color: '#353d35' }} />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h3 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white truncate">{user.name}</h3>
            <p className="text-sm md:text-base text-gray-600 dark:text-gray-400 truncate">{user.email}</p>
          </div>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          {onConnect && (
            <button
              onClick={onConnect}
              className="flex items-center justify-center gap-1.5 md:gap-2 px-3 md:px-4 py-2 text-sm md:text-base bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800 text-white rounded-lg transition-colors flex-1 sm:flex-initial flex-shrink-0"
            >
              <Plug className="w-4 h-4 md:w-5 md:h-5" />
              Activate Workflow
            </button>
          )}
          <button
            onClick={onLogout}
            className="flex items-center justify-center gap-1.5 md:gap-2 px-3 md:px-4 py-2 text-sm md:text-base bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700 text-white rounded-lg transition-colors flex-1 sm:flex-initial flex-shrink-0"
          >
            <LogOut className="w-4 h-4 md:w-5 md:h-5" />
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}
