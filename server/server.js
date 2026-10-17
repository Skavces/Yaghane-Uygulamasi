const express = require("express")
const http = require("http")
const { Server } = require("socket.io")
const sqlite3 = require("sqlite3").verbose()
const cors = require("cors")
const path = require("path")
const fs = require("fs")
const os = require("os")

const app = express()
const server = http.createServer(app)

app.use(cors({ origin: true, credentials: true }))
app.use(express.json())

const DB_YOLU = process.env.DB_YOLU || path.join(__dirname, "takip.db")
const PORT = Number(process.env.PORT) || 3001

function dbAc() {
  const yeni = new sqlite3.Database(DB_YOLU, (err) => {
    if (err) console.error(err.message)
    else console.log("SQLite veritabanına bağlanıldı.")
  })
  yeni.serialize(() => {
    yeni.run("PRAGMA journal_mode = WAL;")
    yeni.run("PRAGMA busy_timeout = 5000;")
  })
  return yeni
}

// Geri yüklemede bağlantı yeniden açılır; handler'lar db'yi çağrı anında okur.
let db = dbAc()

let geriYukleniyor = false
app.use("/api", (req, res, next) => {
  if (geriYukleniyor) return res.status(503).json({ msg: "Yedek geri yükleniyor, birkaç saniye sonra tekrar deneyin." })
  next()
})

function getTurkeyTimestamp() {
  const now = new Date()
  const turkeyTime = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Istanbul" }))

  const year = turkeyTime.getFullYear()
  const month = String(turkeyTime.getMonth() + 1).padStart(2, "0")
  const day = String(turkeyTime.getDate()).padStart(2, "0")
  const hours = String(turkeyTime.getHours()).padStart(2, "0")
  const minutes = String(turkeyTime.getMinutes()).padStart(2, "0")
  const seconds = String(turkeyTime.getSeconds()).padStart(2, "0")

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}

function normalizeTelefonTR(input) {
  const digits = String(input || "").replace(/\D/g, "")
  if (!digits) return ""
  const with0 = digits[0] === "0" ? digits : "0" + digits
  return with0.slice(0, 11)
}

function parseBidonList(str) {
  const s = String(str || "").trim()
  if (!s) return []
  const parts = s
    .replace(/[,\s]+/g, "-")
    .split("-")
    .map((x) => x.trim())
    .filter(Boolean)
  return parts
}

function formatBidonList(arr) {
  const a = (arr || []).map((x) => String(x).trim()).filter(Boolean)
  return a.join("-")
}

