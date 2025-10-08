// === Firebase Firestore bağlantısı ===
const db = window.db;
if (!db) console.error("⚠️ Firebase Firestore tanımlı değil!");

// === DOM Elemanları ===
const masaListesi = document.getElementById("masaListesi");
const masaForm = document.getElementById("masaForm");
const masaAdiInput = document.getElementById("masaAdi");
const masaModal = new bootstrap.Modal(document.getElementById("masaModal"));
const masaBaslik = document.getElementById("masaBaslik");
const masaUrunListesi = document.querySelector("#masaUrunListesi tbody");
const masaToplam = document.getElementById("masaToplam");
const hesapOdeBtn = document.getElementById("hesapOdeBtn");
const odemeTuru = document.getElementById("odemeTuru");

let aktifMasa = null;
let urunler = {};
let masalar = {};

// === Firebase MASALAR ===
async function masalariYukle() {
  const snap = await db.collection("masalar").get();
  masaListesi.innerHTML = "";

  snap.forEach((doc) => {
    const masa = doc.data();
    masalar[doc.id] = masa;

    const card = document.createElement("div");
    card.className = "col-6 col-md-3";
    card.innerHTML = `
      <div class="card masa-card shadow-sm text-center p-3" style="cursor:pointer;" onclick="masaAc('${doc.id}')">
        <h5>${masa.ad}</h5>
      </div>`;
    masaListesi.appendChild(card);
  });
}

// === Firebase ÜRÜNLER ===
async function urunleriYukle() {
  const snap = await db.collection("urunler").get();
  urunler = {};
  const urunKartListesi = document.getElementById("urunKartListesi");
  urunKartListesi.innerHTML = "";

  snap.forEach((doc) => {
    const urun = doc.data();
    urunler[doc.id] = urun;

    const card = document.createElement("div");
    card.className = "col-6 col-md-3";
    card.innerHTML = `
      <div class="card urun-card shadow-sm text-center p-2" onclick="urunEkle('${doc.id}')">
        <div class="card-body">
          <h6 class="card-title">${urun.ad}</h6>
          <p class="text-muted">${urun.fiyat} ₺</p>
        </div>
      </div>`;
    urunKartListesi.appendChild(card);
  });
}

// === Masa Açma ===
async function masaAc(id) {
  aktifMasa = id;
  const masa = masalar[id];
  masaBaslik.innerText = masa.ad;

  await masaUrunleriGoster();
  await urunleriYukle();

  masaModal.show();
}

// === Masa Ürünleri ===
async function masaUrunleriGoster() {
  const masaRef = db.collection("masalar").doc(aktifMasa).collection("urunler");
  const snap = await masaRef.get();

  masaUrunListesi.innerHTML = "";
  let toplam = 0;

  snap.forEach((doc) => {
    const u = doc.data();
    toplam += u.fiyat;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${u.ad}</td>
      <td>${u.fiyat.toFixed(2)} ₺</td>
      <td><button class="btn btn-danger btn-sm" onclick="urunSil('${doc.id}')">🗑️</button></td>`;
    masaUrunListesi.appendChild(tr);
  });

  masaToplam.innerText = toplam.toFixed(2);
}

// === Ürün Ekle ===
async function urunEkle(id) {
  if (!aktifMasa) return;

  const urun = urunler[id];
  await db.collection("masalar").doc(aktifMasa).collection("urunler").add(urun);

  Swal.fire({
    title: "✅ Ürün Eklendi",
    text: `${urun.ad} masaya eklendi.`,
    icon: "success",
    timer: 1200,
    showConfirmButton: false,
  });

  masaUrunleriGoster();
}

// === Ürün Sil ===
async function urunSil(id) {
  await db.collection("masalar").doc(aktifMasa).collection("urunler").doc(id).delete();

  Swal.fire({
    title: "🗑️ Ürün Silindi",
    icon: "info",
    timer: 1000,
    showConfirmButton: false,
  });

  masaUrunleriGoster();
}

// === Masa Ekleme ===
masaForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const ad = masaAdiInput.value.trim();
  if (!ad) return;

  await db.collection("masalar").add({ ad });
  Swal.fire("🎉 Masa Eklendi", ad + " başarıyla eklendi!", "success");
  masaAdiInput.value = "";
  masalariYukle();
});

// === Hesap Ödeme ===
hesapOdeBtn.addEventListener("click", async () => {
  const tur = odemeTuru.value;
  const toplam = parseFloat(masaToplam.innerText);

  if (toplam === 0) {
    Swal.fire("⚠️ Boş Masa", "Bu masada ürün bulunmuyor.", "warning");
    return;
  }

  const masa = masalar[aktifMasa];

  const odeme = {
    masa: masa.ad,
    tutar: toplam,
    tur,
    tarih: new Date().toISOString(),
  };

  try {
    await window.odemeKaydetFirebase(odeme);

    // Ürünleri temizle
    const urunRef = db.collection("masalar").doc(aktifMasa).collection("urunler");
    const snap = await urunRef.get();
    const batch = db.batch();
    snap.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();

    Swal.fire("💰 Ödeme Alındı", `${masa.ad} için ${toplam}₺ (${tur})`, "success");
    masaModal.hide();
    window.guncelCiro();

  } catch (err) {
    console.error("Ödeme işlemi hatası:", err);
    Swal.fire("Hata", "Ödeme kaydedilirken bir sorun oluştu!", "error");
  }
});

// === Sayfa yüklenince ===
document.addEventListener("DOMContentLoaded", async () => {
  await masalariYukle();
  await window.guncelCiro();
});
