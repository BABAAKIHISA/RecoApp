export default function UserInfo({ user, signOut }) {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-center sm:items-center space-y-4 sm:space-y-0 bg-white/60 backdrop-blur-md px-6 py-4 rounded-2xl shadow-sm border border-white/80">
      <h2 className="text-2xl font-bold tracking-tight text-slate-900">ユーザ名</h2>
      <h1 className="text-xl font-bold text-slate-700 flex items-center gap-2">
        <span className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-500 flex items-center justify-center text-white shadow-md">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
        </span>
        {user?.signInDetails?.loginId || 'User'}  さん
      </h1>
      <button
        onClick={signOut}
        className="px-5 py-2 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2"
      >
        Sign out
      </button>
    </div>
  );
}
