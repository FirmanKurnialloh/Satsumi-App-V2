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
    const parsed = parseSessionToken_(token);
    if (!parsed.valid) return { valid: false, reason: parsed.reason || "Token tidak valid." };
    const tokenNik = parsed.nik;
    const tokenTime = parsed.t;

    const dbUser = getUserByNik_(tokenNik);
    if (!dbUser) return { valid: false, reason: "Akun tidak ditemukan di Database." };

    if (String(clientUser.role) !== String(dbUser.role)) return { valid: false, reason: "SECURITY ALERT: Manipulasi Role Terdeteksi!" };
    if (String(clientUser.email) !== String(dbUser.email)) return { valid: false, reason: "SECURITY ALERT: Manipulasi Email Terdeteksi!" };
    if (String(clientUser.status) !== "Aktif") return { valid: false, reason: "Akun dinonaktifkan Admin." };

    return { valid: true, freshUser: dbUser };
  } catch (e) { return { valid: false, reason: "Token Ilegal/Rusak." }; }
}

function parseSessionToken_(token) {
  try {
    const parts = String(token).split('.');
    if (parts.length !== 2) return { valid: false, reason: 'Format token salah.' };
    const payloadB64 = parts[0];
    const sigB64 = parts[1];
    const payloadStr = Utilities.newBlob(Utilities.base64Decode(payloadB64)).getDataAsString();

    const signature = Utilities.computeHmacSignature(Utilities.MacAlgorithm.HMAC_SHA_256, payloadStr, getSecretKey_());
    const expectedSig = Utilities.base64Encode(signature);
    if (expectedSig !== sigB64) return { valid: false, reason: 'Signature token tidak cocok.' };

    const obj = JSON.parse(payloadStr);
    const now = new Date().getTime();
    if (now - parseInt(obj.t) > 24 * 60 * 60 * 1000) return { valid: false, reason: 'Sesi kedaluwarsa. Login ulang.' };
    return { valid: true, nik: obj.nik, t: obj.t };
  } catch (e) { return { valid: false, reason: 'Token parse error.' }; }
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
  const payload = JSON.stringify({ nik: nik, t: timestamp });
  const payloadB64 = Utilities.base64Encode(payload);
  const signature = Utilities.computeHmacSignature(Utilities.MacAlgorithm.HMAC_SHA_256, payload, getSecretKey_());
  const sigB64 = Utilities.base64Encode(signature);
  return payloadB64 + '.' + sigB64;
}

// --- FUNGSI GANTI PASSWORD GLOBAL ---
function changeMyPassword(token, form) {
  if (!token) return { status: 'error', message: 'Akses ditolak: Sesi tidak valid.' };
  try {
    const parsed = parseSessionToken_(token);
    if (!parsed.valid) return { status: 'error', message: 'Sesi tidak valid.' };
    const tokenNik = parsed.nik;
    
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