import { useState } from "react"
import { ClipboardList, Factory, PackageCheck, Settings } from "lucide-react"
import SettingsModal from "./SettingsModal"

export default function Login({ onLogin }) {
  const [error, setError] = useState("")
  const [settingsOpen, setSettingsOpen] = useState(false)

  const handleLogin = (role) => {
    setError("")
    if (!role) {
      setError("Bir rol seçmen lazım.")
      return
    }
    onLogin(role)
  }

  const roles = [
    { id: "girisci", title: "Giriş", icon: ClipboardList, description: "Zeytin teslim alma ve müşteri kaydı" },
    { id: "yagci", title: "Yağhane", icon: Factory, description: "Sıkım ve yağ ölçümü" },
    { id: "cikisci", title: "Çıkış", icon: PackageCheck, description: "Teslim, ödeme ve bidon iadesi" },
  ]

  return (
    <div className="min-h-screen bg-zemin flex items-center justify-center p-6">
      <div className="w-full max-w-4xl">
        <div className="flex items-center gap-4 mb-8">
          <img src="/zeytin-logo.svg" alt="logo" className="w-16 h-16" />
          <div>
            <h1 className="font-display text-3xl font-bold tracking-wide text-murekkep">
              KAYA KARDEŞLER
            </h1>
            <p className="text-murekkep/60">Zeytinyağı Fabrikası · İstasyon seçin</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {roles.map((role, index) => (
            <button
              key={role.id}
              type="button"
              onClick={() => handleLogin(role.id)}
              className="card group text-left p-6 hover:border-zeytin transition-colors"
            >
              <div className="flex items-center justify-between mb-6">
                <span className="fis-no">{index + 1}</span>
                <role.icon className="w-6 h-6 text-zeytin" strokeWidth={1.75} />
              </div>
              <h3 className="font-display text-2xl font-bold text-murekkep mb-1">{role.title}</h3>
              <p className="text-murekkep/60 mb-6 min-h-[3rem]">{role.description}</p>
              <span className="text-sm font-semibold text-zeytin group-hover:underline">
                Aç →
              </span>
            </button>
          ))}
        </div>

        {error && (
          <p role="alert" className="mt-4 text-sm font-semibold text-red-700">{error}</p>
        )}

        <div className="mt-8 flex items-center justify-between text-sm text-murekkep/60">
          <div className="flex items-center gap-2">
            <span>Tasarım & Kodlama</span>
            <a
              href="https://selimkavaklicesme.com"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-murekkep hover:underline"
            >
              www.selimkavaklicesme.com
            </a>
            <span aria-hidden="true">·</span>
            <a href="tel:+905516021021" className="font-semibold text-zeytin hover:underline">
              0551 602 1021
            </a>
          </div>

          <button
            onClick={() => setSettingsOpen(true)}
            className="btn-secondary py-1.5"
            title="Ayarlar"
          >
            <Settings className="w-4 h-4" /> Ayarlar
          </button>
        </div>
      </div>

      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
    </div>
  )
}
