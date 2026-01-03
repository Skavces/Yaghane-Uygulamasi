import { useState } from "react"

export default function Login({ onLogin }) {
  const [user, setUser] = useState("")
  const [error, setError] = useState("")

  const handleLogin = (e) => {
    e.preventDefault()
    setError("")
    if (!user) {
      setError("Bir rol seçmen lazım.")
      return
    }
    onLogin(user)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-amber-50 flex items-center justify-center p-6 relative overflow-hidden">
      {/* ARKA PLAN PATTERN */}
      <div className="absolute inset-0 opacity-[0.03]">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 2px 2px, #059669 1px, transparent 0)`,
          backgroundSize: '40px 40px'
        }}></div>
      </div>

      {/* ANIMATED GLOW EFFECTS */}
      <div className="absolute top-20 left-20 w-72 h-72 bg-emerald-200/40 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-20 right-20 w-96 h-96 bg-amber-200/40 rounded-full blur-3xl animate-pulse delay-1000"></div>

      <div className="w-full max-w-md relative z-10">
        {/* LOGO/BAŞLIK ALANI */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center mb-6">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full blur-2xl opacity-30 animate-pulse"></div>
              <span className="text-7xl relative z-10 inline-block transform hover:scale-110 transition-transform duration-300">🫒</span>
            </div>
          </div>
          
          <div className="space-y-2 mb-3">
            <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-red-600 to-red-700 tracking-tight">
              KAYA KARDEŞLER
            </h1>
            <h2 className="text-2xl font-bold text-slate-800 tracking-wide">
              ZEYTİNYAĞI FABRİKASI
            </h2>
          </div>
          
          <p className="text-slate-600 text-sm font-medium">Devam etmek için rol seçin</p>
        </div>

        {/* GİRİŞ KARTI */}
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/60 p-8 relative overflow-hidden">
          {/* Card Glow */}
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/50 to-transparent pointer-events-none"></div>
          
          <form onSubmit={handleLogin} className="space-y-6 relative z-10">
            {/* KULLANICI SEÇİMİ */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-3">
                Kullanıcı Rolü
              </label>
              <div className="relative group">
                <select
                  value={user}
                  onChange={(e) => setUser(e.target.value)}
                  className="w-full px-5 py-4 bg-white/80 border-2 border-slate-200 rounded-2xl text-slate-800 font-medium appearance-none focus:outline-none focus:border-emerald-400 focus:bg-white transition-all cursor-pointer backdrop-blur-sm hover:bg-white hover:border-slate-300 group-hover:shadow-md"
                >
                  <option value="">Rolünüzü seçin</option>
                  <option value="girisci">📝 Girişçi (Müşteri Kaydı)</option>
                  <option value="yagci">🏭 Yağcı (İşlem)</option>
                  <option value="cikisci">✅ Çıkışçı (Kontrol)</option>
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                  <svg
                    className="w-5 h-5 text-slate-400 group-hover:text-slate-600 transition-colors"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </div>
              </div>
            </div>

            {/* HATA MESAJI */}
            {error && (
              <div className="flex items-center gap-3 p-4 bg-red-50 border-2 border-red-200 rounded-2xl animate-shake">
                <svg
                  className="w-5 h-5 text-red-500 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
                <p className="text-sm text-red-700 font-semibold">{error}</p>
              </div>
            )}

            {/* GİRİŞ BUTONU */}
            <button
              type="submit"
              className="w-full py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-bold rounded-2xl transition-all shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-3 text-lg group"
            >
              <span>Giriş Yap</span>
              <svg
                className="w-5 h-5 group-hover:translate-x-1 transition-transform"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M13 7l5 5m0 0l-5 5m5-5H6"
                />
              </svg>
            </button>
          </form>
        </div>

        {/* ALT BİLGİ */}
        <div className="text-center mt-8">
          <p className="text-sm text-slate-600 font-medium">
            Sorun mu yaşıyorsunuz?{" "}
            <span className="text-emerald-600 hover:text-emerald-700 cursor-pointer transition-colors font-semibold underline decoration-2 underline-offset-2">
              Sistem yöneticisi ile iletişime geçin
            </span>
          </p>
        </div>
      </div>
    </div>
  )
}