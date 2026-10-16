import { useState, useEffect, useMemo, useRef, useCallback } from "react"
import axios from "axios"
import { hesaplaYagIslemi, hesaplaYagciPaneli } from "../utils/yagHesap"
import io from "socket.io-client"
import * as XLSX from "xlsx-js-style"
import { saveAs } from "file-saver"

axios.defaults.baseURL = "/"
const socket = io()

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
    <div className="flex h-screen bg-gradient-to-br from-emerald-50 via-white to-amber-50 overflow-hidden font-sans relative">
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

      {iadeModalAcik && seciliIslem && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden border-2 border-white/60">
            <div className="bg-gradient-to-r from-emerald-50 to-amber-50 p-6 border-b-2 border-slate-200 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-black text-slate-800">Bidon İadesi</h2>
                <p className="text-sm font-bold text-slate-500 mt-1">
                  {seciliIslem.ad_soyad} • {normalizeTelefon(seciliIslem.telefon)}
                </p>
              </div>
              <button
                onClick={() => {
                  setIadeModalAcik(false)
                  if (aktifTab === "bidonlar") setSeciliIslem(null)
                }}
                className="text-slate-400 hover:text-red-500 text-3xl font-bold transition-colors"
              >
                x
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <p className="text-sm font-bold text-emerald-700 mb-3">{normalizeTelefon(seciliIslem.telefon)} Numaralı Müşterinin Tüm Bidonları:</p>
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-4 rounded-2xl border-2 border-slate-300 bg-slate-50">
                    <p className="text-xs font-black text-slate-500 uppercase">Verilen</p>
                    <p className="text-2xl font-black text-slate-800">{ayniTelefonTumBidonlar.verilenler.length} ADET</p>
                  </div>
                  <div className="p-4 rounded-2xl border-2 border-emerald-400 bg-emerald-100">
                    <p className="text-xs font-black text-emerald-800 uppercase">İade Alınan</p>
                    <p className="text-2xl font-black text-emerald-900">{ayniTelefonTumBidonlar.iadeler.length} ADET</p>
                  </div>
                  <div className="p-4 rounded-2xl border-2 border-amber-400 bg-amber-100">
                    <p className="text-xs font-black text-amber-800 uppercase">Müşteride Kalan</p>
                    <p className="text-2xl font-black text-amber-900">{ayniTelefonTumBidonlar.kalanlar.length} ADET</p>
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-black text-slate-700">İade alınacak bidonlara tıklayın</label>
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
                      className="text-xs font-black text-emerald-700 hover:text-emerald-900 underline"
                    >
                      {iadeSecim.length === ayniTelefonTumBidonlar.kalanlar.length ? "Seçimi Temizle" : "Tümünü Seç"}
                    </button>
                  )}
                </div>

                {ayniTelefonTumBidonlar.kalanlar.length === 0 ? (
                  <div className="text-center py-6 text-slate-400 font-bold bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
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
                          className={`px-4 py-2 rounded-xl border-2 text-lg font-black tracking-wider transition-all ${secili
                            ? "bg-emerald-600 border-emerald-700 text-white shadow-md"
                            : "bg-amber-50 border-amber-300 text-amber-900 hover:border-emerald-400"
                            }`}
                        >
                          {secili ? "✓ " : ""}{no}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

              {ayniTelefonTumBidonlar.iadeKayitlari.length > 0 && (
                <div>
                  <label className="block text-sm font-black text-slate-700 mb-2">
                    İade edilmiş bidonlar (geri almak için tıklayın)
                  </label>
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
                          className={`px-4 py-2 rounded-xl border-2 text-lg font-black tracking-wider transition-all ${secili
                            ? "bg-rose-600 border-rose-700 text-white shadow-md line-through"
                            : "bg-emerald-50 border-emerald-300 text-emerald-800 hover:border-rose-400"
                            }`}
                        >
                          {no}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              <div>
                <button
                  type="button"
                  onClick={handleIadeKaydet}
                  disabled={iadeSecim.length === 0 && geriAlSecim.length === 0}
                  className={`w-full py-4 font-bold rounded-2xl shadow-lg transition-all ${iadeSecim.length === 0 && geriAlSecim.length === 0
                    ? "bg-slate-300 text-slate-500 cursor-not-allowed"
                    : "bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white"
                    }`}
                >
                  {iadeSecim.length === 0 && geriAlSecim.length === 0
                    ? "Bidon Seçin"
                    : [
                        iadeSecim.length > 0 ? `${iadeSecim.length} Bidonu İade Al` : "",
                        geriAlSecim.length > 0 ? `${geriAlSecim.length} İadeyi Geri Al` : "",
                      ].filter(Boolean).join(" • ")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {satisModalAcik && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border-2 border-white/60">
            <div className="bg-gradient-to-r from-emerald-50 to-amber-50 p-6 border-b-2 border-slate-200 flex justify-between items-center">
              <h2 className="text-2xl font-black text-slate-800">Perakende Satış</h2>
              <button
                onClick={() => setSatisModalAcik(false)}
                className="text-slate-400 hover:text-red-500 text-3xl font-bold transition-colors"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSatisKaydet} className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Ad Soyad</label>
                  <input
                    name="ad_soyad"
                    value={satisForm.ad_soyad}
                    onChange={handleSatisInput}
                    className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-2xl text-lg font-semibold text-slate-800 focus:outline-none focus:border-emerald-400 transition-all shadow-sm hover:shadow-md"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Telefon</label>
                  <input
                    name="telefon"
                    value={satisForm.telefon}
                    onChange={handleTelefonChange}
                    maxLength={14}
                    placeholder="0555 123 45 67"
                    className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-2xl text-lg font-semibold text-slate-800 focus:outline-none focus:border-emerald-400 transition-all shadow-sm hover:shadow-md"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Miktar (KG)</label>
                  <input
                    type="number"
                    name="satilan_kg"
                    value={satisForm.satilan_kg}
                    onChange={handleSatisInput}
                    className="w-full px-4 py-3 bg-gradient-to-br from-amber-50 to-amber-100/50 border-2 border-amber-300 rounded-2xl text-lg font-bold text-slate-800 focus:outline-none focus:border-amber-400 transition-all shadow-sm hover:shadow-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Fiyat (₺)</label>
                  <input
                    type="number"
                    name="birim_fiyat"
                    value={satisForm.birim_fiyat}
                    onChange={handleSatisInput}
                    className="w-full px-4 py-3 bg-gradient-to-br from-emerald-50 to-emerald-100/50 border-2 border-emerald-300 rounded-2xl text-lg font-bold text-emerald-700 focus:outline-none focus:border-emerald-400 transition-all shadow-sm hover:shadow-md"
                  />
                </div>
              </div>

              <div className="p-5 bg-gradient-to-r from-emerald-600 to-emerald-700 rounded-2xl flex justify-between items-center text-white shadow-lg">
                <span className="font-bold text-lg">TOPLAM TUTAR</span>
                <span className="text-3xl font-black">
                  {(parseFloat(satisForm.satilan_kg || 0) * parseFloat(satisForm.birim_fiyat || 0)).toFixed(2)} ₺
                </span>
              </div>

              <div>
                <div className="flex justify-between items-end mb-2">
                  <label className="block text-sm font-bold text-slate-700">Bidon No</label>
                  <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-xl border-2 border-slate-200">
                    Verilecek Bidon:{" "}
                    <span className="text-slate-900 text-sm font-black">
                      {Math.ceil((parseFloat(satisForm.satilan_kg) || 0) / 50)}
                    </span>{" "}
                    Adet
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
                  className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-2xl text-lg font-bold text-slate-800 text-center focus:outline-none focus:border-slate-400 transition-all shadow-sm hover:shadow-md tracking-wider"
                  placeholder="1234-5678"
                />
              </div>

              <button
                type="submit"
                className="w-full py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-bold rounded-2xl shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 text-lg"
              >
                SATIŞI TAMAMLA
              </button>
            </form>
          </div>
        </div>
      )}

      <div className={`${aktifTab === "bidonlar" ? "w-1/4" : "w-1/2"} bg-white/80 backdrop-blur-xl border-r-2 border-white/60 flex flex-col h-full shadow-2xl z-10 relative transition-all duration-300`}>
        <div className="p-6 border-b-2 border-slate-100">
          <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 via-emerald-700 to-emerald-800 mb-4 text-center tracking-tight">
            Çıkış Paneli
          </h2>
          <button
            onClick={() => setSatisModalAcik(true)}
            className="w-full py-4 bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-800 hover:to-slate-900 text-white font-bold rounded-2xl shadow-lg hover:shadow-xl transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
          >
            <span>+ Perakende Satış</span>
          </button>
          <button
            onClick={handleExcelIndir}
            className="w-full mt-4 py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-bold rounded-2xl shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 transition-all transform hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 group"
          >
            <svg className="w-6 h-6 group-hover:animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            <span>Geçmiş Kayıtları İndir</span>
          </button>
        </div>

        <div className="px-6 pt-4 pb-2">
          <div className="flex bg-slate-100 p-1.5 rounded-2xl border-2 border-slate-200 shadow-inner">
            <button
              onClick={() => {
                setAktifTab("bekleyen")
                setSeciliIslem(null)
                setBekleyenMusteriAra("")
              }}
              className={`flex-1 py-3.5 text-md font-bold rounded-xl transition-all duration-200 ${aktifTab === "bekleyen"
                ? "bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-lg shadow-amber-500/40 ring-2 ring-amber-400/50"
                : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
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
              className={`flex-1 py-3.5 text-md font-bold rounded-xl transition-all duration-200 ${aktifTab === "gecmis"
                ? "bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/40 ring-2 ring-emerald-400/50"
                : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
                }`}
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
              className={`flex-1 py-3.5 text-md font-bold rounded-xl transition-all duration-200 ${aktifTab === "bidonlar"
                ? "bg-gradient-to-r from-violet-500 to-violet-600 text-white shadow-lg shadow-violet-500/40 ring-2 ring-violet-400/50"
                : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
                }`}
            >
              Bidonlar
            </button>
          </div>
        </div>



        {aktifTab === "bekleyen" && (
          <div className="px-6 pt-3 space-y-3">
            <div>
              <label className="block text-sm font-bold text-slate-500 uppercase mb-2">Müşteri numarası ile ara</label>
              <div className="relative">
                <input
                  value={bekleyenMusteriAra}
                  onChange={(e) => {
                    const onlyDigits = e.target.value.replace(/\D/g, "").slice(0, 10)
                    setBekleyenMusteriAra(onlyDigits)
                  }}
                  inputMode="numeric"
                  placeholder="123"
                  className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-2xl text-sm font-bold text-slate-800 focus:outline-none focus:border-emerald-400 transition-all pr-12 shadow-sm hover:shadow-md"
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

        {aktifTab === "gecmis" && (
          <div className="px-6 pt-3 space-y-3">
            <div>
              <label className="block text-sm font-bold text-slate-500 uppercase mb-2">Telefon Numarası ile Ara</label>
              <div className="relative">
                <input
                  value={gecmisTelefonAra}
                  onChange={(e) => {
                    const onlyDigits = e.target.value.replace(/\D/g, "").slice(0, 11)
                    setGecmisTelefonAra(onlyDigits)
                  }}
                  inputMode="numeric"
                  placeholder="05551234567"
                  className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-2xl text-sm font-bold text-slate-800 focus:outline-none focus:border-emerald-400 transition-all pr-12 shadow-sm hover:shadow-md"
                />
                {gecmisTelefonAra && (
                  <button
                    onClick={() => setGecmisTelefonAra("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 font-bold"
                    type="button"
                    aria-label="Temizle"
                  >
                    X
                  </button>
                )}
              </div>
            </div>


          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-transparent to-slate-50/30">
          {aktifTab === "bidonlar" ? null : gosterilecekListe.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-slate-400">
              <p className="text-sm font-medium opacity-60">Kayıt bulunamadı.</p>
            </div>
          ) : (
            gosterilecekListe.map((islem) => (
              <div
                key={islem.id}
                onClick={() => setSeciliIslem(islem)}
                className={`p-4 pr-44 rounded-2xl cursor-pointer border-2 transition-all relative overflow-hidden bg-white/80 backdrop-blur-sm transform hover:scale-[1.01] ${seciliIslem?.id === islem.id
                  ? "border-amber-400 shadow-xl shadow-amber-500/20"
                  : "border-slate-200 hover:border-slate-300 hover:shadow-lg"
                  }`}
              >
                <div className="mb-2">
                  {islem.odeme_tipi === "SATIS" ? (
                    <span className="inline-block px-2.5 py-1 rounded-xl text-[10px] font-bold bg-gradient-to-r from-violet-100 to-violet-200 text-violet-700 border border-violet-300">
                      PERAKENDE SATIŞ
                    </span>
                  ) : (
                    <div className="flex gap-2">
                      {islem.odeme_tipi === "yag" && (
                        <span className="inline-block px-2.5 py-1 rounded-xl border-2 border-blue-300 bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 text-[10px] font-bold">
                          HAK
                        </span>
                      )}
                      {islem.odeme_tipi === "para" && (
                        <span className="inline-block px-2.5 py-1 rounded-xl border-2 border-red-300 bg-gradient-to-r from-red-50 to-red-100 text-red-700 text-[10px] font-bold">
                          PARA
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <p className="font-bold text-2xl text-slate-800">{islem.ad_soyad}</p>
                  <p className="text-2xl font-bold text-slate-700 mt-1">
                    {normalizeTelefon(islem.telefon)}
                  </p>
                </div>

                <div className="flex justify-between items-end mt-3 border-t border-slate-100 pt-2">
                  <span className="text-[18px] font-bold text-slate-600">
                    {new Date(islem.created_at).toLocaleString("tr-TR", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>

                {(islem.musteri_no || islem.odeme_tipi === "SATIS") && (
                  <div className="absolute top-0 right-0 bottom-0 w-44 bg-emerald-600 rounded-r-xl flex items-center justify-center p-2">
                    {islem.odeme_tipi === "SATIS" ? (
                      <p className="text-2xl font-black text-white text-center leading-tight">
                        PERAKENDE
                      </p>
                    ) : (
                      <p className="text-4xl font-black text-white">
                        #{islem.musteri_no}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      <div className={`${aktifTab === "bidonlar" ? "w-3/4" : "w-1/2"} flex flex-col h-full overflow-hidden relative transition-all duration-300`}>
        {mesaj && (
          <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-[9999]">
            <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border-2 border-emerald-400/30 backdrop-blur-sm">
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
              <span className="font-bold text-base">{mesaj}</span>
            </div>
          </div>
        )}

        {(!seciliIslem || aktifTab === "bidonlar") ? (
          aktifTab === "bidonlar" ? (
            <div className="flex-1 p-8 overflow-y-auto">
              <div className="max-w-4xl mx-auto space-y-10 py-4">
                <div className="text-center">
                  <h2 className="text-5xl font-black text-slate-800 mb-3">Bidon İstatistikleri</h2>
                  <p className="text-lg text-slate-500 font-medium">Tüm müşterilerin toplam bidon durumları</p>
                </div>

                <div className="grid grid-cols-3 gap-6">
                  <div className="bg-white p-8 rounded-3xl border-2 border-slate-200 text-center shadow-lg">
                    <div className="text-sm font-black text-slate-400 uppercase tracking-wider mb-3">TOPLAM VERİLEN</div>
                    <div className="text-6xl font-black text-slate-800">{bidonIstatistikleri.toplamVerilen}</div>
                  </div>
                  <div className="bg-emerald-50 p-8 rounded-3xl border-2 border-emerald-200 text-center shadow-lg shadow-emerald-100">
                    <div className="text-sm font-black text-emerald-600 uppercase tracking-wider mb-3">TOPLAM İADE</div>
                    <div className="text-6xl font-black text-emerald-700">{bidonIstatistikleri.toplamIade}</div>
                  </div>
                  <div className="bg-amber-50 p-8 rounded-3xl border-2 border-amber-200 text-center shadow-lg shadow-amber-100">
                    <div className="text-sm font-black text-amber-600 uppercase tracking-wider mb-3">MÜŞTERİLERDE KALAN</div>
                    <div className="text-6xl font-black text-amber-700">{bidonIstatistikleri.toplamKalan}</div>
                  </div>
                </div>

                <button
                  onClick={handleBidonExcelIndir}
                  className="w-full py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-black text-xl rounded-2xl shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 transform hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-3 group"
                >
                  <svg className="w-8 h-8 group-hover:animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                  <span>Kayıtları excel olarak indir</span>
                </button>

                <div className="bg-white/60 backdrop-blur-xl p-10 rounded-3xl border-2 border-slate-200 shadow-xl space-y-8">
                  <h3 className="text-2xl font-black text-slate-700 border-b-2 border-slate-100 pb-4">Müşteri Arama</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-3">
                      <label className="block text-base font-bold text-slate-500 uppercase">İsim Soyisim</label>
                      <input
                        value={bidonAdAra}
                        onChange={(e) => setBidonAdAra(e.target.value)}
                        placeholder="İsim ile ara..."
                        className="w-full px-6 py-5 bg-white border-2 border-slate-200 rounded-2xl text-xl font-bold text-slate-800 focus:outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 transition-all shadow-sm"
                      />
                    </div>
                    <div className="space-y-3">
                      <label className="block text-base font-bold text-slate-500 uppercase">Telefon Numarası</label>
                      <input
                        value={bidonTelAra}
                        onChange={(e) => setBidonTelAra(e.target.value)}
                        placeholder="Telefon ile ara..."
                        className="w-full px-6 py-5 bg-white border-2 border-slate-200 rounded-2xl text-xl font-bold text-slate-800 focus:outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 transition-all shadow-sm"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <h3 className="text-2xl font-black text-slate-700 px-2">Sonuçlar ({bidonListesi.length})</h3>
                  {bidonListesi.length === 0 ? (
                    <div className="text-center py-12 text-xl text-slate-400 font-bold bg-white/40 rounded-3xl border-2 border-dashed border-slate-200">
                      Kayıt bulunamadı.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-5">
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
                          className="bg-white p-8 rounded-2xl border-2 border-slate-200 shadow-sm hover:shadow-lg hover:border-violet-300 cursor-pointer transition-all flex justify-between items-start"
                        >
                          <div className="flex flex-col gap-1">
                            {item.ad_soyad.split(" / ").map((name, i) => (
                               <h4 key={i} className="text-2xl font-black text-slate-800 leading-tight">{name}</h4>
                            ))}
                            <p className="text-lg font-bold text-slate-500 mt-2">{item.telefon}</p>
                          </div>

                          <div className="flex gap-10 text-center self-center">
                            <div>
                              <div className="text-xs font-bold text-slate-400 uppercase mb-1">VERİLEN</div>
                              <div className="text-3xl font-black text-slate-700">{item.verilenToplam}</div>
                            </div>
                            <div>
                              <div className="text-xs font-bold text-emerald-600 uppercase mb-1">İADE</div>
                              <div className="text-3xl font-black text-emerald-700">{item.iadeToplam}</div>
                            </div>
                            <div>
                              <div className="text-xs font-bold text-amber-600 uppercase mb-1">KALAN</div>
                              <div className="text-3xl font-black text-amber-700">{item.kalanToplam}</div>
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
            <div className="flex-1 flex items-center justify-center text-slate-400 font-semibold text-lg">Seçim yapın...</div>
          )
        ) : (
          <div className="flex-1 overflow-y-auto p-8">
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 border-2 border-white/60 flex justify-between items-center shadow-xl">
                <div>
                  <p className="text-sm font-bold text-slate-500 uppercase mb-1 tracking-wider">Müşteri Bilgisi</p>
                  <h3 className="text-3xl font-black text-slate-800">{seciliIslem.ad_soyad}</h3>
                  <p className="text-xl text-slate-600 font-semibold">{normalizeTelefon(seciliIslem.telefon)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-slate-500 uppercase mb-1 tracking-wider">Tarih</p>
                  <h3 className="text-2xl font-bold text-slate-700">
                    {new Date(seciliIslem.created_at).toLocaleDateString("tr-TR")}
                  </h3>
                  <p className="text-base font-bold text-slate-400">
                    {new Date(seciliIslem.created_at).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>

              {seciliIslem.odeme_tipi === "SATIS" ? (
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-white/80 backdrop-blur-sm p-5 rounded-2xl border-2 border-slate-200 text-center shadow-lg">
                    <p className="text-xs font-bold text-slate-400 uppercase">SATILAN</p>
                    <p className="text-3xl font-black text-slate-800">{seciliIslem.cikan_yag} KG</p>
                  </div>
                  <div className="bg-white/80 backdrop-blur-sm p-5 rounded-2xl border-2 border-slate-200 text-center shadow-lg">
                    <p className="text-xs font-bold text-slate-400 uppercase">BİRİM FİYAT</p>
                    <p className="text-3xl font-black text-slate-800">{seciliIslem.yag_fiyati} ₺</p>
                  </div>
                  <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 p-5 rounded-2xl border-2 border-emerald-300 text-center shadow-lg">
                    <p className="text-xs font-bold text-emerald-600 uppercase">TOPLAM TUTAR</p>
                    <p className="text-3xl font-black text-emerald-700">{seciliIslem.firma_hakki_tl} ₺</p>
                  </div>
                </div>
              ) : yeniSistemMi(seciliIslem) ? (
                <>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="flex items-center justify-center min-h-[3.5rem] text-lg font-bold text-slate-700 mb-1 text-center leading-tight">Yağ ile Ödeme Bedeli (₺)</label>
                        <div className="bg-white/80 border-slate-200 backdrop-blur-sm p-4 rounded-2xl border-2 shadow-lg text-center">
                          <div className="text-4xl font-black text-slate-800">{seciliIslem.yag_ile_odeme}</div>
                        </div>
                      </div>
                      <div>
                        <label className="flex items-center justify-center min-h-[3.5rem] text-lg font-bold text-slate-700 mb-1 text-center leading-tight">Bidon Ücreti (₺)</label>
                        <div className="bg-white/80 border-slate-200 backdrop-blur-sm p-4 rounded-2xl border-2 shadow-lg text-center">
                          <div className="text-4xl font-black text-slate-800">{seciliIslem.bidon_ucreti}</div>
                        </div>
                      </div>
                      <div>
                        <label className="flex items-center justify-center min-h-[3.5rem] text-lg font-bold text-slate-700 mb-1 text-center leading-tight">Sıkım Bedeli (₺)</label>
                        <div className="bg-white/80 border-slate-200 backdrop-blur-sm p-4 rounded-2xl border-2 shadow-lg text-center">
                          <div className="text-4xl font-black text-slate-800">{seciliIslem.sikim_bedeli}</div>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="flex items-center justify-center min-h-[3.5rem] text-lg font-bold text-slate-700 mb-1 text-center leading-tight">Gelen Zeytin (KG)</label>
                        <div className="bg-white/80 border-slate-200 backdrop-blur-sm p-4 rounded-2xl border-2 shadow-lg text-center">
                          <div className="text-4xl font-black text-slate-800">{seciliIslem.zeytin_kg}</div>
                        </div>
                      </div>
                      <div>
                        <label className="flex items-center justify-center min-h-[3.5rem] text-lg font-bold text-slate-700 mb-1 text-center leading-tight">Sıkma Ücreti (₺)</label>
                        <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-300 backdrop-blur-sm p-4 rounded-2xl border-2 shadow-lg text-center">
                          <div className="text-4xl font-black text-blue-900">{yuvarla(yeniDetay.sikmaUcretiTL)}</div>
                        </div>
                      </div>
                      <div>
                        <label className="flex items-center justify-center min-h-[3.5rem] text-lg font-bold text-slate-700 mb-1 text-center leading-tight">Sıkma Ücreti (Yağ KG)</label>
                        <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-300 backdrop-blur-sm p-4 rounded-2xl border-2 shadow-lg text-center">
                          <div className="text-4xl font-black text-blue-900">{yuvarla(yeniDetay.sikmaUcretiYag)}</div>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="flex items-center justify-center min-h-[3.5rem] text-lg font-bold text-slate-700 mb-1 text-center leading-tight">Kantarda Gözüken Yağ (KG)</label>
                        <div className="bg-white/80 border-slate-200 backdrop-blur-sm p-4 rounded-2xl border-2 shadow-lg text-center">
                          <div className="text-4xl font-black text-slate-800">{seciliIslem.cikan_yag}</div>
                        </div>
                      </div>
                      <div>
                        <label className="flex items-center justify-center min-h-[3.5rem] text-lg font-bold text-slate-700 mb-1 text-center leading-tight">Kantardaki Bidon</label>
                        <div className="bg-white/80 border-slate-200 backdrop-blur-sm p-4 rounded-2xl border-2 shadow-lg text-center">
                          <div className="text-4xl font-black text-slate-800">{seciliIslem.kantar_bidon ?? "—"}</div>
                        </div>
                      </div>
                      <div>
                        <label className="flex items-center justify-center min-h-[3.5rem] text-lg font-bold text-slate-700 mb-1 text-center leading-tight">Net Yağ (KG)</label>
                        <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-300 backdrop-blur-sm p-4 rounded-2xl border-2 shadow-lg text-center">
                          <div className="text-4xl font-black text-blue-900">{yuvarla(yeniDetay.netYag)}</div>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="flex items-center justify-center min-h-[3.5rem] text-lg font-bold text-slate-700 mb-1 text-center leading-tight">Bidon Bedeli (₺)</label>
                        <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-300 backdrop-blur-sm p-4 rounded-2xl border-2 shadow-lg text-center">
                          <div className="text-4xl font-black text-blue-900">{yuvarla(yeniDetay.bidonBedeliTL)}</div>
                        </div>
                      </div>
                      <div>
                        <label className="flex items-center justify-center min-h-[3.5rem] text-lg font-bold text-slate-700 mb-1 text-center leading-tight">Bidon Bedeli (Yağ KG)</label>
                        <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-300 backdrop-blur-sm p-4 rounded-2xl border-2 shadow-lg text-center">
                          <div className="text-4xl font-black text-blue-900">{yuvarla(yeniDetay.bidonBedeliYag)}</div>
                        </div>
                      </div>
                    </div>
                  <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="flex items-center justify-center min-h-[3.5rem] text-lg font-bold text-slate-700 mb-1 text-center leading-tight">Oran</label>
                        <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-300 backdrop-blur-sm p-4 rounded-2xl border-2 shadow-lg text-center">
                          <div className="text-4xl font-black text-blue-900">{yeniDetay.oran}</div>
                        </div>
                      </div>
                      <div>
                        <label className="flex items-center justify-center min-h-[3.5rem] text-lg font-bold text-slate-700 mb-1 text-center leading-tight">Toplam Sıkım Bedeli (₺)</label>
                        <div className={`relative p-4 rounded-2xl border-2 shadow-lg text-center ${seciliIslem.odeme_tipi === "para" ? "border-red-500 bg-gradient-to-br from-red-50 to-red-100/50" : "border-slate-200 bg-white/60 opacity-30"}`}>
                          <span className={`absolute top-2 right-2 w-5 h-5 rounded-full border-2 flex items-center justify-center ${seciliIslem.odeme_tipi === "para" ? "border-red-600" : "border-slate-400"}`}>
                            {seciliIslem.odeme_tipi === "para" && <span className="w-2.5 h-2.5 rounded-full bg-red-600" />}
                          </span>
                          <div className="text-4xl font-black text-red-700">{yuvarla(yeniDetay.toplamTL)}</div>
                        </div>
                      </div>
                      <div>
                        <label className="flex items-center justify-center min-h-[3.5rem] text-lg font-bold text-slate-700 mb-1 text-center leading-tight">Toplam Sıkım Bedeli (Yağ KG)</label>
                        <div className={`relative p-4 rounded-2xl border-2 shadow-lg text-center ${seciliIslem.odeme_tipi === "yag" ? "border-blue-500 bg-gradient-to-br from-blue-50 to-blue-100/50" : "border-slate-200 bg-white/60 opacity-30"}`}>
                          <span className={`absolute top-2 right-2 w-5 h-5 rounded-full border-2 flex items-center justify-center ${seciliIslem.odeme_tipi === "yag" ? "border-blue-600" : "border-slate-400"}`}>
                            {seciliIslem.odeme_tipi === "yag" && <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />}
                          </span>
                          <div className="text-4xl font-black text-blue-700">{yuvarla(yeniDetay.toplamYag)}</div>
                        </div>
                      </div>
                  </div>

                  <div className="p-8 bg-gradient-to-br from-white to-slate-50 border-2 border-slate-200 rounded-3xl shadow-2xl backdrop-blur-sm">
                    <div className="grid grid-cols-2 gap-6 text-center divide-x-2 divide-slate-100">
                      <div className="flex flex-col justify-center">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">KALAN YAĞ</p>
                        <div className="flex items-baseline justify-center gap-1">
                          <p className="text-5xl font-black text-slate-800">{hazir?.kalanYag}</p>
                          <p className="text-sm font-bold text-slate-400">KG</p>
                        </div>
                      </div>
                      <div className="flex flex-col justify-center">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">VERİLEN TOPLAM BİDON</p>
                        <div className="flex items-baseline justify-center">
                          <span className="text-5xl font-black text-slate-800">{bidonOzetAyniTelefon?.genelToplam ?? 0}</span>
                          <span className="text-sm font-bold text-slate-400 ml-1.5">ADET</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-lg font-bold text-slate-700 mb-1 text-center">Gelen Zeytin (KG)</label>
                      <div className="bg-white/80 backdrop-blur-sm p-4 rounded-2xl border-2 border-slate-200 shadow-lg text-center">
                        <div className="text-4xl font-black text-slate-800">{seciliIslem.zeytin_kg}</div>
                      </div>
                    </div>
                    <div>
                      <label className="block text-lg font-bold text-slate-700 mb-1 text-center">Çıkan Yağ (KG)</label>
                      <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 p-4 rounded-2xl border-2 border-amber-300 shadow-lg text-center">
                        <div className="text-4xl font-black text-amber-900">{seciliIslem.cikan_yag}</div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-lg font-bold text-slate-700 mb-1 text-center">Kantardaki Bidon Sayısı</label>
                      <div className="bg-white/80 backdrop-blur-sm p-4 rounded-2xl border-2 border-slate-200 shadow-lg text-center">
                        <div className="text-4xl font-black text-slate-800">{seciliIslem.kantar_bidon ?? "—"}</div>
                      </div>
                    </div>
                    <div>
                      <label className="block text-lg font-bold text-slate-700 mb-1 text-center">Net Yağ (KG)</label>
                      <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 p-4 rounded-2xl border-2 border-blue-300 shadow-lg text-center">
                        <div className="text-4xl font-black text-blue-900">{hesapDetay.netYag}</div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-lg font-bold text-slate-700 mb-1 text-center">Hak Oranı</label>
                      <div className="bg-white/80 backdrop-blur-sm p-4 rounded-2xl border-2 border-slate-200 shadow-lg text-center">
                        <div className="text-4xl font-black text-slate-800">%{seciliIslem.hak_oran}</div>
                      </div>
                    </div>
                    <div>
                      <label className="block text-lg font-bold text-slate-700 mb-1 text-center">Yağ Fiyatı (₺)</label>
                      <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 p-4 rounded-2xl border-2 border-emerald-300 shadow-lg text-center">
                        <div className="text-4xl font-black text-emerald-800">{seciliIslem.yag_fiyati}</div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div
                      className={`p-6 rounded-2xl border-2 transition-all text-center transform ${seciliIslem.odeme_tipi === "yag"
                        ? "border-blue-500 bg-gradient-to-br from-blue-50 to-blue-100/50 shadow-xl shadow-blue-500/20"
                        : "border-slate-200 bg-white/60 opacity-30"
                        }`}
                    >
                      <p className="text-sm font-bold uppercase tracking-wide text-slate-600 mb-2">
                        HAK
                        {seciliIslem.odeme_tipi === "yag" && <span className="ml-2 text-blue-600">(SEÇİLEN)</span>}
                      </p>
                      <div className="flex items-baseline justify-center gap-2">
                        <span className="text-5xl font-black text-slate-800">
                          {hesapDetay.hakKGround}
                        </span>
                        <span className="text-base font-bold text-slate-500">
                          KG Kesilir
                        </span>
                      </div>
                    </div>

                    <div
                      className={`p-6 rounded-2xl border-2 transition-all text-center transform ${seciliIslem.odeme_tipi === "para"
                        ? "border-red-500 bg-gradient-to-br from-red-50 to-red-100/50 shadow-xl shadow-red-500/20"
                        : "border-slate-200 bg-white/60 opacity-30"
                        }`}
                    >
                      <p className="text-sm font-bold uppercase tracking-wide text-slate-600 mb-2">
                        PARA
                        {seciliIslem.odeme_tipi === "para" && <span className="ml-2 text-red-600">(SEÇİLEN)</span>}
                      </p>
                      <div className="flex items-baseline justify-center gap-2">
                        <span className="text-5xl font-black text-red-700">
                          {hesapDetay.paraTL}
                        </span>
                        <span className="text-base font-bold text-red-600">
                          ₺ Ödenir
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="p-8 bg-gradient-to-br from-white to-slate-50 border-2 border-slate-200 rounded-3xl shadow-2xl backdrop-blur-sm">
                    <div className="grid grid-cols-3 gap-6 text-center divide-x-2 divide-slate-100">

                      <div className="flex flex-col justify-center">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">KALAN YAĞ</p>
                        <div className="flex items-baseline justify-center gap-1">
                          <p className="text-5xl font-black text-slate-800">{hazir?.kalanYag}</p>
                          <p className="text-sm font-bold text-slate-400">KG</p>
                        </div>
                      </div>

                      <div className="flex flex-col justify-center bg-gradient-to-br from-orange-50 to-orange-100/50 rounded-2xl -my-4 py-6 shadow-inner">
                        <p className="text-xs font-bold text-orange-500 uppercase tracking-wider mb-2">ORAN</p>
                        <p className="text-5xl font-black text-orange-600">{hazir?.randiman}</p>
                      </div>

                      <div className="flex flex-col justify-center">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                          VERİLEN TOPLAM BİDON
                        </p>
                        <div className="flex items-baseline justify-center">
                          <span className="text-5xl font-black text-slate-800">
                            {bidonOzetAyniTelefon?.genelToplam ?? 0}
                          </span>
                          <span className="text-sm font-bold text-slate-400 ml-1.5">ADET</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}

              <div className="space-y-2">
                <div className="flex items-end justify-between gap-3">
                  <label className="block text-md font-bold text-slate-700">
                    Müşteriye Verilen Bidon Numaraları
                  </label>

                  {seciliIslem.status === 2 && (
                    <div className="flex items-center gap-2">
                      {!isEditing ? (
                        <button
                          type="button"
                          onClick={() => {
                            setBidonEdit(seciliIslem.bidon_no || "")
                            setIsEditing(true)
                          }}
                          className="px-4 py-2 rounded-xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 border border-emerald-700 transition-colors shadow-md"
                        >
                          Düzenle
                        </button>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => setIsEditing(false)}
                            className="px-3 py-2 rounded-xl text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 border border-rose-700 transition-colors shadow-md"
                          >
                            Vazgeç
                          </button>

                          <button
                            type="button"
                            onClick={handleBidonDuzenleKaydet}
                            className={`px-4 py-2 rounded-xl text-sm font-black border-2 transition-all
                            bg-emerald-600 text-white border-emerald-700 hover:bg-emerald-700 shadow-md
                            ${bidonSaving ? "opacity-80 cursor-not-allowed" : ""}
                          `}
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
                    className="w-full px-5 py-4 bg-white/80 backdrop-blur-sm border-2 border-emerald-400 ring-4 ring-emerald-50 rounded-2xl text-lg font-bold text-slate-800 text-center tracking-wider shadow-lg resize-none overflow-hidden"
                    placeholder="1234-5678"
                  />
                ) : (
                  <div className="w-full px-5 py-4 bg-white/80 backdrop-blur-sm border-2 border-slate-200 rounded-2xl text-lg font-bold text-slate-800 text-center tracking-wider shadow-lg">
                    {seciliIslem.bidon_no || "---"}
                  </div>
                )}

                {seciliIslem.status !== 3 && (
                  <div className="text-center">
                    <span className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl border-2 border-slate-200 bg-slate-50 text-slate-700 font-black">
                      Verilen Bidon Sayısı:{" "}
                      <span className="text-emerald-700">
                        {isEditing ? parseBidonList(bidonEdit).length : seciliVerilenBidonlar.length}
                      </span>
                    </span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-end justify-between gap-3">
                  <label className="block text-md font-bold text-slate-700">Not</label>
                  {notEdit !== (seciliIslem.notlar || "") && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setNotEdit(seciliIslem.notlar || "")}
                        className="px-3 py-2 rounded-xl text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 border border-rose-700 transition-colors shadow-md"
                      >
                        Vazgeç
                      </button>
                      <button
                        type="button"
                        onClick={handleNotKaydet}
                        disabled={notSaving}
                        className={`px-4 py-2 rounded-xl text-sm font-black border-2 transition-all bg-emerald-600 text-white border-emerald-700 hover:bg-emerald-700 shadow-md ${notSaving ? "opacity-80 cursor-not-allowed" : ""}`}
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
                  placeholder="Bu kayıt için not ekleyin..."
                  className="w-full px-5 py-4 bg-white/80 backdrop-blur-sm border-2 border-slate-200 focus:border-emerald-400 focus:outline-none rounded-2xl text-lg font-semibold text-slate-800 shadow-lg resize-none"
                />
              </div>


              {seciliIslem.status !== 3 ? (
                <button
                  onClick={handleCikisYap}
                  disabled={isEditing}
                  className={`w-full py-4 font-bold rounded-2xl transition-all shadow-lg flex items-center justify-center gap-3 text-lg ${isEditing
                    ? "bg-slate-300 text-slate-500 cursor-not-allowed"
                    : "bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-emerald-500/30 hover:shadow-emerald-500/50 transform hover:scale-[1.02] active:scale-[0.98]"
                    }`}
                >
                  <span>{isEditing ? "Önce Bidon Düzenlemeyi Kaydet" : "İşlemi Onayla ve Çıkış Yap"}</span>
                </button>
              ) : (
                <div className="w-full py-4 bg-slate-100 text-slate-400 font-bold rounded-2xl text-center border-2 border-slate-200">
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