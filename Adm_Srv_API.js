/**
 * ==========================================
 * SATSUMI ADMIN: SERVER CONTROLLER & API
 * ==========================================
 * Security Features:
 * - Token validation (HMAC-SHA256)
 * - Admin/Super gatekeeper checks
 * - Rate-limiting (Adjusted for Navigation)
 */

/**
 * Pelonggaran Rate-limit: Mengizinkan hingga 15 permintaan per 60 detik
 */
function checkRateLimit_(token) {
  try {
    const props = PropertiesService.getUserProperties();
    const key = 'ratelimit_' + (token ? token.substring(0, 8) : 'anon');
    const stored = JSON.parse(props.getProperty(key) || '{"count":0,"ts":0}');
    const now = new Date().getTime();
    
    if (stored.ts < now - 60000) {
      stored.count = 0;
      stored.ts = now;
    }
    
    stored.count++;
    if (stored.count > 15) {
      throw new Error("Terlalu banyak permintaan. Coba lagi dalam 1 menit.");
    }
    
    props.setProperty(key, JSON.stringify(stored));
    return true;
  } catch(e) {
    if (e.message.includes("Terlalu banyak")) throw e;
    console.warn("Rate limit check failed (bypassed)", e);
    return true;
  }
}

function checkAdminGatekeeper_(token) {
  if (!token) throw new Error("Akses Ditolak: Token sesi tidak ditemukan.");
  try {
    const parsed = parseSessionToken_(token);
    if (!parsed.valid) throw new Error('Sesi tidak valid.');
    const tokenNik = parsed.nik;
    const dbUser = getUserByNik_(tokenNik);
    if (!dbUser || (!dbUser.role.toUpperCase().includes('ADMIN') && !dbUser.role.toUpperCase().includes('SUPER'))) {
      throw new Error("Akses Ditolak: Anda bukan Administrator.");
    }
    return true;
  } catch(e) { throw new Error("Sesi tidak valid atau telah kedaluwarsa."); }
}

function generateRandomPassword(length) {
  length = length || 8;
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*';
  let out = '';
  for (let i = 0; i < length; i++) {
    out += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return out;
}

function getAdminDashboardData(token) {
  checkRateLimit_(token);
  checkAdminGatekeeper_(token);
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const userSheet = ss.getSheetByName("Master_User");
  const data = userSheet.getDataRange().getValues();
  data.shift(); 

  let totalHadirHariIni = 0;
  try {
    const absensiSheet = ss.getSheetByName("PRESENSI") || ss.getSheetByName("Log_Presensi");
    if (absensiSheet) {
      const today = Utilities.formatDate(new Date(), "GMT+7", "dd/MM/yyyy");
      const absensiData = absensiSheet.getDataRange().getValues();
      totalHadirHariIni = absensiData.filter(r => {
        if (!r[0]) return false;
        const tglRow = (r[0] instanceof Date) ? Utilities.formatDate(r[0], "GMT+7", "dd/MM/yyyy") : String(r[0]);
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
  checkRateLimit_(token);
  checkAdminGatekeeper_(token);
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Master_User");
  const data = sheet.getDataRange().getValues();
  data.shift(); 
  return data.map(r => ({ nik: r[0], email: r[1], nama: r[3], role: r[4], status: r[5] }));
}

function saveUser(token, form) {
  checkRateLimit_(token);
  checkAdminGatekeeper_(token);
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Master_User");
  const data = sheet.getDataRange().getValues();
  for(let i=1; i<data.length; i++) {
    if(String(data[i][0]) === String(form.nik)) return { status: 'error', message: 'NIK sudah terdaftar!' };
  }
  const tempPlain = generateRandomPassword(8);
  const defaultPass = hashPassword_(tempPlain);
  sheet.appendRow([form.nik, form.email, defaultPass, form.nama, form.role, "Aktif", ""]);
  return { status: 'success', message: 'User berhasil ditambahkan.', temp: tempPlain };
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
  checkRateLimit_(token);
  checkAdminGatekeeper_(token);
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Master_User");
  const data = sheet.getDataRange().getValues();
  for(let i=1; i<data.length; i++) {
    if(String(data[i][0]) === String(nik)) {
      const tempPlain = generateRandomPassword(8);
      const defaultPass = hashPassword_(tempPlain);
      sheet.getRange(i+1, 3).setValue(defaultPass);
      return { status: 'success', message: 'Password berhasil direset.', temp: tempPlain };
    }
  }
  return { status: 'error', message: 'User tidak ditemukan.' };
}

function deleteUser(token, nik) {
  checkRateLimit_(token);
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

/**
 * MENGAMBIL DATA REKAP PRESENSI HARIAN DENGAN FILTER TANGGAL
 */
function getRekapHarian(token, filterDate) {
  checkRateLimit_(token);
  checkAdminGatekeeper_(token);
  
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("PRESENSI");
  if (!sheet) return [];

  let targetDate;
  if (filterDate) {
    const parts = filterDate.split('-');
    targetDate = parts[2] + "/" + parts[1] + "/" + parts[0];
  } else {
    targetDate = Utilities.formatDate(new Date(), "GMT+7", "dd/MM/yyyy");
  }

  const data = sheet.getDataRange().getValues();
  return data.slice(1).filter(row => {
    if (!row[0]) return false;
    const tgl = (row[0] instanceof Date) ? Utilities.formatDate(row[0], "GMT+7", "dd/MM/yyyy") : String(row[0]);
    return tgl === targetDate;
  }).map(row => ({
    jam: row[1] instanceof Date ? Utilities.formatDate(row[1], "GMT+7", "HH:mm:ss") : String(row[1]),
    nik: String(row[2]),
    nama: row[3],
    jabatan: row[4],
    status: row[5],
    keterangan: row[6] || "-",
    foto: row[7] || ""
  })).reverse();
}

function saveHarianSettings(token, form) {
  checkAdminGatekeeper_(token);
  try {
    const props = PropertiesService.getScriptProperties();
    props.setProperties({
      'SET_HARIAN_MASUK': form.jamMasuk,
      'SET_HARIAN_TOLERANSI': form.jamToleransi,
      'SET_HARIAN_PULANG': form.jamPulang
    });
    return { status: 'success', message: 'Jadwal harian berhasil diperbarui.' };
  } catch (e) { 
    return { status: 'error', message: 'Gagal menyimpan: ' + e.message }; 
  }
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