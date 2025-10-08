// main-siparis.js

// db zaten global olarak HTML içinde tanımlı olmalı
if (!window.db) {
  alert("Firebase başlatılmamış!");
}

// DOM yüklendiğinde
document.addEventListener("DOMContentLoaded", async () => {
  const masaListesi = document.getElementById("masaListesi");
  const masaBaslik = document.getElementById("masaBaslik");
  const masaUrunListesi = document.querySelector("#masaUrunListesi tbody");
  const masaToplam = document.getElementById("masaToplam");
  const urunKartListesi = document.getElementById("urunKartListesi");
  let aktifMasa = null;

  // Firebase’den ürünleri çek
  async function urunleriGetir() {
    const urunler = [];
    try {
      const snapshot = await db.collection("urunler").get();
      snapshot.forEach(doc => urunler.push({ id: doc.id, ...doc.data() }));
    } catch (err) {
      console.log("Ürünler yüklenemedi:", err);
    }
    return urunler;
  }

  // MASA YÜKLEME
  function masalariYukle() {
    const masalar = JSON.parse(localStorage.getItem("masalar") || "[]");
  const masaListesi = document.getElementById("masaListesi"); // PC
  const masaListesiMobile = document.getElementById("masaListesiMobile"); // Mobil

  masaListesi.innerHTML = "";
  masaListesiMobile.innerHTML = "";

  masalar.forEach((m, i) => {
    const cardHTML = `<div class="col-6 col-sm-4 col-md-3">
                        <div class="card p-4 text-center shadow-sm masa-card">
                          <h5>${m.ad}</h5>
                        </div>
                      </div>`;
    masaListesi.innerHTML += cardHTML;
    masaListesiMobile.innerHTML += cardHTML;
  });
  }

  // MASA AÇMA
  async function masaAc(i) {
    aktifMasa = `masa${i}`;
    const masalar = JSON.parse(localStorage.getItem("masalar") || "[]");
    masaBaslik.innerText = masalar[i].ad;
    await urunleriKareListele();
    masaYukle();
    new bootstrap.Modal(document.getElementById("masaModal")).show();
  }

  // ÜRÜN LİSTELEME
  async function urunleriKareListele() {
    const urunler = await urunleriGetir();
    urunKartListesi.innerHTML = "";
    urunler.forEach((urun) => {
      const card = document.createElement("div");
      card.className = "col-6 col-sm-4 col-md-3 col-lg-2";
      card.innerHTML = `<div class="card shadow-sm p-3 text-center h-100 urun-card">
                          <h6>${urun.ad}</h6>
                          <div class="fw-bold">${urun.fiyat} ₺</div>
                        </div>`;
      card.addEventListener("click", () => {
        const adisyon = JSON.parse(localStorage.getItem(aktifMasa) || "[]");
        adisyon.push(urun);
        localStorage.setItem(aktifMasa, JSON.stringify(adisyon));
        masaYukle();
        masalariYukle();
      });
      urunKartListesi.appendChild(card);
    });
  }

  // MASA YÜKLE
  function masaYukle() {
    const adisyon = JSON.parse(localStorage.getItem(aktifMasa) || "[]");
    masaUrunListesi.innerHTML = "";
    let toplam = 0;
    adisyon.forEach((u, i) => {
      masaUrunListesi.innerHTML += `<tr>
                                      <td>${u.ad}</td>
                                      <td>${u.fiyat} ₺</td>
                                      <td><button class="btn btn-danger w-50" onclick="urunCikar(${i})">Sil</button></td>
                                    </tr>`;
      toplam += u.fiyat;
    });
    masaToplam.innerText = toplam.toFixed(2);
  }

  window.urunCikar = i => {
    const adisyon = JSON.parse(localStorage.getItem(aktifMasa) || "[]");
    adisyon.splice(i, 1);
    localStorage.setItem(aktifMasa, JSON.stringify(adisyon));
    masaYukle();
    masalariYukle();
  }

  // ÖDEME
  document.getElementById("hesapOdeBtn").addEventListener("click", async () => {
    const adisyon = JSON.parse(localStorage.getItem(aktifMasa) || "[]");
    if (adisyon.length === 0) {
      Swal.fire("Hata","Ödenecek ürün yok!","warning");
      return;
    }
    const odemeTuru = document.getElementById("odemeTuru").value;
    const toplamTutar = adisyon.reduce((sum, u) => sum + u.fiyat, 0);
    let odemeGecmisi = JSON.parse(localStorage.getItem("odemeGecmisi") || "[]");
    odemeGecmisi.push({ masa: aktifMasa, tutar: toplamTutar, tur: odemeTuru, tarih: new Date().toISOString(), synced: false });
    localStorage.setItem("odemeGecmisi", JSON.stringify(odemeGecmisi));

    try {
      await window.odemeKaydetFirebase({ masa: aktifMasa, tutar: toplamTutar, tur: odemeTuru, tarih: new Date().toISOString() });
      odemeGecmisi = odemeGecmisi.map(o => ({ ...o, synced: true }));
      localStorage.setItem("odemeGecmisi", JSON.stringify(odemeGecmisi));
    } catch (e) { console.log("Offline, daha sonra sync edilecek."); }

    Swal.fire("Başarılı","Ödeme tamamlandı!","success");
    localStorage.setItem(aktifMasa, JSON.stringify([]));
    masaYukle();
    masalariYukle();
    window.guncelCiro();
    new bootstrap.Modal(document.getElementById("masaModal")).hide();
  });

  // MASA YÖNETİMİ
  const masaForm = document.getElementById("masaForm");
  const masaListesiAdmin = document.getElementById("masaListesiAdmin");

  function masalariYukleAdmin() {
    const masalar = JSON.parse(localStorage.getItem("masalar") || "[]");
    masaListesiAdmin.innerHTML = "";
    masalar.forEach((m, i) => {
      masaListesiAdmin.innerHTML += `<div class="d-flex justify-content-between align-items-center p-2 border mb-2 rounded">
                                        <span>${m.ad}</span>
                                        <button class="btn btn-danger btn-sm" onclick="masaSil(${i})">Sil</button>
                                      </div>`;
    });
  }

  masaForm.addEventListener("submit", e => {
    e.preventDefault();
    const ad = document.getElementById("masaAdi").value.trim();
    if (!ad) return;
    const masalar = JSON.parse(localStorage.getItem("masalar") || "[]");
    masalar.push({ ad });
    localStorage.setItem("masalar", JSON.stringify(masalar));
    masaForm.reset();
    masalariYukleAdmin();
    masalariYukle();
  });

  window.masaSil = i => {
    const masalar = JSON.parse(localStorage.getItem("masalar") || "[]");
    masalar.splice(i, 1);
    localStorage.setItem("masalar", JSON.stringify(masalar));
    masalariYukleAdmin();
    masalariYukle();
  }

  masalariYukle();
  masalariYukleAdmin();
  window.guncelCiro();
});
