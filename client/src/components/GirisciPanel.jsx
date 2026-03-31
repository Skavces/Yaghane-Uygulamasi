import { useState, useEffect } from "react"
import axios from "axios"
import io from "socket.io-client"

axios.defaults.baseURL = "/"

const socket = io()

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-amber-50 p-6 font-sans relative overflow-hidden">
      {mesaj && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-[9999]">
          <div className={`px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border-2 ${
            mesajTipi === "error"
              ? "bg-gradient-to-r from-red-600 to-red-700 text-white border-red-400/30"
              : "bg-gradient-to-r from-emerald-600 to-emerald-700 text-white border-emerald-400/30"
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
            <span className="font-bold text-base">{mesaj}</span>
          </div>
        </div>
      )}

      <div className="absolute inset-0 opacity-[0.03] pointer-events-none">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, #059669 1px, transparent 0)`,
            backgroundSize: "40px 40px",
          }}
        ></div>
      </div>

      <div className="absolute top-20 right-1/4 w-96 h-96 bg-emerald-200/30 rounded-full blur-3xl animate-pulse pointer-events-none"></div>
      <div className="absolute bottom-40 left-1/3 w-72 h-72 bg-amber-200/30 rounded-full blur-3xl animate-pulse delay-1000 pointer-events-none"></div>

      <div className="max-w-5xl mx-auto relative z-10">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 via-emerald-700 to-emerald-800 mb-2 tracking-tight">
            Müşteri Giriş Paneli
          </h1>
          <p className="text-slate-600 font-medium">Müşteri Takip ve Kayıt Sistemi</p>
        </div>

        <div className="bg-white/80 backdrop-blur-xl rounded-t-3xl shadow-2xl border-2 border-white/60 border-b-0 overflow-hidden">
          <div className="flex">
            <button
              onClick={() => setActiveTab("form")}
              className={`flex-1 py-5 px-6 font-bold text-sm transition relative ${activeTab === "form"
                ? "text-slate-800 bg-white"
                : "text-slate-500 bg-gradient-to-b from-slate-50 to-slate-100 hover:from-slate-100 hover:to-slate-50"
                }`}
            >
              {activeTab === "form" && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-emerald-600"></div>
              )}
              <span className="flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
                Müşteri Girişi
              </span>
            </button>

            <button
              onClick={() => setActiveTab("liste")}
              className={`flex-1 py-5 px-6 font-bold text-sm transition relative ${activeTab === "liste"
                ? "text-slate-800 bg-white"
                : "text-slate-500 bg-gradient-to-b from-slate-50 to-slate-100 hover:from-slate-100 hover:to-slate-50"
                }`}
            >
              {activeTab === "liste" && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-emerald-600"></div>
              )}
              <span className="flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
                Takip Listesi
                {kayitlar.filter(k => k.status !== 2).length > 0 && (
                  <span className="ml-2 px-2 py-0.5 bg-gradient-to-r from-rose-500 to-rose-600 text-white text-xs font-bold rounded-full shadow-lg animate-pulse">
                    {kayitlar.filter(k => k.status !== 2).length}
                  </span>
                )}
              </span>
            </button>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-xl rounded-b-3xl shadow-2xl border-2 border-white/60 border-t-0 p-8 min-h-[500px] relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/30 to-amber-50/30 pointer-events-none"></div>

          <div className="relative z-10">
            {activeTab === "form" && (
              <div className="max-w-lg mx-auto space-y-8 animate-fadeIn">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-3 uppercase tracking-wide">
                      Müşteri Numarası
                    </label>
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
                      className="w-full px-4 py-6 bg-white border-2 border-slate-200 rounded-2xl text-4xl font-black text-slate-800 text-center tracking-[0.5em] placeholder:text-slate-300 focus:outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50/50 focus:bg-white transition-all shadow-lg hover:shadow-xl"
                      placeholder="000"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-3 uppercase tracking-wide">
                      Ad Soyad
                    </label>
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
                      className="w-full px-5 py-4 bg-white border-2 border-slate-200 rounded-2xl text-lg font-bold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 focus:bg-white transition-all shadow-sm hover:shadow-md"
                      placeholder="NADİR KAYA"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-3 uppercase tracking-wide">
                      Telefon
                    </label>
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
                      className="w-full px-5 py-4 bg-white border-2 border-slate-200 rounded-2xl text-lg font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 focus:bg-white transition-all shadow-sm hover:shadow-md"
                      placeholder="0555 123 45 67"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-3 uppercase tracking-wide">
                      Kayıt Türü
                    </label>

                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setFormData((p) => ({ ...p, giris_durum: "sikilacak" }))}
                        className={`px-4 py-4 rounded-2xl border-2 font-black transition shadow-sm ${formData.giris_durum === "sikilacak"
                          ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        Sıkılacak
                        <div className="text-xs font-bold opacity-70 mt-1">
                          Sıraya alınacak
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setFormData((p) => ({ ...p, giris_durum: "bekleyecek" }))}
                        className={`px-4 py-4 rounded-2xl border-2 font-black transition shadow-sm ${formData.giris_durum === "bekleyecek"
                          ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        Bekleyecek
                        <div className="text-xs font-bold opacity-70 mt-1">
                          Sonradan sıraya alınacak
                        </div>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-3 uppercase tracking-wide">
                      Ödeme Yöntemi
                    </label>

                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() =>
                          setFormData((p) => ({ ...p, odeme_tipi: "yag" }))
                        }
                        className={`px-4 py-4 rounded-2xl border-2 font-black transition shadow-sm ${formData.odeme_tipi === "yag"
                          ? "border-blue-500 bg-blue-50 text-blue-700"
                          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                          }`}
                      >
                        HAK
                        <div className="text-xs font-bold opacity-70 mt-1">
                          Yağ kesintisi yapılacak
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setFormData((p) => ({ ...p, odeme_tipi: "para" }))
                        }
                        className={`px-4 py-4 rounded-2xl border-2 font-black transition shadow-sm ${formData.odeme_tipi === "para"
                          ? "border-red-500 bg-red-50 text-red-700"
                          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                          }`}
                      >
                        PARA
                        <div className="text-xs font-bold opacity-70 mt-1">
                          Para ödenecek
                        </div>
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-bold rounded-2xl transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 flex items-center justify-center gap-3 text-lg mt-4 group"
                  >
                    <span>KAYDI OLUŞTUR</span>
                    <svg
                      className="w-6 h-6 group-hover:translate-x-1 transition-transform"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2.5}
                        d="M13 5l7 7-7 7M5 5l7 7-7 7"
                      />
                    </svg>
                  </button>
                </form>
              </div>
            )}

            {activeTab === "liste" && (
              <div className="space-y-6 animate-fadeIn">
                <div className="flex justify-between items-center pb-4 border-b-2 border-slate-100">
                  <div>
                    <h3 className="text-2xl font-black text-slate-800">Takip Listesi</h3>
                    <p className="text-slate-600 text-sm font-medium">
                      Bekleyecek / Sırada / Çıkışta müşteriler
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
                        placeholder="Müşteri No"
                        className="w-40 px-4 py-3 bg-white border-2 border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:border-emerald-400 transition-all pr-10 shadow-sm hover:shadow-md"
                      />
                      {musteriNoAra && (
                        <button
                          onClick={() => setMusteriNoAra("")}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 font-bold"
                          type="button"
                          aria-label="Temizle"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                    <button
                      onClick={fetchKayitlar}
                      className="flex items-center gap-2 px-4 py-3 text-sm font-bold text-emerald-700 bg-gradient-to-r from-emerald-50 to-emerald-100 hover:from-emerald-100 hover:to-emerald-50 rounded-xl transition-all shadow-sm hover:shadow-md border border-emerald-200"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                        />
                      </svg>
                      Yenile
                    </button>
                  </div>
                </div>

                {kayitlar.length === 0 ? (
                  <div className="text-center py-20 bg-gradient-to-br from-slate-50 to-slate-100 rounded-3xl border-2 border-dashed border-slate-300">
                    <div className="bg-white w-20 h-20 mx-auto rounded-full flex items-center justify-center shadow-lg mb-4 border-2 border-slate-200">
                      <svg className="w-10 h-10 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </div>
                    <h4 className="text-slate-800 font-bold text-lg">Liste Boş</h4>
                    <p className="text-slate-500">Şu an aktif müşteri yok.</p>
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-2xl border-2 border-slate-200 shadow-xl">
                    <table className="min-w-full">
                      <thead className="bg-gradient-to-r from-slate-50 to-slate-100 border-b-2 border-slate-200">
                        <tr>
                          <th className="px-5 py-4 text-left text-sm font-bold text-slate-600 uppercase tracking-wider">
                            Müşteri No
                          </th>
                          <th className="px-5 py-4 text-left text-sm font-bold text-slate-600 uppercase tracking-wider">
                            İsim / Telefon
                          </th>
                          <th className="px-5 py-4 text-left text-sm font-bold text-slate-600 uppercase tracking-wider">
                            Giriş Saati
                          </th>
                          <th className="px-5 py-4 text-center text-sm font-bold text-slate-600 uppercase tracking-wider">
                            Durum
                          </th>
                          <th className="px-5 py-4 text-center text-sm font-bold text-slate-600 uppercase tracking-wider">
                            Ödeme
                          </th>
                          <th className="px-5 py-4 text-center text-sm font-bold text-slate-600 uppercase tracking-wider">
                            İşlem
                          </th>
                        </tr>
                      </thead>

                      <tbody className="bg-white divide-y-2 divide-slate-100">
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
                                ? "Sıra Bekliyor"
                                : isSirada
                                  ? "Sırada"
                                  : "Çıkışta"

                            const statusColor = isBekleyecek
                              ? "bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 border-blue-400"
                              : isSiraBekliyor
                                ? "bg-gradient-to-r from-emerald-100 to-emerald-200 text-emerald-800 border-emerald-300"
                                : isSirada
                                  ? "bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-800 border-yellow-300"
                                  : "bg-gradient-to-r from-red-200 to-red-300 text-red-900 border-red-300"

                            return (
                              <tr key={kayit.id} className="hover:bg-slate-50 transition duration-150">
                                <td className="px-5 py-4">
                                  <span className="text-xl font-black text-slate-800 tracking-wide bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
                                    #{kayit.musteri_no}
                                  </span>
                                </td>

                                <td className="px-5 py-4">
                                  <div className="flex flex-col">
                                    <span className="text-base font-bold text-slate-700">
                                      {kayit.ad_soyad}
                                    </span>
                                    <span className="text-base font-semibold text-slate-500">
                                      {kayit.telefon ? formatTelefonTR(kayit.telefon) : "-"}
                                    </span>
                                  </div>
                                </td>

                                <td className="px-5 py-4">
                                  <div className="flex flex-col">
                                    <span className="text-base font-bold text-slate-800 flex items-center gap-1">
                                      <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth={2}
                                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                        />
                                      </svg>
                                      {saat}
                                    </span>
                                    <span className="text-sm font-semibold text-slate-500 pl-5">{tarih}</span>
                                  </div>
                                </td>

                                <td className="px-5 py-4 text-center">
                                  <span
                                    className={`inline-flex items-center px-4 py-1.5 border-2 rounded-full text-sm font-black uppercase tracking-wide shadow-sm ${statusColor}`}
                                  >
                                    {isBekleyecek ? (
                                      <span className="w-2 h-2 rounded-full bg-blue-500 mr-2 shadow-lg"></span>
                                    ) : isSiraBekliyor ? (
                                      <span className="w-2 h-2 rounded-full bg-emerald-500 mr-2 animate-pulse shadow-lg"></span>
                                    ) : isSirada ? (
                                      <span className="w-2 h-2 rounded-full bg-amber-500 mr-2 animate-pulse shadow-lg"></span>
                                    ) : (
                                      <span className="w-2 h-2 rounded-full bg-orange-500 mr-2 shadow-lg"></span>
                                    )}
                                    {statusText}
                                  </span>
                                </td>

                                <td className="px-5 py-4 text-center">
                                  <span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-black uppercase tracking-wider border ${
                                    (kayit.odeme_tipi || 'yag') === 'yag'
                                      ? "bg-blue-100 text-blue-700 border-blue-300"
                                      : "bg-red-100 text-red-700 border-red-300"
                                  }`}>
                                    {(kayit.odeme_tipi || 'yag') === 'yag' ? "HAK" : "PARA"}
                                  </span>
                                </td>

                                <td className="px-5 py-4 text-center">
                                  {isSiraBekliyor ? (
                                    <button
                                      onClick={() => sikilacakYap(kayit.id)}
                                      className="px-4 py-2 rounded-xl font-black text-sm bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-md hover:scale-[1.02] active:scale-[0.98] transition whitespace-nowrap"
                                    >
                                      SIKILACAK YAP
                                    </button>
                                  ) : isBekleyecek ? (
                                    <button
                                      onClick={() => sirayayAl(kayit.id)}
                                      className="px-4 py-2 rounded-xl font-black text-sm bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md hover:scale-[1.02] active:scale-[0.98] transition whitespace-nowrap"
                                    >
                                      SIRAYA AL
                                    </button>
                                  ) : (
                                    <span className="text-sm font-bold text-slate-400">-</span>
                                  )}
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