const semaHazirla = () => db.serialize(() => {
  db.run(
    `CREATE TABLE IF NOT EXISTS islemler (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      musteri_no TEXT,
      ad_soyad TEXT,
      telefon TEXT,

      zeytin_kg REAL DEFAULT 0,
      cikan_yag REAL DEFAULT 0,
      hak_oran REAL DEFAULT 0,
      yag_fiyati REAL DEFAULT 0,
      firma_hakki REAL DEFAULT 0,
      firma_hakki_tl REAL DEFAULT 0,
      odeme_tipi TEXT DEFAULT 'yag',

      bidon_no TEXT,
      iade_bidonlar TEXT DEFAULT '',
      notlar TEXT,

      status INTEGER DEFAULT 1,
      created_at TEXT,
      finished_at TEXT
    )`,
    (err) => {
      if (err) console.error("Tablo oluşturma hatası:", err.message)
    }
  )

  db.run(`ALTER TABLE settings ADD COLUMN yedek_klasoru TEXT DEFAULT ''`, (err) => {
    if (err && !String(err.message || "").toLowerCase().includes("duplicate")) {
      console.error("settings.yedek_klasoru kolon ekleme hatası:", err.message)
    }
  })

  db.run(`ALTER TABLE islemler ADD COLUMN iade_bidonlar TEXT DEFAULT ''`, (err) => {
    if (err) {
      if (!String(err.message || "").toLowerCase().includes("duplicate")) {
        console.error("iade_bidonlar kolon ekleme hatası:", err.message)
      }
    }
  })

  db.run(`ALTER TABLE islemler ADD COLUMN odeme_tipi TEXT DEFAULT 'yag'`, (err) => {
    if (err) {
      if (!String(err.message || "").toLowerCase().includes("duplicate")) {
        console.error("odeme_tipi kolon ekleme hatası:", err.message)
      }
    }
  })

  db.run(`ALTER TABLE islemler ADD COLUMN giris_durum TEXT DEFAULT 'sikilacak'`, (err) => {
    if (err) {
      if (!String(err.message || "").toLowerCase().includes("duplicate")) {
        console.error("giris_durum kolon ekleme hatası:", err.message)
      }
    }
  })

  db.run(`ALTER TABLE islemler ADD COLUMN yag_ile_odeme REAL`, (err) => {
    if (err) {
      if (!String(err.message || "").toLowerCase().includes("duplicate")) {
        console.error("yag_ile_odeme kolon ekleme hatası:", err.message)
      }
    }
  })

  db.run(`ALTER TABLE islemler ADD COLUMN bidon_ucreti REAL`, (err) => {
    if (err) {
      if (!String(err.message || "").toLowerCase().includes("duplicate")) {
        console.error("bidon_ucreti kolon ekleme hatası:", err.message)
      }
    }
  })

  db.run(`ALTER TABLE islemler ADD COLUMN sikim_bedeli REAL`, (err) => {
    if (err) {
      if (!String(err.message || "").toLowerCase().includes("duplicate")) {
        console.error("sikim_bedeli kolon ekleme hatası:", err.message)
      }
    }
  })

  db.run(`ALTER TABLE islemler ADD COLUMN kantar_bidon INTEGER DEFAULT 0`, (err) => {
    if (err) {
      if (!String(err.message || "").toLowerCase().includes("duplicate")) {
        console.error("kantar_bidon kolon ekleme hatası:", err.message)
      }
    }
  })

  db.run(
    `
    CREATE UNIQUE INDEX IF NOT EXISTS uniq_active_musteri_no
    ON islemler(musteri_no)
    WHERE status != 3
  `,
    (err) => {
      if (err) {
        console.error("UNIQUE index oluşturma hatası:", err.message)
        console.error("Muhtemelen DB'de aynı musteri_no için status!=3 birden fazla kayıt var.")
      }
    }
  )

  db.run(
    `CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      yag_fiyati REAL DEFAULT 300,
      hak_oran REAL DEFAULT 8,
      yag_ile_odeme REAL DEFAULT 230,
      bidon_ucreti REAL DEFAULT 400,
      sikim_bedeli REAL DEFAULT 5
    )`,
    (err) => {
      if (err) console.error("Settings tablosu oluşturma hatası:", err.message)
      else {
         db.get("SELECT count(*) as count FROM settings", [], (err, row) => {
            if(err) return;
            if(row && row.count === 0) {
              db.run("INSERT INTO settings (yag_fiyati, hak_oran) VALUES (300, 8)")
            }
         })
      }
    }
  )

  ;[
    ["yag_ile_odeme", 230],
    ["bidon_ucreti", 400],
    ["sikim_bedeli", 5],
  ].forEach(([kolon, varsayilan]) => {
    db.run(`ALTER TABLE settings ADD COLUMN ${kolon} REAL DEFAULT ${varsayilan}`, (err) => {
      if (err && !String(err.message || "").toLowerCase().includes("duplicate")) {
        console.error(`settings.${kolon} kolon ekleme hatası:`, err.message)
      }
    })
  })

  db.run(`ALTER TABLE islemler ADD COLUMN iade_bidonlar TEXT DEFAULT ''`, (err) => {
    if (err) {
      if (!String(err.message || "").toLowerCase().includes("duplicate")) {
        console.error("iade_bidonlar kolon ekleme hatası:", err.message)
      }
    }
  })

  db.run(
    `
    CREATE UNIQUE INDEX IF NOT EXISTS uniq_active_musteri_no
    ON islemler(musteri_no)
    WHERE status != 3
  `,
    (err) => {
      if (err) {
        console.error("UNIQUE index oluşturma hatası:", err.message)
        console.error("Muhtemelen DB'de aynı musteri_no için status!=3 birden fazla kayıt var.")
      }
    }
  )
})

semaHazirla()

const io = new Server(server, { cors: { origin: true, credentials: true } })

app.get("/api/settings", (req, res) => {
  db.get("SELECT * FROM settings LIMIT 1", [], (err, row) => {
    if (err) return res.status(500).json(err)
    if (!row) return res.json({ yag_fiyati: 300, yag_ile_odeme: 230, bidon_ucreti: 400, sikim_bedeli: 5 })
    res.json(row)
  })
})

