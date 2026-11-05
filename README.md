# Doğduğun gün hava nasıldı?

**Canlı:** https://birtohum.github.io/dogdugum-gun/

Doğum tarihini ve ilini seç. Sayfa sana şunları gösterir:

- o gün havanın kaç derece olduğunu ve yağış olup olmadığını;
- sonraki her doğum gününde havanın nasıl olduğunu;
- o günden beri şehrin ne kadar ısındığını.

Sonucu 1200×630'luk bir kart olarak paylaşabilirsin.

## Nasıl çalışıyor

Sunucu yok. Tarayıcı, [Open-Meteo](https://open-meteo.com/) geçmiş hava arşivine tek bir istek atar. Bu istek, doğum yılının 1 Ocak'ından bir hafta öncesine kadar günlük verileri getirir: en yüksek, en düşük ve ortalama sıcaklık, yağış, kar ve hava durumu kodu. Geri kalan her şey tarayıcıda hesaplanır:

- **Sıralama:** Doğduğun gün, aynı ayın o tarihten beri yaşanan bütün günleri arasında kaçıncı sırada? Ortalama sıcaklığa göre yüzdelik olarak verilir.
- **Doğum günleri:** Her yıl aynı gün, gündüzün en yüksek sıcaklığı alınır. 29 Şubat'ta doğanlar için artık olmayan yıllarda 28 Şubat kullanılır.
- **Isınma:** Tamamlanmış yılların yıllık ortalamalarına en küçük kareler doğrusu uydurulur. Eğim, aradaki yıl sayısıyla çarpılır. En az 10 tamamlanmış yıl gerekir.

İl koordinatları il merkezleridir.

## Sınırlar

- **Ölçüm değil, model:** Veri bir istasyon ölçümü değil, ECMWF ERA5 yeniden analizidir. Yaklaşık 10–25 km'lik bir ızgara hücresinin hesaplanmış değeridir. Tek bir günün sıcaklığı, o şehrin meteoroloji istasyonundan 1–3 °C farklı olabilir. Dağlık ve kıyı illerde bu fark daha büyüktür. Uzun dönem eğilim, tek günden daha güvenilirdir.
- **Yöntemin yetmediği yer:** 10–20 yıllık eğilim, yıldan yıla oynamaya karşı hassastır. Bu sayfa yalnız doğrusal eğilimi gösterir; anlamlılık testi yapmaz.
- **Kapsam:** Veri 1940'tan başlar. Son günler arşive birkaç gün gecikmeyle girer.

## Gizlilik

Girdiğin tarih kaydedilmez. Tarih yalnızca Open-Meteo'ya sorgu olarak gider ve paylaşım bağlantısında görünür.

## Lisans

Kod Apache-2.0. Veri: Open-Meteo, [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) (ERA5, Copernicus Climate Change Service).
