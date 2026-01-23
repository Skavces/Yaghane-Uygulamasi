import { useState, useEffect } from "react"
import axios from "axios"
import io from "socket.io-client"
import Login from "./components/Login"
import GirisciPanel from "./components/GirisciPanel"
import YagciPanel from "./components/YagciPanel"
import CikisciPanel from "./components/CikisciPanel"

const socket = io()

function App() {
  const [role, setRole] = useState(null) 
  const [settings, setSettings] = useState({ yag_fiyati: 300, hak_oran: 8 })

  useEffect(() => {
    fetchSettings()
    socket.on("settings-updated", (newSettings) => {
       setSettings(newSettings)
    })
    return () => socket.off("settings-updated")
  }, [])

  const fetchSettings = async () => {
    try {
      const res = await axios.get("/api/settings")
      setSettings(res.data)
    } catch (e) {
      console.error("Ayarlar çekilemedi", e)
    }
  }

  const handleLogout = () => setRole(null)

  if (!role) {
    return <Login onLogin={(r) => setRole(r)} />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 relative">
      <nav className="bg-gradient-to-r from-green-600 to-green-700 border-b border-green-800 shadow-sm sticky top-0 z-50 backdrop-blur-lg">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            { }
            <div className="flex items-center gap-3">
              <span className="text-4xl">🫒</span>
              <div>
                <h1 className="text-xl font-black text-white">
                  KAYA KARDEŞLER
                </h1>
                <p className="text-xs font-semibold text-green-100">Zeytinyağı Fabrikası</p>
              </div>
            </div>

            { }
            <div className="flex items-center gap-3">
              <button 
                onClick={handleLogout} 
                className="group flex items-center gap-2 px-5 py-2.5 bg-white hover:bg-red-500 text-green-700 hover:text-white font-semibold rounded-xl transition-all shadow-md hover:shadow-lg hover:scale-105 active:scale-95"
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
        </div>
      </nav>

      { }
      <div className="pt-6">
        {role === "girisci" && <GirisciPanel />}
        {role === "yagci" && <YagciPanel defaultSettings={settings} />}
        {role === "cikisci" && <CikisciPanel defaultSettings={settings} />}
      </div>
    </div>
  )
}

export default App