app.put("/api/settings", (req, res) => {
  const { yag_fiyati } = req.body
  // Yeni alanlar gönderilmezse (eski istemci) mevcut değer korunur.
  const yagIleOdeme = req.body.yag_ile_odeme ?? null
  const bidonUcreti = req.body.bidon_ucreti ?? null
  const sikimBedeli = req.body.sikim_bedeli ?? null

  const yayinla = (mesaj) => {
    db.get("SELECT * FROM settings LIMIT 1", [], (errSel, guncel) => {
      if (!errSel && guncel) io.emit("settings-updated", guncel)
      res.json({ msg: mesaj })
    })
  }

  db.get("SELECT id FROM settings LIMIT 1", [], (err, row) => {
    if (err) return res.status(500).json(err)

    if (row) {
       db.run(
         `UPDATE settings SET
            yag_fiyati=?,
            yag_ile_odeme=COALESCE(?, yag_ile_odeme),
            bidon_ucreti=COALESCE(?, bidon_ucreti),
            sikim_bedeli=COALESCE(?, sikim_bedeli)
          WHERE id=?`,
         [yag_fiyati, yagIleOdeme, bidonUcreti, sikimBedeli, row.id],
         (err2) => {
           if (err2) return res.status(500).json(err2)
           yayinla("Ayarlar güncellendi")
         }
       )
    } else {
       db.run(
         `INSERT INTO settings (yag_fiyati, yag_ile_odeme, bidon_ucreti, sikim_bedeli)
          VALUES (?, COALESCE(?, 230), COALESCE(?, 400), COALESCE(?, 5))`,
         [yag_fiyati, yagIleOdeme, bidonUcreti, sikimBedeli],
         function(err2) {
           if (err2) return res.status(500).json(err2)
           yayinla("Ayarlar oluşturuldu")
         }
       )
    }
  })
})

app.get("/api/giris-bekleyenler", (req, res) => {
  db.all("SELECT * FROM islemler WHERE status != 3 ORDER BY id DESC", [], (err, rows) => {
    if (err) return res.status(500).json(err)
    res.json(rows)
  })
})

app.get("/api/liste", (req, res) => {
  db.all("SELECT * FROM islemler ORDER BY id DESC", [], (err, rows) => {
    if (err) res.status(500).json(err)
    else res.json(rows)
  })
})

app.get("/api/musteri-bul/:no", (req, res) => {
  db.get(
    "SELECT * FROM islemler WHERE musteri_no = ? AND status = 1",
    [req.params.no],
    (err, row) => {
      if (err) res.status(500).json(err)
      else if (!row) res.status(404).json({ msg: "Bulunamadı" })
      else res.json(row)
    }
  )
})

app.get("/api/yag-bekleyenler", (req, res) => {
  db.all(
    "SELECT * FROM islemler WHERE status = 1 ORDER BY created_at ASC, id ASC",
    [],
    (err, rows) => {
      if (err) return res.status(500).json(err)
      res.json(rows)
    }
  )
})

app.post("/api/giris", (req, res) => {
  const { musteri_no, ad_soyad, telefon, giris_durum, odeme_tipi } = req.body
  const turkeyTime = getTurkeyTimestamp()

  if (!musteri_no || !ad_soyad) {
    return res.status(400).json({ msg: "Eksik bilgi" })
  }

  const status = 0
  const tel = normalizeTelefonTR(telefon)
  const odeme = odeme_tipi || "yag"
  const durum = giris_durum || "sikilacak"

  db.run(
    "INSERT INTO islemler (musteri_no, ad_soyad, telefon, status, created_at, odeme_tipi, giris_durum) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [musteri_no, ad_soyad, tel || "", status, turkeyTime, odeme, durum],
    function (err) {
      if (err) {
        if (err.message && err.message.includes("UNIQUE")) {
          return res.status(409).json({
            msg: "Bu müşteri numarası zaten kullanımda (çıkış yapılmamış).",
          })
        }
        return res.status(500).json(err)
      }

      io.emit("veri-guncellendi")
      res.json({ id: this.lastID })
    }
  )
})

