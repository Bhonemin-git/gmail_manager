import { LogOut, Plug } from 'lucide-react';
import { GmailUser } from '../types/gmail';

interface HeaderProps {
  user?: GmailUser | null;
  onLogout?: () => void;
  onConnect?: () => void;
  onLogoClick?: () => void;
}

export function Header({ user, onLogout, onConnect, onLogoClick }: HeaderProps = {}) {
  return (
    <header
      className="py-6 md:py-8 border-b"
      style={{
        background: 'linear-gradient(to bottom, #0B1E52, #050B22)',
        color: '#e5e5e5',
        borderColor: '#404040'
      }}
    >
      <div className="container mx-auto px-3 md:px-4">
        <div className="flex items-center justify-between gap-3 md:gap-4">
          <div className="flex items-center gap-2 md:gap-3 min-w-0">
            <button
              onClick={onLogoClick}
              className="text-3xl md:text-4xl font-extrabold truncate tracking-tight cursor-pointer hover:opacity-80 transition-opacity"
              style={{ color: '#06b6d4' }}
            >
              RouteRight
            </button>
          </div>
          <div className="flex items-center gap-2 md:gap-4">
            {user && (
              <div className="flex items-center gap-2 md:gap-3">
                <div className="hidden md:flex items-center gap-2 md:gap-3">
                  {user.picture && (
                    <img
                      src={user.picture}
                      alt={user.name}
                      className="w-12 h-12 rounded-full border-2 flex-shrink-0"
                      style={{ borderColor: '#353d35' }}
                    />
                  )}
                  <div className="min-w-0 max-w-[200px]">
                    <p className="text-base font-semibold truncate" style={{ color: '#e5e5e5' }}>{user.name}</p>
                    <p className="text-sm truncate" style={{ color: '#a0a0a0' }}>{user.email}</p>
                  </div>
                </div>
                <div className="md:hidden">
                  {user.picture && (
                    <img
                      src={user.picture}
                      alt={user.name}
                      className="w-8 h-8 rounded-full border-2 flex-shrink-0"
                      style={{ borderColor: '#353d35' }}
                    />
                  )}
                </div>
                <div className="flex gap-1.5 md:gap-2">
                  {onConnect && (
                    <button
                      onClick={onConnect}
                      className="flex items-center justify-center gap-1.5 px-3 md:px-4 py-2 md:py-2.5 text-sm md:text-base text-white rounded-lg transition-colors font-medium"
                      style={{ backgroundColor: '#0891b2' }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#06b6d4'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#0891b2'}
                      title="Activate Workflow"
                    >
                      <Plug className="w-4 h-4 md:w-5 md:h-5" />
                      <span className="hidden sm:inline">Activate Workflow</span>
                    </button>
                  )}
                  {onLogout && (
                    <button
                      onClick={onLogout}
                      className="flex items-center justify-center gap-1.5 px-3 md:px-4 py-2 md:py-2.5 text-sm md:text-base text-white rounded-lg transition-colors font-medium"
                      style={{ backgroundColor: '#dc2626' }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#ef4444'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#dc2626'}
                      title="Logout"
                    >
                      <LogOut className="w-4 h-4 md:w-5 md:h-5" />
                      <span className="hidden sm:inline">Logout</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
