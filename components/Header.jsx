export default function Header() {
  return (
    <header className="px-6 py-4 bg-white/80 backdrop-blur-md shadow-sm border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto flex items-center">
        <p className="text-2xl font-black tracking-tight text-gray-600">TRUST</p>

        <button onClick={() => console.log('録音音声表示')}
          className="ml-auto px-4 py-2 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2"
        >
          <span>録音音声表示</span>
        </button>
      </div>
    </header>

  );
}