// Kayıt düzenle
app.put("/api/giris-duzenle/:id", (req, res) => {
  const id = req.params.id
  const { musteri_no, ad_soyad, telefon, odeme_tipi, giris_durum } = req.body
  if (!musteri_no || !ad_soyad) {
    return res.status(400).json({ msg: "Eksik bilgi" })
  }
  const tel = normalizeTelefonTR(telefon)
  db.run(
    "UPDATE islemler SET musteri_no=?, ad_soyad=?, telefon=?, odeme_tipi=?, giris_durum=? WHERE id=?",
    [musteri_no, ad_soyad, tel || "", odeme_tipi || "yag", giris_durum || "sikilacak", id],
    function (err) {
      if (err) {
        if (err.message && err.message.includes("UNIQUE")) {
          return res.status(409).json({ msg: "Bu müşteri numarası zaten kullanımda." })
        }
        return res.status(500).json(err)
      }
      if (this.changes === 0) return res.status(404).json({ msg: "Kayıt bulunamadı." })
      io.emit("veri-guncellendi")
      res.json({ msg: "Kayıt güncellendi." })
    }
  )
})

// Bekleyecek → Sıra Bekliyor (giris_durum=sikilacak, status=0 kalır)
app.put("/api/giris-siraya-al/:id", (req, res) => {
  const id = req.params.id
  db.run(
    "UPDATE islemler SET giris_durum='sikilacak' WHERE id=? AND status=0 AND giris_durum='bekleyecek'",
    [id],
    function (err) {
      if (err) return res.status(500).json(err)
      if (this.changes === 0) return res.status(400).json({ msg: "Kayıt bekleyecek durumda değil." })
      io.emit("veri-guncellendi")
      res.json({ msg: "Sıraya alındı." })
    }
  )
})

// Sıra Bekliyor → Bekleyecek (geri al)
app.put("/api/giris-geri-bekleyecek/:id", (req, res) => {
  const id = req.params.id
  db.run(
    "UPDATE islemler SET giris_durum='bekleyecek' WHERE id=? AND status=0 AND giris_durum='sikilacak'",
    [id],
    function (err) {
      if (err) return res.status(500).json(err)
      if (this.changes === 0) return res.status(400).json({ msg: "Kayıt sıra bekliyor durumunda değil." })
      io.emit("veri-guncellendi")
      res.json({ msg: "Bekleyecek durumuna alındı." })
    }
  )
})

// Yağcıda → Sıra Bekliyor (geri al)
app.put("/api/giris-geri-sikilacak/:id", (req, res) => {
  const id = req.params.id
  db.run(
    "UPDATE islemler SET status=0 WHERE id=? AND status=1",
    [id],
    function (err) {
      if (err) return res.status(500).json(err)
      if (this.changes === 0) return res.status(400).json({ msg: "Kayıt yağcıda durumunda değil." })
      io.emit("veri-guncellendi")
      res.json({ msg: "Sıra bekliyor durumuna alındı." })
    }
  )
})

// Sıra Bekliyor → Yağcı Paneli (status=1)
app.put("/api/giris-sikilacak/:id", (req, res) => {
  const id = req.params.id
  db.run(
    "UPDATE islemler SET status=1 WHERE id=? AND status=0 AND giris_durum='sikilacak'",
    [id],
    function (err) {
      if (err) return res.status(500).json(err)
      if (this.changes === 0) return res.status(400).json({ msg: "Kayıt sıra bekliyor durumunda değil." })
      io.emit("veri-guncellendi")
      res.json({ msg: "Yağcıya gönderildi." })
    }
  )
})

app.put("/api/yag-islem/:id", (req, res) => {
  const {
    zeytin_kg,
    cikan_yag,
    hak_oran,
    yag_fiyati,
    firma_hakki,
    firma_hakki_tl,
    odeme_tipi,
    bidon_no,
    notlar,
    kantar_bidon,
    yag_ile_odeme,
    bidon_ucreti,
    sikim_bedeli,
  } = req.body

  const id = req.params.id

  const sql = `UPDATE islemler SET
               zeytin_kg=?,
               cikan_yag=?,
               hak_oran=?,
               yag_fiyati=?,
               firma_hakki=?,
               firma_hakki_tl=?,
               odeme_tipi=?,
               bidon_no=?,
               notlar=?,
               kantar_bidon=?,
               yag_ile_odeme=?,
               bidon_ucreti=?,
               sikim_bedeli=?,
               status=2
               WHERE id=?`

  db.run(
    sql,
    [
      zeytin_kg,
      cikan_yag,
      hak_oran ?? 0,
      yag_fiyati,
      firma_hakki,
      firma_hakki_tl,
      odeme_tipi,
      bidon_no,
      notlar,
      kantar_bidon || 0,
      yag_ile_odeme ?? null,
      bidon_ucreti ?? null,
      sikim_bedeli ?? null,
      id,
    ],
    function (err) {
      if (err) return res.status(500).json(err)
      io.emit("veri-guncellendi")
      res.json({ msg: "Üretim verileri girildi" })
    }
  )
})

