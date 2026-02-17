/**
 * ==========================================
 * SATSUMI ADMIN: SERVER CONTROLLER & API
 * ==========================================
 */

// --- FUNGSI VALIDASI TOKEN ADMIN ---
function checkAdminGatekeeper_(token) {
  if (!token) throw new Error("Akses Ditolak: Token sesi tidak ditemukan.");
  try {
    const decoded = Utilities.newBlob(Utilities.base64Decode(token)).getDataAsString();
    const [tokenNik] = decoded.split("|");
    const dbUser = getUserByNik_(tokenNik); // Fungsi ini ada di Sys_Srv_Auth
    if (!dbUser || (!dbUser.role.toUpperCase().includes('ADMIN') && !dbUser.role.toUpperCase().includes('SUPER'))) {
      throw new Error("Akses Ditolak: Anda bukan Administrator.");
    }
    return true;
  } catch(e) { throw new Error("Sesi tidak valid atau telah kedaluwarsa."); }
}

function getAdminDashboardData(token) {
  checkAdminGatekeeper_(token);
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const userSheet = ss.getSheetByName("Master_User");
  const data = userSheet.getDataRange().getValues();
  data.shift(); 

  let totalHadirHariIni = 0;
  try {
    const absensiSheet = ss.getSheetByName("Log_Presensi");
    if (absensiSheet) {
      const today = Utilities.formatDate(new Date(), "GMT+7", "yyyy-MM-dd");
      const absensiData = absensiSheet.getDataRange().getValues();
      totalHadirHariIni = absensiData.filter(r => {
        const tglRow = Utilities.formatDate(new Date(r[1]), "GMT+7", "yyyy-MM-dd"); 
        return tglRow === today;
      }).length;
    }
  } catch(e) { totalHadirHariIni = 0; }

  const stats = {
    total: data.length,
    guru: data.filter(r => String(r[4]).toLowerCase() === 'guru').length,
    tendik: data.filter(r => String(r[4]).toLowerCase() === 'tendik').length,
    siswa: data.filter(r => String(r[4]).toLowerCase() === 'siswa').length,
    persenPresensi: data.length > 0 ? Math.round((totalHadirHariIni / data.length) * 100) : 0
  };

  const recent = data.slice(-5).reverse().map(r => ({ nik: r[0], nama: r[3], role: r[4], status: r[5] }));
  return { stats: stats, table: recent };
}

function getAllUsers(token) {
  checkAdminGatekeeper_(token);
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Master_User");
  const data = sheet.getDataRange().getValues();
  data.shift(); 
  return data.map(r => ({ nik: r[0], email: r[1], nama: r[3], role: r[4], status: r[5] }));
}

// function saveUser(token, form) {
//   checkAdminGatekeeper_(token);
//   const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Master_User");
//   const data = sheet.getDataRange().getValues();
//   for(let i=1; i<data.length; i++) {
//     if(String(data[i][0]) === String(form.nik)) return { status: 'error', message: 'NIK sudah terdaftar!' };
//   }

//   const defaultPass = hashPassword_("123456");
//   sheet.appendRow([form.nik, form.email, defaultPass, form.nama, form.role, "Aktif", ""]);
//   return { status: 'success', message: 'User berhasil ditambahkan.' };
// }

function saveUser(token, form) {
  checkAdminGatekeeper_(token);
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Master_User");
  const data = sheet.getDataRange().getValues();
  for(let i=1; i<data.length; i++) {
    if(String(data[i][0]) === String(form.nik)) return { status: 'error', message: 'NIK sudah terdaftar!' };
  }

  const defaultPass = hashPassword_("123456");
  sheet.appendRow([form.nik, form.email, defaultPass, form.nama, form.role, "Aktif", ""]);
  
  // ---> TRIGGGER NOTIFIKASI DI SINI <---
  // Hanya contoh, pastikan Anda sudah mengatur App ID OneSignal di Sys_Srv_Notif.gs
  try {
    const pesanNotif = "Pengguna baru telah ditambahkan: " + form.nama + " sebagai " + form.role;
    sendNotificationToAll("Info Admin Satsumi", pesanNotif);
  } catch(e) { /* Abaikan jika notif error agar tidak mengganggu proses simpan */ }

  return { status: 'success', message: 'User berhasil ditambahkan.' };
}

