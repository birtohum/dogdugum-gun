"use strict";
// Doğduğun gün hava nasıldı? — tek bir Open-Meteo arşiv isteğiyle (doğum yılının 1 Ocak'ından bugüne günlük veri) her şey tarayıcıda hesaplanır.

const AYLAR = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
const GUNLER = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];
const $ = (id) => document.getElementById(id);
const sayi = (x, b = 1) => x.toLocaleString("tr-TR", { minimumFractionDigits: b, maximumFractionDigits: b }).replace("-", "−");
const isaretli = (x, b = 1) => (x > 0 ? "+" : x < 0 ? "−" : "") + sayi(Math.abs(x), b);

// Türkçe ek: ek("İzmir","da") → "İzmir'de", ek("Muş","dan") → "Muş'tan"
function ekle(sozcuk, okunus, ek) {
  const sesli = [...okunus.toLocaleLowerCase("tr")].reverse().find((h) => "aıoueiöü".includes(h)) || "e";
  const kalin = "aıou".includes(sesli);
  const sert = "fstkçşhp".includes(okunus.toLocaleLowerCase("tr").slice(-1));
  let e = ek.replace("a", kalin ? "a" : "e");
  if (sert) e = e.replace("d", "t");
  return `${sozcuk}'${e}`;
}
const ek = (s, e) => ekle(s, s, e);
function yilEk(y, e) {
  const B = ["", "bir", "iki", "üç", "dört", "beş", "altı", "yedi", "sekiz", "dokuz"];
  const O = ["", "on", "yirmi", "otuz", "kırk", "elli", "altmış", "yetmiş", "seksen", "doksan"];
  const oku = y % 10 ? B[y % 10] : y % 100 ? O[(y % 100) / 10] : y % 1000 ? "yüz" : "bin";
  return ekle(String(y), oku, e);
}

// "%56'sından", "%40'ından", "%3'ünden"
function yuzdeDan(n) {
  const B = ["sıfır", "bir", "iki", "üç", "dört", "beş", "altı", "yedi", "sekiz", "dokuz"];
  const O = ["", "on", "yirmi", "otuz", "kırk", "elli", "altmış", "yetmiş", "seksen", "doksan"];
  const oku = n === 100 ? "yüz" : n % 10 || n === 0 ? B[n % 10] : O[n / 10];
  const sesli = [...oku].reverse().find((h) => "aıoueiöü".includes(h));
  const d4 = { a: "ı", ı: "ı", o: "u", u: "u", e: "i", i: "i", ö: "ü", ü: "ü" }[sesli];
  const iy = ("aıoueiöü".includes(oku.slice(-1)) ? "s" : "") + d4;
  return `%${n}'${iy}n${"aıou".includes(d4) ? "dan" : "den"}`;
}

let ILLER = [];
let son = null; // son hesaplanan sonuç (paylaşım kartı için)

function durumMetni(kod, kar) {
  if (kar > 0.5) return "karlı";
  if (kod === 0) return "açık, güneşli";
  if (kod === 1) return "çoğunlukla açık";
  if (kod === 2) return "parçalı bulutlu";
  if (kod === 3) return "kapalı, bulutlu";
  if (kod === 45 || kod === 48) return "sisli";
  if (kod >= 51 && kod <= 57) return "çiseleyen yağmurlu";
  if (kod >= 61 && kod <= 67) return "yağmurlu";
  if (kod >= 71 && kod <= 77) return "karlı";
  if (kod >= 80 && kod <= 82) return "sağanak yağışlı";
  if (kod === 85 || kod === 86) return "kar sağanaklı";
  if (kod >= 95) return "gök gürültülü fırtınalı";
  return "";
}

function isoGun(d) { return d.toISOString().slice(0, 10); }
function tarihYazi(iso) {
  const [y, m, g] = iso.split("-").map(Number);
  const gun = new Date(Date.UTC(y, m - 1, g)).getUTCDay();
  return `${g} ${AYLAR[m - 1]} ${y}, ${GUNLER[gun]}`;
}

