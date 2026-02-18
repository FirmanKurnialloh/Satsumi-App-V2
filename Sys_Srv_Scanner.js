function getCurrentSessionMode() {
  const settings = getSessionSettings();
  const now = new Date();

  const jam = Utilities.formatDate(now, "GMT+7", "HH:mm");
  const menit = timeToMinutes(jam);

  const masukMulai   = timeToMinutes(settings["Masuk Mulai"]);
  const masukSampai  = timeToMinutes(settings["Masuk Sampai"]);
  const pulangMulai  = timeToMinutes(settings["Pulang Mulai"]);
  const pulangSampai = timeToMinutes(settings["Pulang Sampai"]);

  let mode = "DI LUAR SESI";

  if (menit < masukMulai) mode = "HADIR CEPAT";
  else if (menit >= masukMulai && menit <= masukSampai) mode = "SESI MASUK";
  else if (menit > masukSampai && menit < pulangMulai) mode = "TERLAMBAT";
  else if (menit >= pulangMulai && menit <= pulangSampai) mode = "SESI PULANG";
  else if (menit > pulangSampai) mode = "SESI LEMBUR";

  return { mode };
}


function getSessionSettings() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Settings");
  const data = sheet.getDataRange().getDisplayValues();

  let cfg = {};

  for (let i = 0; i < data.length; i++) {
    const key = data[i][0];
    const val = data[i][1];
    if (key && val) cfg[key] = val;
  }

  return cfg;
}

function timeToMinutes(t) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}


function getModeAndKeterangan(now, settings) {
  const jamStr = Utilities.formatDate(now, "GMT+7", "HH:mm");
  const menitSekarang = timeToMinutes(jamStr);

  const masukMulai   = timeToMinutes(settings["Masuk Mulai"]);
  const masukSampai  = timeToMinutes(settings["Masuk Sampai"]);
  const pulangMulai  = timeToMinutes(settings["Pulang Mulai"]);
  const pulangSampai = timeToMinutes(settings["Pulang Sampai"]);
  const lemburMulai  = timeToMinutes(settings["Lembur Mulai"]);

  // ======================
  // SESI MASUK
  // ======================
  if (menitSekarang < masukMulai) {
    return { mode: "Masuk", ket: "Hadir Cepat" };
  }
  if (menitSekarang >= masukMulai && menitSekarang <= masukSampai) {
    return { mode: "Masuk", ket: "Tepat Waktu" };
  }
  if (menitSekarang > masukSampai && menitSekarang < pulangMulai) {
    const telat = menitSekarang - masukSampai;
    return { mode: "Masuk", ket: "Terlambat " + formatMenit(telat) };
  }

  // ======================
  // SESI PULANG
  // ======================
  if (menitSekarang >= pulangMulai && menitSekarang <= pulangSampai) {
    return { mode: "Pulang", ket: "Normal" };
  }
  if (menitSekarang < pulangMulai) {
    return { mode: "Pulang", ket: "Pulang Cepat" };
  }

  // ======================
  // LEMBUR
  // ======================
  if (menitSekarang > pulangSampai) {
    const lembur = menitSekarang - pulangSampai;
    return { mode: "Lembur", ket: "Lembur " + formatMenit(lembur) };
  }

  return { mode: "Masuk", ket: "Normal" };
}

function formatMenit(menit) {
  const jam = Math.floor(menit / 60);
  const sisa = menit % 60;
  if (jam > 0) return jam + " jam " + sisa + " menit";
  return sisa + " menit";
}


/**
 * MENGAMBIL DATA AKTIVITAS HARI INI BERDASARKAN STRUKTUR BARU
 */
function getScannerData() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName("PRESENSI");
    
    // PERBAIKAN 1: Gunakan getDisplayValues() agar jam dan tanggal persis seperti teks di Sheet
    const data = sheet.getDataRange().getDisplayValues(); 
    
    const today = Utilities.formatDate(new Date(), "GMT+7", "dd/MM/yyyy");
    
    let logs = [];
    let stats = { masuk: 0, izin: 0, sakit: 0, pulang: 0, lembur: 0 };
    let firstScan = null;

    for (let i = data.length - 1; i >= 1; i--) {
      // Data sudah berupa string murni berkat getDisplayValues()
      let rowDate = data[i][0].toString().trim(); 
      
      if (rowDate === today) {
        const entry = {
          nama: data[i][3],       // Kolom D: Nama Lengkap
          jabatan: data[i][4],    // Kolom E: Jabatan
          waktu: data[i][1],      // Kolom B: Jam (Sudah rapi)
          mode: data[i][5],       // Kolom F: Status (Masuk/Pulang)
          keterangan: data[i][6], // Kolom G: Keterangan
          foto: data[i][7]        // Kolom H: Foto
        };
        
        logs.push(entry);

        const status = entry.mode.toLowerCase();
        if (status === 'masuk') stats.masuk++;
        else if (status === 'pulang') stats.pulang++;
        else if (status === 'izin') stats.izin++;
        else if (status === 'sakit') stats.sakit++;
        else if (status === 'lembur') stats.lembur++;

        firstScan = entry; 
      }
    }

    return {
      logs: logs.slice(0, 15), 
      stats: stats,
      first: firstScan
    };
  } catch (e) {
    console.error("Error getScannerData: " + e.toString());
    return { logs: [], stats: { masuk: 0, izin: 0, sakit: 0, pulang: 0, lembur: 0 }, first: null };
  }
}

