import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1e3c6e] via-[#2a5298] to-[#1e3c6e] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-10 text-center">
        <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <svg
            className="text-red-500 w-8 h-8"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Link Expired or Invalid</h1>
        <p className="text-slate-500 text-sm mb-6 leading-relaxed">
          This share link has expired or is no longer valid. Please contact your agent
          for a new link.
        </p>
        <div className="pt-4 border-t border-slate-100">
          <div className="flex items-center justify-center gap-2">
            <div className="w-6 h-6 bg-[#1e3c6e] rounded-md flex items-center justify-center">
              <span className="text-white font-black text-xs">A</span>
            </div>
            <span className="text-sm text-slate-400 font-medium">AINO Real Estate</span>
          </div>
        </div>
      </div>
    </div>
  )
}