async function veriGetir(il, iso) {
  const yil = iso.slice(0, 4);
  const bitis = new Date(Date.now() - 6 * 864e5);
  const anahtar = `dg:${il[0]}:${yil}:${isoGun(bitis)}`;
  try { const v = sessionStorage.getItem(anahtar); if (v) return JSON.parse(v); } catch (e) {}
  const u = new URL("https://archive-api.open-meteo.com/v1/archive");
  u.search = new URLSearchParams({
    latitude: il[2], longitude: il[3], start_date: `${yil}-01-01`, end_date: isoGun(bitis),
    daily: "temperature_2m_max,temperature_2m_min,temperature_2m_mean,precipitation_sum,weather_code,snowfall_sum",
    timezone: "Europe/Istanbul",
  });
  const r = await fetch(u);
  if (!r.ok) throw new Error(r.status === 429 ? "Hava verisi servisi şu an çok yoğun. Bir dakika sonra yeniden dene." : "Hava verisi servisi yanıt vermedi. Biraz sonra yeniden dene.");
  const j = await r.json();
  const d = j.daily;
  // sondaki boş günleri at
  let n = d.time.length;
  while (n > 0 && d.temperature_2m_mean[n - 1] == null) n--;
  const v = {
    t: d.time.slice(0, n), max: d.temperature_2m_max.slice(0, n), min: d.temperature_2m_min.slice(0, n),
    ort: d.temperature_2m_mean.slice(0, n), yag: d.precipitation_sum.slice(0, n),
    kod: d.weather_code.slice(0, n), kar: d.snowfall_sum.slice(0, n),
  };
  try { sessionStorage.setItem(anahtar, JSON.stringify(v)); } catch (e) {}
  return v;
}

function egim(xs, ys) {
  const n = xs.length, mx = xs.reduce((a, b) => a + b) / n, my = ys.reduce((a, b) => a + b) / n;
  let pay = 0, payda = 0;
  for (let i = 0; i < n; i++) { pay += (xs[i] - mx) * (ys[i] - my); payda += (xs[i] - mx) ** 2; }
  const b = pay / payda;
  return { b, a: my - b * mx };
}

function hesapla(v, iso) {
  const i = v.t.indexOf(iso);
  if (i < 0 || v.ort[i] == null || v.max[i] == null || v.min[i] == null) return null;
  const [y, m, g] = iso.split("-").map(Number);
  const gun = { max: v.max[i], min: v.min[i], ort: v.ort[i], yag: v.yag[i], kod: v.kod[i], kar: v.kar[i] };

  // aynı ayın bütün günleri içinde sıralama (ortalama sıcaklığa göre)
  const ayAnahtar = `-${String(m).padStart(2, "0")}-`;
  const ayGunleri = [];
  for (let k = 0; k < v.t.length; k++) if (v.t[k].slice(4, 8) === ayAnahtar && v.ort[k] != null) ayGunleri.push(v.ort[k]);
  const dahaSicak = ayGunleri.filter((x) => x > gun.ort).length;
  const yuzdeSoguk = Math.round((100 * dahaSicak) / ayGunleri.length);

  // her doğum günü (29 Şubat → artık olmayan yıllarda 28 Şubat)
  const dg = [];
  const sonYil = Number(v.t[v.t.length - 1].slice(0, 4));
  for (let yy = y; yy <= sonYil; yy++) {
    let gg = g;
    if (m === 2 && g === 29 && !(yy % 4 === 0 && (yy % 100 !== 0 || yy % 400 === 0))) gg = 28;
    const k = v.t.indexOf(`${yy}-${String(m).padStart(2, "0")}-${String(gg).padStart(2, "0")}`);
    if (k >= 0 && v.max[k] != null) dg.push({ yil: yy, max: v.max[k] });
  }

  // yıllık ortalamalar (yalnız tamamlanmış yıllar)
  const yillar = {};
  for (let k = 0; k < v.t.length; k++) {
    if (v.ort[k] == null) continue;
    const yy = v.t[k].slice(0, 4);
    (yillar[yy] ||= []).push(v.ort[k]);
  }
  const yillik = Object.entries(yillar)
    .filter(([, a]) => a.length >= 360)
    .map(([yy, a]) => ({ yil: Number(yy), ort: a.reduce((p, q) => p + q, 0) / a.length }));
  let isinma = null;
  if (yillik.length >= 10) {
    const e = egim(yillik.map((x) => x.yil), yillik.map((x) => x.ort));
    isinma = { onYil: e.b * 10, toplam: e.b * (yillik[yillik.length - 1].yil - yillik[0].yil), bas: yillik[0].yil, son: yillik[yillik.length - 1].yil };
  }
  return { gun, yuzdeSoguk, ayGunSayisi: ayGunleri.length, dg, yillik, isinma, m, sonGun: v.t[v.t.length - 1] };
}

