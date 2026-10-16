export function hesaplaYagIslemi({ cikanYag, zeytin, hakOran, yagFiyati, odemeTipi }) {
  const kantarYag = parseFloat(cikanYag)  || 0
  const zey       = parseFloat(zeytin)    || 0
  const oran      = parseFloat(hakOran)   || 0
  const fiyat     = parseFloat(yagFiyati) || 0
  const tip       = odemeTipi || "yag"

  const approxKalan  = tip === "para" ? kantarYag : kantarYag * (1 - oran / 100)
  const bidon1       = approxKalan > 0 ? Math.ceil(approxKalan / 50) : 0
  const netYag1      = Math.max(0, kantarYag - bidon1 * 2)
  const hak1         = Math.round(netYag1 * oran / 100)
  const kalan1       = tip === "para" ? netYag1 : Math.max(0, netYag1 - hak1)

  const bidonSayisi = kalan1 > 0 ? Math.ceil(kalan1 / 50) : 0
  const bidonTare   = bidonSayisi * 2
  const netYag      = Math.max(0, kantarYag - bidonTare)

  const hakKGraw   = (netYag * oran) / 100
  const hakKGround = Math.round(hakKGraw)

  const paraTL = (hakKGround * fiyat).toFixed(0)
  const yagTL  = (hakKGround * fiyat).toFixed(2)

  const musteriKalan = Math.round(
    tip === "para"
      ? netYag                              
      : Math.max(0, netYag - hakKGround)    
  )

  const verilecekBidon = musteriKalan > 0 ? Math.ceil(musteriKalan / 50) : 0

  const randiman = netYag > 0 ? zey / netYag : 0

  return {
    netYag,
    hakKGraw,
    hakKGround,
    paraTL,
    yagTL,
    musteriKalan,
    verilecekBidon,
    randiman: randiman === 0 ? "0" : randiman.toFixed(4),
    firmaHakki:   hakKGround,
    firmaHakkiTL: tip === "para" ? paraTL : yagTL,
  }
}

export function hesaplaYagciPaneli({ zeytin, cikanYag, kantarBidon, yagIleOdeme, bidonUcreti, sikimBedeli }) {
  const zey      = parseFloat(zeytin)      || 0
  const kantar   = parseFloat(cikanYag)    || 0
  const kBidon   = parseFloat(kantarBidon) || 0
  const yagOdeme = parseFloat(yagIleOdeme) || 0
  const bidonUc  = parseFloat(bidonUcreti) || 0
  const sikim    = parseFloat(sikimBedeli) || 0

  const netYag = Math.max(0, kantar - kBidon * 2)

  const sikmaUcretiTL  = zey * sikim
  const sikmaUcretiYag = yagOdeme > 0 ? sikmaUcretiTL / yagOdeme : 0
  const bidonBedeliTL  = kBidon * bidonUc
  const bidonBedeliYag = kBidon * 2

  const toplamTL  = sikmaUcretiTL + bidonBedeliTL
  const toplamYag = sikmaUcretiYag + bidonBedeliYag
  const oran      = netYag > 0 ? zey / netYag : 0

  return {
    netYag,
    sikmaUcretiTL, sikmaUcretiYag,
    bidonBedeliTL, bidonBedeliYag,
    toplamTL, toplamYag,
    oran: oran === 0 ? "0" : oran.toFixed(2),
  }
}
