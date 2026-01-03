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

// TÜRKİYE SAATİ FONKSİYONU
function getTurkeyTimestamp() {
  const now = new Date()
  const turkeyTime = new Date(
    now.toLocaleString("en-US", { timeZone: "Europe/Istanbul" })
  )

  const year = turkeyTime.getFullYear()
  const month = String(turkeyTime.getMonth() + 1).padStart(2, "0")
  const day = String(turkeyTime.getDate()).padStart(2, "0")
  const hours = String(turkeyTime.getHours()).padStart(2, "0")
  const minutes = String(turkeyTime.getMinutes()).padStart(2, "0")
  const seconds = String(turkeyTime.getSeconds()).padStart(2, "0")

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}

// TABLO + UNIQUE INDEX (aktif kayıt varken aynı musteri_no girilemez)
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
      notlar TEXT,

      status INTEGER DEFAULT 1,
      created_at TEXT,
      finished_at TEXT
    )`,
    (err) => {
      if (err) console.error("Tablo oluşturma hatası:", err.message)
    }
  )

  db.run(
    `
    CREATE UNIQUE INDEX IF NOT EXISTS uniq_active_musteri_no
    ON islemler(musteri_no)
    WHERE status != 3
  `,
    (err) => {
      if (err) {
        console.error("UNIQUE index oluşturma hatası:", err.message)
        console.error(
          "Muhtemelen DB'de aynı musteri_no için status!=3 birden fazla kayıt var."
        )
      }
    }
  )
})

const io = new Server(server, { cors: { origin: true, credentials: true } })

app.get("/api/giris-bekleyenler", (req, res) => {
  db.all(
    "SELECT * FROM islemler WHERE status != 3 ORDER BY id DESC",
    [],
    (err, rows) => {
      if (err) return res.status(500).json(err)
      res.json(rows)
    }
  )
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
    "SELECT * FROM islemler WHERE status = 1 ORDER BY id DESC",
    [],
    (err, rows) => {
      if (err) return res.status(500).json(err)
      res.json(rows)
    }
  )
})

app.post("/api/giris", (req, res) => {
  const { musteri_no, ad_soyad, telefon } = req.body
  const turkeyTime = getTurkeyTimestamp()

  if (!musteri_no || !ad_soyad) {
    return res.status(400).json({ msg: "Eksik bilgi" })
  }

  db.run(
    "INSERT INTO islemler (musteri_no, ad_soyad, telefon, status, created_at) VALUES (?, ?, ?, 1, ?)",
    [musteri_no, ad_soyad, telefon || "", turkeyTime],
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
  const { ad_soyad, telefon, satilan_kg, birim_fiyat, bidon_no, notlar } =
    req.body
  const turkeyTime = getTurkeyTimestamp()

  const toplam_tutar = (parseFloat(satilan_kg) * parseFloat(birim_fiyat)).toFixed(
    2
  )

  const sql = `INSERT INTO islemler (
    musteri_no, ad_soyad, telefon,
    zeytin_kg, cikan_yag, hak_oran, yag_fiyati,
    firma_hakki, firma_hakki_tl, odeme_tipi,
    bidon_no, notlar, status, created_at, finished_at
  ) VALUES (?, ?, ?, 0, ?, 0, ?, 0, ?, 'SATIS', ?, ?, 3, ?, ?)`

  const params = [
    "PERAKENDE",
    ad_soyad || "",
    telefon || "",
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

const clientBuildPath = path.join(__dirname, "../client/dist")
app.use(express.static(clientBuildPath))

app.get(/^(?!\/api\/).*/, (req, res) => {
  res.sendFile(path.join(clientBuildPath, "index.html"))
})

server.listen(3001, "0.0.0.0", () => {
  console.log("Server: http://0.0.0.0:3001")
  console.log("Türkiye Saati (UTC+3) aktif")
})