function dgGrafik(dg, dogumYili) {
  const el = $("dgGrafik");
  if (dg.length < 2) { el.innerHTML = '<p class="alt">Henüz yeterince doğum günü yok.</p>'; return; }
  const G = 860, Y = 230, sol = 34, sag = 12, ust = 22, alt = 26;
  const xs = dg.map((d) => d.yil), ys = dg.map((d) => d.max);
  const x0 = xs[0], x1 = xs[xs.length - 1];
  let y0 = Math.floor(Math.min(...ys) - 2), y1 = Math.ceil(Math.max(...ys) + 2);
  const X = (x) => sol + ((x - x0) / Math.max(1, x1 - x0)) * (G - sol - sag);
  const Yp = (y) => ust + (1 - (y - y0) / (y1 - y0)) * (Y - ust - alt);
  let s = `<svg viewBox="0 0 ${G} ${Y}" role="img" aria-label="Her doğum gününde en yüksek sıcaklık">`;
  const adim = (y1 - y0) > 16 ? 10 : 5;
  for (let t = Math.ceil(y0 / adim) * adim; t <= y1; t += adim) {
    s += `<line class="eksen" x1="${sol}" x2="${G - sag}" y1="${Yp(t)}" y2="${Yp(t)}"/><text x="${sol - 6}" y="${Yp(t) + 4}" text-anchor="end">${t}°</text>`;
  }
  const yilAdim = (x1 - x0) > 40 ? 10 : 5;
  for (let t = Math.ceil(x0 / yilAdim) * yilAdim; t <= x1; t += yilAdim) s += `<text x="${X(t)}" y="${Y - 6}" text-anchor="middle">${t}</text>`;
  if (dg.length >= 8) {
    const e = egim(xs, ys);
    s += `<line class="egilim" x1="${X(x0)}" x2="${X(x1)}" y1="${Yp(e.a + e.b * x0)}" y2="${Yp(e.a + e.b * x1)}"/>`;
  }
  const r = dg.length > 60 ? 3.2 : 4.5;
  dg.forEach((d) => {
    const sen = d.yil === dogumYili;
    s += `<circle class="nokta${sen ? " sen" : ""}" cx="${X(d.yil)}" cy="${Yp(d.max)}" r="${sen ? r + 2 : r}"><title>${d.yil}: ${sayi(d.max)} °C</title></circle>`;
  });
  const ilk = dg[0];
  s += `<text class="etiket" x="${X(ilk.yil) + 9}" y="${Yp(ilk.max) - 9}">doğduğun gün</text>`;
  el.innerHTML = s + "</svg>";
}

function seritler(yillik, dogumYili) {
  const el = $("seritler");
  if (!yillik.length) { el.innerHTML = ""; return; }
  const ort = yillik.reduce((a, b) => a + b.ort, 0) / yillik.length;
  const sapma = Math.max(...yillik.map((x) => Math.abs(x.ort - ort))) || 1;
  el.innerHTML = yillik.map((x) => {
    const f = (x.ort - ort) / sapma; // -1..1
    const renk = f >= 0 ? `color-mix(in oklab, var(--sicak) ${Math.round(18 + 82 * f)}%, var(--zemin))` : `color-mix(in oklab, var(--soguk) ${Math.round(18 + 82 * -f)}%, var(--zemin))`;
    return `<i style="background:${renk}" title="${x.yil}: ${sayi(x.ort)} °C"></i>`;
  }).join("");
  $("sBas").textContent = yillik[0].yil;
  $("sSon").textContent = yillik[yillik.length - 1].yil;
}