/**
 * SIMPAN PRESENSI DARI SCANNER KIOSK
 * DENGAN VALIDASI ANTI DUPLIKASI, ANTI SPAM & DETEKSI EARLY BIRD
 */
function simpanPresensi(qrHash, photoData) {
  try {
    qrHash = String(qrHash).trim();

    if (!qrHash || qrHash.length < 20) {
      return { status: "error", message: "QR tidak valid." };
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const userSheet = ss.getSheetByName("DUK");
    const userData = userSheet.getDataRange().getDisplayValues(); 
    // A=Hash, B=NIK, C=Nama, D=Jabatan

    let user = null;

    for (let i = 1; i < userData.length; i++) {
      if (String(userData[i][0]).trim() === qrHash) {
        user = {
          nik: userData[i][1],
          nama: userData[i][2],
          jabatan: userData[i][3] || "Staff"
        };
        break;
      }
    }

    if (!user) {
      return { status: "error", message: "QR tidak terdaftar." };
    }

    const presSheet = ss.getSheetByName("PRESENSI");
    const presData = presSheet.getDataRange().getDisplayValues();
    // A=Tanggal, B=Jam, C=NIK, F=Status

    const now = new Date();
    const jamStr = Utilities.formatDate(now, "GMT+7", "HH:mm:ss");
    const tglStr = Utilities.formatDate(now, "GMT+7", "dd/MM/yyyy");
    
    const settings = getSessionSettings();
    const hasil = getModeAndKeterangan(now, settings);
    const modeStatus = hasil.mode;
    const keterangan = hasil.ket;


    // ===============================
    // VALIDASI DUPLIKASI & ANTI SPAM
    // ===============================
    const BATAS_SPAM_DETIK = 180; // 3 menit

    for (let i = presData.length - 1; i >= 1; i--) {
      const rowTgl = presData[i][0];
      const rowJam = presData[i][1];
      const rowNik = presData[i][2];
      const rowMode = presData[i][5];

      if (rowNik !== user.nik || rowTgl !== tglStr) continue;

      // ❌ MODE SAMA DI HARI YANG SAMA
      if (rowMode === modeStatus) {
        return {
          status: "duplikat",
          nama: user.nama,
          mode: modeStatus,
          message: "Presensi " + modeStatus + " sudah tercatat hari ini."
        };
      }

      // ⏱️ ANTI SPAM (SELISIH WAKTU)
      const lastTime = new Date(tglStr.split("/").reverse().join("-") + " " + rowJam);
      const diffDetik = (now - lastTime) / 1000;

      if (diffDetik < BATAS_SPAM_DETIK) {
        return {
          status: "duplikat", 
          nama: user.nama,
          message: "Presensi terlalu cepat. Silakan tunggu beberapa menit."
        };
      }

      break; 
    }

    // ===============================
    // DETEKSI EARLY BIRD (GAMIFIKASI)
    // ===============================
    let isEarlyBird = false;
    if (modeStatus === "Masuk") {
      let adaMasukHariIni = false;
      // Cek apakah hari ini sudah ada yang absen "Masuk"
      for (let i = presData.length - 1; i >= 1; i--) {
        if (presData[i][0] === tglStr && presData[i][5] === "Masuk") {
          adaMasukHariIni = true;
          break; // Sudah ada yang absen, berarti bukan Early Bird
        }
      }
      if (!adaMasukHariIni) {
        isEarlyBird = true; // Yeay! Dia orang pertama!
      }
    }

    // ===============================
    // SIMPAN FOTO
    // ===============================
    let photoUrl = "";
    if (photoData && photoData.length > 50) {
      try {
        const blob = Utilities.newBlob(
          Utilities.base64Decode(photoData.split(",")[1]),
          "image/jpeg",
          user.nik + "_" + now.getTime() + ".jpg"
        );

        const folder = DriveApp.getFoldersByName("Satsumi_Foto_Presensi").hasNext()
          ? DriveApp.getFoldersByName("Satsumi_Foto_Presensi").next()
          : DriveApp.createFolder("Satsumi_Foto_Presensi");

        const file = folder.createFile(blob);
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        photoUrl = "https://drive.google.com/thumbnail?id=" + file.getId();
      } catch (e) {
        console.warn("Foto gagal disimpan:", e);
      }
    }

    // ===============================
    // SIMPAN DATA PRESENSI
    // ===============================
    presSheet.appendRow([
      tglStr,
      jamStr,
      user.nik,
      user.nama,
      user.jabatan,
      modeStatus,
      keterangan,
      photoUrl
    ]);
    
    // ===============================
    // BALASAN KE KIOSK (DENGAN DATA GAMIFIKASI)
    // ===============================
    return {
      status: "success",
      message: "Presensi " + user.nama + " (" + modeStatus + ") berhasil.",
      nama: user.nama,
      waktu: jamStr,
      mode: modeStatus,
      keterangan: keterangan,   // Tambahan: agar Kiosk bisa membacakan keterangan Tepat Waktu/Terlambat
      foto: photoUrl,           // Tambahan: agar Kiosk bisa menampilkan foto di popup penghargaan
      is_early_bird: isEarlyBird// KUNCI UTAMA: Pemicu animasi Confetti!
    };

  } catch (e) {
    return {
      status: "error",
      message: "Gagal menyimpan presensi: " + e.toString()
    };
  }
}

/**
 * CLIENT-SIDE ENCRYPTION HELPER (for reference)
 */
function encryptNIKServer(nik) {
  return nik;
}