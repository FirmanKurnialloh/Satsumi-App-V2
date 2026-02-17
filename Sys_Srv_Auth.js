/**
 * ==========================================
 * SATSUMI SYSTEM: AUTHENTICATION & SECURITY
 * ==========================================
 */
function checkLogin(creds) {
  const props = PropertiesService.getScriptProperties();
  const isMaintenance = props.getProperty('MAINTENANCE') === 'true';
  
  // MENGGUNAKAN ACTIVE SPREADSHEET (STANDAR SATSUMI)
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Master_User");
  
  const data = sheet.getDataRange().getValues();
  const hashedInput = hashPassword_(creds.password); 

  for (let i = 1; i < data.length; i++) {
    if (data[i][1].toString().toLowerCase() === creds.email.toLowerCase() && 
        data[i][2].toString() === hashedInput) {
      
      const user = extractUserFromRow_(data[i]);
      if (isMaintenance && user.role !== 'Super Admin' && user.role !== 'Super User') {
        return { status: "error", message: "Sistem sedang dalam PERBAIKAN." };
      }

      const token = createSessionToken_(user.nik);
      return { status: "success", user: user, token: token };
    }
  }
  return { status: "error", message: "Email atau Password salah!" };
}

function validateSessionToken(token, clientUser) {
  if (!token || !clientUser) return { valid: false, reason: "Token/Data hilang." };
  try {
    const decoded = Utilities.newBlob(Utilities.base64Decode(token)).getDataAsString();
    const [tokenNik, tokenTime] = decoded.split("|");
    const now = new Date().getTime();
    if (now - parseInt(tokenTime) > 24 * 60 * 60 * 1000) return { valid: false, reason: "Sesi kedaluwarsa. Login ulang." };

    const dbUser = getUserByNik_(tokenNik);
    if (!dbUser) return { valid: false, reason: "Akun tidak ditemukan di Database." };

    if (String(clientUser.role) !== String(dbUser.role)) return { valid: false, reason: "SECURITY ALERT: Manipulasi Role Terdeteksi!" };
    if (String(clientUser.email) !== String(dbUser.email)) return { valid: false, reason: "SECURITY ALERT: Manipulasi Email Terdeteksi!" };
    if (String(clientUser.status) !== "Aktif") return { valid: false, reason: "Akun dinonaktifkan Admin." };

    return { valid: true, freshUser: dbUser };
  } catch (e) { return { valid: false, reason: "Token Ilegal/Rusak." }; }
}

function getUserByNik_(nik) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Master_User");
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(nik)) return extractUserFromRow_(data[i]);
  }
  return null;
}

function extractUserFromRow_(row) {
  return { nik: String(row[0]), email: String(row[1]), nama: String(row[3]), role: String(row[4]), status: String(row[5]) };
}

function createSessionToken_(nik) {
  const timestamp = new Date().getTime();
  const secret = "SATSUMI_INTERNAL_SERVER_SECRET"; 
  return Utilities.base64Encode(`${nik}|${timestamp}|${secret}`);
}

// --- FUNGSI GANTI PASSWORD GLOBAL ---
function changeMyPassword(token, form) {
  if (!token) return { status: 'error', message: 'Akses ditolak: Sesi tidak valid.' };
  try {
    const decoded = Utilities.newBlob(Utilities.base64Decode(token)).getDataAsString();
    const [tokenNik] = decoded.split("|");
    
    // Keamanan: Pastikan NIK di token cocok dengan NIK yang mau diganti (Tidak bisa ganti sandi orang lain)
    if (String(tokenNik) !== String(form.nik)) {
      return { status: 'error', message: 'Akses Ditolak: Anda tidak bisa mengubah sandi orang lain!' };
    }

    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Master_User");
    const data = sheet.getDataRange().getValues();
    const oldPassHash = hashPassword_(form.oldPass); // Menggunakan fungsi hash global
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
    return { status: 'error', message: 'User tidak ditemukan di Database.' };
  } catch(e) {
    return { status: 'error', message: 'Sesi kedaluwarsa.' };
  }
}