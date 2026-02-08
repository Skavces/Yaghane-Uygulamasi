import { useState, useEffect } from "react"
import axios from "axios"

export default function SettingsModal({ onClose, onSave }) {
  const [formData, setFormData] = useState({
    yag_fiyati: "",
    hak_oran: "",
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const res = await axios.get("/api/settings")
      setFormData({
        yag_fiyati: res.data.yag_fiyati,
        hak_oran: res.data.hak_oran,
      })
    } catch {
      setError("Ayarlar yüklenemedi.")
    }
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    try {
        await axios.put("/api/settings", formData)
        if (onSave) onSave(formData)
        onClose()
    } catch {
      setError("Ayarlar kaydedilemedi.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden border-2 border-white/60">
        <div className="bg-gradient-to-r from-slate-100 to-slate-200 p-6 border-b-2 border-slate-200 flex justify-between items-center">
          <h2 className="text-xl font-black text-slate-800">Ayarlar</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-red-500 text-2xl font-bold transition-colors"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-4">
          {error && (
             <div className="p-3 bg-red-50 text-red-700 text-sm font-bold rounded-xl border border-red-200">
               {error}
             </div>
          )}

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">
              Yağ Fiyatı (₺)
            </label>
            <input
              type="number"
              value={formData.yag_fiyati}
              onChange={(e) => setFormData({...formData, yag_fiyati: e.target.value})}
              className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-2xl text-lg font-bold text-slate-800 focus:outline-none focus:border-emerald-400 transition-all shadow-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">
              Hak Oranı (%)
            </label>
            <input
              type="number"
              value={formData.hak_oran}
              onChange={(e) => setFormData({...formData, hak_oran: e.target.value})}
              className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-2xl text-lg font-bold text-slate-800 focus:outline-none focus:border-emerald-400 transition-all shadow-sm"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-bold rounded-2xl shadow-lg transition-all"
          >
            {loading ? "Kaydediliyor..." : "Kaydet"}
          </button>
        </form>
      </div>
    </div>
  )
}
