# Maliyet formülleri

Tek kaynak: `public/app.js` → `recalculate()`. Sunucu (`server.js`) hesaplamaz; POST sırasında istemcinin gönderdiği `netCost` / `exWorkPrice` / `salePrice` / `expectedRevenue` / `materialAmount` saklanır.

`wasteRate` ve `profitRate` state’te **kesir** (ör. `0.20` = %20). Arayüz yüzde girer (`* 100` göster, `/ 100` yaz).

Payda 0 ise sonuç 0 (`safeDiv`).

## Ağırlık

```text
netWeight   = volume * density                         # g
grossWeight = netWeight + grossExtra                   # g
```

`volume` cm³, `density` g/cm³, `grossExtra` g.

## Birim kalemler (EUR / adet)

```text
rawMaterial  = grossWeight * (1 + wasteRate) * materialPrice / 1000
mold         = moldPrice / (annualMoldQuantity * amortizationYears)
machineLabor = (machineHourly + laborHourly) * cycleSeconds / (3600 * cavities)
```

`materialPrice` EUR/kg. Kalıp: senelik adet × amortisman yılına bölünür.

## Kalkülatif faiz

Kapitalin %10’u, sonra birime:

```text
materialTotal = 0.10 * quantity * grossWeight * (1 + wasteRate) * materialPrice / 1000   # EUR (toplam)
interest      = materialTotal / quantity                                                     # EUR/ad
```

Ekranda «Kalkülatif faiz (%10 × kapital)» = `materialTotal` (EUR, 0 ondalık).

## Net maliyet → satış

```text
baseCost     = rawMaterial + mold + machineLabor + interest     # net maliyet
extrasSum    = Σ extras[i].price                              # EUR/ad
subtotal     = baseCost + extrasSum
exWork       = subtotal * (1 + profitRate)                    # EX-WORK
packaging    = packageCost / packageQuantity
freight      = shipmentCost / shipmentQuantity
salePrice    = exWork + packaging + freight
revenue      = salePrice * quantity                             # beklenen ciro
materialAmount = netWeight * (1 + wasteRate) * materialPrice * quantity / 1000
```

`materialAmount` **net** ağırlık kullanır (`grossWeight` değil). Hammadde bedeli (`rawMaterial`) **brüt** ağırlık kullanır.

## Varsayılan örnek (defaultState)

Yeni oturumda (localStorage yoksa) `defaultState` dolu gelir: malzeme `PF31-9005`, hacim 84, yoğunluk 1.42, fire %5, kâr %20, adet 150000, 4 göz, 180 sn, vb. `emptyState` «Temizle» ile gelir. Tarih varsayılanı kodda sabit (`2026-07-28`); yeni parçada bugünü yazmak istenirse `defaultState.date` güncellenir.

## Değiştirirken

1. Formülü `recalculate()` içinde güncelle
2. Bu dosyayı aynı satırla güncelle
3. Özet kartlar (`sum-*`) ve sağ panel (`p-*`) aynı değerleri gösterir; birini unutma
4. Kayıtlı `formData` eski formülle hesaplanmış özet sayılar taşıyabilir; «Formu aç» state’i yükler ve yeniden hesaplar, listedeki `netCost` vb. PATCH edilmez
