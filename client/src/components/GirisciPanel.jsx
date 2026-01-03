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
  })
  const [kayitlar, setKayitlar] = useState([])
  const [mesaj, setMesaj] = useState("")
  const [mesajTipi, setMesajTipi] = useState("")

  useEffect(() => {
    fetchKayitlar()
    socket.on("veri-guncellendi", fetchKayitlar)
    return () => socket.off("veri-guncellendi", fetchKayitlar)
  }, [])

  const fetchKayitlar = async () => {
    try {
      const res = await axios.get("/api/giris-bekleyenler")
      setKayitlar(res.data)
    } catch (error) {
      console.error(error)
    }
  }

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await axios.post("/api/giris", formData)
      setMesaj("Müşteri kaydedildi")
      setMesajTipi("success")
      setFormData({ musteri_no: "", ad_soyad: "", telefon: "" })
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-amber-50 p-6 font-sans relative overflow-hidden">
      {/* ARKA PLAN PATTERN */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 2px 2px, #059669 1px, transparent 0)`,
          backgroundSize: '40px 40px'
        }}></div>
      </div>

      {/* ANIMATED GLOW EFFECTS */}
      <div className="absolute top-20 right-1/4 w-96 h-96 bg-emerald-200/30 rounded-full blur-3xl animate-pulse pointer-events-none"></div>
      <div className="absolute bottom-40 left-1/3 w-72 h-72 bg-amber-200/30 rounded-full blur-3xl animate-pulse delay-1000 pointer-events-none"></div>

      <div className="max-w-4xl mx-auto relative z-10">
        {/* HEADER */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-4">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full blur-xl opacity-30 animate-pulse"></div>
            </div>
          </div>
          <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 via-emerald-700 to-emerald-800 mb-2 tracking-tight">
            Müşteri Giriş Paneli
          </h1>
          <p className="text-slate-600 font-medium">Müşteri Takip ve Kayıt Sistemi</p>
        </div>

        {/* TAB NAVİGASYON */}
        <div className="bg-white/80 backdrop-blur-xl rounded-t-3xl shadow-2xl border-2 border-white/60 border-b-0 overflow-hidden">
          <div className="flex">
            <button
              onClick={() => setActiveTab("form")}
              className={`flex-1 py-5 px-6 font-bold text-sm transition relative ${
                activeTab === "form"
                  ? "text-slate-800 bg-white"
                  : "text-slate-500 bg-gradient-to-b from-slate-50 to-slate-100 hover:from-slate-100 hover:to-slate-50"
              }`}
            >
              {activeTab === "form" && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-emerald-600"></div>
              )}
              <span className="flex items-center justify-center gap-2">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
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
              className={`flex-1 py-5 px-6 font-bold text-sm transition relative ${
                activeTab === "liste"
                  ? "text-slate-800 bg-white"
                  : "text-slate-500 bg-gradient-to-b from-slate-50 to-slate-100 hover:from-slate-100 hover:to-slate-50"
              }`}
            >
              {activeTab === "liste" && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-emerald-600"></div>
              )}
              <span className="flex items-center justify-center gap-2">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
                Takip Listesi
                {kayitlar.length > 0 && (
                  <span className="ml-2 px-2 py-0.5 bg-gradient-to-r from-rose-500 to-rose-600 text-white text-xs font-bold rounded-full shadow-lg animate-pulse">
                    {kayitlar.length}
                  </span>
                )}
              </span>
            </button>
          </div>
        </div>

        {/* İÇERİK ALANI */}
        <div className="bg-white/80 backdrop-blur-xl rounded-b-3xl shadow-2xl border-2 border-white/60 border-t-0 p-8 min-h-[500px] relative overflow-hidden">
          {/* Card Glow */}
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/30 to-amber-50/30 pointer-events-none"></div>
          
          <div className="relative z-10">
            {/* FORM SEKMESİ */}
            {activeTab === "form" && (
              <div className="max-w-lg mx-auto space-y-8 animate-fadeIn">
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* MÜŞTERİ NUMARASI */}
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
                      autoFocus
                      maxLength={3}
                      className="w-full px-4 py-6 bg-white border-2 border-slate-200 rounded-2xl text-5xl font-black text-slate-800 text-center tracking-[0.5em] placeholder:text-slate-300 focus:outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50/50 focus:bg-white transition-all shadow-lg hover:shadow-xl"
                      placeholder="101"
                    />
                  </div>

                  {/* AD SOYAD */}
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-3 uppercase tracking-wide">
                      Ad Soyad
                    </label>
                    <input
                      name="ad_soyad"
                      value={formData.ad_soyad}
                      onChange={handleChange}
                      required
                      className="w-full px-5 py-4 bg-white border-2 border-slate-200 rounded-2xl text-lg font-bold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 focus:bg-white transition-all shadow-sm hover:shadow-md"
                      placeholder="Nadir Kaya"
                    />
                  </div>

                  {/* TELEFON */}
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-3 uppercase tracking-wide">
                      Telefon
                    </label>
                    <input
                      name="telefon"
                      value={formData.telefon}
                      inputMode="numeric"
                      autoComplete="tel"
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

                  {/* KAYDET BUTONU */}
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

                {/* MESAJ */}
                {mesaj && (
                  <div
                    className={`flex items-center justify-center gap-3 p-5 rounded-2xl shadow-lg border-2 ${
                      mesajTipi === "error"
                        ? "bg-red-50 border-red-300 text-red-700"
                        : "bg-gradient-to-r from-emerald-50 to-emerald-100 border-emerald-300 text-emerald-700"
                    }`}
                  >
                    <span className="text-2xl">
                      {mesajTipi === "error" ? "❌" : "✅"}
                    </span>
                    <p className="font-bold text-lg">{mesaj}</p>
                  </div>
                )}
              </div>
            )}

            {/* LİSTE SEKMESİ */}
            {activeTab === "liste" && (
              <div className="space-y-6 animate-fadeIn">
                {/* BAŞLIK VE YENİLE BUTONU */}
                <div className="flex justify-between items-center pb-4 border-b-2 border-slate-100">
                  <div>
                    <h3 className="text-2xl font-black text-slate-800">İşlemdeki Müşteriler</h3>
                    <p className="text-slate-600 text-sm font-medium">
                      Sıradaki ve çıkış bekleyen müşterilerin listesi
                    </p>
                  </div>
                  <button
                    onClick={fetchKayitlar}
                    className="flex items-center gap-2 px-4 py-3 text-sm font-bold text-emerald-700 bg-gradient-to-r from-emerald-50 to-emerald-100 hover:from-emerald-100 hover:to-emerald-50 rounded-xl transition-all shadow-sm hover:shadow-md border border-emerald-200"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
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

                {/* LİSTE İÇERİĞİ */}
                {kayitlar.length === 0 ? (
                  <div className="text-center py-20 bg-gradient-to-br from-slate-50 to-slate-100 rounded-3xl border-2 border-dashed border-slate-300">
                    <div className="bg-white w-20 h-20 mx-auto rounded-full flex items-center justify-center shadow-lg mb-4 border-2 border-slate-200">
                      <svg
                        className="w-10 h-10 text-slate-300"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </div>
                    <h4 className="text-slate-800 font-bold text-lg">Liste Boş</h4>
                    <p className="text-slate-500">Şu an işlem bekleyen müşteri yok.</p>
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-2xl border-2 border-slate-200 shadow-xl">
                    <table className="min-w-full">
                      <thead className="bg-gradient-to-r from-slate-50 to-slate-100 border-b-2 border-slate-200">
                        <tr>
                          <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
                            Müşteri No
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
                            İsim / Telefon
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
                            Giriş Saati
                          </th>
                          <th className="px-6 py-4 text-center text-xs font-bold text-slate-600 uppercase tracking-wider">
                            Durum
                          </th>
                        </tr>
                      </thead>

                      <tbody className="bg-white divide-y-2 divide-slate-100">
                        {kayitlar.map((kayit) => {
                          const { saat, tarih } = formatTarihSaat(kayit.created_at)

                          const isSirada = kayit.status === 1
                          const statusColor = isSirada
                            ? "bg-gradient-to-r from-amber-100 to-amber-200 text-amber-800 border-amber-300"
                            : "bg-gradient-to-r from-orange-100 to-orange-200 text-orange-800 border-orange-300"

                          const statusText = isSirada ? "Sırada" : "Çıkışta"

                          return (
                            <tr
                              key={kayit.id}
                              className="hover:bg-slate-50 transition duration-150"
                            >
                              <td className="px-6 py-4">
                                <span className="text-xl font-black text-slate-800 tracking-wide bg-slate-100 px-3 py-1 rounded-xl border border-slate-200">
                                  #{kayit.musteri_no}
                                </span>
                              </td>

                              <td className="px-6 py-4">
                                <div className="flex flex-col">
                                  <span className="text-base font-bold text-slate-700">
                                    {kayit.ad_soyad}
                                  </span>
                                  <span className="text-xs text-slate-400 font-mono mt-0.5">
                                    {kayit.telefon || "-"}
                                  </span>
                                </div>
                              </td>

                              <td className="px-6 py-4">
                                <div className="flex flex-col">
                                  <span className="text-sm font-bold text-slate-800 flex items-center gap-1">
                                    <svg
                                      className="w-4 h-4 text-slate-400"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                      />
                                    </svg>
                                    {saat}
                                  </span>
                                  <span className="text-xs text-slate-400 pl-5">
                                    {tarih}
                                  </span>
                                </div>
                              </td>

                              <td className="px-6 py-4 text-center">
                                <span
                                  className={`inline-flex items-center px-4 py-1.5 border-2 rounded-full text-xs font-black uppercase tracking-wide shadow-md ${statusColor}`}
                                >
                                  {isSirada ? (
                                    <span className="w-2 h-2 rounded-full bg-amber-500 mr-2 animate-pulse shadow-lg"></span>
                                  ) : (
                                    <span className="w-2 h-2 rounded-full bg-orange-500 mr-2 shadow-lg"></span>
                                  )}
                                  {statusText}
                                </span>
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