function goster(il, iso, h) {
  const [y] = iso.split("-").map(Number);
  const g = h.gun;
  $("gTarih").textContent = `${tarihYazi(iso)} · ${il[1]}`;
  $("gDerece").textContent = sayi(g.ort);
  $("gDurum").textContent = durumMetni(g.kod, g.kar) ? `Gün boyu ortalama; ${durumMetni(g.kod, g.kar)}` : "Gün boyu ortalama";
  $("gMax").textContent = sayi(g.max) + " °C";
  $("gMin").textContent = sayi(g.min) + " °C";
  $("gYagis").textContent = g.kar > 0.5 ? `${sayi(g.kar)} cm kar` : g.yag >= 0.1 ? `${sayi(g.yag)} mm` : "yok";

  const ay = AYLAR[h.m - 1];
  let c = h.yuzdeSoguk > 50
    ? `Doğduğun gün, ${yilEk(y, "dan")} bu yana ${ek(il[1], "da")} yaşanan ${sayi(h.ayGunSayisi, 0)} ${ay} gününün <b>${yuzdeDan(h.yuzdeSoguk)} daha soğuktu</b>.`
    : `Doğduğun gün, ${yilEk(y, "dan")} bu yana ${ek(il[1], "da")} yaşanan ${sayi(h.ayGunSayisi, 0)} ${ay} gününün <b>${yuzdeDan(100 - h.yuzdeSoguk)} daha sıcaktı</b>.`;
  if (h.dg.length >= 3) {
    const sirali = [...h.dg].sort((a, b) => b.max - a.max);
    const en = sirali[0], enAz = sirali[sirali.length - 1];
    c += ` Gündüzün en yüksek sıcaklığına göre en sıcak doğum günün <b>${en.yil}</b> (${sayi(en.max)} °C), en soğuğu <b>${enAz.yil}</b> (${sayi(enAz.max)} °C).`;
  }
  $("cumle").innerHTML = c;
  $("dgAlt").textContent = `${h.dg.length} doğum günü, her yıl aynı gün gündüzün en yüksek sıcaklığı. Turuncu nokta doğduğun gün; kesikli çizgi eğilim.`;
  dgGrafik(h.dg, y);

  if (h.isinma) {
    const t = h.isinma.toplam;
    $("isinma").textContent = Math.abs(t) < 0.15 ? "Belirgin bir değişim yok." : `${isaretli(t)} °C ${t > 0 ? "ısındı" : "soğudu"}`;
    $("isinmaAlt").textContent = `${ek(il[1], "da")} ${h.isinma.bas}–${h.isinma.son} yıllık ortalamalarının doğrusal eğilimi: on yılda ${isaretli(h.isinma.onYil, 2)} °C. Her şerit bir yıl; mavi o dönemin ortalamasından soğuk, turuncu sıcak.`;
  } else {
    $("isinma").textContent = "Henüz erken.";
    $("isinmaAlt").textContent = "Isınmayı güvenilir söylemek için en az 10 tamamlanmış yıl gerekiyor. Şeritler yine de her yılın ortalamasını gösteriyor.";
  }
  seritler(h.yillik, y);
  son = { il, iso, h };
}

async function calistir(ilNo, iso, ornek) {
  const il = ILLER.find((x) => x[0] === ilNo);
  const kutu = $("sonuc");
  kutu.classList.add("yukleniyor");
  $("ornekNot").classList.remove("hata");
  $("ornekNot").textContent = ornek ? "Örnek olarak bugünden 30 yıl öncesi gösteriliyor. Kendi tarihini gir." : "Yükleniyor…";
  try {
    const v = await veriGetir(il, iso);
    const h = hesapla(v, iso);
    if (!h) throw new Error("Bu tarih için veri yok. 2 Ocak 1940 ile bir hafta öncesi arasında bir gün seç.");
    goster(il, iso, h);
    if (!ornek) {
      $("ornekNot").textContent = "";
      history.replaceState(null, "", `?t=${iso}&il=${il[0]}`);
    }
  } catch (e) {
    $("ornekNot").textContent = e.message;
    $("ornekNot").classList.add("hata");
  } finally {
    kutu.classList.remove("yukleniyor");
  }
}

