import { useState, useEffect } from "react"
import axios from "axios"
import { ArrowUp, Folder, FolderPlus } from "lucide-react"

export default function KlasorSecici({ onSec, onVazgec }) {
  const [veri, setVeri] = useState(null)
  const [hata, setHata] = useState("")
  const [yeniAd, setYeniAd] = useState("")
  const [yeniAcik, setYeniAcik] = useState(false)

  const git = async (params) => {
    try {
      const res = await axios.get("/api/yedek/klasor-gez", { params })
      setVeri(res.data)
      setHata("")
    } catch (err) {
      setHata(err.response?.data?.msg || "Klasörler alınamadı.")
    }
  }

  useEffect(() => {
    axios
      .get("/api/yedek/klasor-gez")
      .then((res) => setVeri(res.data))
      .catch((err) => setHata(err.response?.data?.msg || "Klasörler alınamadı."))
  }, [])

  const klasorOlustur = async () => {
    if (!yeniAd.trim() || !veri?.yol) return
    setHata("")
    try {
      const res = await axios.post("/api/yedek/klasor-olustur", { ust: veri.yol, ad: yeniAd })
      setYeniAd("")
      setYeniAcik(false)
      await git({ yol: res.data.yol })
    } catch (err) {
      setHata(err.response?.data?.msg || "Klasör oluşturulamadı.")
    }
  }

  // Windows'ta ust === "" "Bilgisayar" (sürücü listesi) demektir; null ise üst yok.
  const ustaGit = () => (veri.ust === "" ? git({ kok: 1 }) : git({ yol: veri.ust }))

  return (
    <div className="border border-cizgi rounded p-3 space-y-2 bg-zemin/50">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={ustaGit}
          disabled={!veri || veri.ust === null}
          className="btn-secondary py-1 px-2 text-xs shrink-0"
          title="Üst klasör"
        >
          <ArrowUp className="w-3.5 h-3.5" /> Üst
        </button>
        <p className="readout text-xs text-murekkep/80 break-all">{veri ? veri.yol || "Bilgisayar" : "..."}</p>
      </div>

      {veri?.kisayollar?.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {veri.kisayollar.map((k) => (
            <button
              key={k.yol}
              type="button"
              onClick={() => git({ yol: k.yol })}
              className="text-xs px-2 py-1 rounded border border-cizgi bg-white text-murekkep/70 hover:text-murekkep"
            >
              {k.ad}
            </button>
          ))}
          {veri.yol !== "" && veri.ust === "" && (
            <button
              type="button"
              onClick={() => git({ kok: 1 })}
              className="text-xs px-2 py-1 rounded border border-cizgi bg-white text-murekkep/70 hover:text-murekkep"
            >
              Bilgisayar
            </button>
          )}
        </div>
      )}

      {hata && <p className="text-sm font-semibold text-red-700">{hata}</p>}

      <ul className="max-h-44 overflow-y-auto bg-white border border-cizgi rounded divide-y divide-cizgi">
        {veri && veri.klasorler.length === 0 && (
          <li className="px-3 py-2 text-sm text-murekkep/60">Bu klasörde alt klasör yok.</li>
        )}
        {veri?.klasorler.map((k) => (
          <li key={k.yol}>
            <button
              type="button"
              onClick={() => git({ yol: k.yol })}
              className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-murekkep hover:bg-zemin"
            >
              <Folder className="w-4 h-4 text-murekkep/50 shrink-0" />
              <span className="truncate">{k.ad}</span>
            </button>
          </li>
        ))}
      </ul>

      {yeniAcik ? (
        <div className="flex gap-2">
          <input
            value={yeniAd}
            onChange={(e) => setYeniAd(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                klasorOlustur()
              }
            }}
            placeholder="Yeni klasör adı"
            className="input text-sm"
            autoFocus
          />
          <button type="button" onClick={klasorOlustur} className="btn-secondary shrink-0">
            Oluştur
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setYeniAcik(true)}
          disabled={!veri?.yol}
          className="text-sm text-murekkep/70 hover:text-murekkep inline-flex items-center gap-1.5 disabled:opacity-40"
        >
          <FolderPlus className="w-4 h-4" /> Yeni klasör
        </button>
      )}

      <div className="flex gap-2 pt-1">
        <button type="button" onClick={onVazgec} className="btn-secondary flex-1">
          Vazgeç
        </button>
        <button type="button" onClick={() => onSec(veri.yol)} disabled={!veri?.yol} className="btn-primary flex-1">
          Bu klasörü seç
        </button>
      </div>
    </div>
  )
}
