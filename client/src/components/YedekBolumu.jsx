import { useState, useEffect, useRef } from "react"
import axios from "axios"
import { RotateCcw, Upload } from "lucide-react"

const ONAY_YAZISI = "GERİ YÜKLE"

const tarihYaz = (ms) =>
  new Date(ms).toLocaleString("tr-TR", { dateStyle: "short", timeStyle: "short" })

const boyutYaz = (b) => (b >= 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`)

export default function YedekBolumu() {
  const [klasor, setKlasor] = useState("")
  const [yedekler, setYedekler] = useState([])
  const [mesaj, setMesaj] = useState(null)
  const [mesgul, setMesgul] = useState(false)
  const [onay, setOnay] = useState(null)
  const [onayYazi, setOnayYazi] = useState("")
  const dosyaRef = useRef(null)

  const yukle = async () => {
    try {
      const res = await axios.get("/api/yedek")
      setKlasor(res.data.klasor)
      setYedekler(res.data.yedekler)
    } catch {
      setMesaj({ hata: true, metin: "Yedek bilgisi alınamadı." })
    }
  }

  useEffect(() => {
    yukle()
  }, [])

  const calistir = async (islem, basari) => {
    setMesgul(true)
    setMesaj(null)
    try {
      const res = await islem()
      setMesaj({ hata: false, metin: basari || res.data.msg })
      await yukle()
    } catch (err) {
      setMesaj({ hata: true, metin: err.response?.data?.msg || "İşlem başarısız." })
    } finally {
      setMesgul(false)
    }
  }

  const klasorKaydet = () => calistir(() => axios.put("/api/yedek/klasor", { klasor }))
  const simdiYedekAl = () => calistir(() => axios.post("/api/yedek/simdi"))

  const geriYukle = async () => {
    const hedef = onay
    setOnay(null)
    setOnayYazi("")
    if (hedef.dosya) {
      await calistir(() =>
        axios.post("/api/yedek/yukle", hedef.dosya, {
          headers: { "Content-Type": "application/octet-stream" },
          maxBodyLength: Infinity,
        })
      )
    } else {
      await calistir(() => axios.post(`/api/yedek/geri-yukle/${encodeURIComponent(hedef.ad)}`))
    }
  }

  const dosyaSecildi = (e) => {
    const dosya = e.target.files?.[0]
    e.target.value = ""
    if (dosya) setOnay({ dosya, ad: dosya.name })
  }

  const onayHazir = onayYazi.trim().toLocaleUpperCase("tr-TR") === ONAY_YAZISI

  return (
    <div className="pt-4 border-t border-cizgi space-y-3">
      <div>
        <h3 className="font-display text-base font-bold text-murekkep">Veritabanı yedeği</h3>
        <p className="text-sm text-murekkep/60">
          Her gün otomatik yedek alınır, son 30 gün saklanır. Klasör bu uygulamanın çalıştığı bilgisayardadır;
          USB bellek veya başka bir disk seçmek daha güvenlidir.
        </p>
      </div>

      {mesaj && (
        <div
          className={`p-3 text-sm font-semibold rounded border ${
            mesaj.hata ? "bg-red-50 text-red-700 border-red-200" : "bg-green-50 text-green-800 border-green-200"
          }`}
        >
          {mesaj.metin}
        </div>
      )}

      <div>
        <label className="label">Yedek klasörü</label>
        <div className="flex gap-2">
          <input
            value={klasor}
            onChange={(e) => setKlasor(e.target.value)}
            className="input readout text-sm"
            placeholder="/media/usb/yedek"
          />
          <button type="button" onClick={klasorKaydet} disabled={mesgul} className="btn-secondary">
            Kaydet
          </button>
        </div>
      </div>

      <div className="flex gap-2">
        <button type="button" onClick={simdiYedekAl} disabled={mesgul} className="btn-secondary flex-1">
          Şimdi yedek al
        </button>
        <button
          type="button"
          onClick={() => dosyaRef.current?.click()}
          disabled={mesgul}
          className="btn-secondary flex-1"
        >
          <Upload className="w-4 h-4" /> Dosyadan yükle
        </button>
        <input ref={dosyaRef} type="file" accept=".db" onChange={dosyaSecildi} className="hidden" />
      </div>

      {onay && (
        <div className="p-3 rounded border border-para/40 bg-para/5 space-y-2">
          <p className="text-sm text-murekkep">
            <span className="font-bold">{onay.ad}</span> geri yüklenecek. Şu anki bütün veriler bu yedekle
            değiştirilir (öncesinde mevcut verinin yedeği alınır). Devam etmek için{" "}
            <span className="readout font-bold">{ONAY_YAZISI}</span> yazın.
          </p>
          <input
            value={onayYazi}
            onChange={(e) => setOnayYazi(e.target.value)}
            className="input readout text-sm"
            autoFocus
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setOnay(null)
                setOnayYazi("")
              }}
              className="btn-secondary flex-1"
            >
              Vazgeç
            </button>
            <button type="button" onClick={geriYukle} disabled={!onayHazir || mesgul} className="btn-primary flex-1">
              Geri yükle
            </button>
          </div>
        </div>
      )}

      <div>
        <label className="label">Yedekler</label>
        {yedekler.length === 0 ? (
          <p className="text-sm text-murekkep/60">Bu klasörde henüz yedek yok.</p>
        ) : (
          <ul className="max-h-48 overflow-y-auto border border-cizgi rounded divide-y divide-cizgi">
            {yedekler.map((y) => (
              <li key={y.ad} className="flex items-center justify-between gap-2 px-3 py-2">
                <div className="min-w-0">
                  <p className="readout text-sm text-murekkep">{tarihYaz(y.tarih)}</p>
                  <p className="text-xs text-murekkep/60 truncate">
                    {y.ad} · {boyutYaz(y.boyut)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setOnay({ ad: y.ad })}
                  disabled={mesgul}
                  className="btn-secondary py-1 px-2 text-xs shrink-0"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Geri yükle
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
