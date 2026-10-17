import { useEffect, useMemo, useRef, useState, useCallback } from "react"
import axios from "axios"
import { CheckCircle2, RefreshCw, Search, X } from "lucide-react"
import TarihSaat from "./TarihSaat"
import Telefon from "./Telefon"
import { hesaplaYagciPaneli } from "../utils/yagHesap"

axios.defaults.baseURL = "/"

const ALAN_ETIKET = "label text-center min-h-[2.25rem] flex items-end justify-center"
const GIRDI = "input readout text-2xl text-center py-3"
const OKUMA = "bg-zemin border border-cizgi rounded px-4 py-3 text-center readout text-2xl"

const ODEME_SECILI = {
  para: "border-2 border-para bg-para/10 text-para",
  sizma: "border-2 border-sizma bg-sizma/10 text-sizma",
}

const odemeKutu = (aktif, renk) =>
  `relative cursor-pointer select-none rounded border px-5 py-3 text-center transition-colors ${
    aktif ? ODEME_SECILI[renk] : "bg-white border-cizgi text-murekkep/50 hover:bg-zemin"
  }`

export default function YagciPanel({ defaultSettings }) {
  const [liste, setListe] = useState([])
  const [tumListe, setTumListe] = useState([])
  const [loadingListe, setLoadingListe] = useState(false)
  const [listeHata, setListeHata] = useState("")
  const [secili, setSecili] = useState(null)

  const defFiyat = defaultSettings?.yag_fiyati || "300"
  const defYagIleOdeme = String(defaultSettings?.yag_ile_odeme ?? "230")
  const defBidonUcreti = String(defaultSettings?.bidon_ucreti ?? "400")
  const defSikimBedeli = String(defaultSettings?.sikim_bedeli ?? "5")

  const [formData, setFormData] = useState({
    zeytin_kg: "",
    cikan_yag: "",
    kantar_bidon: "",
    yag_fiyati: defFiyat,
    yag_ile_odeme: defYagIleOdeme,
    bidon_ucreti: defBidonUcreti,
    sikim_bedeli: defSikimBedeli,
    firma_hakki: "",
    firma_hakki_tl: "",
    odeme_tipi: "para",
    bidon_no: "",
    notlar: "",
  })

  const [mesaj, setMesaj] = useState("")
  const [mesajAnim, setMesajAnim] = useState("spin")
  const [hata, setHata] = useState("")
  const [musteriNoAra, setMusteriNoAra] = useState("")
  const fetchBekleyenler = async () => {
    setLoadingListe(true)
    setListeHata("")
    try {
      const res = await axios.get("/api/yag-bekleyenler")
      setListe(Array.isArray(res.data) ? res.data : [])
    } catch {
      setListe([])
      setListeHata("Bekleyen liste çekilemedi.")
    } finally {
      setLoadingListe(false)
    }
  }

  const fetchTumListe = async () => {
    try {
      const res = await axios.get("/api/liste")
      setTumListe(Array.isArray(res.data) ? res.data : [])
    } catch (e) {
      console.error("Geçmiş liste çekilemedi", e)
    }
  }

  useEffect(() => {
    fetchBekleyenler()
    fetchTumListe()
  }, [])

  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      yag_ile_odeme: defYagIleOdeme,
      bidon_ucreti: defBidonUcreti,
      sikim_bedeli: defSikimBedeli,
    }))
  }, [defYagIleOdeme, defBidonUcreti, defSikimBedeli])

  useEffect(() => {
    if (!secili) return
    setHata("")
    setMesaj("")
    setFormData((prev) => ({
      ...prev,
      zeytin_kg: secili.zeytin_kg || "",
      cikan_yag: "",
      kantar_bidon: "",
      odeme_tipi: secili.odeme_tipi || "yag",
      bidon_no: "",
      notlar: "",
      firma_hakki: "",
      firma_hakki_tl: "",
    }))
  }, [secili])

  const yuvarla = (v) => (Number.isFinite(v) ? Math.round(v * 100) / 100 : 0)

  const hesap = useMemo(() => {
    return hesaplaYagciPaneli({
      zeytin:      formData.zeytin_kg,
      cikanYag:    formData.cikan_yag,
      kantarBidon: formData.kantar_bidon,
      yagIleOdeme: formData.yag_ile_odeme,
      bidonUcreti: formData.bidon_ucreti,
      sikimBedeli: formData.sikim_bedeli,
    })
  }, [
    formData.zeytin_kg,
    formData.cikan_yag,
    formData.kantar_bidon,
    formData.yag_ile_odeme,
    formData.bidon_ucreti,
    formData.sikim_bedeli,
  ])

  useEffect(() => {
    const yag = String(yuvarla(hesap.toplamYag))
    const tl = String(yuvarla(hesap.toplamTL))
    setFormData((prev) => {
      if (String(prev.firma_hakki) === yag && String(prev.firma_hakki_tl) === tl) return prev
      return { ...prev, firma_hakki: yag, firma_hakki_tl: tl }
    })
  }, [hesap])

  const handleChange = (e) => {
    const { name, value } = e.target
    const updated = { ...formData, [name]: value }
    if (name === "cikan_yag") {
      const parsed = parseFloat(value)
      if (!isNaN(parsed) && parsed > 0) {
        updated.kantar_bidon = Math.ceil(parsed / 50)
      }
    }
    setFormData(updated)
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
      setMesajAnim("spin")
      setMesaj(`${secili.ad_soyad} işlemi tamamlandı`)
      setSecili(null)
      await fetchBekleyenler()
      setTimeout(() => setMesajAnim("tik"), 1200)
      setTimeout(() => setMesaj(""), 2500)
    } catch {
      setHata("Kayıt sırasında hata oluştu")
    }
  }

  const bidonRef = useRef(null)

  const countBidon = (str) => {
    const s = String(str || "").trim()
    if (!s) return 0
    const parts = s
      .replace(/[,\s]+/g, "-")
      .split("-")
      .map((x) => x.trim())
      .filter(Boolean)
    return parts.length
  }

  const verilenBidonSayisi = useMemo(() => {
    return countBidon(formData.bidon_no)
  }, [formData.bidon_no])

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

    return sorted.filter((m) =>
      String(m.musteri_no || "").startsWith(q)
    )
  }, [liste, musteriNoAra])


  const normalizeTelefon = (input) => {
    let d = String(input || "").replace(/\D/g, "")
    if (d.startsWith("90")) d = d.slice(2)
    if (d.length === 10) d = "0" + d
    if (d.length > 11) d = d.slice(0, 11)
    if (d.length !== 11) return d

    return d.replace(/(\d{4})(\d{3})(\d{2})(\d{2})/, "$1 $2 $3 $4")
  }

  const urunIadeBidonSayisi = useCallback((item) => {
    const iadeStr = item.iade_bidonlar ?? item.geri_alinan_bidonlar ?? ""
    return countBidon(iadeStr)
  }, [])

  const toplamGecmisBidon = useMemo(() => {
    if (!secili) return 0
    if (!tumListe.length) return 0

     
    const hedefNo = secili.musteri_no
    const hedefTel = secili.telefon ? normalizeTelefon(secili.telefon) : null

     
    const gecmisIslemler = tumListe.filter(item => {
      if (item.status !== 3) return false

       
      if (hedefNo && String(item.musteri_no) === String(hedefNo)) return true

       
      if (hedefTel && item.telefon && normalizeTelefon(item.telefon) === hedefTel) return true

      return false
    })

    let toplam = 0
    gecmisIslemler.forEach(islem => {
      const verilen = countBidon(islem.bidon_no)
      const iade = urunIadeBidonSayisi(islem)
      const fark = verilen - iade
      if (fark > 0) toplam += fark
    })


    return toplam
  }, [secili, tumListe, urunIadeBidonSayisi])


  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="font-display text-2xl font-bold text-murekkep">Yağhane</h1>
          <p className="text-murekkep/60">
            Bekleyen müşteriyi seç, ölçümleri gir, işlemi onayla.
          </p>
        </div>

        {hata && (
          <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-[9999]">
            <div className="bg-murekkep text-white px-5 py-3 rounded-md shadow-lg flex items-center gap-3 border-l-4 border-red-500">
              <span className="font-semibold">{hata}</span>
            </div>
          </div>
        )}
        {mesaj && (
          <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-[9999]">
            <div className="bg-murekkep text-white px-5 py-3 rounded-md shadow-lg flex items-center gap-3 border-l-4 border-zeytin">
              <div className="relative w-6 h-6 flex-shrink-0">
                {mesajAnim === "spin" ? (
                  <svg className="w-6 h-6 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="white" strokeOpacity="0.3" strokeWidth="2.5" />
                    <path d="M12 2a10 10 0 0 1 10 10" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6 anim-pop-in" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="2.5" className="anim-circle-draw" />
                    <path d="M7 12l3.5 3.5L17 9" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="anim-check-draw" />
                  </svg>
                )}
              </div>
              <span className="font-semibold">{mesaj}</span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-7 gap-6">
          <div className="card p-5 lg:col-span-3 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg font-bold text-murekkep">Bekleyenler</h2>
              <button onClick={fetchBekleyenler} className="btn-secondary">
                <RefreshCw className="w-4 h-4" />
                Yenile
              </button>
            </div>

            <div className="mb-4">
              <label className="label">Müşteri no ile ara</label>

              <div className="relative">
                <input
                  value={musteriNoAra}
                  onChange={(e) =>
                    setMusteriNoAra(
                      e.target.value.replace(/\D/g, "").slice(0, 3)
                    )
                  }
                  placeholder="000"
                  inputMode="numeric"
                  className="peer input readout pr-10"
                />

                {musteriNoAra ? (
                  <button
                    type="button"
                    onClick={() => setMusteriNoAra("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-murekkep/40 hover:text-murekkep"
                    aria-label="Temizle"
                  >
                    <X className="w-4 h-4" />
                  </button>
                ) : (
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-murekkep/40 peer-focus:text-zeytin transition-colors pointer-events-none" />
                )}
              </div>

              {!!musteriNoAra && (
                <p className="mt-2 text-xs text-murekkep/60">
                  Sonuç: {filtreliListe.length}
                </p>
              )}
            </div>

            {loadingListe && (
              <div className="p-6 text-center text-sm text-murekkep/60">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-cizgi border-t-zeytin mb-2"></div>
                <p>Liste yükleniyor...</p>
              </div>
            )}

            {listeHata && (
              <div className="p-3 bg-red-50 border border-red-200 rounded mb-3">
                <p className="text-sm text-red-700 font-semibold">{listeHata}</p>
              </div>
            )}

            {!loadingListe && filtreliListe.length === 0 && !listeHata && (
              <div className="p-8 text-center text-murekkep/60">
                <p>{musteriNoAra ? "Aramaya uygun müşteri yok." : "Bekleyen müşteri yok."}</p>
              </div>
            )}

            <div className="space-y-2 flex-1 min-h-0 overflow-auto pr-1">
              {filtreliListe.map((m) => {
                const active = secili?.id === m.id
                return (
                  <button
                    key={m.id}
                    onClick={() => setSecili(m)}
                    className={`w-full text-left p-3 rounded border flex gap-3 items-start transition-colors ${active
                      ? "border-zeytin border-l-4 bg-zeytin/5"
                      : "border-cizgi bg-white hover:bg-zemin"
                      }`}
                  >
                    <span className="fis-no text-lg min-w-[4.75rem] justify-center">No {m.musteri_no}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-murekkep text-lg truncate flex-1">{m.ad_soyad}</p>
                        {(m.odeme_tipi || 'yag') === 'yag' ? (
                          <span className="rozet bg-sizma/10 text-sizma border-sizma/30">HAK</span>
                        ) : (
                          <span className="rozet bg-para/10 text-para border-para/30">PARA</span>
                        )}
                      </div>
                      <Telefon numara={m.telefon ? normalizeTelefon(m.telefon) : "-"} />
                      <TarihSaat
                        className="mt-1.5"
                        tarih={new Date(m.created_at).toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric" })}
                        saat={new Date(m.created_at).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
                      />
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="lg:col-span-4">
            {!secili ? (
              <div className="card border-dashed p-16 text-center">
                <p className="text-murekkep/60 text-lg">
                  Ölçüm girmek için soldan bir müşteri seçin.
                </p>
              </div>
            ) : (
              <div className="card p-6 space-y-6">
                <div className="flex items-center justify-between pb-5 border-b border-cizgi">
                  <div>
                    <p className="label">Müşteri</p>
                    <h3 className="font-display text-xl font-bold text-murekkep">
                      {secili.ad_soyad}
                    </h3>
                    <Telefon numara={secili.telefon ? normalizeTelefon(secili.telefon) : "-"} />
                  </div>
                  <span className="fis-no text-2xl px-3 py-1">No {secili.musteri_no}</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className={ALAN_ETIKET}>Yağ ile ödeme bedeli (₺)</label>
                    <input
                      type="number"
                      name="yag_ile_odeme"
                      value={formData.yag_ile_odeme}
                      onChange={handleChange}
                      placeholder="0"
                      className={GIRDI}
                    />
                  </div>
                  <div>
                    <label className={ALAN_ETIKET}>Bidon ücreti (₺)</label>
                    <input
                      type="number"
                      name="bidon_ucreti"
                      value={formData.bidon_ucreti}
                      onChange={handleChange}
                      placeholder="0"
                      className={GIRDI}
                    />
                  </div>
                  <div>
                    <label className={ALAN_ETIKET}>Sıkım bedeli (₺)</label>
                    <input
                      type="number"
                      name="sikim_bedeli"
                      value={formData.sikim_bedeli}
                      onChange={handleChange}
                      placeholder="0"
                      className={GIRDI}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className={ALAN_ETIKET}>Gelen zeytin (kg)</label>
                    <input
                      type="number"
                      name="zeytin_kg"
                      value={formData.zeytin_kg}
                      onChange={handleChange}
                      placeholder="500"
                      className={GIRDI}
                    />
                  </div>
                  <div>
                    <label className={ALAN_ETIKET}>Sıkma ücreti (₺)</label>
                    <div className={OKUMA}>{yuvarla(hesap.sikmaUcretiTL)}</div>
                  </div>
                  <div>
                    <label className={ALAN_ETIKET}>Sıkma ücreti (yağ kg)</label>
                    <div className={`${OKUMA} text-sizma`}>{yuvarla(hesap.sikmaUcretiYag)}</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className={ALAN_ETIKET}>Kantarda gözüken yağ (kg)</label>
                    <input
                      type="number"
                      name="cikan_yag"
                      value={formData.cikan_yag}
                      onChange={handleChange}
                      placeholder="0"
                      className={GIRDI}
                    />
                  </div>
                  <div>
                    <label className={ALAN_ETIKET}>Kantardaki bidon</label>
                    <input
                      type="number"
                      name="kantar_bidon"
                      value={formData.kantar_bidon}
                      onChange={handleChange}
                      placeholder="0"
                      className={GIRDI}
                    />
                  </div>
                  <div>
                    <label className={ALAN_ETIKET}>Net yağ (kg)</label>
                    <div className={`${OKUMA} text-sizma`}>{formData.cikan_yag ? yuvarla(hesap.netYag) : "—"}</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={ALAN_ETIKET}>Bidon bedeli (₺)</label>
                    <div className={OKUMA}>{yuvarla(hesap.bidonBedeliTL)}</div>
                  </div>
                  <div>
                    <label className={ALAN_ETIKET}>Bidon bedeli (yağ kg)</label>
                    <div className={`${OKUMA} text-sizma`}>{yuvarla(hesap.bidonBedeliYag)}</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className={ALAN_ETIKET}>Oran</label>
                    <div className={OKUMA}>{hesap.oran}</div>
                  </div>
                  <div>
                    <label className={ALAN_ETIKET}>Toplam sıkım bedeli (₺)</label>
                    <div onClick={() => setFormData({ ...formData, odeme_tipi: "para" })} className={odemeKutu(formData.odeme_tipi === "para", "para")}>
                      <span
                        role="radio"
                        aria-checked={formData.odeme_tipi === "para"}
                        className={`absolute top-2 right-2 w-5 h-5 rounded-full border-2 flex items-center justify-center ${formData.odeme_tipi === "para" ? "border-para" : "border-cizgi"}`}
                      >
                        {formData.odeme_tipi === "para" && <span className="w-2.5 h-2.5 rounded-full bg-para" />}
                      </span>
                      <div className="readout text-2xl">{yuvarla(hesap.toplamTL)}</div>
                    </div>
                  </div>
                  <div>
                    <label className={ALAN_ETIKET}>Toplam sıkım bedeli (yağ kg)</label>
                    <div onClick={() => setFormData({ ...formData, odeme_tipi: "yag" })} className={odemeKutu(formData.odeme_tipi === "yag", "sizma")}>
                      <span
                        role="radio"
                        aria-checked={formData.odeme_tipi === "yag"}
                        className={`absolute top-2 right-2 w-5 h-5 rounded-full border-2 flex items-center justify-center ${formData.odeme_tipi === "yag" ? "border-sizma" : "border-cizgi"}`}
                      >
                        {formData.odeme_tipi === "yag" && <span className="w-2.5 h-2.5 rounded-full bg-sizma" />}
                      </span>
                      <div className="readout text-2xl">{yuvarla(hesap.toplamYag)}</div>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="label text-center">Verilen bidon numaraları</label>

                  <textarea
                    ref={bidonRef}
                    rows={1}
                    name="bidon_no"
                    value={formData.bidon_no}
                    onFocus={autoGrowBidon}
                    onInput={autoGrowBidon}
                    onKeyDown={(e) => {
                      if (e.key === " " || e.key === "Enter") {
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
                    className="input readout text-lg text-center tracking-wider resize-none overflow-hidden"
                    placeholder="1234-56-7890"
                  />
                </div>

                <div className="card divide-y divide-dashed divide-cizgi max-w-sm mx-auto">
                  <div className="flex items-baseline justify-between gap-4 px-4 py-2">
                    <span className="text-sm text-murekkep/70">Şu an verilen bidon</span>
                    <span className="readout text-lg">{verilenBidonSayisi}</span>
                  </div>
                  <div className="flex items-baseline justify-between gap-4 px-4 py-2">
                    <span className="text-sm text-murekkep/70">Bu numaraya verilen toplam bidon</span>
                    <span className="readout text-lg">{toplamGecmisBidon + verilenBidonSayisi}</span>
                  </div>
                </div>

                <div>
                  <label className="label">İşlem notları</label>
                  <textarea
                    name="notlar"
                    value={formData.notlar}
                    onChange={handleChange}
                    rows="3"
                    className="input resize-none"
                    placeholder="İşlem hakkında not ekleyin"
                  />
                </div>

                <div className="flex gap-4 pt-2">
                  <button onClick={() => setSecili(null)} className="btn-secondary w-1/3 py-3.5">
                    İptal
                  </button>

                  <button
                    onClick={handleKaydet}
                    disabled={!formData.zeytin_kg || !formData.cikan_yag || !formData.kantar_bidon || !formData.bidon_no}
                    className="btn-primary w-2/3 py-3.5 text-base"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    İşlemi onayla
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
