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
    <div className="fixed inset-0 z-[60] bg-murekkep/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-md shadow-lg w-full max-w-sm overflow-hidden border border-cizgi">
        <div className="px-6 py-4 border-b border-cizgi flex justify-between items-center">
          <h2 className="font-display text-lg font-bold text-murekkep">Ayarlar</h2>
          <button
            onClick={onClose}
            aria-label="Kapat"
            className="text-murekkep/50 hover:text-murekkep text-2xl leading-none transition-colors"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-4">
          {error && (
             <div className="p-3 bg-red-50 text-red-700 text-sm font-semibold rounded border border-red-200">
               {error}
             </div>
          )}

          <div>
            <label className="label">Yağ fiyatı (₺)</label>
            <input
              type="number"
              value={formData.yag_fiyati}
              onChange={(e) => setFormData({...formData, yag_fiyati: e.target.value})}
              className="input readout text-lg"
            />
          </div>

          <div>
            <label className="label">Hak oranı (%)</label>
            <input
              type="number"
              value={formData.hak_oran}
              onChange={(e) => setFormData({...formData, hak_oran: e.target.value})}
              className="input readout text-lg"
            />
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? "Kaydediliyor..." : "Kaydet"}
          </button>
        </form>
      </div>
    </div>
  )
}
