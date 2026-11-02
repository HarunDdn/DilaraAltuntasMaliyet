# Maliyet formülleri (özet)

Esas ve güncel kopya: `D:\Maliyet Hesaplama\docs\formulas.md`.

```text
netWeight      = volume * density
grossWeight    = netWeight + grossExtra
rawMaterial    = grossWeight * (1 + wasteRate) * materialPrice / 1000
mold           = moldPrice / (annualMoldQuantity * amortizationYears)
machineLabor   = (machineHourly + laborHourly) * cycleSeconds / (3600 * cavities) * (1 + wasteRate)
materialTotal  = 0.10 * quantity * grossWeight * (1 + wasteRate) * materialPrice / 1000
interest       = materialTotal / quantity
baseCost       = rawMaterial + mold + machineLabor + interest
exWork         = (baseCost + extrasSum) * (1 + profitRate)
listPrice      = exWork + packageCost/packageQuantity + shipmentCost/shipmentQuantity
salePrice      = listPrice * (1 - discountRate)
revenue        = salePrice * quantity
materialAmount = netWeight * (1 + wasteRate) * materialPrice * quantity / 1000
```

`wasteRate` / `profitRate` / `discountRate` kesir. Payda 0 → 0.
