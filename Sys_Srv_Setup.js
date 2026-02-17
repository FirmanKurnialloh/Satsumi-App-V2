/**
 * ==========================================
 * SATSUMI SYSTEM: INITIAL SETUP
 * ==========================================
 */
function createInitialAdmin() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Master_User");
  const nik = "3201xxxxxxxxxxxx";
  const email = "admin@smpn1sukaresmi.sch.id";
  const passwordMentah = generateRandomPassword(10);
  const nama = "Super Admin Satsumi";
  const hashedPass = hashPassword_(passwordMentah);
  
  sheet.getRange(2, 1, 1, 6).setValues([[nik, email, hashedPass, nama, "Super Admin", "Aktif"]]);
  return "Admin Berhasil Dibuat. Login menggunakan Email: " + email + ". Silakan atur password melalui menu reset jika diperlukan.";
}

function createInitialUser() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Master_User");
  const nik = "3202xxxxxxxxxxxx";
  const email = "user@smpn1sukaresmi.sch.id";
  const passwordMentah = generateRandomPassword(8);
  const nama = "Super User Satsumi";
  const hashedPass = hashPassword_(passwordMentah);
  
  sheet.getRange(3, 1, 1, 6).setValues([[nik, email, hashedPass, nama, "Super User", "Aktif"]]);
  return "User Berhasil Dibuat. Login menggunakan Email: " + email + ". Silakan atur password melalui menu reset jika diperlukan.";
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

function hashPassword_(password) {
  try {
    // Use CryptoJS with server-side salt (pepper) if available
    const salt = (typeof getSecretSalt_ === 'function') ? getSecretSalt_() : '';
    return CryptoJS.SHA256(String(password) + String(salt)).toString();
  } catch (e) {
    const signature = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, password);
    return signature.map(b => (b < 0 ? b + 256 : b).toString(16).padStart(2, '0')).join('');
  }
}