function editUser(token, form) {
  checkAdminGatekeeper_(token);
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Master_User");
  const data = sheet.getDataRange().getValues();
  for(let i=1; i<data.length; i++) {
    if(String(data[i][0]) === String(form.nik)) {
      sheet.getRange(i+1, 2).setValue(form.email);
      sheet.getRange(i+1, 4).setValue(form.nama);
      sheet.getRange(i+1, 5).setValue(form.role);
      return { status: 'success', message: 'Data user diperbarui.' };
    }
  }
  return { status: 'error', message: 'User tidak ditemukan.' };
}

function resetUserPassword(token, nik) {
  checkAdminGatekeeper_(token);
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Master_User");
  const data = sheet.getDataRange().getValues();
  const defaultPass = hashPassword_("123456");

  for(let i=1; i<data.length; i++) {
    if(String(data[i][0]) === String(nik)) {
      sheet.getRange(i+1, 3).setValue(defaultPass);
      return { status: 'success', message: 'Password direset ke: 123456' };
    }
  }
  return { status: 'error', message: 'User tidak ditemukan.' };
}

function deleteUser(token, nik) {
  checkAdminGatekeeper_(token);
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Master_User");
  const data = sheet.getDataRange().getValues();
  const targetNik = String(nik).trim();
  for(let i=1; i<data.length; i++) {
    if(String(data[i][0]).trim() === targetNik) {
      sheet.deleteRow(i + 1);
      return { status: 'success', message: 'User ' + targetNik + ' berhasil dihapus.' };
    }
  }
  return { status: 'error', message: 'Gagal: NIK tidak ditemukan.' };
}

function getAbsensiSimulasi(token) {
  checkAdminGatekeeper_(token);
  return [
    { nama: "Budi Santoso", waktu: "06:45", status: "HADIR" },
    { nama: "Siti Aminah", waktu: "06:50", status: "HADIR" },
    { nama: "Rudi Hartono", waktu: "-", status: "ALPHA" },
  ];
}

function changeUserPassword(token, form) {
  checkAdminGatekeeper_(token);
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Master_User");
  const data = sheet.getDataRange().getValues();
  const oldPassHash = hashPassword_(form.oldPass);
  const newPassHash = hashPassword_(form.newPass);

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(form.nik)) {
      if (String(data[i][2]) === oldPassHash) {
        sheet.getRange(i + 1, 3).setValue(newPassHash);
        return { status: 'success', message: 'Password berhasil diperbarui!' };
      } else {
        return { status: 'error', message: 'Password Lama salah!' };
      }
    }
  }
  return { status: 'error', message: 'User tidak ditemukan.' };
}

function getSystemSettings(token) {
  checkAdminGatekeeper_(token);
  const props = PropertiesService.getScriptProperties();
  return {
    appName: props.getProperty('APP_NAME') || 'Satsumi App',
    appDesc: props.getProperty('APP_DESC') || 'Sistem Administrasi Terpadu',
    maintenance: props.getProperty('MAINTENANCE') === 'true'
  };
}

function saveSystemSettings(token, form) {
  checkAdminGatekeeper_(token);
  try {
    const props = PropertiesService.getScriptProperties();
    props.setProperty('APP_NAME', form.appName);
    props.setProperty('APP_DESC', form.appDesc);
    return { status: 'success', message: 'Pengaturan disimpan.' };
  } catch (e) { return { status: 'error', message: 'Gagal menyimpan: ' + e.message }; }
}

function toggleMaintenanceMode(token, isActive) {
  checkAdminGatekeeper_(token);
  const props = PropertiesService.getScriptProperties();
  props.setProperty('MAINTENANCE', isActive.toString());
  return { status: 'success', message: isActive ? 'Mode Perbaikan DIAKTIFKAN.' : 'Mode Perbaikan DIMATIKAN.' };
}