// --- paylaşım kartı (1200×630) ---
function kartCiz() {
  const { il, iso, h } = son;
  const c = document.createElement("canvas");
  c.width = 1200; c.height = 630;
  const x = c.getContext("2d");
  x.fillStyle = "#f6f4ef"; x.fillRect(0, 0, 1200, 630);
  const f = (w, s) => `${w} ${s}px Inter, system-ui, sans-serif`;
  x.fillStyle = "#c2410c"; x.font = f(600, 26); x.fillText("DOĞDUĞUM GÜN", 70, 96);
  x.fillStyle = "#17191d"; x.font = f(700, 44); x.fillText(`${tarihYazi(iso).split(",")[0]} · ${il[1]}`, 70, 156);
  x.font = f(800, 210); x.fillText(sayi(h.gun.ort) + "°", 62, 370);
  x.fillStyle = "#646a73"; x.font = f(500, 32);
  const d = durumMetni(h.gun.kod, h.gun.kar);
  x.fillText(`en yüksek ${sayi(h.gun.max)}°, en düşük ${sayi(h.gun.min)}°${d ? " · " + d : ""}`, 70, 448);
  if (h.isinma && Math.abs(h.isinma.toplam) >= 0.15) {
    x.fillStyle = "#17191d"; x.font = f(600, 30);
    x.fillText(`O günden beri ${il[1]} ${isaretli(h.isinma.toplam)} °C ${h.isinma.toplam > 0 ? "ısındı" : "soğudu"}.`, 70, 496);
  }
  // şeritler
  const yl = h.yillik, ort = yl.reduce((a, b) => a + b.ort, 0) / (yl.length || 1);
  const sp = Math.max(...yl.map((q) => Math.abs(q.ort - ort)), 0.01);
  const w = 1060 / Math.max(1, yl.length);
  yl.forEach((q, i) => {
    const t = (q.ort - ort) / sp;
    const a = 0.18 + 0.82 * Math.abs(t);
    x.fillStyle = t >= 0 ? `rgba(194,65,12,${a})` : `rgba(29,78,216,${a})`;
    x.fillRect(70 + i * w, 520, Math.ceil(w), 52);
  });
  x.fillStyle = "#646a73"; x.font = f(500, 20);
  x.fillText("birtohum.github.io/dogdugum-gun · veri: Open-Meteo, ERA5", 70, 604);
  return c;
}

async function paylas() {
  if (!son) return;
  const not = $("paylasNot");
  const c = kartCiz();
  const blob = await new Promise((r) => c.toBlob(r, "image/png"));
  const ad = `dogdugum-gun-${son.iso}.png`;
  const dosya = new File([blob], ad, { type: "image/png" });
  if (navigator.canShare && navigator.canShare({ files: [dosya] })) {
    try { await navigator.share({ files: [dosya], text: `Doğduğum gün ${ek(son.il[1], "da")} hava ${sayi(son.h.gun.ort)} °C imiş.`, url: location.href }); return; } catch (e) { if (e.name === "AbortError") return; }
  }
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = ad; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  not.textContent = "Kart indirildi.";
}

async function baslat() {
  ILLER = await (await fetch("veri/iller.json")).json();
  const sec = $("il");
  [...ILLER].sort((a, b) => a[1].localeCompare(b[1], "tr")).forEach((il) => sec.add(new Option(il[1], il[0])));
  const enGec = isoGun(new Date(Date.now() - 7 * 864e5));
  $("tarih").max = enGec;

  const p = new URLSearchParams(location.search);
  let iso = p.get("t"), ilNo = Number(p.get("il")), ornek = false;
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso) || !ILLER.some((x) => x[0] === ilNo)) {
    const b = new Date(); b.setFullYear(b.getFullYear() - 30);
    iso = isoGun(b); ilNo = 34; ornek = true;
  }
  $("tarih").value = iso; sec.value = ilNo;
  calistir(ilNo, iso, ornek);

  $("form").addEventListener("submit", (e) => {
    e.preventDefault();
    const t = $("tarih").value;
    if (!t) return;
    calistir(Number(sec.value), t, false);
    $("sonuc").scrollIntoView({ behavior: "smooth", block: "start" });
  });
  $("paylasBtn").addEventListener("click", paylas);
  $("baglantiBtn").addEventListener("click", async () => {
    if (!son) return;
    const u = `${location.origin}${location.pathname}?t=${son.iso}&il=${son.il[0]}`;
    try { await navigator.clipboard.writeText(u); $("paylasNot").textContent = "Bağlantı kopyalandı."; }
    catch (e) { $("paylasNot").textContent = u; }
  });
}
baslat();