app.post("/api/yag-satisi", (req, res) => {
  const { ad_soyad, telefon, satilan_kg, birim_fiyat, bidon_no, notlar } = req.body
  const turkeyTime = getTurkeyTimestamp()
  const toplam_tutar = (parseFloat(satilan_kg) * parseFloat(birim_fiyat)).toFixed(2)
  const sql = `INSERT INTO islemler (
    musteri_no, ad_soyad, telefon,
    zeytin_kg, cikan_yag, hak_oran, yag_fiyati,
    firma_hakki, firma_hakki_tl, odeme_tipi,
    bidon_no, iade_bidonlar, notlar, status, created_at, finished_at
  ) VALUES (?, ?, ?, 0, ?, 0, ?, 0, ?, 'SATIS', ?, '', ?, 3, ?, ?)`

  const params = [
    "PERAKENDE",
    ad_soyad || "",
    normalizeTelefonTR(telefon) || "",
    satilan_kg,
    birim_fiyat,
    toplam_tutar,
    bidon_no || "",
    notlar || "",
    turkeyTime,
    turkeyTime,
  ]

  db.run(sql, params, function (err) {
    if (err) return res.status(500).json(err)
    io.emit("veri-guncellendi")
    res.json({ msg: "Satış kaydedildi" })
  })
})

app.put("/api/bidon-iade/:id", (req, res) => {
  const id = req.params.id
  const { iade_bidonlar } = req.body

  db.get("SELECT id, status, bidon_no, iade_bidonlar FROM islemler WHERE id = ?", [id], (err, row) => {
    if (err) return res.status(500).json(err)
    if (!row) return res.status(404).json({ msg: "Kayıt bulunamadı" })
    if (row.status !== 3) return res.status(400).json({ msg: "Sadece geçmiş kayıtlarda iade güncellenebilir" })

    const gelen = parseBidonList(iade_bidonlar)
    const temiz = gelen
    const out = formatBidonList(temiz)

    db.run("UPDATE islemler SET iade_bidonlar = ? WHERE id = ?", [out, id], function (err2) {
      if (err2) return res.status(500).json(err2)
      io.emit("veri-guncellendi")
      res.json({ msg: "Bidon iadesi kaydedildi", iade_bidonlar: out })
    })
  })
})

app.put("/api/cikis/:id", (req, res) => {
  const turkeyTime = getTurkeyTimestamp()

  db.run(
    "UPDATE islemler SET status=3, finished_at=? WHERE id=?",
    [turkeyTime, req.params.id],
    function (err) {
      if (err) return res.status(500).json(err)
      io.emit("veri-guncellendi")
      res.json({ msg: "Bitti" })
    }
  )
})

app.put("/api/bidon-no/:id", (req, res) => {
  const id = req.params.id
  const bidon_no = String(req.body?.bidon_no || "")

  db.get("SELECT id, status, odeme_tipi, iade_bidonlar FROM islemler WHERE id = ?", [id], (err, row) => {
    if (err) return res.status(500).json(err)
    if (!row) return res.status(404).json({ msg: "Kayıt bulunamadı" })
    if (row.odeme_tipi === "SATIS") return res.status(400).json({ msg: "Satış kaydında bidon düzenlenmez" })

    const verilen = parseBidonList(bidon_no)
    const outBidon = formatBidonList(verilen)

    const iade = parseBidonList(row.iade_bidonlar)
    const outIade = formatBidonList(iade)

    db.run(
      "UPDATE islemler SET bidon_no = ?, iade_bidonlar = ? WHERE id = ?",
      [outBidon, outIade, id],
      function (err2) {
        if (err2) return res.status(500).json(err2)
        io.emit("veri-guncellendi")
        res.json({ msg: "Bidon numaraları güncellendi", bidon_no: outBidon, iade_bidonlar: outIade })
      }
    )
  })
})

