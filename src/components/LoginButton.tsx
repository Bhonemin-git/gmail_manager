import { TypewriterText } from './TypewriterText';

interface LoginButtonProps {
  onLogin: () => void;
}

export function LoginButton({ onLogin }: LoginButtonProps) {
  return (
    <div className="flex flex-col items-center justify-center w-full min-h-screen py-8">
      <div className="backdrop-blur-xl bg-white/5 dark:bg-gray-900/10 rounded-2xl shadow-2xl border border-white/20 dark:border-gray-700/30 py-8 px-8 max-w-lg w-full mx-4">
        <div className="flex flex-col items-center space-y-6">
          <div className="text-center space-y-6">
            <div className="mx-auto flex items-center justify-center mb-2">
              <h1 className="text-5xl font-extrabold text-cyan-400 drop-shadow-2xl tracking-tight" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                RouteRight
              </h1>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white drop-shadow-lg whitespace-nowrap">From Inbox Chaos to Clear Action</h2>
            <p className="text-gray-200 dark:text-gray-200 drop-shadow-md leading-relaxed min-h-[4.5rem]">
              <TypewriterText
                text="Securely connect your Gmail account to view insights and trigger automated workflows through n8n integration."
                speed={65}
                delay={800}
                className="text-gray-200 dark:text-gray-200"
              />
            </p>
          </div>
          <button
            onClick={onLogin}
            className="px-8 py-4 text-white font-semibold rounded-lg transition-transform hover:scale-105"
            style={{
              backgroundColor: '#06b6d4',
              boxShadow: '0 0 20px rgba(255, 255, 255, 0.5), 0 0 40px rgba(6, 182, 212, 0.3)'
            }}
          >
            Connect Gmail Account
          </button>
        </div>
      </div>
    </div>
  );
}
