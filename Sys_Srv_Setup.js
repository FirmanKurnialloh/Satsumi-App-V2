/**
 * ==========================================
 * SATSUMI SYSTEM: INITIAL SETUP
 * ==========================================
 */
function createInitialAdmin() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Master_User");
  const nik = "3201xxxxxxxxxxxx";
  const email = "admin@smpn1sukaresmi.sch.id";
  const passwordMentah = "admin123";
  const nama = "Super Admin Satsumi";
  const hashedPass = hashPassword_(passwordMentah);
  
  sheet.getRange(2, 1, 1, 6).setValues([[nik, email, hashedPass, nama, "Super Admin", "Aktif"]]);
  return "Admin Berhasil Dibuat. Login menggunakan Email: " + email;
}

function createInitialUser() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Master_User");
  const nik = "3202xxxxxxxxxxxx";
  const email = "user@smpn1sukaresmi.sch.id";
  const passwordMentah = "user123";
  const nama = "Super User Satsumi";
  const hashedPass = hashPassword_(passwordMentah);
  
  sheet.getRange(3, 1, 1, 6).setValues([[nik, email, hashedPass, nama, "Super User", "Aktif"]]);
  return "User Berhasil Dibuat. Login menggunakan Email: " + email;
}

function hashPassword_(password) {
  const signature = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, password);
  return signature.map(b => (b < 0 ? b + 256 : b).toString(16).padStart(2, '0')).join('');
}