app.put("/api/not/:id", (req, res) => {
  const id = req.params.id
  const notlar = String(req.body?.notlar ?? "").slice(0, 1000)

  db.get("SELECT id, status FROM islemler WHERE id = ?", [id], (err, row) => {
    if (err) return res.status(500).json(err)
    if (!row) return res.status(404).json({ msg: "Kayıt bulunamadı" })

    db.run("UPDATE islemler SET notlar = ? WHERE id = ?", [notlar, id], function (err2) {
      if (err2) return res.status(500).json(err2)
      io.emit("veri-guncellendi")
      res.json({ msg: "Not kaydedildi", notlar })
    })
  })
})

// ---- Yedekleme ----
const VARSAYILAN_YEDEK_KLASORU = path.join(__dirname, "yedekler")
const YEDEK_SAKLAMA_GUN = 30
const YEDEK_AD_DESENI = /^takip-[\w-]+\.db$/

const dbGet = (sql, params = []) =>
  new Promise((resolve, reject) => db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row))))
const dbRun = (sql, params = []) =>
  new Promise((resolve, reject) =>
    db.run(sql, params, function (err) {
      if (err) reject(err)
      else resolve(this)
    })
  )

async function yedekKlasoruOku() {
  const row = await dbGet("SELECT yedek_klasoru FROM settings LIMIT 1")
  return (row && row.yedek_klasoru) || VARSAYILAN_YEDEK_KLASORU
}

function yedekAdiTarih(zaman) {
  const [tarih, saat] = getTurkeyTimestamp().split(" ")
  return zaman ? `${tarih}_${saat.replace(/:/g, "")}` : tarih
}

// etiket boşsa günlük otomatik yedek adı (takip-YYYY-MM-DD.db), doluysa saatli ad.
async function yedekAl(etiket = "") {
  const klasor = await yedekKlasoruOku()
  await fs.promises.mkdir(klasor, { recursive: true })
  const ad = etiket ? `takip-${yedekAdiTarih(true)}-${etiket}.db` : `takip-${yedekAdiTarih(false)}.db`
  const hedef = path.join(klasor, ad)
  // VACUUM INTO, WAL dahil tutarlı tek dosya üretir (düz kopyalama WAL yüzünden eksik kalabilir).
  await dbRun(`VACUUM INTO '${hedef.replace(/'/g, "''")}'`)
  await eskiYedekleriTemizle(klasor)
  return ad
}

async function eskiYedekleriTemizle(klasor) {
  const [yil, ay, gun] = getTurkeyTimestamp().slice(0, 10).split("-").map(Number)
  const sinir = Date.UTC(yil, ay - 1, gun) - YEDEK_SAKLAMA_GUN * 24 * 60 * 60 * 1000
  for (const ad of await fs.promises.readdir(klasor)) {
    const m = /^takip-(\d{4})-(\d{2})-(\d{2})/.exec(ad)
    if (!m || !YEDEK_AD_DESENI.test(ad)) continue
    if (Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) < sinir) {
      await fs.promises.unlink(path.join(klasor, ad)).catch(() => {})
    }
  }
}

// Bilgisayar geceleri kapalı olabildiği için sabit saat yerine "bugünün yedeği yoksa al".
async function gunlukYedekKontrol() {
  if (geriYukleniyor) return
  try {
    const klasor = await yedekKlasoruOku()
    const bugun = path.join(klasor, `takip-${yedekAdiTarih(false)}.db`)
    if (!fs.existsSync(bugun)) {
      const ad = await yedekAl()
      console.log("Günlük yedek alındı:", ad)
    }
  } catch (err) {
    console.error("Günlük yedek hatası:", err.message)
  }
}

async function adayDogrula(dosya) {
  const aday = await new Promise((resolve, reject) => {
    const d = new sqlite3.Database(dosya, sqlite3.OPEN_READWRITE, (err) => (err ? reject(err) : resolve(d)))
  })
  const al = (sql) => new Promise((resolve, reject) => aday.all(sql, (err, rows) => (err ? reject(err) : resolve(rows))))
  try {
    const kontrol = await al("PRAGMA integrity_check")
    if (!kontrol.length || kontrol[0].integrity_check !== "ok") throw new Error("Dosya bozuk")
    const tablolar = (await al("SELECT name FROM sqlite_master WHERE type='table'")).map((r) => r.name)
    if (!tablolar.includes("islemler") || !tablolar.includes("settings")) {
      throw new Error("Bu dosya bu uygulamanın veritabanı yedeği değil")
    }
  } finally {
    await new Promise((resolve) => aday.close(() => resolve()))
  }
}

