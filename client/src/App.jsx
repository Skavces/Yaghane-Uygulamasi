import { useState } from "react"
import Login from "./components/Login"
import GirisciPanel from "./components/GirisciPanel"
import YagciPanel from "./components/YagciPanel"
import CikisciPanel from "./components/CikisciPanel"

function App() {
  const [role, setRole] = useState(null) 
  
  const handleLogout = () => setRole(null)

  if (!role) {
    return <Login onLogin={(r) => setRole(r)} />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Navbar */}
      <nav className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-50 backdrop-blur-lg bg-white/95">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            {/* Sol Taraf - Logo ve Başlık */}
            <div className="flex items-center gap-3">
              <span className="text-4xl">🫒</span>
              <div>
                <h1 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-red-600">
                  KAYA KARDEŞLER
                </h1>
                <p className="text-xs font-semibold text-slate-500">Zeytinyağı Fabrikası</p>
              </div>
            </div>

            {/* Sağ Taraf - Çıkış Butonu */}
            <button 
              onClick={handleLogout} 
              className="group flex items-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-semibold rounded-xl transition-all shadow-md hover:shadow-lg hover:scale-105 active:scale-95"
            >
              <svg 
                className="w-4 h-4 group-hover:rotate-12 transition-transform" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" 
                />
              </svg>
              <span className="text-sm">Çıkış Yap</span>
            </button>
          </div>
        </div>
      </nav>
      
      <div>
        {role === "girisci" && <GirisciPanel />}
        {role === "yagci" && <YagciPanel />}
        {role === "cikisci" && <CikisciPanel />}
      </div>
    </div>
  )
}

export default App