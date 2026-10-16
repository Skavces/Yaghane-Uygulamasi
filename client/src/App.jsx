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
    void (async () => {
      try {
        const res = await axios.get("/api/settings")
        setSettings(res.data)
      } catch (err) {
        console.error("Ayarlar çekilemedi", err)
      }
    })()
    socket.on("settings-updated", (newSettings) => {
       setSettings(newSettings)
    })
    return () => socket.off("settings-updated")
  }, [])

  const handleLogout = () => setRole(null)

  if (!role) {
    return <Login onLogin={(r) => setRole(r)} />
  }

  const istasyon = {
    girisci: "Giriş istasyonu",
    yagci: "Yağhane istasyonu",
    cikisci: "Çıkış istasyonu",
  }[role]

  return (
    <div className="min-h-screen bg-zemin">
      <header className="bg-murekkep sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-14 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <img src="/zeytin-logo.svg" alt="logo" className="w-8 h-8" />
            <div className="flex items-baseline gap-3">
              <h1 className="font-display text-base font-bold tracking-wide text-white">
                KAYA KARDEŞLER
              </h1>
              <span className="hidden sm:inline text-sm text-white/60">Zeytinyağı Fabrikası</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-sm font-semibold text-white/80">{istasyon}</span>
            <button
              onClick={handleLogout}
              className="btn border border-white/30 text-white hover:bg-white/10 py-1.5"
            >
              Çıkış yap
            </button>
          </div>
        </div>
      </header>

      <div className="pt-6">
        {role === "girisci" && <GirisciPanel />}
        {role === "yagci" && <YagciPanel defaultSettings={settings} />}
        {role === "cikisci" && <CikisciPanel defaultSettings={settings} />}
      </div>
    </div>
  )
}

export default App