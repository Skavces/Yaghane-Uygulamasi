import { useEffect, useMemo, useRef, useState } from "react"
import axios from "axios"

axios.defaults.baseURL = "/"

export default function YagciPanel() {
  const [liste, setListe] = useState([])
  const [loadingListe, setLoadingListe] = useState(false)
  const [listeHata, setListeHata] = useState("")

  const [secili, setSecili] = useState(null)

  const [formData, setFormData] = useState({
    zeytin_kg: "",
    cikan_yag: "",
    hak_oran: "8",
    yag_fiyati: "300",
    firma_hakki: "",
    firma_hakki_tl: "",
    odeme_tipi: "yag",
    bidon_no: "",
    notlar: "",
  })

  const [hesapSonuc, setHesapSonuc] = useState({
    kalanYag: 0,
    bidon52: 0,
    bidon50: 0,
    verilecekBidon: 0,
    randiman: 0,
  })

  const [mesaj, setMesaj] = useState("")
  const [hata, setHata] = useState("")

  const fetchBekleyenler = async () => {
    setLoadingListe(true)
    setListeHata("")
    try {
      const res = await axios.get("/api/yag-bekleyenler")
      setListe(Array.isArray(res.data) ? res.data : [])
    } catch (e) {
      setListe([])
      setListeHata("Bekleyen liste çekilemedi.")
    } finally {
      setLoadingListe(false)
    }
  }

  useEffect(() => {
    fetchBekleyenler()
  }, [])

  useEffect(() => {
    if (!secili) return
    setHata("")
    setMesaj("")
    setFormData((prev) => ({
      ...prev,
      zeytin_kg: secili.zeytin_kg || "",
      cikan_yag: "",
      odeme_tipi: "yag",
      bidon_no: "",
      notlar: "",
      firma_hakki: "",
      firma_hakki_tl: "",
    }))
  }, [secili])

  // hesap
  useEffect(() => {
    const zeytin = parseFloat(formData.zeytin_kg) || 0
    const yag = parseFloat(formData.cikan_yag) || 0
    const oran = parseFloat(formData.hak_oran) || 0
    const fiyat = parseFloat(formData.yag_fiyati) || 0

    const hakKG = (yag * oran) / 100
    let firmaHakki = Number(hakKG.toFixed(1))
    if (firmaHakki < 0) firmaHakki = 0
    const hakTL = (firmaHakki * fiyat).toFixed(2)

    setFormData((prev) => {
      if (
        String(prev.firma_hakki) === String(firmaHakki) &&
        String(prev.firma_hakki_tl) === String(hakTL)
      ) {
        return prev
      }
      return { ...prev, firma_hakki: firmaHakki, firma_hakki_tl: hakTL }
    })

    let musteriKalanYag = 0
    if (formData.odeme_tipi === "yag") musteriKalanYag = yag - firmaHakki
    else musteriKalanYag = yag

    let b52 = 0
    let b50 = 0
    if (musteriKalanYag > 0) {
      b52 = musteriKalanYag / 52
      b50 = musteriKalanYag / 50
    }

    let verilecekBidon = 0
    if (musteriKalanYag > 0) verilecekBidon = Math.ceil(musteriKalanYag / 52)

    let randimanHesap = 0
    if (zeytin > 0 && yag > 0) randimanHesap = zeytin / yag

    setHesapSonuc({
      kalanYag: musteriKalanYag.toFixed(1),
      bidon52: b52.toFixed(2),
      bidon50: b50.toFixed(2),
      verilecekBidon,
      randiman: randimanHesap.toFixed(1),
    })
  }, [
    formData.cikan_yag,
    formData.zeytin_kg,
    formData.hak_oran,
    formData.yag_fiyati,
    formData.odeme_tipi,
  ])

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleKaydet = async () => {
    if (!secili) return
    setHata("")
    setMesaj("")

    // min kontrol
    const yag = parseFloat(formData.cikan_yag)
    if (!yag || yag <= 0) {
      setHata("Çıkan yağ 0 olamaz.")
      return
    }

    try {
      await axios.put(`/api/yag-islem/${secili.id}`, formData)
      setMesaj(`${secili.ad_soyad} işlemi tamamlandı`)
      setSecili(null)
      await fetchBekleyenler()
      setTimeout(() => setMesaj(""), 2500)
    } catch (e) {
      setHata("Kayıt sırasında hata oluştu")
    }
  }

  const bidonRef = useRef(null)

  const autoGrowBidon = () => {
    const el = bidonRef.current
    if (!el) return
    el.style.height = "0px"
    el.style.height = el.scrollHeight + "px"
  }

  const aramaKey = useMemo(() => {
    return ""
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-6xl mx-auto">
        {/* HEADER */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-slate-800 mb-2">Yağcı İşlem Paneli</h1>
          <p className="text-slate-500">Beklemedeki müşteriyi seç, işlemi gir, bitir.</p>
        </div>

        {/* TOP BANNER */}
        {(hata || mesaj) && (
          <div className="mb-4">
            {hata && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
                <p className="text-sm text-red-700 font-semibold">{hata}</p>
              </div>
            )}
            {mesaj && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-xl">
                <p className="text-sm text-green-700 font-semibold">{mesaj}</p>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* SOL: BEKLEYENLER */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 lg:col-span-1">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-slate-800">Bekleyenler</h2>
              <button
                onClick={fetchBekleyenler}
                className="px-3 py-2 text-sm font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 transition"
              >
                Yenile
              </button>
            </div>

            {loadingListe && (
              <div className="p-4 text-sm text-slate-500">Liste yükleniyor...</div>
            )}

            {listeHata && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl mb-3">
                <p className="text-sm text-red-700 font-semibold">{listeHata}</p>
              </div>
            )}

            {!loadingListe && liste.length === 0 && !listeHata && (
              <div className="p-4 text-sm text-slate-500">Bekleyen müşteri yok.</div>
            )}

            <div className="space-y-2 max-h-[70vh] overflow-auto pr-1">
              {liste.map((m) => {
                const active = secili?.id === m.id
                return (
                  <button
                    key={m.id}
                    onClick={() => setSecili(m)}
                    className={`w-full text-left p-3 rounded-xl border transition ${
                      active
                        ? "border-amber-400 bg-amber-50"
                        : "border-slate-200 bg-white hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-bold text-slate-800">{m.ad_soyad}</p>
                        <p className="text-xs text-slate-500">
                          #{m.musteri_no} • {m.telefon || "-"}
                        </p>
                      </div>
                      <div className="text-xs font-bold text-slate-500">
                        {m.zeytin_kg ? `${m.zeytin_kg}kg` : ""}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* SAĞ: FORM */}
          <div className="lg:col-span-2">
            {!secili ? (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-10 text-center">
                <p className="text-slate-600 font-semibold">
                  Lütfen soldan bir müşteri seçin.
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 space-y-6">
                {/* MÜŞTERİ BİLGİSİ */}
                <div className="bg-slate-50 rounded-xl p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
                        Müşteri
                      </p>
                      <h3 className="text-xl font-bold text-slate-800">{secili.ad_soyad}</h3>
                      <p className="mt-2 text-sm font-semibold text-slate-600 flex items-center gap-2">
                        <span className="text-slate-400">📞</span>
                        {secili.telefon ? secili.telefon : "-"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
                        Müşteri No
                      </p>
                      <h3 className="text-2xl font-bold text-slate-800">#{secili.musteri_no}</h3>
                    </div>
                  </div>
                </div>

                {/* ZEYTİN VE YAĞ */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Gelen Zeytin (KG)
                    </label>
                    <input
                      type="number"
                      name="zeytin_kg"
                      value={formData.zeytin_kg}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-lg font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-300 transition"
                      placeholder="500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Çıkan Yağ (KG)
                    </label>
                    <input
                      type="number"
                      name="cikan_yag"
                      value={formData.cikan_yag}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-lg font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-300 transition"
                      placeholder="0"
                    />
                  </div>
                </div>

                {/* ORAN VE FİYAT */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Hak Oranı (%)
                    </label>
                    <input
                      type="number"
                      name="hak_oran"
                      value={formData.hak_oran}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-lg font-semibold text-slate-800 text-center focus:outline-none focus:ring-2 focus:ring-slate-300 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Yağ Fiyatı (₺)
                    </label>
                    <input
                      type="number"
                      name="yag_fiyati"
                      value={formData.yag_fiyati}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl text-lg font-semibold text-emerald-700 text-center focus:outline-none focus:ring-2 focus:ring-emerald-300 transition"
                    />
                  </div>
                </div>

                {/* ÖDEME TİPİ */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, odeme_tipi: "yag" })}
                    className={`p-5 rounded-xl border-2 transition-all text-left ${
                      formData.odeme_tipi === "yag"
                        ? "border-amber-500 bg-amber-50 shadow-sm"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold text-slate-800">
                        {formData.firma_hakki || "0"}
                      </span>
                      <span className="text-sm font-medium text-slate-500">KG Kesilir</span>
                    </div>
                    <p className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-500">
                      Yağ alınacak
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, odeme_tipi: "para" })}
                    className={`p-5 rounded-xl border-2 transition-all text-left ${
                      formData.odeme_tipi === "para"
                        ? "border-emerald-500 bg-emerald-50 shadow-sm"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold text-emerald-700">
                        {formData.firma_hakki_tl || "0"}
                      </span>
                      <span className="text-sm font-medium text-slate-500">₺ Ödenir</span>
                    </div>
                    <p className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-500">
                      Para alınacak
                    </p>
                  </button>
                </div>

                {/* SONUÇ */}
                <div className="p-6 bg-white border-2 border-slate-200 rounded-xl shadow-lg">
                  <div className="grid grid-cols-3 gap-6 text-center divide-x divide-slate-100">
                    <div className="flex flex-col justify-center">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">
                        KALAN YAĞ
                      </p>
                      <div className="flex items-baseline justify-center gap-1">
                        <p className="text-4xl font-extrabold text-slate-800">
                          {hesapSonuc.kalanYag}
                        </p>
                        <p className="text-sm font-bold text-slate-400">KG</p>
                      </div>
                    </div>

                    <div className="flex flex-col justify-center bg-orange-50 rounded-lg -my-2 py-4">
                      <p className="text-xs font-bold text-orange-400 uppercase tracking-wide mb-1">
                        ORAN
                      </p>
                      <p className="text-3xl font-extrabold text-orange-600">
                        {hesapSonuc.randiman}
                      </p>
                    </div>

                    <div className="flex flex-col justify-center">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">
                        VERİLECEK BİDON
                      </p>
                      <div className="flex items-baseline justify-center gap-1">
                        <p className="text-4xl font-extrabold text-slate-800">
                          {hesapSonuc.verilecekBidon}
                        </p>
                        <p className="text-sm font-bold text-slate-400">ADET</p>
                      </div>
                      <p className="text-[10px] text-slate-400 font-bold mt-1">NET / 52 KG</p>
                    </div>
                  </div>
                </div>

                {/* BİDON NO */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Bidon Numarası
                  </label>

                  <textarea
                    ref={bidonRef}
                    rows={1}
                    name="bidon_no"
                    value={formData.bidon_no}
                    onFocus={autoGrowBidon}
                    onInput={autoGrowBidon}
                    onKeyDown={(e) => {
                      if (e.key === " ") {
                        e.preventDefault()
                        setFormData((prev) => {
                          const v = prev.bidon_no || ""
                          if (v.length > 0 && !v.endsWith("-")) return { ...prev, bidon_no: v + "-" }
                          return prev
                        })
                        requestAnimationFrame(autoGrowBidon)
                      }
                    }}
                    onChange={(e) => {
                      let v = e.target.value

                      v = v.replace(/[^\d-\n]/g, "")
                      v = v.replace(/-+/g, "-")
                      v = v
                        .split("\n")
                        .map((line) => {
                          const parts = line.split("-")
                          const fixedParts = parts.map((p) => p.slice(0, 4))
                          return fixedParts.join("-")
                        })
                        .join("\n")

                      setFormData((prev) => ({ ...prev, bidon_no: v }))
                      requestAnimationFrame(autoGrowBidon)
                    }}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-lg font-semibold text-slate-800 text-center placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:bg-white transition tracking-wider resize-none overflow-hidden"
                    placeholder="1234-56-7890"
                  />
                </div>


                {/* NOTLAR */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    İşlem Notları
                  </label>
                  <textarea
                    name="notlar"
                    value={formData.notlar}
                    onChange={handleChange}
                    rows="2"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:bg-white transition resize-none"
                    placeholder="Not..."
                  />
                </div>

                {/* ONAYLA */}
                <div className="flex gap-3">
                  <button
                    onClick={() => setSecili(null)}
                    className="w-1/3 py-4 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded-xl transition"
                  >
                    İptal
                  </button>

                  <button
                    onClick={handleKaydet}
                    className="w-2/3 py-4 bg-slate-800 hover:bg-slate-900 text-white font-semibold rounded-xl transition shadow-sm hover:shadow flex items-center justify-center gap-2 text-lg"
                  >
                    <span>İşlemi Onayla</span>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
