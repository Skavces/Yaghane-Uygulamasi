import { useState, useEffect, useRef } from "react"
import axios from "axios"
import io from "socket.io-client"
import { ClipboardList, ListChecks, MoreVertical, Pencil, RefreshCw, Undo2, X } from "lucide-react"

axios.defaults.baseURL = "/"

const socket = io()

const SECIM_SECILI = {
  zeytin: "border-zeytin bg-zeytin/10 text-zeytin",
  murekkep: "border-murekkep bg-murekkep/5 text-murekkep",
  sizma: "border-sizma bg-sizma/10 text-sizma",
  para: "border-para bg-para/10 text-para",
}

const secimKutu = (aktif, renk) =>
  `relative rounded border px-4 py-3 text-left transition-colors ${
    aktif ? `${SECIM_SECILI[renk]} border-2` : "border-cizgi bg-white text-murekkep/70 hover:bg-zemin"
  }`

export default function GirisciPanel() {
  const [activeTab, setActiveTab] = useState("form")
  const [formData, setFormData] = useState({
    musteri_no: "",
    ad_soyad: "",
    telefon: "",
    giris_durum: "sikilacak",
    odeme_tipi: "yag",
  })
  const [kayitlar, setKayitlar] = useState([])
  const [mesaj, setMesaj] = useState("")
  const [mesajTipi, setMesajTipi] = useState("")
  const [mesajAnim, setMesajAnim] = useState("spin")
  const [musteriNoAra, setMusteriNoAra] = useState("")
  const [acikMenu, setAcikMenu] = useState(null)
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 })
  const [duzenleModal, setDuzenleModal] = useState(null)
  const menuRef = useRef(null)

  const fetchKayitlar = async () => {
    try {
      const res = await axios.get("/api/giris-bekleyenler")
      setKayitlar(res.data)
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    void (async () => {
      try {
        const res = await axios.get("/api/giris-bekleyenler")
        setKayitlar(res.data)
      } catch (err) {
        console.error(err)
      }
    })()
    socket.on("veri-guncellendi", fetchKayitlar)
    return () => socket.off("veri-guncellendi", fetchKayitlar)
  }, [])

  useEffect(() => {
    if (!acikMenu) return
    const handle = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setAcikMenu(null)
      }
    }
    document.addEventListener("mousedown", handle)
    return () => document.removeEventListener("mousedown", handle)
  }, [acikMenu])

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await axios.post("/api/giris", formData)
      setMesajAnim("spin")
      setMesaj("Müşteri kaydedildi, listeye düştü.")
      setMesajTipi("success")
      setFormData({ musteri_no: "", ad_soyad: "", telefon: "", giris_durum: "sikilacak", odeme_tipi: "yag" })
      setActiveTab("liste")
      setTimeout(() => setMesajAnim("tik"), 1200)
      setTimeout(() => setMesaj(""), 3000)
    } catch (error) {
      setMesajTipi("error")

      if (error?.response?.status === 409) {
        setMesaj(
          error.response.data?.msg || "Bu müşteri numarası zaten kullanımda."
        )
      } else if (error?.response?.status === 400) {
        setMesaj(error.response.data?.msg || "Eksik bilgi")
      } else {
        setMesaj("Kayıt sırasında hata oluştu")
      }
    }
  }

  const formatTelefonTR = (value) => {
    let digits = (value || "").replace(/\D/g, "")

    if (digits.length > 0 && digits[0] !== "0") {
      digits = "0" + digits
    }

    digits = digits.slice(0, 11)

    const p1 = digits.slice(0, 4)
    const p2 = digits.slice(4, 7)
    const p3 = digits.slice(7, 9)
    const p4 = digits.slice(9, 11)

    return [p1, p2, p3, p4].filter(Boolean).join(" ")
  }

  const formatTarihSaat = (dateString) => {
    const date = new Date(dateString)
    const turkiyeSaati = new Date(
      date.toLocaleString("en-US", { timeZone: "Europe/Istanbul" })
    )

    const saat = turkiyeSaati.toLocaleTimeString("tr-TR", {
      hour: "2-digit",
      minute: "2-digit",
    })

    const tarih = turkiyeSaati.toLocaleDateString("tr-TR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })

    return { saat, tarih }
  }

  const sikilacakYap = async (id) => {
    try {
      await axios.put(`/api/giris-sikilacak/${id}`)
      setMesajAnim("spin")
      setMesaj("Yağcıya gönderildi.")
      setMesajTipi("success")
      setTimeout(() => setMesajAnim("tik"), 1200)
      setTimeout(() => setMesaj(""), 2500)
    } catch (e) {
      setMesajTipi("error")
      setMesaj(e?.response?.data?.msg || "Güncelleme hatası")
      setTimeout(() => setMesaj(""), 2500)
    }
  }

  const sirayayAl = async (id) => {
    try {
      await axios.put(`/api/giris-siraya-al/${id}`)
      setMesajAnim("spin")
      setMesaj("Sıraya alındı.")
      setMesajTipi("success")
      setTimeout(() => setMesajAnim("tik"), 1200)
      setTimeout(() => setMesaj(""), 2500)
    } catch (e) {
      setMesajTipi("error")
      setMesaj(e?.response?.data?.msg || "Güncelleme hatası")
      setTimeout(() => setMesaj(""), 2500)
    }
  }

  const geriBekleyecek = async (id) => {
    try {
      await axios.put(`/api/giris-geri-bekleyecek/${id}`)
      setMesajAnim("spin")
      setMesaj("Bekleyecek durumuna alındı.")
      setMesajTipi("success")
      setTimeout(() => setMesajAnim("tik"), 1200)
      setTimeout(() => setMesaj(""), 2500)
    } catch (e) {
      setMesajTipi("error")
      setMesaj(e?.response?.data?.msg || "Güncelleme hatası")
      setTimeout(() => setMesaj(""), 2500)
    }
  }

  const geriSikilacak = async (id) => {
    try {
      await axios.put(`/api/giris-geri-sikilacak/${id}`)
      setMesajAnim("spin")
      setMesaj("Sıra bekliyor durumuna alındı.")
      setMesajTipi("success")
      setTimeout(() => setMesajAnim("tik"), 1200)
      setTimeout(() => setMesaj(""), 2500)
    } catch (e) {
      setMesajTipi("error")
      setMesaj(e?.response?.data?.msg || "Güncelleme hatası")
      setTimeout(() => setMesaj(""), 2500)
    }
  }

  const duzenleKaydet = async () => {
    try {
      await axios.put(`/api/giris-duzenle/${duzenleModal.id}`, {
        musteri_no: duzenleModal.musteri_no,
        ad_soyad: duzenleModal.ad_soyad,
        telefon: duzenleModal.telefon,
        odeme_tipi: duzenleModal.odeme_tipi,
        giris_durum: duzenleModal.giris_durum,
      })
      setMesajAnim("spin")
      setMesaj("Kayıt güncellendi.")
      setMesajTipi("success")
      setDuzenleModal(null)
      setTimeout(() => setMesajAnim("tik"), 1200)
      setTimeout(() => setMesaj(""), 2500)
    } catch (e) {
      setMesajTipi("error")
      setMesaj(e?.response?.data?.msg || "Güncelleme hatası")
      setTimeout(() => setMesaj(""), 2500)
    }
  }

  return (
    <div className="p-6">
      {mesaj && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-[9999]">
          <div className={`px-5 py-3 rounded-md shadow-lg flex items-center gap-3 bg-murekkep text-white border-l-4 ${
            mesajTipi === "error" ? "border-red-500" : "border-zeytin"
          }`}>
            {mesajTipi !== "error" && (
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
            )}
            <span className="font-semibold">{mesaj}</span>
          </div>
        </div>
      )}

      {acikMenu && (
        <div
          ref={menuRef}
          className="card fixed z-[9999] shadow-lg w-40 py-1 -translate-x-full"
          style={{ top: menuPos.top, left: menuPos.left }}
        >
          {kayitlar.filter(k => k.id === acikMenu).map(kayit => (
            <button
              key={kayit.id}
              onMouseDown={(e) => {
                e.stopPropagation()
                setDuzenleModal({ ...kayit })
                setAcikMenu(null)
              }}
              className="w-full text-left px-4 py-2.5 text-sm font-semibold text-murekkep hover:bg-zemin flex items-center gap-2"
            >
              <Pencil className="w-4 h-4 text-murekkep/60" />
              Kaydı düzenle
            </button>
          ))}
        </div>
      )}

      {duzenleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-murekkep/60 p-4" onClick={() => setDuzenleModal(null)}>
          <div className="bg-white rounded-md shadow-lg border border-cizgi w-full max-w-md overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-cizgi flex items-center justify-between">
              <h3 className="font-display text-lg font-bold text-murekkep">Kaydı düzenle</h3>
              <button onClick={() => setDuzenleModal(null)} aria-label="Kapat" className="p-1 rounded text-murekkep/50 hover:text-murekkep hover:bg-zemin transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div>
                <label className="label">Müşteri numarası</label>
                <input
                  value={duzenleModal.musteri_no}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "").slice(0, 3)
                    setDuzenleModal((p) => ({ ...p, musteri_no: val }))
                  }}
                  maxLength={3}
                  className="input readout text-3xl text-center tracking-[0.4em] py-3"
                  placeholder="000"
                />
              </div>

              <div>
                <label className="label">Ad soyad</label>
                <input
                  value={duzenleModal.ad_soyad}
                  onChange={(e) => setDuzenleModal((p) => ({ ...p, ad_soyad: e.target.value.toLocaleUpperCase("tr-TR") }))}
                  className="input text-lg font-semibold"
                  placeholder="NADİR KAYA"
                />
              </div>

              <div>
                <label className="label">Telefon</label>
                <input
                  value={duzenleModal.telefon}
                  inputMode="numeric"
                  onChange={(e) => {
                    const formatted = formatTelefonTR(e.target.value)
                    setDuzenleModal((p) => ({ ...p, telefon: formatted }))
                  }}
                  className="input readout text-lg"
                  placeholder="0555 123 45 67"
                />
              </div>

              <div>
                <label className="label">Ödeme yöntemi</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setDuzenleModal((p) => ({ ...p, odeme_tipi: "yag" }))}
                    className={secimKutu(duzenleModal.odeme_tipi === "yag", "sizma")}
                  >
                    HAK
                  </button>
                  <button
                    type="button"
                    onClick={() => setDuzenleModal((p) => ({ ...p, odeme_tipi: "para" }))}
                    className={secimKutu(duzenleModal.odeme_tipi === "para", "para")}
                  >
                    PARA
                  </button>
                </div>
              </div>

              <div>
                <label className="label">Durum</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setDuzenleModal((p) => ({ ...p, giris_durum: "sikilacak" }))}
                    className={secimKutu(duzenleModal.giris_durum !== "bekleyecek", "zeytin")}
                  >
                    Sıkılacak
                  </button>
                  <button
                    type="button"
                    onClick={() => setDuzenleModal((p) => ({ ...p, giris_durum: "bekleyecek" }))}
                    className={secimKutu(duzenleModal.giris_durum === "bekleyecek", "murekkep")}
                  >
                    Bekleyecek
                  </button>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-cizgi flex gap-3">
              <button onClick={() => setDuzenleModal(null)} className="btn-secondary flex-1">
                İptal
              </button>
              <button onClick={duzenleKaydet} className="btn-primary flex-1">
                Kaydet
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="font-display text-2xl font-bold text-murekkep">Müşteri girişi</h1>
          <p className="text-murekkep/60">Müşteri takip ve kayıt sistemi</p>
        </div>

        <div className="card overflow-hidden">
          <div className="flex border-b border-cizgi">
            <button
              onClick={() => setActiveTab("form")}
              className={`flex items-center gap-2 px-6 py-4 text-sm font-semibold border-b-2 -mb-px transition-colors ${activeTab === "form"
                ? "border-zeytin text-murekkep"
                : "border-transparent text-murekkep/60 hover:text-murekkep hover:bg-zemin"
                }`}
            >
              <ClipboardList className="w-4 h-4" />
              Müşteri girişi
            </button>

            <button
              onClick={() => setActiveTab("liste")}
              className={`flex items-center gap-2 px-6 py-4 text-sm font-semibold border-b-2 -mb-px transition-colors ${activeTab === "liste"
                ? "border-zeytin text-murekkep"
                : "border-transparent text-murekkep/60 hover:text-murekkep hover:bg-zemin"
                }`}
            >
              <ListChecks className="w-4 h-4" />
              Takip listesi
              {kayitlar.filter(k => k.status !== 2).length > 0 && (
                <span className="fis-no">
                  {kayitlar.filter(k => k.status !== 2).length}
                </span>
              )}
            </button>
          </div>

          <div className="p-6 min-h-[25rem]">
            {activeTab === "form" && (
              <div className="max-w-lg mx-auto">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label className="label">Müşteri numarası</label>
                    <input
                      name="musteri_no"
                      value={formData.musteri_no}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, "").slice(0, 3)
                        setFormData({ ...formData, musteri_no: val })
                      }}
                      required
                      onInvalid={(e) => e.target.setCustomValidity("Müşteri numarası boş bırakılamaz")}
                      onInput={(e) => e.target.setCustomValidity("")}
                      autoFocus
                      maxLength={3}
                      className="input readout text-4xl text-center tracking-[0.4em] py-5"
                      placeholder="000"
                    />
                  </div>

                  <div>
                    <label className="label">Ad soyad</label>
                    <input
                      name="ad_soyad"
                      value={formData.ad_soyad}
                      onChange={(e) => {
                        const val = e.target.value.toLocaleUpperCase("tr-TR")
                        setFormData({ ...formData, ad_soyad: val })
                      }}
                      required
                      onInvalid={(e) => e.target.setCustomValidity("Ad soyad boş bırakılamaz")}
                      onInput={(e) => e.target.setCustomValidity("")}
                      className="input text-lg font-semibold"
                      placeholder="NADİR KAYA"
                    />
                  </div>

                  <div>
                    <label className="label">Telefon</label>
                    <input
                      name="telefon"
                      value={formData.telefon}
                      inputMode="numeric"
                      autoComplete="tel"
                      required
                      onInvalid={(e) => e.target.setCustomValidity("Telefon numarası boş bırakılamaz")}
                      onInput={(e) => e.target.setCustomValidity("")}
                      onChange={(e) => {
                        const formatted = formatTelefonTR(e.target.value)
                        setFormData({ ...formData, telefon: formatted })
                      }}
                      onPaste={(e) => {
                        e.preventDefault()
                        const pasted = e.clipboardData.getData("text")
                        const formatted = formatTelefonTR(pasted)
                        setFormData((prev) => ({ ...prev, telefon: formatted }))
                      }}
                      className="input readout text-lg"
                      placeholder="0555 123 45 67"
                    />
                  </div>

                  <div>
                    <label className="label">Kayıt türü</label>

                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setFormData((p) => ({ ...p, giris_durum: "sikilacak" }))}
                        className={secimKutu(formData.giris_durum === "sikilacak", "zeytin")}
                      >
                        <span className="block font-bold">Sıkılacak</span>
                        <span className="block text-xs font-normal opacity-70 mt-0.5">Sıraya alınacak</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setFormData((p) => ({ ...p, giris_durum: "bekleyecek" }))}
                        className={secimKutu(formData.giris_durum === "bekleyecek", "murekkep")}
                      >
                        <span className="block font-bold">Bekleyecek</span>
                        <span className="block text-xs font-normal opacity-70 mt-0.5">Sonradan sıraya alınacak</span>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="label">Ödeme yöntemi</label>

                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setFormData((p) => ({ ...p, odeme_tipi: "yag" }))}
                        className={secimKutu(formData.odeme_tipi === "yag", "sizma")}
                      >
                        <span className="block font-bold">HAK</span>
                        <span className="block text-xs font-normal opacity-70 mt-0.5">Yağ kesintisi yapılacak</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setFormData((p) => ({ ...p, odeme_tipi: "para" }))}
                        className={secimKutu(formData.odeme_tipi === "para", "para")}
                      >
                        <span className="block font-bold">PARA</span>
                        <span className="block text-xs font-normal opacity-70 mt-0.5">Para ödenecek</span>
                      </button>
                    </div>
                  </div>

                  <button type="submit" className="btn-primary w-full py-3.5 text-base">
                    Kaydı oluştur
                  </button>
                </form>
              </div>
            )}

            {activeTab === "liste" && (
              <div className="space-y-5">
                <div className="flex justify-between items-center pb-4 border-b border-cizgi">
                  <div>
                    <h3 className="font-display text-lg font-bold text-murekkep">Takip listesi</h3>
                    <p className="text-murekkep/60 text-sm">
                      Bekleyecek, sırada ve yağcıdaki müşteriler
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <input
                        value={musteriNoAra}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, "").slice(0, 3)
                          setMusteriNoAra(val)
                        }}
                        inputMode="numeric"
                        placeholder="Müşteri no"
                        className="input readout w-36 pr-9 text-sm"
                      />
                      {musteriNoAra && (
                        <button
                          onClick={() => setMusteriNoAra("")}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-murekkep/40 hover:text-murekkep"
                          type="button"
                          aria-label="Temizle"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <button onClick={fetchKayitlar} className="btn-secondary">
                      <RefreshCw className="w-4 h-4" />
                      Yenile
                    </button>
                  </div>
                </div>

                {kayitlar.length === 0 ? (
                  <div className="card border-dashed py-12 text-center">
                    <h4 className="font-semibold text-murekkep">Listede bekleyen müşteri yok.</h4>
                    <p className="text-murekkep/60 text-sm mt-1">
                      Yeni kayıt için Müşteri girişi sekmesini kullanın.
                    </p>
                  </div>
                ) : (
                  <div className="card overflow-hidden">
                    <table className="min-w-full">
                      <thead className="bg-zemin border-b border-cizgi">
                        <tr>
                          <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-murekkep/60">Müşteri no</th>
                          <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-murekkep/60">İsim / telefon</th>
                          <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-murekkep/60">Giriş saati</th>
                          <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-wider text-murekkep/60 w-36">Durum</th>
                          <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-wider text-murekkep/60">Ödeme</th>
                          <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-wider text-murekkep/60 w-52">İşlem</th>
                          <th className="px-3 py-3 w-10"></th>
                        </tr>
                      </thead>

                      <tbody className="bg-white divide-y divide-cizgi">
                        {kayitlar
                          .filter((kayit) => {
                            if (kayit.status === 2) return false // Çıkışta olanları gösterme
                            if (!musteriNoAra) return true
                            return String(kayit.musteri_no).startsWith(musteriNoAra)
                          })
                          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                          .map((kayit) => {
                            const { saat, tarih } = formatTarihSaat(kayit.created_at)

                            const isBekleyecek = kayit.status === 0 && kayit.giris_durum === "bekleyecek"
                            const isSiraBekliyor = kayit.status === 0 && kayit.giris_durum !== "bekleyecek"
                            const isSirada = kayit.status === 1

                            const statusText = isBekleyecek
                              ? "Bekleyecek"
                              : isSiraBekliyor
                                ? "Sıra bekliyor"
                                : isSirada
                                  ? "Yağcıda"
                                  : "Çıkışta"

                            const statusClass = isBekleyecek
                              ? "rozet-bekliyor"
                              : isSiraBekliyor
                                ? "rozet-cikista"
                                : isSirada
                                  ? "rozet-sirada"
                                  : "rozet-bitti"

                            return (
                              <tr key={kayit.id} className="hover:bg-zemin/60 transition-colors">
                                <td className="px-5 py-3">
                                  <span className="fis-no text-base">No {kayit.musteri_no}</span>
                                </td>

                                <td className="px-5 py-3 whitespace-nowrap">
                                  <div className="flex flex-col">
                                    <span className="font-semibold text-murekkep">{kayit.ad_soyad}</span>
                                    <span className="readout text-sm text-murekkep/60">
                                      {kayit.telefon ? formatTelefonTR(kayit.telefon) : "-"}
                                    </span>
                                  </div>
                                </td>

                                <td className="px-5 py-3">
                                  <div className="flex flex-col">
                                    <span className="readout text-murekkep">{saat}</span>
                                    <span className="text-xs text-murekkep/60">{tarih}</span>
                                  </div>
                                </td>

                                <td className="px-5 py-3 text-center w-36">
                                  <span className={`${statusClass} whitespace-nowrap`}>{statusText}</span>
                                </td>

                                <td className="px-5 py-3 text-center">
                                  {(kayit.odeme_tipi || 'yag') === 'yag' ? (
                                    <span className="rozet bg-sizma/10 text-sizma border-sizma/30">HAK</span>
                                  ) : (
                                    <span className="rozet bg-para/10 text-para border-para/30">PARA</span>
                                  )}
                                </td>

                                <td className="px-5 py-3 text-center w-52">
                                  <div className="flex items-center justify-center gap-2">
                                    {isSiraBekliyor ? (
                                      <button onClick={() => sikilacakYap(kayit.id)} className="btn-primary py-1.5 whitespace-nowrap">
                                        Sıkılacak yap
                                      </button>
                                    ) : isBekleyecek ? (
                                      <button onClick={() => sirayayAl(kayit.id)} className="btn-secondary py-1.5 whitespace-nowrap">
                                        Sıraya al
                                      </button>
                                    ) : isSirada ? (
                                      <button onClick={() => geriSikilacak(kayit.id)} className="btn-secondary py-1.5 whitespace-nowrap">
                                        <Undo2 className="w-4 h-4" />
                                        Geri al
                                      </button>
                                    ) : (
                                      <span className="text-sm text-murekkep/40">-</span>
                                    )}
                                  </div>
                                </td>

                                <td className="px-3 py-3 w-10 relative">
                                  <button
                                    onMouseDown={(e) => {
                                      e.stopPropagation()
                                      if (acikMenu === kayit.id) {
                                        setAcikMenu(null)
                                      } else {
                                        const rect = e.currentTarget.getBoundingClientRect()
                                        setMenuPos({ top: rect.bottom + 4, left: rect.right })
                                        setAcikMenu(kayit.id)
                                      }
                                    }}
                                    aria-label="Kayıt seçenekleri"
                                    className="p-1.5 rounded text-murekkep/50 hover:text-murekkep hover:bg-zemin transition-colors"
                                  >
                                    <MoreVertical className="w-5 h-5" />
                                  </button>
                                </td>
                              </tr>
                            )
                          })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
