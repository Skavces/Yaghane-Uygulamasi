export function hesaplaYagIslemi({ cikanYag, zeytin, hakOran, yagFiyati, odemeTipi, bidonSayisi }) {
  const kantarYag = parseFloat(cikanYag)   || 0
  const zey       = parseFloat(zeytin)     || 0
  const oran      = parseFloat(hakOran)    || 0
  const fiyat     = parseFloat(yagFiyati)  || 0
  const tip       = odemeTipi || "yag"
  const bidon     = parseInt(bidonSayisi)  || 0

  // 1. Net yağ = kantar yağ - bidon tare
  const netYag = Math.max(0, kantarYag - bidon * 2)

  // 2. Hak hesabı
  const hakKGraw   = (netYag * oran) / 100
  const hakKGround = Math.round(hakKGraw)

  const paraTL = (hakKGround * fiyat).toFixed(0)
  const yagTL  = (hakKGround * fiyat).toFixed(2)

  // 3. Müşteriye kalan
  const musteriKalan = Math.round(
    tip === "para"
      ? netYag
      : Math.max(0, netYag - hakKGround)
  )

  const verilecekBidon = musteriKalan > 0 ? Math.ceil(musteriKalan / 50) : 0

  const randiman = zey > 0 && kantarYag > 0 ? (kantarYag / zey) * 100 : 0

  return {
    netYag,
    hakKGraw,
    hakKGround,
    paraTL,
    yagTL,
    musteriKalan,
    verilecekBidon,
    randiman: randiman.toFixed(1),
    firmaHakki:   hakKGround,
    firmaHakkiTL: tip === "para" ? paraTL : yagTL,
  }
}
