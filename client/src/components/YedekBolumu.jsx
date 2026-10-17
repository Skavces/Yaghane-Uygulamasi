import { useState, useEffect, useRef } from "react"
import axios from "axios"
import { FolderOpen, RotateCcw, Upload, X } from "lucide-react"

const ONAY_YAZISI = "GERİ YÜKLE"

const SAYFA = 20
const BOS_FILTRE = { baslangic: "", bitis: "", tur: "" }

const TUR_ROZET = {
  otomatik: { ad: "Günlük", sinif: "bg-zeytin/10 text-zeytin" },
  elle: { ad: "Elle", sinif: "bg-sizma/10 text-sizma" },
  oncesi: { ad: "Öncesi", sinif: "bg-para/10 text-para" },
}

// "2026-10-17" + "190900" -> "17.10.2026 19:09" (otomatik yedeklerde saat yok)
const yedekTarihYaz = (gun, saat) => {
  const [y, a, g] = gun.split("-")
  return saat ? `${g}.${a}.${y} ${saat.slice(0, 2)}:${saat.slice(2, 4)}` : `${g}.${a}.${y}`
}

const gunStr = (d) => d.toLocaleDateString("sv-SE")

const filtreParams = (f) => Object.fromEntries(Object.entries(f).filter(([, v]) => v))

const boyutYaz = (b) => (b >= 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`)

export default function YedekBolumu() {
  const [klasor, setKlasor] = useState("")
  const [yedekler, setYedekler] = useState([])
  const [toplam, setToplam] = useState(0)
  const [filtre, setFiltre] = useState(BOS_FILTRE)
  const [yenile, setYenile] = useState(0)
  const [mesaj, setMesaj] = useState(null)
  const [mesgul, setMesgul] = useState(false)
  const [onay, setOnay] = useState(null)
  const [onayYazi, setOnayYazi] = useState("")
  const [pencereAcik, setPencereAcik] = useState(false)
  const dosyaRef = useRef(null)

  // Filtre değişince ya da bir işlem bitince liste ilk sayfadan yeniden yüklenir.
  useEffect(() => {
    let iptal = false
    axios
      .get("/api/yedek", { params: { ...filtreParams(filtre), limit: SAYFA } })
      .then((res) => {
        if (iptal) return
        setKlasor(res.data.klasor)
        setYedekler(res.data.yedekler)
        setToplam(res.data.toplam)
      })
      .catch((err) => {
        if (!iptal) setMesaj({ hata: true, metin: err.response?.data?.msg || "Yedek bilgisi alınamadı." })
      })
    return () => {
      iptal = true
    }
  }, [filtre, yenile])

  const dahaFazla = async () => {
    try {
      const res = await axios.get("/api/yedek", {
        params: { ...filtreParams(filtre), limit: SAYFA, offset: yedekler.length },
      })
      setYedekler((onceki) => [...onceki, ...res.data.yedekler])
      setToplam(res.data.toplam)
    } catch (err) {
      setMesaj({ hata: true, metin: err.response?.data?.msg || "Yedek bilgisi alınamadı." })
    }
  }

  const hizliTarih = (gunSayisi) => {
    const bugun = new Date()
    const bas = new Date()
    if (gunSayisi === "ay") bas.setDate(1)
    else bas.setDate(bugun.getDate() - (gunSayisi - 1))
    setFiltre((f) => ({ ...f, baslangic: gunStr(bas), bitis: gunStr(bugun) }))
  }

  const filtreVar = Object.values(filtre).some(Boolean)

  const calistir = async (islem, basari) => {
    setMesgul(true)
    setMesaj(null)
    try {
      const res = await islem()
      setMesaj({ hata: false, metin: basari || res.data.msg })
      setYenile((n) => n + 1)
    } catch (err) {
      setMesaj({ hata: true, metin: err.response?.data?.msg || "İşlem başarısız." })
    } finally {
      setMesgul(false)
    }
  }

  const klasorSec = async () => {
    setPencereAcik(true)
    setMesaj(null)
    try {
      const res = await axios.post("/api/yedek/klasor-sec")
      if (res.data.yol) await calistir(() => axios.put("/api/yedek/klasor", { klasor: res.data.yol }))
    } catch (err) {
      setMesaj({ hata: true, metin: err.response?.data?.msg || "Klasör seçilemedi." })
    } finally {
      setPencereAcik(false)
    }
  }
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
    <div className="space-y-3">
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
          <input value={klasor} readOnly className="input readout text-sm" />
          <button
            type="button"
            onClick={klasorSec}
            disabled={mesgul || pencereAcik}
            className="btn-secondary shrink-0"
          >
            <FolderOpen className="w-4 h-4" /> {pencereAcik ? "Pencere açık..." : "Klasör seç"}
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
          <Upload className="w-4 h-4" /> Yedek yükle
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

      <div className="space-y-2">
        <label className="label">Yedekler ({toplam})</label>

        <div className="grid grid-cols-2 gap-2">
          <input
            type="date"
            value={filtre.baslangic}
            max={filtre.bitis || undefined}
            onChange={(e) => setFiltre({ ...filtre, baslangic: e.target.value })}
            className="input text-sm py-1.5"
            aria-label="Başlangıç tarihi"
          />
          <input
            type="date"
            value={filtre.bitis}
            min={filtre.baslangic || undefined}
            onChange={(e) => setFiltre({ ...filtre, bitis: e.target.value })}
            className="input text-sm py-1.5"
            aria-label="Bitiş tarihi"
          />
        </div>

        <div className="flex gap-2">
          <select
            value={filtre.tur}
            onChange={(e) => setFiltre({ ...filtre, tur: e.target.value })}
            className="input text-sm py-1.5"
            aria-label="Yedek türü"
          >
            <option value="">Tüm türler</option>
            <option value="otomatik">Günlük</option>
            <option value="elle">Elle</option>
            <option value="oncesi">Geri yükleme öncesi</option>
          </select>
          {filtreVar && (
            <button
              type="button"
              onClick={() => setFiltre(BOS_FILTRE)}
              className="btn-secondary py-1.5 px-3 shrink-0 text-sm"
            >
              <X className="w-4 h-4" /> Temizle
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5">
          {[
            ["Bugün", 1],
            ["Son 7 gün", 7],
            ["Bu ay", "ay"],
          ].map(([ad, gun]) => (
            <button
              key={ad}
              type="button"
              onClick={() => hizliTarih(gun)}
              className="text-xs px-2 py-1 rounded border border-cizgi bg-white text-murekkep/70 hover:text-murekkep"
            >
              {ad}
            </button>
          ))}
        </div>

        {yedekler.length === 0 ? (
          <p className="text-sm text-murekkep/60">
            {filtreVar ? "Bu tarihlerde yedek yok." : "Bu klasörde henüz yedek yok."}
          </p>
        ) : (
          <ul className="max-h-64 overflow-y-auto border border-cizgi rounded divide-y divide-cizgi">
            {yedekler.map((y) => (
              <li key={y.ad} className="flex items-center justify-between gap-2 px-3 py-2">
                <div className="min-w-0">
                  <p className="readout text-sm text-murekkep flex items-center gap-2">
                    {yedekTarihYaz(y.gun, y.saat)}
                    <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded ${TUR_ROZET[y.tur].sinif}`}>
                      {TUR_ROZET[y.tur].ad}
                    </span>
                  </p>
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

        {yedekler.length < toplam && (
          <button type="button" onClick={dahaFazla} className="btn-secondary w-full py-1.5 text-sm">
            Daha fazla göster (kalan {toplam - yedekler.length})
          </button>
        )}
      </div>
    </div>
  )
}
