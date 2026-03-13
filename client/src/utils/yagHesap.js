export function hesaplaYagIslemi({ cikanYag, zeytin, hakOran, yagFiyati, odemeTipi }) {
  const cikan  = parseFloat(cikanYag)  || 0
  const zey    = parseFloat(zeytin)    || 0
  const oran   = parseFloat(hakOran)   || 0
  const fiyat  = parseFloat(yagFiyati) || 0
  const tip    = odemeTipi || "yag"
  const netYag = Math.max(0, cikan)

  let initialKalan
  if (tip === "para") {
    initialKalan = netYag
  } else {
    const initialHak = Math.round((netYag * oran) / 100)
    initialKalan = Math.max(0, netYag - initialHak)
  }
  const bidonSayisi  = initialKalan > 0 ? Math.ceil(initialKalan / 50) : 0
  const bidonTare    = bidonSayisi * 2

  const adjustedYag  = Math.max(0, netYag - bidonTare)
  const hakKGraw     = (adjustedYag * oran) / 100
  const hakKGround   = Math.round(hakKGraw)

  const paraTL = (hakKGround * fiyat).toFixed(0)
  const yagTL  = (hakKGround * fiyat).toFixed(2)

  let musteriKalan
  if (tip === "para") {
    musteriKalan = netYag
  } else {
    musteriKalan = Math.max(0, netYag - hakKGround)
  }
  musteriKalan = Math.round(musteriKalan)

  const verilecekBidon = musteriKalan > 0 ? Math.ceil(musteriKalan / 50) : 0

  const randiman = zey > 0 && cikan > 0 ? (cikan / zey) * 100 : 0

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