async function geriYukle(kaynakDosya) {
  const gecici = path.join(os.tmpdir(), `yaghane-geri-yukle-${Date.now()}.db`)
  await fs.promises.copyFile(kaynakDosya, gecici)
  try {
    try {
      await adayDogrula(gecici)
    } catch (err) {
      const e = new Error(err.message && /yedek değil|bozuk/.test(err.message) ? err.message : "Geçerli bir SQLite dosyası değil")
      e.durum = 400
      throw e
    }

    geriYukleniyor = true
    try {
      const klasor = await yedekKlasoruOku()
      // Mevcut verinin yedeği alınamazsa geri yükleme yapılmaz.
      await yedekAl("geri-yukleme-oncesi")

      await new Promise((resolve, reject) => db.close((err) => (err ? reject(err) : resolve())))
      try {
        await fs.promises.copyFile(gecici, DB_YOLU)
        for (const ek of ["-wal", "-shm"]) await fs.promises.unlink(DB_YOLU + ek).catch(() => {})
      } finally {
        db = dbAc()
        semaHazirla()
      }
      // Yüklenen yedekteki eski klasör yolu geçerli olmayabilir; mevcut yolu koru.
      await dbRun("UPDATE settings SET yedek_klasoru=?", [klasor])
    } finally {
      geriYukleniyor = false
    }
    io.emit("db-geri-yuklendi")
  } finally {
    await fs.promises.unlink(gecici).catch(() => {})
  }
}

const hataYanit = (res, err) => res.status(err.durum || 500).json({ msg: err.message || "Beklenmeyen hata" })

app.get("/api/yedek", async (req, res) => {
  try {
    const klasor = await yedekKlasoruOku()
    let yedekler = []
    if (fs.existsSync(klasor)) {
      const adlar = (await fs.promises.readdir(klasor)).filter((a) => YEDEK_AD_DESENI.test(a))
      yedekler = await Promise.all(
        adlar.map(async (ad) => {
          const st = await fs.promises.stat(path.join(klasor, ad))
          return { ad, boyut: st.size, tarih: st.mtimeMs }
        })
      )
      yedekler.sort((a, b) => b.tarih - a.tarih)
    }
    res.json({ klasor, yedekler })
  } catch (err) {
    hataYanit(res, err)
  }
})

app.put("/api/yedek/klasor", async (req, res) => {
  try {
    const klasor = String(req.body.klasor || "").trim()
    if (!path.isAbsolute(klasor)) {
      return res.status(400).json({ msg: "Tam klasör yolu girin (örn. /media/usb/yedek veya D:\\Yedek)." })
    }
    try {
      await fs.promises.mkdir(klasor, { recursive: true })
      const test = path.join(klasor, ".yazma-testi")
      await fs.promises.writeFile(test, "ok")
      await fs.promises.unlink(test)
    } catch {
      return res.status(400).json({ msg: "Bu klasör oluşturulamadı veya içine yazılamıyor." })
    }
    const sonuc = await dbRun("UPDATE settings SET yedek_klasoru=?", [klasor])
    if (!sonuc.changes) await dbRun("INSERT INTO settings (yedek_klasoru) VALUES (?)", [klasor])
    res.json({ msg: "Yedek klasörü kaydedildi", klasor })
  } catch (err) {
    hataYanit(res, err)
  }
})

app.post("/api/yedek/simdi", async (req, res) => {
  try {
    const ad = await yedekAl("elle")
    res.json({ msg: "Yedek alındı", ad })
  } catch (err) {
    hataYanit(res, err)
  }
})

app.post("/api/yedek/geri-yukle/:ad", async (req, res) => {
  try {
    const ad = path.basename(String(req.params.ad || ""))
    if (!YEDEK_AD_DESENI.test(ad)) return res.status(400).json({ msg: "Geçersiz yedek adı" })
    const dosya = path.join(await yedekKlasoruOku(), ad)
    if (!fs.existsSync(dosya)) return res.status(404).json({ msg: "Yedek dosyası bulunamadı" })
    await geriYukle(dosya)
    res.json({ msg: "Yedek geri yüklendi" })
  } catch (err) {
    hataYanit(res, err)
  }
})

