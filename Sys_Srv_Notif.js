/**
 * ==========================================
 * SATSUMI SYSTEM: PUSH NOTIFICATION SENDER
 * ==========================================
 * Script ini bertugas mengirim perintah Notifikasi ke HP Android pengguna
 * yang sudah menginstal aplikasi WebView (Menggunakan OneSignal API).
 */

const ONESIGNAL_APP_ID = "MASUKKAN_APP_ID_ONESIGNAL_ANDA_DI_SINI";
const ONESIGNAL_REST_KEY = "MASUKKAN_REST_API_KEY_DI_SINI";

/**
 * Mengirim notifikasi ke semua pengguna (Broadcast)
 */
function sendNotificationToAll(title, message) {
  const payload = {
    app_id: ONESIGNAL_APP_ID,
    headings: { "en": title },
    contents: { "en": message },
    included_segments: ["Subscribed Users"] // Kirim ke semua yang instal aplikasi
  };
  
  return executePushNotification_(payload);
}

/**
 * Mengirim notifikasi ke satu user spesifik (Berdasarkan NIK)
 * (Membutuhkan integrasi Tagging/External ID di sisi Android Webview)
 */
function sendNotificationToUser(nik, title, message) {
  const payload = {
    app_id: ONESIGNAL_APP_ID,
    headings: { "en": title },
    contents: { "en": message },
    include_external_user_ids: [String(nik)] // NIK sebagai ID tujuan
  };
  
  return executePushNotification_(payload);
}

/**
 * Engine pengirim HTTP Request ke Server Notifikasi (OneSignal)
 */
function executePushNotification_(payload) {
  const options = {
    method: "post",
    contentType: "application/json",
    headers: {
      "Authorization": "Basic " + ONESIGNAL_REST_KEY
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  try {
    const response = UrlFetchApp.fetch("https://onesignal.com/api/v1/notifications", options);
    Logger.log("Hasil Kirim Notif: " + response.getContentText());
    return true;
  } catch (e) {
    Logger.log("Gagal Kirim Notif: " + e.message);
    return false;
  }
}