/**
 * ==========================================
 * SATSUMI SYSTEM: GLOBAL CONFIGURATION
 * ==========================================
 */
const CONFIG = {
  get: function(key) {
    if (!this.cache) {
      const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Settings");
      const data = sheet.getDataRange().getValues();
      this.cache = {};
      for (let i = 1; i < data.length; i++) {
        this.cache[data[i][0]] = data[i][1];
      }
    }
    return this.cache[key];
  }
};

function getAppConfig() {
  return {
    appName: CONFIG.get("APP_NAME"),
    version: CONFIG.get("VERSION")
  };
}

/**
 * BRIDGE UNTUK SCANNER
 * Mengambil data database lewat mesin CONFIG
 */
function getPresensiScannerSettings() {
  return {
    info: CONFIG.get("INFO_TICKER") || "Selamat Datang di SIPGTK",
    nama: CONFIG.get("NAMA_SEKOLAH") || "SMPN 1 SUKARESMI",
    versi: CONFIG.get("VERSION") || "v.1.0.0"
  };
}

function initializeFolders() {
  const appName = CONFIG.get("APP_NAME") || "Satsumi_App";
  const mainFolderName = appName + "_DATABASE";
  
  let mainFolder;
  const folders = DriveApp.getFoldersByName(mainFolderName);
  
  if (folders.hasNext()) {
    mainFolder = folders.next();
  } else {
    mainFolder = DriveApp.createFolder(mainFolderName);
  }
  
  const folderId = mainFolder.getId();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Settings");
  const data = sheet.getDataRange().getValues();
  
  let found = false;
  for (let i = 0; i < data.length; i++) {
    if (data[i][0] === "FOLDER_UTAMA") {
      sheet.getRange(i + 1, 2).setValue(folderId);
      found = true;
      break;
    }
  }

  if (!found) {
    sheet.appendRow(["FOLDER_UTAMA", folderId, "ID Folder Database Utama"]);
  }
  return "Folder Berhasil Disiapkan!";
  
}

/**
 * SATSUMI SYSTEM: SECURITY CONFIG
 */
// Secrets are now read from PropertiesService. Set via Project Properties.
function getSecretKey_() {
  try {
    const props = PropertiesService.getScriptProperties();
    return props.getProperty('SECRET_KEY') || "Satsumi_Sipgtk_2026_Key";
  } catch (e) { return "Satsumi_Sipgtk_2026_Key"; }
}

function getSecretSalt_() {
  try {
    const props = PropertiesService.getScriptProperties();
    return props.getProperty('SECRET_SALT') || "Salt_Sipgtk_Secure_2026";
  } catch (e) { return "Salt_Sipgtk_Secure_2026"; }
}

/**
 * DEKRIPSI NIK (Server Side)
 * Digunakan untuk membaca NIK yang masuk dari Scanner
 */
function decryptNIK(ciphertext) {
  try {
    if (typeof CryptoJS !== 'undefined') {
      const key = CryptoJS.SHA256(getSecretKey_());
      const iv  = CryptoJS.SHA256(getSecretSalt_()).toString().substring(0, 32);

      const decrypted = CryptoJS.AES.decrypt(
        ciphertext,
        key,
        {
          iv: CryptoJS.enc.Hex.parse(iv),
          mode: CryptoJS.mode.CBC,
          padding: CryptoJS.pad.Pkcs7
        }
      );

      return decrypted.toString(CryptoJS.enc.Utf8);
    }
    // Fallback: try treating ciphertext as base64-encoded plaintext
    try {
      return Utilities.newBlob(Utilities.base64Decode(String(ciphertext))).getDataAsString();
    } catch (e) {
      return String(ciphertext);
    }
  } catch (e) {
    return "";
  }
}