app.post(
  "/api/yedek/yukle",
  express.raw({ type: "application/octet-stream", limit: "500mb" }),
  async (req, res) => {
    const gecici = path.join(os.tmpdir(), `yaghane-yukleme-${Date.now()}.db`)
    try {
      if (!Buffer.isBuffer(req.body) || !req.body.length) return res.status(400).json({ msg: "Dosya boş" })
      await fs.promises.writeFile(gecici, req.body)
      await geriYukle(gecici)
      res.json({ msg: "Yedek geri yüklendi" })
    } catch (err) {
      hataYanit(res, err)
    } finally {
      await fs.promises.unlink(gecici).catch(() => {})
    }
  }
)

// Klasör seçici: tarayıcı gerçek klasör yolunu veremediği için klasörleri sunucu listeler.
// Yalnızca klasör adları döner, dosya içeriği okunmaz.
const WINDOWS = process.platform === "win32"

function klasorKisayollari() {
  const liste = [{ ad: "Ev", yol: os.homedir() }]
  if (!WINDOWS) {
    const kullanici = os.userInfo().username
    liste.push({ ad: "USB / Medya", yol: path.join("/media", kullanici) })
    liste.push({ ad: "USB / Medya", yol: path.join("/run/media", kullanici) })
  }
  return liste.filter((k) => fs.existsSync(k.yol))
}

app.get("/api/yedek/klasor-gez", async (req, res) => {
  try {
    if (WINDOWS && req.query.kok) {
      const suruculer = "CDEFGHIJKLMNOPQRSTUVWXYZ"
        .split("")
        .map((h) => `${h}:\\`)
        .filter((s) => fs.existsSync(s))
      return res.json({
        yol: "",
        ust: null,
        klasorler: suruculer.map((s) => ({ ad: s, yol: s })),
        kisayollar: klasorKisayollari(),
      })
    }

    let yol = String(req.query.yol || "").trim()
    if (!yol) {
      const kayitli = await yedekKlasoruOku()
      yol = fs.existsSync(kayitli) ? kayitli : os.homedir()
    }
    if (!path.isAbsolute(yol)) return res.status(400).json({ msg: "Geçersiz klasör yolu" })
    yol = path.resolve(yol)

    let girdiler
    try {
      girdiler = await fs.promises.readdir(yol, { withFileTypes: true })
    } catch {
      return res.status(400).json({ msg: "Bu klasör açılamadı." })
    }

    const klasorler = []
    for (const g of girdiler) {
      if (g.name.startsWith(".")) continue
      let klasorMu = g.isDirectory()
      if (!klasorMu && g.isSymbolicLink()) {
        klasorMu = await fs.promises.stat(path.join(yol, g.name)).then((s) => s.isDirectory(), () => false)
      }
      if (klasorMu) klasorler.push({ ad: g.name, yol: path.join(yol, g.name) })
    }
    klasorler.sort((a, b) => a.ad.localeCompare(b.ad, "tr"))

    const ustYol = path.dirname(yol)
    res.json({
      yol,
      ust: ustYol !== yol ? ustYol : WINDOWS ? "" : null,
      klasorler,
      kisayollar: klasorKisayollari(),
    })
  } catch (err) {
    hataYanit(res, err)
  }
})

app.post("/api/yedek/klasor-olustur", async (req, res) => {
  try {
    const ust = String(req.body.ust || "")
    const ad = String(req.body.ad || "").trim()
    if (!path.isAbsolute(ust) || !fs.existsSync(ust)) return res.status(400).json({ msg: "Üst klasör bulunamadı." })
    if (!ad || ad === "." || ad === ".." || !/^[^\\/:*?"<>|]+$/.test(ad)) {
      return res.status(400).json({ msg: "Klasör adı geçersiz." })
    }
    const yol = path.join(ust, ad)
    try {
      await fs.promises.mkdir(yol)
    } catch (err) {
      return res.status(400).json({ msg: err.code === "EEXIST" ? "Bu adda bir klasör zaten var." : "Klasör oluşturulamadı." })
    }
    res.json({ yol })
  } catch (err) {
    hataYanit(res, err)
  }
})

setTimeout(gunlukYedekKontrol, 2000)
setInterval(gunlukYedekKontrol, 60 * 60 * 1000)

const clientBuildPath = path.join(__dirname, "../client/dist")
app.use(express.static(clientBuildPath))

app.get(/^(?!\/api\/).*/, (req, res) => {
  res.sendFile(path.join(clientBuildPath, "index.html"))
})

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server: http://0.0.0.0:${PORT}`)
  console.log("Türkiye Saati (UTC+3) aktif")
})