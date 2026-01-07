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
  const [musteriNoAra, setMusteriNoAra] = useState("")
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

  function yuvarlaHakKG(value) {
    const alt = Math.floor(value)
    const ondalik = value - alt
    return ondalik <= 0.5 ? alt : alt + 1
  }

  const hesap = useMemo(() => {
    const yag = parseFloat(formData.cikan_yag) || 0
    const oran = parseFloat(formData.hak_oran) || 0
    const fiyat = parseFloat(formData.yag_fiyati) || 0
    const hakKGraw = (yag * oran) / 100
    const hakKGround = yuvarlaHakKG(hakKGraw)
    const paraTL = (hakKGraw * fiyat).toFixed(2)
    const yagTL = (hakKGround * fiyat).toFixed(2) 

    return { hakKGraw, hakKGround, paraTL, yagTL }
  }, [formData.cikan_yag, formData.hak_oran, formData.yag_fiyati])


  useEffect(() => {
    const zeytin = parseFloat(formData.zeytin_kg) || 0
    const yag = parseFloat(formData.cikan_yag) || 0
    const oran = parseFloat(formData.hak_oran) || 0
    const fiyat = parseFloat(formData.yag_fiyati) || 0
    const hakKGraw = (yag * oran) / 100
    const hakKGround = yuvarlaHakKG(hakKGraw)
    const paraTL = (hakKGraw * fiyat).toFixed(2)
    const yagTL = (hakKGround * fiyat).toFixed(2)

    setFormData((prev) => {
      const nextTL = prev.odeme_tipi === "para" ? paraTL : yagTL

      if (
        String(prev.firma_hakki) === String(hakKGround) &&
        String(prev.firma_hakki_tl) === String(nextTL)
      ) {
        return prev
      }

      return { ...prev, firma_hakki: hakKGround, firma_hakki_tl: nextTL }
    })

    const musteriKalanYag =
      formData.odeme_tipi === "yag" ? yag - hakKGround : yag

    const b52 = musteriKalanYag > 0 ? musteriKalanYag / 52 : 0
    const b50 = musteriKalanYag > 0 ? musteriKalanYag / 50 : 0
    const verilecekBidon = musteriKalanYag > 0 ? Math.ceil(musteriKalanYag / 52) : 0

    const randimanHesap = zeytin > 0 && yag > 0 ? zeytin / yag : 0

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

  const filtreliListe = useMemo(() => {
    const sorted = [...liste].sort((a, b) => {
      const da = new Date(String(a.created_at || "").replace(" ", "T"))
      const db = new Date(String(b.created_at || "").replace(" ", "T"))
      const diff = da - db
      if (diff !== 0) return diff
      return (a.id || 0) - (b.id || 0)
    })

    const q = (musteriNoAra || "").trim().replace(/\D/g, "")
    if (!q) return sorted
    return sorted.filter((m) => String(m.musteri_no || "").includes(q))
  }, [liste, musteriNoAra])

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-amber-50 p-6 relative overflow-hidden">
      {/* ARKA PLAN PATTERN */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, #059669 1px, transparent 0)`,
            backgroundSize: "40px 40px",
          }}
        ></div>
      </div>

      {/* ANIMATED GLOW EFFECTS */}
      <div className="absolute top-20 right-1/4 w-96 h-96 bg-emerald-200/30 rounded-full blur-3xl animate-pulse pointer-events-none"></div>
      <div className="absolute bottom-40 left-1/3 w-72 h-72 bg-amber-200/30 rounded-full blur-3xl animate-pulse delay-1000 pointer-events-none"></div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* HEADER */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 via-emerald-700 to-emerald-800 mb-2 tracking-tight">
            Yağcı İşlem Paneli
          </h1>
          <p className="text-slate-600 font-medium">
            Beklemedeki müşteriyi seç, işlemi gir, bitir.
          </p>
        </div>

        {/* TOP BANNER */}
        {(hata || mesaj) && (
          <div className="mb-6">
            {hata && (
              <div className="p-4 bg-red-50 border-2 border-red-200 rounded-2xl backdrop-blur-sm shadow-lg animate-shake">
                <div className="flex items-center gap-3">
                  <svg
                    className="w-5 h-5 text-red-500 flex-shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <p className="text-sm text-red-700 font-semibold">{hata}</p>
                </div>
              </div>
            )}
            {mesaj && (
              <div className="p-4 bg-green-50 border-2 border-green-200 rounded-2xl backdrop-blur-sm shadow-lg">
                <div className="flex items-center gap-3">
                  <svg
                    className="w-5 h-5 text-green-500 flex-shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <p className="text-sm text-green-700 font-semibold">{mesaj}</p>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* SOL: BEKLEYENLER */}
          <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/60 p-6 lg:col-span-1 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/50 to-transparent pointer-events-none"></div>

            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-slate-800">Bekleyenler</h2>
                <button
                  onClick={fetchBekleyenler}
                  className="px-4 py-2 text-sm font-semibold rounded-xl bg-gradient-to-r from-slate-100 to-slate-200 hover:from-slate-200 hover:to-slate-300 transition-all shadow-sm hover:shadow"
                >
                  Yenile
                </button>
              </div>

              {/* MÜŞTERİ NO ARA */}
              <div className="mb-4">
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                  Müşteri No İle Ara
                </label>

                <div className="flex gap-2">
                  <input
                    value={musteriNoAra}
                    onChange={(e) =>
                      setMusteriNoAra(
                        e.target.value.replace(/\D/g, "").slice(0, 3)
                      )
                    }
                    placeholder="101"
                    inputMode="numeric"
                    className="w-full px-4 py-3 bg-white/70 border-2 border-slate-200 rounded-2xl text-base font-bold text-slate-800 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition shadow-sm"
                  />

                  <button
                    type="button"
                    onClick={() => setMusteriNoAra("")}
                    className="px-4 py-3 rounded-2xl border-2 border-slate-200 bg-white/70 text-slate-700 font-black hover:bg-white hover:border-slate-300 transition shadow-sm"
                    title="Temizle"
                  >
                    X
                  </button>
                </div>

                {!!musteriNoAra && (
                  <p className="mt-2 text-xs text-slate-500 font-semibold">
                    Sonuç: {filtreliListe.length}
                  </p>
                )}
              </div>

              {loadingListe && (
                <div className="p-6 text-center text-sm text-slate-500 font-medium">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-emerald-200 border-t-emerald-600 mb-2"></div>
                  <p>Liste yükleniyor...</p>
                </div>
              )}

              {listeHata && (
                <div className="p-4 bg-red-50 border-2 border-red-200 rounded-2xl mb-3">
                  <p className="text-sm text-red-700 font-semibold">{listeHata}</p>
                </div>
              )}

              {!loadingListe && filtreliListe.length === 0 && !listeHata && (
                <div className="p-8 text-center text-slate-500 font-medium">
                  <p>{musteriNoAra ? "Aramaya uygun müşteri yok." : "Bekleyen müşteri yok."}</p>
                </div>
              )}

              <div className="space-y-2 max-h-[70vh] overflow-auto pr-1">
                {filtreliListe.map((m) => {
                  const active = secili?.id === m.id
                  return (
                    <button
                      key={m.id}
                      onClick={() => setSecili(m)}
                      className={`w-full text-left p-4 rounded-2xl border-2 transition-all transform hover:scale-[1.01] ${
                        active
                          ? "border-amber-400 bg-gradient-to-r from-amber-50 to-amber-100/50 shadow-lg shadow-amber-500/20"
                          : "border-slate-200 bg-white/60 hover:bg-white hover:border-slate-300 hover:shadow-md"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-bold text-slate-800 text-lg">{m.ad_soyad}</p>
                          <p className="text-sm text-slate-500 font-medium mt-1">
                            {m.telefon || "-"}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="px-3 py-1 bg-emerald-100 rounded-xl">
                            <p className="text-lg font-bold text-emerald-700">
                              #{m.musteri_no}
                            </p>
                          </div>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* SAĞ: FORM */}
          <div className="lg:col-span-2">
            {!secili ? (
              <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/60 p-16 text-center relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-slate-50/50 to-transparent pointer-events-none"></div>
                <div className="relative z-10">
                  <p className="text-slate-600 font-semibold text-lg">
                    Lütfen soldan bir müşteri seçin.
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/60 p-8 space-y-6 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/30 to-amber-50/30 pointer-events-none"></div>

                <div className="relative z-10 space-y-6">
                  {/* MÜŞTERİ BİLGİSİ */}
                  <div className="bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-2xl p-6 border-2 border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                          Müşteri Bilgileri
                        </p>
                        <h3 className="text-2xl font-black text-slate-800">
                          {secili.ad_soyad}
                        </h3>
                        <p className="mt-2 text-sm font-semibold text-slate-600">
                          {secili.telefon ? secili.telefon : "-"}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                          Müşteri No
                        </p>
                        <div className="px-4 py-2 bg-white rounded-xl border-2 border-slate-200 shadow-sm">
                          <h3 className="text-2xl font-black text-slate-800">
                            #{secili.musteri_no}
                          </h3>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ZEYTİN VE YAĞ */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">
                        Gelen Zeytin (KG)
                      </label>
                      <input
                        type="number"
                        name="zeytin_kg"
                        value={formData.zeytin_kg}
                        onChange={handleChange}
                        className="w-full px-5 py-4 bg-white border-2 border-slate-200 rounded-2xl text-lg font-bold text-slate-800 focus:outline-none focus:border-emerald-400 focus:bg-white transition-all shadow-sm hover:shadow-md"
                        placeholder="500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">
                        Çıkan Yağ (KG)
                      </label>
                      <input
                        type="number"
                        name="cikan_yag"
                        value={formData.cikan_yag}
                        onChange={handleChange}
                        className="w-full px-5 py-4 bg-gradient-to-br from-amber-50 to-amber-100/50 border-2 border-amber-300 rounded-2xl text-lg font-bold text-slate-800 focus:outline-none focus:border-amber-400 focus:from-amber-100 focus:to-amber-50 transition-all shadow-sm hover:shadow-md"
                        placeholder="0"
                      />
                    </div>
                  </div>

                  {/* ORAN VE FİYAT */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">
                        Hak Oranı (%)
                      </label>
                      <input
                        type="number"
                        name="hak_oran"
                        value={formData.hak_oran}
                        onChange={handleChange}
                        className="w-full px-5 py-4 bg-white border-2 border-slate-200 rounded-2xl text-xl font-bold text-slate-800 text-center focus:outline-none focus:border-slate-400 transition-all shadow-sm hover:shadow-md"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">
                        Yağ Fiyatı (₺)
                      </label>
                      <input
                        type="number"
                        name="yag_fiyati"
                        value={formData.yag_fiyati}
                        onChange={handleChange}
                        className="w-full px-5 py-4 bg-gradient-to-br from-emerald-50 to-emerald-100/50 border-2 border-emerald-300 rounded-2xl text-xl font-bold text-emerald-700 text-center focus:outline-none focus:border-emerald-400 transition-all shadow-sm hover:shadow-md"
                      />
                    </div>
                  </div>

                  {/* ÖDEME TİPİ */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() =>
                        setFormData({ ...formData, odeme_tipi: "yag" })
                      }
                      className={`p-6 rounded-2xl border-2 transition-all text-left transform hover:scale-[1.02] ${
                        formData.odeme_tipi === "yag"
                          ? "border-amber-500 bg-gradient-to-br from-amber-50 to-amber-100/50 shadow-xl shadow-amber-500/20"
                          : "border-slate-200 bg-white/60 hover:border-slate-300 hover:shadow-lg"
                      }`}
                    >
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-600 mb-2">
                        YAĞ KESİNTİSİ
                      </p>
                      <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-black text-slate-800">
                          {formData.firma_hakki || "0"}
                        </span>
                        <span className="text-sm font-bold text-slate-500">
                          KG Kesilir
                        </span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setFormData({ ...formData, odeme_tipi: "para" })
                      }
                      className={`p-6 rounded-2xl border-2 transition-all text-left transform hover:scale-[1.02] ${
                        formData.odeme_tipi === "para"
                          ? "border-emerald-500 bg-gradient-to-br from-emerald-50 to-emerald-100/50 shadow-xl shadow-emerald-500/20"
                          : "border-slate-200 bg-white/60 hover:border-slate-300 hover:shadow-lg"
                      }`}
                    >
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-600 mb-2">
                        MÜŞTERİ PARA ÖDEYECEK
                      </p>
                      <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-black text-emerald-700">
                           {hesap.paraTL}
                        </span>
                        <span className="text-sm font-bold text-emerald-600">
                          ₺ Ödenir
                        </span>
                      </div>
                    </button>
                  </div>

                  {/* SONUÇ */}
                  <div className="p-8 bg-gradient-to-br from-white to-slate-50 border-2 border-slate-200 rounded-3xl shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-100 rounded-full blur-3xl opacity-30"></div>
                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-amber-100 rounded-full blur-3xl opacity-30"></div>

                    <div className="relative z-10 grid grid-cols-3 gap-6 text-center divide-x-2 divide-slate-100">
                      <div className="flex flex-col justify-center">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                          KALAN YAĞ
                        </p>
                        <div className="flex items-baseline justify-center gap-1">
                          <p className="text-5xl font-black text-slate-800">
                            {hesapSonuc.kalanYag}
                          </p>
                          <p className="text-sm font-bold text-slate-400">KG</p>
                        </div>
                      </div>

                      <div className="flex flex-col justify-center bg-gradient-to-br from-orange-50 to-orange-100/50 rounded-2xl -my-4 py-6 shadow-inner">
                        <p className="text-xs font-bold text-orange-500 uppercase tracking-wider mb-2">
                          ORAN
                        </p>
                        <p className="text-5xl font-black text-orange-600">
                          {hesapSonuc.randiman}
                        </p>
                      </div>

                      <div className="flex flex-col justify-center">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                          VERİLECEK BİDON
                        </p>
                        <div className="flex items-baseline justify-center gap-1">
                          <p className="text-5xl font-black text-slate-800">
                            {hesapSonuc.verilecekBidon}
                          </p>
                          <p className="text-sm font-bold text-slate-400">ADET</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* BİDON NO */}
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">
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
                            if (v.length > 0 && !v.endsWith("-"))
                              return { ...prev, bidon_no: v + "-" }
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
                      className="w-full px-5 py-4 bg-white border-2 border-slate-200 rounded-2xl text-lg font-bold text-slate-800 text-center placeholder:text-slate-400 focus:outline-none focus:border-slate-400 focus:bg-white transition-all tracking-wider resize-none overflow-hidden shadow-sm hover:shadow-md"
                      placeholder="1234-56-7890"
                    />
                  </div>

                  {/* NOTLAR */}
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                      İşlem Notları
                    </label>
                    <textarea
                      name="notlar"
                      value={formData.notlar}
                      onChange={handleChange}
                      rows="3"
                      className="w-full px-5 py-4 bg-white border-2 border-slate-200 rounded-2xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-slate-400 focus:bg-white transition-all resize-none shadow-sm hover:shadow-md"
                      placeholder="İşlem hakkında not ekle..."
                    />
                  </div>

                  {/* ONAYLA */}
                  <div className="flex gap-4 pt-4">
                    <button
                      onClick={() => setSecili(null)}
                      className="w-1/3 py-4 bg-gradient-to-r from-slate-100 to-slate-200 hover:from-slate-200 hover:to-slate-300 text-slate-800 font-bold rounded-2xl transition-all shadow-sm hover:shadow-md transform hover:scale-[1.02] active:scale-[0.98]"
                    >
                      İptal
                    </button>

                    <button
                      onClick={handleKaydet}
                      className="w-2/3 py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-bold rounded-2xl transition-all shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-3 text-lg group"
                    >
                      <span>İşlemi Onayla</span>
                      <svg
                        className="w-5 h-5 group-hover:scale-110 transition-transform"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2.5}
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
