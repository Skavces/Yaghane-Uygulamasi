/**
 * Yağ işlemi hesaplama — tek doğru kaynak.
 *
 * @param {object} params
 * @param {number|string} params.cikanYag   - Kantarda görünen / çıkan yağ (KG)
 * @param {number|string} params.zeytin     - Gelen zeytin (KG)
 * @param {number|string} params.hakOran    - Hak oranı (%)
 * @param {number|string} params.yagFiyati  - Yağ fiyatı (₺/kg)
 * @param {string}        params.odemeTipi  - "yag" | "para"
 * @returns {object}
 */
export function hesaplaYagIslemi({ cikanYag, zeytin, hakOran, yagFiyati, odemeTipi }) {
  const cikan  = parseFloat(cikanYag)  || 0
  const zey    = parseFloat(zeytin)    || 0
  const oran   = parseFloat(hakOran)   || 0
  const fiyat  = parseFloat(yagFiyati) || 0
  const tip    = odemeTipi || "yag"

  // Net yağ = kantarda görünen değer (dara ayrıca düşülmez)
  const netYag = Math.max(0, cikan)

  // Firma hakkı (KG)
  const hakKGraw   = (netYag * oran) / 100
  const hakKGround = Math.round(hakKGraw + Number.EPSILON)

  // Ödeme tutarları
  const paraTL = (hakKGround * fiyat).toFixed(0)
  const yagTL  = (hakKGround * fiyat).toFixed(2)

  // Müşteriye kalan yağ
  let musteriKalan
  if (tip === "para") {
    musteriKalan = netYag          // para ödüyor, yağının tamamı kendine
  } else {
    musteriKalan = netYag - hakKGround  // yağdan kesiliyor
  }
  if (musteriKalan < 0) musteriKalan = 0

  // Verilecek bidon adedi (her bidon 50 kg)
  const verilecekBidon = musteriKalan > 0 ? Math.ceil(musteriKalan / 50) : 0

  // Randiman: çıkan yağ / gelen zeytin × 100  (%)
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
    // Ödeme tipine göre firma hakkı değerleri (Panel'de kullanım kolaylığı için)
    firmaHakki:   hakKGround,
    firmaHakkiTL: tip === "para" ? paraTL : yagTL,
  }
}
