import { useState, useEffect, useMemo, useRef, useCallback } from "react"
import axios from "axios"
import { hesaplaYagIslemi, hesaplaYagciPaneli } from "../utils/yagHesap"
import io from "socket.io-client"
import * as XLSX from "xlsx-js-style"
import { saveAs } from "file-saver"
import { Check, Download, Search, X } from "lucide-react"
import TarihSaat from "./TarihSaat"
import Telefon from "./Telefon"

axios.defaults.baseURL = "/"
const socket = io()

const FIS_ODEME_SECILI = {
  para: "bg-para/10 text-para",
  sizma: "bg-sizma/10 text-sizma",
}

const FIS_RADYO_RENK = {
  para: { halka: "border-para", nokta: "bg-para" },
  sizma: { halka: "border-sizma", nokta: "bg-sizma" },
}

function FisSatir({ etiket, renk = "", children }) {
  return (
    <div className="fis-satir">
      <span className="text-murekkep/70">{etiket}</span>
      <span className={`readout text-lg ${renk}`}>{children}</span>
    </div>
  )
}

function FisAyrac() {
  return <div className="border-b-2 border-dashed border-cizgi" />
}

function FisOdeme({ aktif, renk, etiket, secilen = false, children }) {
  return (
    <div className={`flex items-center justify-between gap-4 px-5 py-3 ${aktif ? FIS_ODEME_SECILI[renk] : "text-murekkep/40"}`}>
      <span className="flex items-center gap-3 font-semibold">
        <span
          role="radio"
          aria-checked={aktif}
          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${aktif ? FIS_RADYO_RENK[renk].halka : "border-cizgi"}`}
        >
          {aktif && <span className={`w-2.5 h-2.5 rounded-full ${FIS_RADYO_RENK[renk].nokta}`} />}
        </span>
        {etiket}
        {aktif && secilen && <span className="rozet bg-white border-current">Seçilen</span>}
      </span>
      <span className="readout text-2xl">{children}</span>
    </div>
  )
}

export default function CikisciPanel({ defaultSettings }) {
  const [tumListe, setTumListe] = useState([])
  const [seciliIslem, setSeciliIslem] = useState(null)
  const [mesaj, setMesaj] = useState("")
  const [mesajAnim, setMesajAnim] = useState("spin")
  const [aktifTab, setAktifTab] = useState("bekleyen")
  const [bekleyenMusteriAra, setBekleyenMusteriAra] = useState("")
  const [gecmisTelefonAra, setGecmisTelefonAra] = useState("")
  const [bidonAdAra, setBidonAdAra] = useState("")
  const [bidonTelAra, setBidonTelAra] = useState("")
  const [satisModalAcik, setSatisModalAcik] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [bidonEdit, setBidonEdit] = useState("")
  const [bidonSaving, setBidonSaving] = useState(false)
  const [notEdit, setNotEdit] = useState("")
  const [notSaving, setNotSaving] = useState(false)
  const textareaRef = useRef(null);
  const defFiyat = defaultSettings?.yag_fiyati || "300"

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = textareaRef.current.scrollHeight + "px";
    }
  }, [bidonEdit, isEditing]);

  useEffect(() => {
    setIsEditing(false);
  }, [seciliIslem?.id]);

  const [iadeModalAcik, setIadeModalAcik] = useState(false)
  const [iadeSecim, setIadeSecim] = useState([])
  const [geriAlSecim, setGeriAlSecim] = useState([])
  const [satisForm, setSatisForm] = useState({
    ad_soyad: "",
    telefon: "",
    satilan_kg: "",
    birim_fiyat: defFiyat,
    bidon_no: "",
    notlar: "",
  })

  useEffect(() => {
    fetchListe()
    socket.on("veri-guncellendi", fetchListe)
    return () => socket.off("veri-guncellendi")
  }, [])

  useEffect(() => {
    if (!seciliIslem) return
    const guncel = tumListe.find((x) => x.id === seciliIslem.id)
    if (guncel) setSeciliIslem(guncel)
  }, [tumListe])

  useEffect(() => {
    setNotEdit(seciliIslem?.notlar || "")
  }, [seciliIslem?.id])

  const fetchListe = async () => {
    try {
      const res = await axios.get("/api/liste")
      setTumListe(res.data)
    } catch (error) {
      console.error("Hata:", error)
    }
  }

  const normalizeTelefon = (t) => {
    let d = String(t || "").replace(/\D/g, "")
    if (d.startsWith("90") && d.length === 12) d = "0" + d.slice(2)
    if (d.length === 10) d = "0" + d
    if (d.length > 11) d = d.slice(0, 11)
    if (d.length === 11) {
      return d.replace(/(\d{4})(\d{3})(\d{2})(\d{2})/, "$1 $2 $3 $4");
    }

    return d
  }

  const parseBidonList = (str) => {
    const s = String(str || "").trim()
    if (!s) return []
    const parts = s
      .replace(/[,\s]+/g, "-")
      .split("-")
      .map((x) => x.trim())
      .filter(Boolean)
    return parts
  }

  const formatBidonList = (arr) => {
    const a = (arr || []).map((x) => String(x).trim()).filter(Boolean)
    return a.join("-")
  }

  const bidonKalanHesapla = useCallback((verilenStr, iadeStr) => {
    const verilen = parseBidonList(verilenStr)
    const iadeArr = parseBidonList(iadeStr)
    const iadeCounts = {}
    for (const b of iadeArr) {
      iadeCounts[b] = (iadeCounts[b] || 0) + 1
    }

    const kalan = []
    for (const b of verilen) {
      if (iadeCounts[b] > 0) {
        iadeCounts[b]--
      } else {
        kalan.push(b)
      }
    }
    return kalan
  }, [])

  const handleSatisInput = (e) => {
    let val = e.target.value
    if (e.target.name === "ad_soyad") {
      val = val.toLocaleUpperCase("tr-TR")
    }
    setSatisForm({ ...satisForm, [e.target.name]: val })
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
      setMesajAnim("spin")
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
      setTimeout(() => setMesajAnim("tik"), 1200)
      setTimeout(() => setMesaj(""), 3000)
    } catch {
      alert("Satış kaydedilirken hata oluştu")
    }
  }

  const handleTelefonChange = (e) => {
    let val = e.target.value.replace(/\D/g, "")

    if (val.length > 0 && val[0] !== "0") val = "0" + val
    if (val.length > 11) val = val.slice(0, 11)

    let formatted = val
    if (val.length > 4) formatted = val.slice(0, 4) + " " + val.slice(4)
    if (val.length > 7) formatted = val.slice(0, 4) + " " + val.slice(4, 7) + " " + val.slice(7)
    if (val.length > 9)
      formatted =
        val.slice(0, 4) +
        " " +
        val.slice(4, 7) +
        " " +
        val.slice(7, 9) +
        " " +
        val.slice(9)

    setSatisForm((prev) => ({ ...prev, telefon: formatted }))
  }

  const handleCikisYap = async () => {
    if (!seciliIslem) return
    try {
      await axios.put(`/api/cikis/${seciliIslem.id}`)
      setMesajAnim("spin")
      setMesaj(`${seciliIslem.ad_soyad} işlemi tamamlandı!`)
      setSeciliIslem(null)
      fetchListe()
      setTimeout(() => setMesajAnim("tik"), 1200)
      setTimeout(() => setMesaj(""), 3000)
    } catch {
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
          return no.startsWith(q)
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
      .sort((a, b) => new Date(b.finished_at || b.created_at) - new Date(a.finished_at || a.created_at))
  }, [tumListe, aktifTab, gecmisTelefonAra, bekleyenMusteriAra])

  const calculateYagIslemi = (islem) => {
    if (!islem) return null
    return hesaplaYagIslemi({
      cikanYag:    islem.cikan_yag,
      zeytin:      islem.zeytin_kg,
      hakOran:     islem.hak_oran,
      yagFiyati:   islem.yag_fiyati,
      odemeTipi:   islem.odeme_tipi,
      bidonSayisi: islem.kantar_bidon,
    })
  }

  const yeniSistemMi = (islem) => islem?.sikim_bedeli != null

  const calculateYeniSistem = (islem) =>
    hesaplaYagciPaneli({
      zeytin:      islem.zeytin_kg,
      cikanYag:    islem.cikan_yag,
      kantarBidon: islem.kantar_bidon,
      yagIleOdeme: islem.yag_ile_odeme,
      bidonUcreti: islem.bidon_ucreti,
      sikimBedeli: islem.sikim_bedeli,
    })

  const yuvarla = (v) => (Number.isFinite(v) ? Math.round(v * 100) / 100 : 0)

  const verileriHazirla = useCallback((islem) => {
    if (islem.odeme_tipi === "SATIS") {
      return { kalanYag: islem.cikan_yag, tutar: islem.firma_hakki_tl, fiyat: islem.yag_fiyati }
    }

    if (yeniSistemMi(islem)) {
      const h = calculateYeniSistem(islem)
      const kalan = islem.odeme_tipi === "para" ? h.netYag : Math.max(0, h.netYag - h.toplamYag)
      return {
        kalanYag: kalan.toFixed(1),
        verilecekBidon: kalan > 0 ? Math.ceil(kalan / 50) : 0,
        randiman: h.oran,
        firmaHakki: islem.firma_hakki ?? 0,
        firmaHakkiTL: islem.firma_hakki_tl ?? 0,
      }
    }
    
    const hesap = calculateYagIslemi(islem)
    if (!hesap) return {}

    return {
      kalanYag: hesap.musteriKalan.toFixed(1),
      verilecekBidon: hesap.verilecekBidon,
      randiman: hesap.randiman,
      firmaHakki: islem.firma_hakki ?? 0,
      firmaHakkiTL: islem.firma_hakki_tl ?? 0,
    }
  }, [])

  const handleExcelIndir = async () => {
    try {
      const res = await axios.get("/api/liste")
      const gecmis = (res.data || []).filter((x) => x.status === 3)

      const splitName = (fullName) => {
        const parts = (fullName || "").trim().split(" ")
        if (parts.length === 1) return { ad: parts[0], soyad: "" }
        const soyad = parts.pop()
        const ad = parts.join(" ")
        return { ad, soyad }
      }

      const rows = gecmis.map((x) => {
        const d = new Date(x.created_at || new Date())
        const tarih = d.toLocaleDateString("tr-TR")
        const saat = d.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })
        const { ad, soyad } = splitName(x.ad_soyad)
        const verilenCount = parseBidonList(x.bidon_no).length
        const iadeCount = parseBidonList(x.iade_bidonlar ?? x.geri_alinan_bidonlar ?? "").length
        const kalanCount = verilenCount - iadeCount

        const zeytin = parseFloat(x.zeytin_kg) || 0
        const cikan = parseFloat(x.cikan_yag) || 0
        let randiman = ""
        if (zeytin > 0 && cikan > 0) {
          randiman = ((cikan / zeytin) * 100).toFixed(1)
        }

        return {
          "TARİH": tarih,
          "SAAT": saat,
          "MÜŞTERİ NO": x.musteri_no ?? "",
          "AD": ad,
          "SOYAD": soyad,
          "TELEFON": normalizeTelefon(x.telefon) ?? "",
          "GELEN ZEYTİN (KG)": x.zeytin_kg ?? "",
          "ÇIKAN YAĞ (KG)": x.cikan_yag ?? "",
          "ORAN": randiman,
          "SEÇİLEN ÖDEME TİPİ": x.odeme_tipi === "yag" ? "YAĞ" : x.odeme_tipi === "para" ? "PARA" : "PERAKENDE",
          "HAK (KG)": x.firma_hakki ?? "",
          "HAK BEDELİ (₺)": x.firma_hakki_tl ?? "",
         // "YAĞ FİYATI (₺)": x.yag_fiyati ?? "",
          "VERİLEN TOPLAM BİDON": verilenCount,
          "GERİ ALINAN TOPLAM BİDON": iadeCount,
          "MÜŞTERİDE KALAN TOPLAM BİDON": kalanCount
        }
      })

      const ws = XLSX.utils.json_to_sheet(rows)
      const range = XLSX.utils.decode_range(ws['!ref'])
      for (let R = range.s.r; R <= range.e.r; ++R) {
        for (let C = range.s.c; C <= range.e.c; ++C) {
          const address = XLSX.utils.encode_cell({ r: R, c: C })
          if (!ws[address]) continue

          const isHeader = R === 0

          ws[address].s = {
            font: { sz: 12, bold: isHeader, color: { rgb: "000000" } },
            alignment: { horizontal: "center", vertical: "center" },
            fill: {
              fgColor: { rgb: isHeader ? "6EE7B7" : "F0FDF4" }
            },
            border: {
              top: { style: "thin", color: { rgb: "000000" } },
              bottom: { style: "thin", color: { rgb: "000000" } },
              left: { style: "thin", color: { rgb: "000000" } },
              right: { style: "thin", color: { rgb: "000000" } }
            }
          }
        }
      }

      if (rows.length > 0) {
        const keys = Object.keys(rows[0])
        const wscols = keys.map((key) => {
          let maxLen = key.length
          rows.forEach((row) => {
            const val = row[key] ? String(row[key]) : ""
            if (val.length > maxLen) maxLen = val.length
          })
          return { wch: maxLen + 8 }
        })
        ws["!cols"] = wscols
      }

      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, "Gecmis")
      const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" })
      const blob = new Blob([wbout], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      })

      const today = new Date()
      const fileName = `yagci_gecmis_${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(
        today.getDate()
      ).padStart(2, "0")}.xlsx`
      saveAs(blob, fileName)
    } catch (err) {
      console.error(err)
      alert("Excel oluşturulurken hata oluştu.")
    }
  }

  useEffect(() => {
    if (!seciliIslem) {
      setBidonEdit("")
      return
    }
    setBidonEdit(seciliIslem.bidon_no || "")
  }, [seciliIslem?.id])

  const hazir = useMemo(() => {
    if (!seciliIslem) return null
    return verileriHazirla(seciliIslem)
  }, [seciliIslem, verileriHazirla])

  const yeniDetay = useMemo(() => {
    if (!seciliIslem || !yeniSistemMi(seciliIslem)) return {}
    return calculateYeniSistem(seciliIslem)
  }, [seciliIslem])

  const hesapDetay = useMemo(() => {
    if (!seciliIslem) return { hakKGround: 0, paraTL: "0.00" }
    
    const hesap = calculateYagIslemi(seciliIslem)
    if (!hesap) return { hakKGround: 0, paraTL: "0.00" }

    return {
      hakKGround: hesap.hakKGround,
      paraTL: hesap.paraTL,
      netYag: hesap.netYag,
    }
  }, [seciliIslem])


  const bidonOzetAyniTelefon = useMemo(() => {
    if (!seciliIslem?.telefon) return null
    const tel = normalizeTelefon(seciliIslem.telefon)
    if (!tel) return null

    const ilgiliKayitlar = tumListe.filter((x) => {
      if (x.odeme_tipi === "SATIS") return false
      return normalizeTelefon(x.telefon) === tel
    })

    let genelToplam = 0
    for (const kayit of ilgiliKayitlar) {
      const verilenAdet = parseBidonList(kayit.bidon_no).length
      const iadeAdet = parseBidonList(kayit.iade_bidonlar ?? kayit.geri_alinan_bidonlar ?? "").length
      genelToplam += (verilenAdet - iadeAdet)
    }

    return { tel, genelToplam }
  }, [tumListe, seciliIslem])

  const seciliVerilenBidonlar = useMemo(() => {
    if (!seciliIslem) return []
    return parseBidonList(seciliIslem.bidon_no)
  }, [seciliIslem])

  const _seciliIadeBidonlar = useMemo(() => {
    if (!seciliIslem) return []
    return parseBidonList(seciliIslem.iade_bidonlar ?? seciliIslem.geri_alinan_bidonlar ?? "")
  }, [seciliIslem])

  const _seciliKalanBidonlar = useMemo(() => {
    if (!seciliIslem) return []
    return bidonKalanHesapla(
      seciliIslem.bidon_no ?? "",
      seciliIslem.iade_bidonlar ?? seciliIslem.geri_alinan_bidonlar ?? ""
    )
  }, [seciliIslem, bidonKalanHesapla])

  const ayniTelefonTumBidonlar = useMemo(() => {
    if (!seciliIslem?.telefon) return { verilenler: [], iadeler: [], iadeKayitlari: [], kalanlar: [] }
    const tel = normalizeTelefon(seciliIslem.telefon)
    if (!tel) return { verilenler: [], iadeler: [], iadeKayitlari: [], kalanlar: [] }

    const ilgiliKayitlar = tumListe.filter((x) => {
      if (x.odeme_tipi === "SATIS") return false
      return normalizeTelefon(x.telefon) === tel
    })

    const tumVerilenler = []
    const tumIadeler = []
    const iadeKayitlari = []

    for (const kayit of ilgiliKayitlar) {
      const verilenList = parseBidonList(kayit.bidon_no)
      const iadeList = parseBidonList(kayit.iade_bidonlar ?? kayit.geri_alinan_bidonlar ?? "")
      
      tumVerilenler.push(...verilenList)
      tumIadeler.push(...iadeList)
      for (const no of iadeList) iadeKayitlari.push({ no: String(no), kayitId: kayit.id })
    }

    const iadeCounts = {}
    for (const b of tumIadeler) {
      const s = String(b)
      iadeCounts[s] = (iadeCounts[s] || 0) + 1
    }

    const kalanlar = []
    for (const b of tumVerilenler) {
      const s = String(b)
      if (iadeCounts[s] && iadeCounts[s] > 0) {
        iadeCounts[s]--
      } else {
        kalanlar.push(b)
      }
    }

    return {
      verilenler: tumVerilenler,
      iadeler: tumIadeler,
      iadeKayitlari,
      kalanlar: kalanlar
    }
  }, [tumListe, seciliIslem])

  const bidonListesi = useMemo(() => {
    const map = {}

    for (const item of tumListe) {
      if (item.odeme_tipi === "SATIS") continue
      if (item.status !== 3) continue
      if (!item.telefon) continue

      const tel = normalizeTelefon(item.telefon)
      if (!tel) continue

      if (!map[tel]) {
        map[tel] = {
          names: new Set(),
          ad_soyad: "",
          telefon: tel,
          verilenToplam: 0,
          iadeToplam: 0,
          kalanToplam: 0
        }
      }

      if (item.ad_soyad) map[tel].names.add(item.ad_soyad.trim())

      const verilenAdet = parseBidonList(item.bidon_no).length
      const iadeAdet = parseBidonList(item.iade_bidonlar ?? item.geri_alinan_bidonlar ?? "").length

      map[tel].verilenToplam += verilenAdet
      map[tel].iadeToplam += iadeAdet
    }

    Object.values(map).forEach(r => {
      r.ad_soyad = Array.from(r.names).join(" / ")
      delete r.names
      r.kalanToplam = r.verilenToplam - r.iadeToplam
    })

    let liste = Object.values(map)

    if (bidonAdAra) {
      const q = bidonAdAra.toLocaleUpperCase("tr-TR")
      liste = liste.filter(x => (x.ad_soyad || "").toLocaleUpperCase("tr-TR").includes(q))
    }

    if (bidonTelAra) {
      const q = bidonTelAra.replace(/\D/g, "")
      liste = liste.filter(x => x.telefon.replaceAll(" ", "").includes(q))
    }

    liste.sort((a, b) => (a.ad_soyad || "").localeCompare(b.ad_soyad || ""))

    return liste
  }, [tumListe, bidonAdAra, bidonTelAra])

  const bidonIstatistikleri = useMemo(() => {
    let toplamVerilen = 0
    let toplamIade = 0
    let toplamKalan = 0

    for (const k of bidonListesi) {
      toplamVerilen += k.verilenToplam
      toplamIade += k.iadeToplam
      toplamKalan += k.kalanToplam
    }
    return { toplamVerilen, toplamIade, toplamKalan }
  }, [bidonListesi])

  const openIadeModal = () => {
    if (!seciliIslem) return
    setIadeSecim([]); setGeriAlSecim([])
    setIadeModalAcik(true)
  }

  const sanitizeBidonInput = (val) => {
    let v = String(val || "")
      .replace(/[^\d-\n ]/g, "")
      .replace(/-+/g, "-")

    v = v.replace(/[ ]+/g, "-")
    v = v
      .split("\n")
      .map((line) => {
        const parts = line
          .split("-")
          .map((p) => p.trim().slice(0, 4))
          .filter(Boolean)
        return parts.join("-")
      })
      .join("\n")

    return v
  }

  const handleNotKaydet = async () => {
    if (!seciliIslem) return
    setNotSaving(true)
    try {
      await axios.put(`/api/not/${seciliIslem.id}`, { notlar: notEdit })

      setMesajAnim("spin")
      setMesaj("Not kaydedildi.")
      setSeciliIslem((prev) => (prev ? { ...prev, notlar: notEdit } : prev))
      fetchListe()
      setTimeout(() => setMesajAnim("tik"), 1200)
      setTimeout(() => setMesaj(""), 2500)
    } catch (e) {
      console.error(e)
      alert("Not kaydedilirken hata oluştu.")
    } finally {
      setNotSaving(false)
    }
  }

  const handleBidonDuzenleKaydet = async () => {
    if (!seciliIslem) return
    setBidonSaving(true)
    try {
      const payload = { bidon_no: formatBidonList(parseBidonList(bidonEdit)) }
      await axios.put(`/api/bidon-no/${seciliIslem.id}`, payload)

      setMesajAnim("spin")
      setMesaj("Bidon numaraları güncellendi.")
      setSeciliIslem((prev) => (prev ? { ...prev, bidon_no: payload.bidon_no } : prev))
      fetchListe()
      setIsEditing(false)
      setTimeout(() => setMesajAnim("tik"), 1200)
      setTimeout(() => setMesaj(""), 2500)
    } catch (e) {
      console.error(e)
      alert("Bidon güncellemede hata oluştu.")
    } finally {
      setBidonSaving(false)
    }
  }

  const handleIadeKaydet = async () => {
    if (!seciliIslem) return

    try {
      const { kalanlar, iadeKayitlari } = ayniTelefonTumBidonlar
      const eklenecek = iadeSecim
        .filter((i) => i >= 0 && i < kalanlar.length)
        .map((i) => String(kalanlar[i]))
      const geriAlinacak = geriAlSecim.filter((i) => i >= 0 && i < iadeKayitlari.length)
      if (eklenecek.length === 0 && geriAlinacak.length === 0) {
        alert("Seçili bidon yok.")
        return
      }

      // kayit id -> iade listesi
      const tel = normalizeTelefon(seciliIslem.telefon)
      const orijinal = {}
      for (const k of tumListe) {
        if (k.odeme_tipi === "SATIS" || normalizeTelefon(k.telefon) !== tel) continue
        orijinal[k.id] = parseBidonList(k.iade_bidonlar ?? k.geri_alinan_bidonlar ?? "").map(String)
      }
      const yeni = Object.fromEntries(Object.entries(orijinal).map(([id, l]) => [id, [...l]]))

      for (const i of geriAlinacak) {
        const { no, kayitId } = iadeKayitlari[i]
        const liste = yeni[kayitId]
        const idx = liste ? liste.indexOf(no) : -1
        if (idx !== -1) liste.splice(idx, 1)
      }
      if (!yeni[seciliIslem.id]) yeni[seciliIslem.id] = []
      yeni[seciliIslem.id].push(...eklenecek)

      const degisenler = Object.keys(yeni).filter(
        (id) => formatBidonList(yeni[id]) !== formatBidonList(orijinal[id] || [])
      )
      await Promise.all(
        degisenler.map((id) =>
          axios.put(`/api/bidon-iade/${id}`, { iade_bidonlar: formatBidonList(yeni[id]) })
        )
      )

      setMesajAnim("spin")
      setMesaj(
        geriAlinacak.length > 0 && eklenecek.length === 0
          ? "Bidon iadesi geri alındı."
          : "Bidon iadesi kaydedildi."
      )
      setIadeModalAcik(false)
      setIadeSecim([])
      setGeriAlSecim([])
      if (aktifTab === "bidonlar") {
        setSeciliIslem(null)
      } else if (yeni[seciliIslem.id]) {
        const out = formatBidonList(yeni[seciliIslem.id])
        setSeciliIslem((prev) => (prev ? { ...prev, iade_bidonlar: out } : prev))
      }
      fetchListe()
      setTimeout(() => setMesajAnim("tik"), 1200)
      setTimeout(() => setMesaj(""), 3000)
    } catch (e) {
      console.error(e)
      alert("Bidon iadesi kaydedilirken hata oluştu.")
    }
  }

  const _handleIadeTemizle = async () => {
    if (!seciliIslem) return
    try {
      const payload = { iade_bidonlar: "" }
      await axios.put(`/api/bidon-iade/${seciliIslem.id}`, payload)

      setMesajAnim("spin")
      setMesaj("İadeler temizlendi.")
      setIadeModalAcik(false)
      setIadeSecim([]); setGeriAlSecim([])
      setSeciliIslem((prev) => (prev ? { ...prev, iade_bidonlar: "" } : prev))
      fetchListe()
      setTimeout(() => setMesajAnim("tik"), 1200)
      setTimeout(() => setMesaj(""), 3000)
    } catch (err) {
      console.error(err)
      alert("İadeler temizlenirken hata oluştu.")
    }
  }

  const handleBidonExcelIndir = () => {
    try {
      const rows = bidonListesi.map((x) => ({
        "AD SOYAD": x.ad_soyad.replaceAll(" / ", "\n"),
        "TELEFON": x.telefon,
        "VERİLEN TOPLAM": x.verilenToplam,
        "İADE TOPLAM": x.iadeToplam,
        "KALAN TOPLAM": x.kalanToplam,
      }))

      // Add Summary Row
      rows.push({
        "AD SOYAD": "GENEL TOPLAM",
        "TELEFON": "",
        "VERİLEN TOPLAM": bidonIstatistikleri.toplamVerilen,
        "İADE TOPLAM": bidonIstatistikleri.toplamIade,
        "KALAN TOPLAM": bidonIstatistikleri.toplamKalan,
      })

      const ws = XLSX.utils.json_to_sheet(rows)
      const range = XLSX.utils.decode_range(ws['!ref'])
      
      for (let R = range.s.r; R <= range.e.r; ++R) {
        for (let C = range.s.c; C <= range.e.c; ++C) {
          const address = XLSX.utils.encode_cell({ r: R, c: C })
          if (!ws[address]) continue

          const isHeader = R === 0
          const isTotal = R === range.e.r

          ws[address].s = {
            font: { 
              sz: isTotal ? 14 : 12, 
              bold: isHeader || isTotal, 
              color: { rgb: "000000" } 
            },
            alignment: { horizontal: "center", vertical: "center", wrapText: true },
            fill: { 
              fgColor: { rgb: isHeader ? "6EE7B7" : isTotal ? "FDBA74" : "F0FDF4" } 
            },
            border: {
              top: { style: "thin", color: { rgb: "000000" } },
              bottom: { style: "thin", color: { rgb: "000000" } },
              left: { style: "thin", color: { rgb: "000000" } },
              right: { style: "thin", color: { rgb: "000000" } }
            }
          }
        }
      }

      if (rows.length > 0) {
        const keys = Object.keys(rows[0])
        ws["!cols"] = keys.map((key) => {
          let maxLen = key.length
          rows.forEach((row) => {
            const val = row[key] ? String(row[key]) : ""
            if (val.length > maxLen) maxLen = val.length
          })
          return { wch: maxLen + 5 }
        })
      }

      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, "BidonTakip")
      const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" })
      const blob = new Blob([wbout], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })

      const today = new Date()
      const fileName = `bidon_takip_${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}.xlsx`
      saveAs(blob, fileName)
    } catch (err) {
      console.error(err)
      alert("Excel oluşturulurken hata oluştu.")
    }
  }

  return (
    <div className="flex h-[calc(100vh-5rem)] overflow-hidden relative">
      {iadeModalAcik && seciliIslem && (
        <div className="fixed inset-0 z-50 bg-murekkep/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-md shadow-lg w-full max-w-xl overflow-hidden border border-cizgi">
            <div className="px-6 py-4 border-b border-cizgi flex justify-between items-center">
              <div>
                <h2 className="font-display text-lg font-bold text-murekkep">Bidon iadesi</h2>
                <p className="text-sm text-murekkep/60 mt-0.5">
                  {seciliIslem.ad_soyad} · <span className="readout">{normalizeTelefon(seciliIslem.telefon)}</span>
                </p>
              </div>
              <button
                onClick={() => {
                  setIadeModalAcik(false)
                  if (aktifTab === "bidonlar") setSeciliIslem(null)
                }}
                aria-label="Kapat"
                className="p-1 rounded text-murekkep/50 hover:text-murekkep hover:bg-zemin transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div>
                <p className="label">{normalizeTelefon(seciliIslem.telefon)} numaralı müşterinin tüm bidonları</p>
                <div className="card grid grid-cols-3 divide-x divide-cizgi text-center">
                  <div className="p-4">
                    <p className="label mb-1">Verilen</p>
                    <p className="readout text-2xl">{ayniTelefonTumBidonlar.verilenler.length}<span className="readout-birim">adet</span></p>
                  </div>
                  <div className="p-4">
                    <p className="label mb-1">İade alınan</p>
                    <p className="readout text-2xl text-zeytin">{ayniTelefonTumBidonlar.iadeler.length}<span className="readout-birim">adet</span></p>
                  </div>
                  <div className="p-4">
                    <p className="label mb-1">Müşteride kalan</p>
                    <p className="readout text-2xl text-sizma">{ayniTelefonTumBidonlar.kalanlar.length}<span className="readout-birim">adet</span></p>
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="label mb-0">İade alınacak bidonları seçin</label>
                  {ayniTelefonTumBidonlar.kalanlar.length > 0 && (
                    <button
                      type="button"
                      onClick={() =>
                        setIadeSecim(
                          iadeSecim.length === ayniTelefonTumBidonlar.kalanlar.length
                            ? []
                            : ayniTelefonTumBidonlar.kalanlar.map((_, i) => i)
                        )
                      }
                      className="text-sm font-semibold text-zeytin hover:underline"
                    >
                      {iadeSecim.length === ayniTelefonTumBidonlar.kalanlar.length ? "Seçimi temizle" : "Tümünü seç"}
                    </button>
                  )}
                </div>

                {ayniTelefonTumBidonlar.kalanlar.length === 0 ? (
                  <div className="text-center py-6 text-murekkep/60 bg-zemin rounded border border-dashed border-cizgi">
                    Müşterinin üzerinde bidon kalmadı.
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-1">
                    {ayniTelefonTumBidonlar.kalanlar.map((no, i) => {
                      const secili = iadeSecim.includes(i)
                      return (
                        <button
                          key={`${no}-${i}`}
                          type="button"
                          onClick={() =>
                            setIadeSecim((prev) => (prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]))
                          }
                          className={`px-4 py-2 rounded border readout text-lg tracking-wider transition-colors flex items-center gap-1.5 ${secili
                            ? "bg-zeytin border-zeytin text-white"
                            : "bg-white border-cizgi text-murekkep hover:bg-zemin"
                            }`}
                        >
                          {secili && <Check className="w-4 h-4" />}{no}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

              {ayniTelefonTumBidonlar.iadeKayitlari.length > 0 && (
                <div>
                  <label className="label">İade edilmiş bidonlar (geri almak için seçin)</label>
                  <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-1">
                    {ayniTelefonTumBidonlar.iadeKayitlari.map(({ no }, i) => {
                      const secili = geriAlSecim.includes(i)
                      return (
                        <button
                          key={`iade-${no}-${i}`}
                          type="button"
                          onClick={() =>
                            setGeriAlSecim((prev) => (prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]))
                          }
                          className={`px-4 py-2 rounded border readout text-lg tracking-wider transition-colors ${secili
                            ? "bg-red-700 border-red-700 text-white line-through"
                            : "bg-zeytin/10 border-zeytin/30 text-zeytin hover:bg-red-50 hover:border-red-300 hover:text-red-700"
                            }`}
                        >
                          {no}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={handleIadeKaydet}
                disabled={iadeSecim.length === 0 && geriAlSecim.length === 0}
                className="btn-primary w-full py-3"
              >
                {iadeSecim.length === 0 && geriAlSecim.length === 0
                  ? "Bidon seçin"
                  : [
                      iadeSecim.length > 0 ? `${iadeSecim.length} bidonu iade al` : "",
                      geriAlSecim.length > 0 ? `${geriAlSecim.length} iadeyi geri al` : "",
                    ].filter(Boolean).join(" · ")}
              </button>
            </div>
          </div>
        </div>
      )}

      {satisModalAcik && (
        <div className="fixed inset-0 z-50 bg-murekkep/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-md shadow-lg w-full max-w-lg overflow-hidden border border-cizgi">
            <div className="px-6 py-4 border-b border-cizgi flex justify-between items-center">
              <h2 className="font-display text-lg font-bold text-murekkep">Perakende satış</h2>
              <button
                onClick={() => setSatisModalAcik(false)}
                aria-label="Kapat"
                className="p-1 rounded text-murekkep/50 hover:text-murekkep hover:bg-zemin transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSatisKaydet} className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Ad soyad</label>
                  <input
                    name="ad_soyad"
                    value={satisForm.ad_soyad}
                    onChange={handleSatisInput}
                    className="input text-lg font-semibold"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="label">Telefon</label>
                  <input
                    name="telefon"
                    value={satisForm.telefon}
                    onChange={handleTelefonChange}
                    maxLength={14}
                    placeholder="0555 123 45 67"
                    className="input readout text-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Miktar (kg)</label>
                  <input
                    type="number"
                    name="satilan_kg"
                    value={satisForm.satilan_kg}
                    onChange={handleSatisInput}
                    className="input readout text-lg"
                  />
                </div>
                <div>
                  <label className="label">Fiyat (₺)</label>
                  <input
                    type="number"
                    name="birim_fiyat"
                    value={satisForm.birim_fiyat}
                    onChange={handleSatisInput}
                    className="input readout text-lg"
                  />
                </div>
              </div>

              <div className="px-5 py-4 bg-murekkep rounded flex justify-between items-center text-white">
                <span className="text-sm font-semibold uppercase tracking-wider text-white/70">Toplam tutar</span>
                <span className="readout text-2xl">
                  {(parseFloat(satisForm.satilan_kg || 0) * parseFloat(satisForm.birim_fiyat || 0)).toFixed(2)} ₺
                </span>
              </div>

              <div>
                <div className="flex justify-between items-end mb-1.5">
                  <label className="label mb-0">Bidon no</label>
                  <span className="rozet-bekliyor">
                    Verilecek bidon:{" "}
                    <span className="readout ml-1">
                      {Math.ceil((parseFloat(satisForm.satilan_kg) || 0) / 50)}
                    </span>
                    <span className="readout-birim">adet</span>
                  </span>
                </div>

                <input
                  value={satisForm.bidon_no}
                  onChange={(e) => handleBidonInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === " " || e.key === "Enter") {
                      e.preventDefault()
                      if (satisForm.bidon_no.length > 0 && !satisForm.bidon_no.endsWith("-")) {
                        setSatisForm((prev) => ({ ...prev, bidon_no: prev.bidon_no + "-" }))
                      }
                    }
                  }}
                  className="input readout text-lg text-center tracking-wider"
                  placeholder="1234-5678"
                />
              </div>

              <button type="submit" className="btn-primary w-full py-3.5 text-base">
                Satışı tamamla
              </button>
            </form>
          </div>
        </div>
      )}

      <div className={`${aktifTab === "bidonlar" ? "w-1/4" : "w-1/2"} bg-white border-r border-cizgi flex flex-col h-full z-10 relative transition-all duration-300`}>
        <div className="p-5 border-b border-cizgi space-y-3">
          <h2 className="font-display text-xl font-bold text-murekkep">Çıkış</h2>
          <button onClick={() => setSatisModalAcik(true)} className="btn-secondary w-full">
            + Perakende satış
          </button>
          <button onClick={handleExcelIndir} className="btn-primary w-full">
            <Download className="w-4 h-4" />
            Geçmiş kayıtları indir
          </button>
        </div>

        <div className="px-5 pt-4 pb-2">
          <div className="seg">
            <button
              onClick={() => {
                setAktifTab("bekleyen")
                setSeciliIslem(null)
                setBekleyenMusteriAra("")
              }}
              className={`seg-item ${aktifTab === "bekleyen" ? "seg-active" : ""}`}
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
              className={`seg-item ${aktifTab === "gecmis" ? "seg-active" : ""}`}
            >
              Geçmiş
            </button>
            <button
              onClick={() => {
                setAktifTab("bidonlar")
                setSeciliIslem(null)
                setGecmisTelefonAra("")
                setBekleyenMusteriAra("")
              }}
              className={`seg-item ${aktifTab === "bidonlar" ? "seg-active" : ""}`}
            >
              Bidonlar
            </button>
          </div>
        </div>

        {aktifTab === "bekleyen" && (
          <div className="px-5 pt-3">
            <label className="label">Müşteri numarası ile ara</label>
            <div className="relative">
              <input
                value={bekleyenMusteriAra}
                onChange={(e) => {
                  const onlyDigits = e.target.value.replace(/\D/g, "").slice(0, 10)
                  setBekleyenMusteriAra(onlyDigits)
                }}
                inputMode="numeric"
                placeholder="123"
                className="input readout pr-10"
              />
              {bekleyenMusteriAra ? (
                <button
                  onClick={() => setBekleyenMusteriAra("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-murekkep/40 hover:text-murekkep"
                  type="button"
                  aria-label="Temizle"
                >
                  <X className="w-4 h-4" />
                </button>
              ) : (
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-murekkep/40 pointer-events-none" />
              )}
            </div>
          </div>
        )}

        {aktifTab === "gecmis" && (
          <div className="px-5 pt-3">
            <label className="label">Telefon numarası ile ara</label>
            <div className="relative">
              <input
                value={gecmisTelefonAra}
                onChange={(e) => {
                  const onlyDigits = e.target.value.replace(/\D/g, "").slice(0, 11)
                  setGecmisTelefonAra(onlyDigits)
                }}
                inputMode="numeric"
                placeholder="05551234567"
                className="input readout pr-10"
              />
              {gecmisTelefonAra && (
                <button
                  onClick={() => setGecmisTelefonAra("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-murekkep/40 hover:text-murekkep"
                  type="button"
                  aria-label="Temizle"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {aktifTab === "bidonlar" ? null : gosterilecekListe.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-murekkep/50">
              <p className="text-sm">Kayıt bulunamadı.</p>
            </div>
          ) : (
            gosterilecekListe.map((islem) => (
              <div
                key={islem.id}
                onClick={() => setSeciliIslem(islem)}
                className={`p-3 rounded border cursor-pointer flex gap-3 items-start transition-colors ${seciliIslem?.id === islem.id
                  ? "border-zeytin border-l-4 bg-zeytin/5"
                  : "border-cizgi bg-white hover:bg-zemin"
                  }`}
              >
                {islem.odeme_tipi === "SATIS" ? (
                  <span className="rozet bg-murekkep/10 text-murekkep border-murekkep/20">PERAKENDE</span>
                ) : (
                  islem.musteri_no && <span className="fis-no text-lg min-w-[4.75rem] justify-center">No {islem.musteri_no}</span>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-lg text-murekkep truncate flex-1">{islem.ad_soyad}</p>
                    {islem.odeme_tipi === "yag" && (
                      <span className="rozet bg-sizma/10 text-sizma border-sizma/30">HAK</span>
                    )}
                    {islem.odeme_tipi === "para" && (
                      <span className="rozet bg-para/10 text-para border-para/30">PARA</span>
                    )}
                  </div>
                  <Telefon numara={normalizeTelefon(islem.telefon)} />
                  <TarihSaat
                    className="mt-1.5"
                    tarih={new Date(islem.created_at).toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric" })}
                    saat={new Date(islem.created_at).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className={`${aktifTab === "bidonlar" ? "w-3/4" : "w-1/2"} flex flex-col h-full overflow-hidden relative transition-all duration-300`}>
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

        {(!seciliIslem || aktifTab === "bidonlar") ? (
          aktifTab === "bidonlar" ? (
            <div className="flex-1 p-8 overflow-y-auto">
              <div className="max-w-4xl mx-auto space-y-8">
                <div>
                  <h2 className="font-display text-3xl font-bold text-murekkep">Bidon istatistikleri</h2>
                  <p className="text-murekkep/60">Tüm müşterilerin toplam bidon durumları</p>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="card p-6 text-center">
                    <div className="label">Toplam verilen</div>
                    <div className="readout text-5xl">{bidonIstatistikleri.toplamVerilen}</div>
                  </div>
                  <div className="card p-6 text-center">
                    <div className="label">Toplam iade</div>
                    <div className="readout text-5xl text-zeytin">{bidonIstatistikleri.toplamIade}</div>
                  </div>
                  <div className="card p-6 text-center">
                    <div className="label">Müşterilerde kalan</div>
                    <div className="readout text-5xl text-sizma">{bidonIstatistikleri.toplamKalan}</div>
                  </div>
                </div>

                <button onClick={handleBidonExcelIndir} className="btn-primary w-full py-3">
                  <Download className="w-5 h-5" />
                  Kayıtları excel olarak indir
                </button>

                <div className="card p-6 space-y-5">
                  <h3 className="font-display text-lg font-bold text-murekkep border-b border-cizgi pb-3">Müşteri arama</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="label">İsim soyisim</label>
                      <input
                        value={bidonAdAra}
                        onChange={(e) => setBidonAdAra(e.target.value)}
                        placeholder="İsim ile ara"
                        className="input text-lg"
                      />
                    </div>
                    <div>
                      <label className="label">Telefon numarası</label>
                      <input
                        value={bidonTelAra}
                        onChange={(e) => setBidonTelAra(e.target.value)}
                        placeholder="Telefon ile ara"
                        className="input readout text-lg"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-display text-lg font-bold text-murekkep">Sonuçlar ({bidonListesi.length})</h3>
                  {bidonListesi.length === 0 ? (
                    <div className="card border-dashed py-12 text-center text-murekkep/60">
                      Kayıt bulunamadı.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-3">
                      {bidonListesi.map((item, idx) => (
                        <div
                          key={item.telefon + idx}
                          onClick={() => {
                            const kayitlar = tumListe.filter(x =>
                              x.odeme_tipi !== "SATIS" &&
                              x.status === 3 &&
                              normalizeTelefon(x.telefon) === item.telefon
                            )
                            if (kayitlar.length === 0) return
                            const enSon = [...kayitlar].sort((a, b) =>
                              new Date(b.finished_at || b.created_at) - new Date(a.finished_at || a.created_at)
                            )[0]
                            setSeciliIslem(enSon)
                            setIadeSecim([]); setGeriAlSecim([])
                            setIadeModalAcik(true)
                          }}
                          className="card p-5 hover:bg-zemin cursor-pointer transition-colors flex justify-between items-start"
                        >
                          <div className="flex flex-col gap-0.5">
                            {item.ad_soyad.split(" / ").map((name, i) => (
                              <h4 key={i} className="font-semibold text-xl text-murekkep leading-tight">{name}</h4>
                            ))}
                            <Telefon numara={item.telefon} className="mt-1" />
                          </div>

                          <div className="flex gap-8 text-center self-center">
                            <div>
                              <div className="label mb-0.5">Verilen</div>
                              <div className="readout text-2xl">{item.verilenToplam}</div>
                            </div>
                            <div>
                              <div className="label mb-0.5">İade</div>
                              <div className="readout text-2xl text-zeytin">{item.iadeToplam}</div>
                            </div>
                            <div>
                              <div className="label mb-0.5">Kalan</div>
                              <div className="readout text-2xl text-sizma">{item.kalanToplam}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 p-8">
              <div className="card border-dashed p-16 text-center text-murekkep/60 text-lg">
                Detay için soldan bir kayıt seçin.
              </div>
            </div>
          )
        ) : (
          <div className="flex-1 overflow-y-auto p-8">
            <div className="max-w-3xl mx-auto space-y-5">
              <div className="fis">
                <div className="flex justify-between items-start gap-4 px-5 py-4 border-b border-dashed border-cizgi">
                  <div className="flex items-start gap-3">
                    {seciliIslem.odeme_tipi === "SATIS" ? (
                      <span className="rozet bg-murekkep/10 text-murekkep border-murekkep/20 mt-1">Perakende satış</span>
                    ) : (
                      seciliIslem.musteri_no && <span className="fis-no text-xl">No {seciliIslem.musteri_no}</span>
                    )}
                    <div>
                      <h3 className="font-display text-xl font-bold text-murekkep">{seciliIslem.ad_soyad}</h3>
                      <Telefon numara={normalizeTelefon(seciliIslem.telefon)} />
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="readout text-murekkep">
                      {new Date(seciliIslem.created_at).toLocaleDateString("tr-TR")}
                    </p>
                    <p className="readout text-murekkep">
                      {new Date(seciliIslem.created_at).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>

                {seciliIslem.odeme_tipi === "SATIS" ? (
                  <>
                    <FisSatir etiket="Satılan">{seciliIslem.cikan_yag}<span className="readout-birim">kg</span></FisSatir>
                    <FisSatir etiket="Birim fiyat">{seciliIslem.yag_fiyati}<span className="readout-birim">₺</span></FisSatir>
                    <div className="fis-toplam">
                      <span className="font-semibold text-murekkep">Toplam tutar</span>
                      <span className="readout text-2xl">{seciliIslem.firma_hakki_tl}<span className="readout-birim">₺</span></span>
                    </div>
                  </>
                ) : yeniSistemMi(seciliIslem) ? (
                  <>
                    <FisSatir etiket="Yağ ile ödeme bedeli">{seciliIslem.yag_ile_odeme}<span className="readout-birim">₺</span></FisSatir>
                    <FisSatir etiket="Bidon ücreti">{seciliIslem.bidon_ucreti}<span className="readout-birim">₺</span></FisSatir>
                    <FisSatir etiket="Sıkım bedeli">{seciliIslem.sikim_bedeli}<span className="readout-birim">₺</span></FisSatir>
                    <FisAyrac />
                    <FisSatir etiket="Gelen zeytin">{seciliIslem.zeytin_kg}<span className="readout-birim">kg</span></FisSatir>
                    <FisSatir etiket="Kantarda gözüken yağ">{seciliIslem.cikan_yag}<span className="readout-birim">kg</span></FisSatir>
                    <FisSatir etiket="Kantardaki bidon">{seciliIslem.kantar_bidon ?? "—"}</FisSatir>
                    <FisSatir etiket="Net yağ" renk="text-sizma">{yuvarla(yeniDetay.netYag)}<span className="readout-birim">kg</span></FisSatir>
                    <FisAyrac />
                    <FisSatir etiket="Sıkma ücreti">
                      {yuvarla(yeniDetay.sikmaUcretiTL)}<span className="readout-birim">₺</span>
                      <span className="text-murekkep/30 mx-2">|</span>
                      <span className="text-sizma">{yuvarla(yeniDetay.sikmaUcretiYag)}</span><span className="readout-birim">yağ kg</span>
                    </FisSatir>
                    <FisSatir etiket="Bidon bedeli">
                      {yuvarla(yeniDetay.bidonBedeliTL)}<span className="readout-birim">₺</span>
                      <span className="text-murekkep/30 mx-2">|</span>
                      <span className="text-sizma">{yuvarla(yeniDetay.bidonBedeliYag)}</span><span className="readout-birim">yağ kg</span>
                    </FisSatir>
                    <FisSatir etiket="Oran">{yeniDetay.oran}</FisSatir>
                    <div className="border-t-4 border-double border-cizgi">
                      <FisOdeme aktif={seciliIslem.odeme_tipi === "para"} renk="para" etiket="Toplam sıkım bedeli (₺)">
                        {yuvarla(yeniDetay.toplamTL)}<span className="readout-birim">₺</span>
                      </FisOdeme>
                      <FisOdeme aktif={seciliIslem.odeme_tipi === "yag"} renk="sizma" etiket="Toplam sıkım bedeli (yağ kg)">
                        {yuvarla(yeniDetay.toplamYag)}<span className="readout-birim">kg</span>
                      </FisOdeme>
                    </div>
                  </>
                ) : (
                  <>
                    <FisSatir etiket="Gelen zeytin">{seciliIslem.zeytin_kg}<span className="readout-birim">kg</span></FisSatir>
                    <FisSatir etiket="Çıkan yağ" renk="text-sizma">{seciliIslem.cikan_yag}<span className="readout-birim">kg</span></FisSatir>
                    <FisSatir etiket="Kantardaki bidon sayısı">{seciliIslem.kantar_bidon ?? "—"}</FisSatir>
                    <FisSatir etiket="Net yağ" renk="text-sizma">{hesapDetay.netYag}<span className="readout-birim">kg</span></FisSatir>
                    <FisSatir etiket="Hak oranı">%{seciliIslem.hak_oran}</FisSatir>
                    <FisSatir etiket="Yağ fiyatı">{seciliIslem.yag_fiyati}<span className="readout-birim">₺</span></FisSatir>
                    <div className="border-t-4 border-double border-cizgi">
                      <FisOdeme aktif={seciliIslem.odeme_tipi === "yag"} renk="sizma" etiket="Hak (yağ kesintisi)" secilen>
                        {hesapDetay.hakKGround}<span className="readout-birim">kg kesilir</span>
                      </FisOdeme>
                      <FisOdeme aktif={seciliIslem.odeme_tipi === "para"} renk="para" etiket="Para" secilen>
                        {hesapDetay.paraTL}<span className="readout-birim">₺ ödenir</span>
                      </FisOdeme>
                    </div>
                  </>
                )}
              </div>

              {seciliIslem.odeme_tipi !== "SATIS" && (
                <div className={`card grid ${yeniSistemMi(seciliIslem) ? "grid-cols-2" : "grid-cols-3"} divide-x divide-cizgi text-center`}>
                  <div className="p-5">
                    <p className="label mb-1">Kalan yağ</p>
                    <p className="readout text-3xl">{hazir?.kalanYag}<span className="readout-birim">kg</span></p>
                  </div>
                  {!yeniSistemMi(seciliIslem) && (
                    <div className="p-5">
                      <p className="label mb-1">Oran</p>
                      <p className="readout text-3xl">{hazir?.randiman}</p>
                    </div>
                  )}
                  <div className="p-5">
                    <p className="label mb-1">Verilen toplam bidon</p>
                    <p className="readout text-3xl">{bidonOzetAyniTelefon?.genelToplam ?? 0}<span className="readout-birim">adet</span></p>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <div className="flex items-end justify-between gap-3">
                  <label className="label mb-0">Müşteriye verilen bidon numaraları</label>

                  {seciliIslem.status === 2 && (
                    <div className="flex items-center gap-2">
                      {!isEditing ? (
                        <button
                          type="button"
                          onClick={() => {
                            setBidonEdit(seciliIslem.bidon_no || "")
                            setIsEditing(true)
                          }}
                          className="btn-secondary py-1.5"
                        >
                          Düzenle
                        </button>
                      ) : (
                        <>
                          <button type="button" onClick={() => setIsEditing(false)} className="btn-secondary py-1.5">
                            Vazgeç
                          </button>

                          <button
                            type="button"
                            onClick={handleBidonDuzenleKaydet}
                            disabled={bidonSaving}
                            className="btn-primary py-1.5"
                          >
                            {bidonSaving ? "Kaydediliyor..." : "Kaydet"}
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {isEditing ? (
                  <textarea
                    ref={textareaRef}
                    value={bidonEdit}
                    onChange={(e) => setBidonEdit(sanitizeBidonInput(e.target.value))}
                    onKeyDown={(e) => {
                      if (e.key === " " || e.key === "Enter") {
                        e.preventDefault()
                        setBidonEdit((prev) => (prev && !prev.endsWith("-") ? prev + "-" : prev))
                      }
                    }}
                    rows={1}
                    autoFocus
                    className="input readout text-lg text-center tracking-wider resize-none overflow-hidden border-zeytin"
                    placeholder="1234-5678"
                  />
                ) : (
                  <div className="input readout text-lg text-center tracking-wider bg-zemin">
                    {seciliIslem.bidon_no || "---"}
                  </div>
                )}

                {seciliIslem.status !== 3 && (
                  <div className="text-center">
                    <span className="rozet-bekliyor">
                      Verilen bidon sayısı:
                      <span className="readout ml-1.5">
                        {isEditing ? parseBidonList(bidonEdit).length : seciliVerilenBidonlar.length}
                      </span>
                    </span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-end justify-between gap-3">
                  <label className="label mb-0">Not</label>
                  {notEdit !== (seciliIslem.notlar || "") && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setNotEdit(seciliIslem.notlar || "")}
                        className="btn-secondary py-1.5"
                      >
                        Vazgeç
                      </button>
                      <button
                        type="button"
                        onClick={handleNotKaydet}
                        disabled={notSaving}
                        className="btn-primary py-1.5"
                      >
                        {notSaving ? "Kaydediliyor..." : "Kaydet"}
                      </button>
                    </div>
                  )}
                </div>
                <textarea
                  value={notEdit}
                  onChange={(e) => setNotEdit(e.target.value)}
                  rows={3}
                  maxLength={1000}
                  placeholder="Bu kayıt için not ekleyin"
                  className="input resize-none"
                />
              </div>

              {seciliIslem.status !== 3 ? (
                <button
                  onClick={handleCikisYap}
                  disabled={isEditing}
                  className="btn-primary w-full py-3.5 text-base"
                >
                  {isEditing ? "Önce bidon düzenlemesini kaydedin" : "İşlemi onayla ve çıkış yap"}
                </button>
              ) : (
                <div className="w-full py-3.5 bg-zemin text-murekkep/60 font-semibold rounded text-center border border-cizgi">
                  Bu işlem kapatılmıştır
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
