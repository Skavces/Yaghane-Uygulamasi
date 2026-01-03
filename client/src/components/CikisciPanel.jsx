import { useState, useEffect, useMemo } from "react"
import axios from "axios"
import io from "socket.io-client"
import * as XLSX from "xlsx-js-style"
import { saveAs } from "file-saver"

axios.defaults.baseURL = "/"
const socket = io()

export default function CikisciPanel() {
  const [tumListe, setTumListe] = useState([])
  const [seciliIslem, setSeciliIslem] = useState(null)
  const [mesaj, setMesaj] = useState("")
  const [aktifTab, setAktifTab] = useState("bekleyen")
  const [bekleyenMusteriAra, setBekleyenMusteriAra] = useState("")
  const [gecmisTelefonAra, setGecmisTelefonAra] = useState("")
  const [satisModalAcik, setSatisModalAcik] = useState(false)
  const [satisForm, setSatisForm] = useState({
    ad_soyad: "",
    telefon: "",
    satilan_kg: "",
    birim_fiyat: "300",
    bidon_no: "",
    notlar: "",
  })

  useEffect(() => {
    fetchListe()
    socket.on("veri-guncellendi", fetchListe)
    return () => socket.off("veri-guncellendi")
  }, [])

  const fetchListe = async () => {
    try {
      const res = await axios.get("/api/liste")
      setTumListe(res.data)
    } catch (error) {
      console.error("Hata:", error)
    }
  }

  // Satış fonksiyonları
  const handleSatisInput = (e) => {
    setSatisForm({ ...satisForm, [e.target.name]: e.target.value })
  }

  const handleBidonInput = (val) => {
    let v = val.replace(/[^\d-]/g, "").replace(/-+/g, "-")
    const parts = v.split("-").map((p) => p.slice(0, 4))
    v = parts.join("-")
    setSatisForm((prev) => ({ ...prev, bidon_no: v }))
  }

  const handleSatisKaydet = async (e) => {
    e.preventDefault()
    if (!satisForm.ad_soyad || !satisForm.satilan_kg) {
      alert("Ad Soyad ve KG zorunludur!")
      return
    }
    try {
      await axios.post("/api/yag-satisi", satisForm)
      setMesaj("Satış başarıyla kaydedildi.")
      setSatisModalAcik(false)
      setSatisForm({
        ad_soyad: "",
        telefon: "",
        satilan_kg: "",
        birim_fiyat: "300",
        bidon_no: "",
        notlar: "",
      })
      setAktifTab("gecmis")
      setGecmisTelefonAra("")
      setBekleyenMusteriAra("")
      fetchListe()
      setTimeout(() => setMesaj(""), 3000)
    } catch (error) {
      alert("Satış kaydedilirken hata oluştu")
    }
  }

  const handleTelefonChange = (e) => {
    let val = e.target.value.replace(/\D/g, "")

    if (val.length > 0 && val[0] !== "0") {
      val = "0" + val
    }

    if (val.length > 11) val = val.slice(0, 11)

    let formatted = val
    if (val.length > 4) {
      formatted = val.slice(0, 4) + " " + val.slice(4)
    }
    if (val.length > 7) {
      formatted = val.slice(0, 4) + " " + val.slice(4, 7) + " " + val.slice(7)
    }
    if (val.length > 9) {
      formatted =
        val.slice(0, 4) +
        " " +
        val.slice(4, 7) +
        " " +
        val.slice(7, 9) +
        " " +
        val.slice(9)
    }

    setSatisForm((prev) => ({ ...prev, telefon: formatted }))
  }

  const handleCikisYap = async () => {
    if (!seciliIslem) return
    try {
      await axios.put(`/api/cikis/${seciliIslem.id}`)
      setMesaj(`${seciliIslem.ad_soyad} işlemi tamamlandı!`)
      setSeciliIslem(null)
      fetchListe()
      setTimeout(() => setMesaj(""), 3000)
    } catch (error) {
      alert("İşlem sırasında hata oluştu")
    }
  }

  const gosterilecekListe = useMemo(() => {
    if (aktifTab === "bekleyen") {
      const q = (bekleyenMusteriAra || "").replace(/\D/g, "")
      return tumListe
        .filter((item) => item.status === 2)
        .filter((item) => {
          if (!q) return true
          const no = String(item.musteri_no ?? "")
          return no.includes(q)
        })
    }

    const q = (gecmisTelefonAra || "").replace(/\D/g, "")
    return tumListe
      .filter((item) => item.status === 3)
      .filter((item) => {
        if (!q) return true
        const tel = String(item.telefon || "").replace(/\D/g, "")
        return tel.includes(q)
      })
  }, [tumListe, aktifTab, gecmisTelefonAra, bekleyenMusteriAra])

  const verileriHazirla = (islem) => {
    if (islem.odeme_tipi === "SATIS") {
      return {
        kalanYag: islem.cikan_yag,
        tutar: islem.firma_hakki_tl,
        fiyat: islem.yag_fiyati,
      }
    }

    let kalan = 0
    if (islem.odeme_tipi === "yag") {
      kalan =
        (parseFloat(islem.cikan_yag) || 0) -
        (parseFloat(islem.firma_hakki) || 0)
    } else {
      kalan = parseFloat(islem.cikan_yag) || 0
    }

    let b52 = 0
    let b50 = 0
    if (kalan > 0) {
      b52 = kalan / 52
      b50 = kalan / 50
    }

    let verilecekBidon = 0
    if (kalan > 0) {
      verilecekBidon = Math.ceil(kalan / 52)
    }

    const zeytin = parseFloat(islem.zeytin_kg) || 0
    const cikan = parseFloat(islem.cikan_yag) || 0
    let rand = 0
    if (zeytin > 0 && cikan > 0) rand = zeytin / cikan

    return {
      kalanYag: kalan.toFixed(1),
      bidon52: b52.toFixed(2),
      bidon50: b50.toFixed(2),
      verilecekBidon,
      randiman: rand.toFixed(1),
      firmaHakki: islem.firma_hakki ?? 0,
      firmaHakkiTL: islem.firma_hakki_tl ?? 0,
    }
  }

  const handleExcelIndir = async () => {
    try {
      const res = await axios.get("/api/liste")
      const gecmis = (res.data || []).filter((x) => x.status === 3)

      const rows = gecmis.map((x) => ({
        Tarih: x.created_at ? new Date(x.created_at).toLocaleString("tr-TR") : "",
        "Müşteri No": x.musteri_no ?? "",
        "Ad Soyad": x.ad_soyad ?? "",
        Telefon: x.telefon ?? "",
        "Zeytin (KG)": x.zeytin_kg ?? "",
        "Çıkan Yağ (KG)": x.cikan_yag ?? "",
        "Hak Oranı (%)": x.hak_oran ?? "",
        "Firma Hakkı (KG)": x.firma_hakki ?? "",
        "Firma Hakkı (₺)": x.firma_hakki_tl ?? "",
        "Ödeme Tipi":
          x.odeme_tipi === "yag"
            ? "Yağ"
            : x.odeme_tipi === "para"
            ? "Para"
            : "Satış",
        "Yağ Fiyatı (₺)": x.yag_fiyati ?? "",
        "Bidon No": x.bidon_no ?? "",
        Notlar: x.notlar ?? "",
      }))

      const ws = XLSX.utils.json_to_sheet(rows)

      if (rows.length > 0) {
        const keys = Object.keys(rows[0])

        const wscols = keys.map((key) => {
          let maxLen = key.length
          rows.forEach((row) => {
            const val = row[key] ? String(row[key]) : ""
            if (val.length > maxLen) maxLen = val.length
          })
          return { wch: maxLen + 2 }
        })
        ws["!cols"] = wscols

        const range = XLSX.utils.decode_range(ws["!ref"])

        for (let R = range.s.r; R <= range.e.r; ++R) {
          for (let C = range.s.c; C <= range.e.c; ++C) {
            const cellAddress = XLSX.utils.encode_cell({ r: R, c: C })
            if (!ws[cellAddress]) continue

            ws[cellAddress].s = {
              alignment: {
                vertical: "center",
                horizontal: "center",
                wrapText: true,
              },
              border: {
                top: { style: "thin", color: { rgb: "000000" } },
                bottom: { style: "thin", color: { rgb: "000000" } },
                left: { style: "thin", color: { rgb: "000000" } },
                right: { style: "thin", color: { rgb: "000000" } },
              },
              font: { name: "Arial", sz: 11 },
            }

            if (R === 0) {
              ws[cellAddress].s.font = {
                name: "Arial",
                sz: 13,
                bold: true,
                color: { rgb: "FFFFFF" },
              }
              ws[cellAddress].s.fill = { fgColor: { rgb: "1e293b" } }
            }
          }
        }
      }

      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, "Gecmis")
      const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" })
      const blob = new Blob([wbout], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      })

      const today = new Date()
      const fileName = `yagci_gecmis_${today.getFullYear()}-${String(
        today.getMonth() + 1
      ).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}.xlsx`

      saveAs(blob, fileName)
    } catch (err) {
      console.error(err)
      alert("Excel oluşturulurken hata oluştu.")
    }
  }

  const hazir = useMemo(() => {
    if (!seciliIslem) return null
    return verileriHazirla(seciliIslem)
  }, [seciliIslem])

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden font-sans">
      {/* SATIŞ */}
      {satisModalAcik && (
        <div className="absolute inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-200">
            <div className="bg-slate-50 p-5 border-b border-slate-200 flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-800">Perakende Satış</h2>
              <button
                onClick={() => setSatisModalAcik(false)}
                className="text-slate-400 hover:text-red-500 text-2xl font-bold"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSatisKaydet} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Ad Soyad
                  </label>
                  <input
                    name="ad_soyad"
                    value={satisForm.ad_soyad}
                    onChange={handleSatisInput}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-lg font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-300 transition"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Telefon
                  </label>
                  <input
                    name="telefon"
                    value={satisForm.telefon}
                    onChange={handleTelefonChange}
                    maxLength={14}
                    placeholder="0555 123 45 67"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-lg font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-300 transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Miktar (KG)
                  </label>
                  <input
                    type="number"
                    name="satilan_kg"
                    value={satisForm.satilan_kg}
                    onChange={handleSatisInput}
                    className="w-full px-4 py-3 bg-violet-50 border border-violet-200 rounded-xl text-lg font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-300 transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Fiyat (₺)
                  </label>
                  <input
                    type="number"
                    name="birim_fiyat"
                    value={satisForm.birim_fiyat}
                    onChange={handleSatisInput}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-lg font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-300 transition"
                  />
                </div>
              </div>

              <div className="p-4 bg-emerald-700 rounded-xl flex justify-between items-center text-white">
                <span className="font-bold">TOPLAM TUTAR</span>
                <span className="text-2xl font-extrabold">
                  {(
                    parseFloat(satisForm.satilan_kg || 0) *
                    parseFloat(satisForm.birim_fiyat || 0)
                  ).toFixed(2)}{" "}
                  ₺
                </span>
              </div>

              <div>
                <div className="flex justify-between items-end mb-2">
                  <label className="block text-sm font-medium text-slate-700">
                    Bidon No
                  </label>

                  <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded border border-slate-200">
                    Verilecek Bidon:{" "}
                    <span className="text-slate-900 text-sm font-extrabold">
                      {Math.ceil((parseFloat(satisForm.satilan_kg) || 0) / 52)}
                    </span>{" "}
                    Adet
                  </span>
                </div>

                <input
                  value={satisForm.bidon_no}
                  onChange={(e) => handleBidonInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === " ") {
                      e.preventDefault()
                      if (
                        satisForm.bidon_no.length > 0 &&
                        !satisForm.bidon_no.endsWith("-")
                      ) {
                        setSatisForm((prev) => ({
                          ...prev,
                          bidon_no: prev.bidon_no + "-",
                        }))
                      }
                    }
                  }}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-lg font-semibold text-slate-800 text-center focus:outline-none focus:ring-2 focus:ring-slate-300 transition"
                  placeholder="1234-5678"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-slate-800 hover:bg-slate-900 text-white font-semibold rounded-xl shadow-sm hover:shadow transition flex items-center justify-center gap-2"
              >
                SATIŞI TAMAMLA
              </button>
            </form>
          </div>
        </div>
      )}

      {/* SOL PANEL */}
      <div className="w-1/2 bg-white border-r border-slate-200 flex flex-col h-full shadow-lg z-10">
        <div className="p-6 border-b border-slate-100">
          <h2 className="text-2xl font-bold text-slate-800 mb-4">Çıkış Paneli</h2>
          <button
            onClick={() => setSatisModalAcik(true)}
            className="w-full py-3 bg-slate-800 hover:bg-slate-900 text-white font-semibold rounded-xl shadow-sm hover:shadow transition flex items-center justify-center gap-2"
          >
            <span>+ Perakende Satış</span>
          </button>
        </div>

        <div className="px-6 pt-4 pb-2">
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => {
                setAktifTab("bekleyen")
                setSeciliIslem(null)
                setBekleyenMusteriAra("")
              }}
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${
                aktifTab === "bekleyen"
                  ? "bg-white text-slate-800 shadow-sm"
                  : "text-slate-400 hover:text-slate-600"
              }`}
            >
              Bekleyen ({tumListe.filter((i) => i.status === 2).length})
            </button>
            <button
              onClick={() => {
                setAktifTab("gecmis")
                setSeciliIslem(null)
                setGecmisTelefonAra("")
                setBekleyenMusteriAra("")
              }}
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${
                aktifTab === "gecmis"
                  ? "bg-white text-slate-800 shadow-sm"
                  : "text-slate-400 hover:text-slate-600"
              }`}
            >
              Geçmiş
            </button>
          </div>
        </div>

        {/* BEKLEYEN: MÜŞTERİ NO İLE ARAMA */}
        {aktifTab === "bekleyen" && (
          <div className="px-6 pt-3 space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                Müşteri numarasına göre ara
              </label>
              <div className="relative">
                <input
                  value={bekleyenMusteriAra}
                  onChange={(e) => {
                    const onlyDigits = e.target.value.replace(/\D/g, "").slice(0, 10)
                    setBekleyenMusteriAra(onlyDigits)
                  }}
                  inputMode="numeric"
                  placeholder="123"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-300 transition pr-12"
                />
                {bekleyenMusteriAra && (
                  <button
                    onClick={() => setBekleyenMusteriAra("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 font-bold"
                    type="button"
                    aria-label="Temizle"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* GEÇMİŞ: TELEFON İLE ARAMA VE EXCEL KAYITLARINI İNDİRME */}
        {aktifTab === "gecmis" && (
          <div className="px-6 pt-3 space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                Telefona göre ara
              </label>
              <div className="relative">
                <input
                  value={gecmisTelefonAra}
                  onChange={(e) => {
                    const onlyDigits = e.target.value.replace(/\D/g, "").slice(0, 11)
                    setGecmisTelefonAra(onlyDigits)
                  }}
                  inputMode="numeric"
                  placeholder="05551234567"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-300 transition pr-12"
                />
                {gecmisTelefonAra && (
                  <button
                    onClick={() => setGecmisTelefonAra("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 font-bold"
                    type="button"
                    aria-label="Temizle"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            <button
              onClick={handleExcelIndir}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-sm hover:shadow transition flex items-center justify-center gap-2 text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              Geçmiş Kayıtları İndir
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
          {gosterilecekListe.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-slate-400">
              <p className="text-sm font-medium opacity-60">Kayıt bulunamadı.</p>
            </div>
          ) : (
            gosterilecekListe.map((islem) => (
              <div
                key={islem.id}
                onClick={() => setSeciliIslem(islem)}
                className={`p-4 rounded-xl cursor-pointer border-2 transition-all relative bg-white ${
                  seciliIslem?.id === islem.id
                    ? "border-slate-800 shadow-md"
                    : "border-slate-200 hover:border-slate-300 hover:shadow-sm"
                }`}
              >
                <div className="mb-2">
                  {islem.odeme_tipi === "SATIS" ? (
                    <span className="inline-block px-2 py-1 rounded text-[10px] font-bold bg-violet-100 text-violet-700">
                      PERAKENDE SATIŞ
                    </span>
                  ) : (
                    <div className="flex gap-2">
                      {islem.odeme_tipi === "yag" && (
                        <span className="inline-block px-2 py-1 rounded border border-amber-200 bg-amber-50 text-amber-700 text-[10px] font-bold">
                          YAĞ KESİNTİSİ
                        </span>
                      )}
                      {islem.odeme_tipi === "para" && (
                        <span className="inline-block px-2 py-1 rounded border border-emerald-200 bg-emerald-50 text-emerald-700 text-[10px] font-bold">
                          PARA ÖDEMESİ
                        </span>
                      )}
                      {islem.status === 2 && (
                        <span className="inline-block px-2 py-1 rounded bg-slate-200 text-slate-600 text-[10px] font-bold">
                          BEKLİYOR
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex justify-between items-start">
                  <div className="flex flex-col">
                    <span className="font-bold text-[22px] text-slate-800">{islem.ad_soyad}</span>
                    <span className="text-lg font-semibold text-slate-500 mt-0.5">
                      {islem.telefon || "-"}
                    </span>
                  </div>

                  {islem.musteri_no && (
                    <span className="text-[20px] font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded">
                      #{islem.musteri_no}
                    </span>
                  )}
                </div>

                <div className="flex justify-between items-end mt-3 border-t border-slate-50 pt-2">
                  <span className="text-[18px] font-bold text-slate-600 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    {new Date(islem.created_at).toLocaleString("tr-TR", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  <span className="text-sm font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded">
                    {islem.cikan_yag} KG
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* SAĞ PANEL*/}
      <div className="w-1/2 flex flex-col h-full overflow-hidden bg-slate-100 relative">
        {mesaj && (
          <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-[9999] animate-slideDown">
            <div className="bg-gradient-to-r from-slate-700 to-slate-800 text-white px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-slate-600/30 backdrop-blur-sm">
              <div className="relative w-6 h-6">
                <div className="absolute inset-0 border-2 rounded-full animate-[spinToCircle_1.5s_ease-out_forwards]"></div>
                <svg
                  className="absolute inset-0 w-6 h-6 opacity-0 scale-0 animate-[checkmark_0.5s_ease-out_1.5s_forwards]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span className="font-semibold text-base">{mesaj}</span>
            </div>
          </div>
        )}

        {!seciliIslem ? (
          <div className="flex-1 flex items-center justify-center text-slate-400 font-medium">
            Seçim yapın...
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-8">
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="bg-slate-50 rounded-xl p-6 border border-slate-200 flex justify-between items-center shadow-sm">
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase mb-1">
                    Müşteri Bilgisi
                  </p>
                  <h3 className="text-2xl font-bold text-slate-800">{seciliIslem.ad_soyad}</h3>
                  <p className="text-slate-500">{seciliIslem.telefon}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-medium text-slate-500 uppercase mb-1">Tarih</p>
                  <h3 className="text-lg font-bold text-slate-700">
                    {new Date(seciliIslem.created_at).toLocaleDateString("tr-TR")}
                  </h3>
                  <p className="text-sm font-bold text-slate-400">
                    {new Date(seciliIslem.created_at).toLocaleTimeString("tr-TR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>

              {seciliIslem.odeme_tipi === "SATIS" ? (
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-white p-5 rounded-xl border border-slate-200 text-center">
                    <p className="text-xs font-bold text-slate-400 uppercase">SATILAN</p>
                    <p className="text-3xl font-bold text-slate-800">{seciliIslem.cikan_yag} KG</p>
                  </div>
                  <div className="bg-white p-5 rounded-xl border border-slate-200 text-center">
                    <p className="text-xs font-bold text-slate-400 uppercase">BİRİM FİYAT</p>
                    <p className="text-3xl font-bold text-slate-800">{seciliIslem.yag_fiyati} ₺</p>
                  </div>
                  <div className="bg-emerald-50 p-5 rounded-xl border border-emerald-200 text-center">
                    <p className="text-xs font-bold text-emerald-600 uppercase">TOPLAM TUTAR</p>
                    <p className="text-3xl font-bold text-emerald-700">{seciliIslem.firma_hakki_tl} ₺</p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Gelen Zeytin (KG)
                      </label>
                      <div className="text-lg font-bold text-slate-800">{seciliIslem.zeytin_kg}</div>
                    </div>
                    <div className="bg-amber-50 p-4 rounded-xl border border-amber-200">
                      <label className="block text-sm font-medium text-amber-800 mb-1">
                        Çıkan Yağ (KG)
                      </label>
                      <div className="text-lg font-bold text-amber-900">{seciliIslem.cikan_yag}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                      <label className="block text-sm font-medium text-slate-700 mb-1">Hak Oranı (%)</label>
                      <div className="text-lg font-bold text-slate-800">%{seciliIslem.hak_oran}</div>
                    </div>
                    <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200">
                      <label className="block text-sm font-medium text-emerald-800 mb-1">Yağ Fiyatı (₺)</label>
                      <div className="text-lg font-bold text-emerald-800">{seciliIslem.yag_fiyati}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div
                      className={`p-5 rounded-xl border-2 transition-all text-left ${
                        seciliIslem.odeme_tipi === "yag"
                          ? "border-amber-500 bg-amber-50 shadow-sm"
                          : "border-slate-100 bg-slate-50 opacity-50"
                      }`}
                    >
                      <p
                        className={`text-xs font-bold uppercase ${
                          seciliIslem.odeme_tipi === "yag" ? "text-amber-700" : "text-slate-500"
                        }`}
                      >
                        YAĞ KESİNTİSİ
                      </p>
                      <div className="text-2xl font-bold text-slate-800">
                        {hazir?.firmaHakki} <span className="text-sm text-slate-500">KG</span>
                      </div>
                    </div>

                    <div
                      className={`p-5 rounded-xl border-2 transition-all text-left ${
                        seciliIslem.odeme_tipi === "para"
                          ? "border-emerald-500 bg-emerald-50 shadow-sm"
                          : "border-slate-100 bg-slate-50 opacity-50"
                      }`}
                    >
                      <p
                        className={`text-xs font-bold uppercase ${
                          seciliIslem.odeme_tipi === "para" ? "text-emerald-700" : "text-slate-500"
                        }`}
                      >
                        PARA ÖDEMESİ
                      </p>
                      <div className="text-2xl font-bold text-slate-800">
                        {hazir?.firmaHakkiTL} <span className="text-sm text-slate-500">₺</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 bg-white border-2 border-slate-200 rounded-xl shadow-lg">
                    <div className="grid grid-cols-3 gap-6 text-center divide-x divide-slate-100">
                      <div className="flex flex-col justify-center">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">
                          KALAN YAĞ
                        </p>
                        <div className="flex items-baseline justify-center gap-1">
                          <p className="text-4xl font-extrabold text-slate-800">{hazir?.kalanYag}</p>
                          <p className="text-sm font-bold text-slate-400">KG</p>
                        </div>
                      </div>

                      <div className="flex flex-col justify-center bg-orange-50 rounded-lg -my-2 py-4">
                        <p className="text-xs font-bold text-orange-400 uppercase tracking-wide mb-1">ORAN</p>
                        <div className="flex items-center justify-center gap-1">
                          <p className="text-3xl font-extrabold text-orange-600">{hazir?.randiman}</p>
                        </div>
                      </div>

                      <div className="flex flex-col justify-center">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">
                          VERİLECEK BİDON
                        </p>
                        <div className="flex items-baseline justify-center gap-1">
                          <p className="text-4xl font-extrabold text-slate-800">{hazir?.verilecekBidon}</p>
                          <p className="text-sm font-bold text-slate-400">ADET</p>
                        </div>
                        <p className="text-[10px] text-slate-400 font-bold mt-1">NET / 52 KG</p>
                      </div>
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Teslim Edilen Bidonlar
                </label>
                <div className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-lg font-semibold text-slate-800 text-center tracking-wider">
                  {seciliIslem.bidon_no || "---"}
                </div>
              </div>

              {seciliIslem.status !== 3 ? (
                <button
                  onClick={handleCikisYap}
                  className="w-full py-4 bg-slate-800 hover:bg-slate-900 text-white font-semibold rounded-xl transition shadow-sm hover:shadow flex items-center justify-center gap-2 text-lg"
                >
                  <span>İşlemi Onayla ve Çıkış Yap</span>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </button>
              ) : (
                <div className="w-full py-4 bg-slate-100 text-slate-400 font-bold rounded-xl text-center border border-slate-200">
                  BU İŞLEM KAPATILMIŞTIR
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
