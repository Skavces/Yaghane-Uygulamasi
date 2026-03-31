const express = require("express")
const http = require("http")
const { Server } = require("socket.io")
const sqlite3 = require("sqlite3").verbose()
const cors = require("cors")
const path = require("path")

const app = express()
const server = http.createServer(app)

app.use(cors({ origin: true, credentials: true }))
app.use(express.json())

const db = new sqlite3.Database(path.join(__dirname, "takip.db"), (err) => {
  if (err) console.error(err.message)
  else console.log("SQLite veritabanına bağlanıldı.")
})

db.serialize(() => {
  db.run("PRAGMA journal_mode = WAL;")
  db.run("PRAGMA busy_timeout = 5000;")
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

db.serialize(() => {
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
      hak_oran REAL DEFAULT 8
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

const io = new Server(server, { cors: { origin: true, credentials: true } })

app.get("/api/settings", (req, res) => {
  db.get("SELECT * FROM settings LIMIT 1", [], (err, row) => {
    if (err) return res.status(500).json(err)
    if (!row) return res.json({ yag_fiyati: 300, hak_oran: 8 })
    res.json(row)
  })
})

app.put("/api/settings", (req, res) => {
  const { yag_fiyati, hak_oran } = req.body
  db.get("SELECT id FROM settings LIMIT 1", [], (err, row) => {
    if (err) return res.status(500).json(err)
    
    if (row) {
       db.run("UPDATE settings SET yag_fiyati=?, hak_oran=? WHERE id=?", [yag_fiyati, hak_oran, row.id], (err2) => {
          if (err2) return res.status(500).json(err2)
          io.emit("settings-updated", { yag_fiyati, hak_oran })
          res.json({ msg: "Ayarlar güncellendi" })
       })
    } else {
       db.run("INSERT INTO settings (yag_fiyati, hak_oran) VALUES (?, ?)", [yag_fiyati, hak_oran], function(err2) {
          if (err2) return res.status(500).json(err2)
          io.emit("settings-updated", { yag_fiyati, hak_oran })
          res.json({ msg: "Ayarlar oluşturuldu" })
       })
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
               status=2
               WHERE id=?`

  db.run(
    sql,
    [
      zeytin_kg,
      cikan_yag,
      hak_oran,
      yag_fiyati,
      firma_hakki,
      firma_hakki_tl,
      odeme_tipi,
      bidon_no,
      notlar,
      kantar_bidon || 0,
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

const clientBuildPath = path.join(__dirname, "../client/dist")
app.use(express.static(clientBuildPath))

app.get(/^(?!\/api\/).*/, (req, res) => {
  res.sendFile(path.join(clientBuildPath, "index.html"))
})

server.listen(3001, "0.0.0.0", () => {
  console.log("Server: http://0.0.0.0:3001")
  console.log("Türkiye Saati (UTC+3) aktif")
})