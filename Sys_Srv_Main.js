/**
 * ==========================================
 * SATSUMI SYSTEM: MAIN CONTROLLER
 * ==========================================
 */
function doGet(e) {
  const page = e.parameter.page;
  const view = e.parameter.v;
  const scriptUrl = ScriptApp.getService().getUrl(); // Ambil URL Aktif (Penting!)

  // 1. HALAMAN VERIFIKASI (Publik - ?page=verify)
  if (page === 'verify') {
    let tmp = HtmlService.createTemplateFromFile('Verify');
    tmp.nik = e.parameter.nik || "";
    tmp.period = e.parameter.period || "";
    return tmp.evaluate().setTitle('SIPGTK - Verifikasi').addMetaTag('viewport', 'width=device-width, initial-scale=1');
  }

  // 2. HALAMAN LOGIN (Default jika tidak ada parameter, atau ?page=login)
  if (page === 'login' || (!page && !view)) {
  let shell = HtmlService.createTemplateFromFile('Sys_View_Index');
  shell.scriptUrl = scriptUrl; 
  shell.params = JSON.stringify(e.parameter || {}); // Kirim parameter v ke JS
  
  return shell.evaluate()
    .setTitle('Satsumi App')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }

  // 3. HALAMAN UTAMA / SHELL (Untuk v=scanner, v=admin, v=user, dll)
  let shell = HtmlService.createTemplateFromFile('Sys_View_Index');
  shell.scriptUrl = scriptUrl; 
  shell.params = JSON.stringify(e.parameter || {}); // Kirim parameter v ke JS
  
  return shell.evaluate()
    .setTitle('Satsumi App')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(filename) {
  return HtmlService.createTemplateFromFile(filename).evaluate().getContent();
}

/** Fungsi pembantu untuk Logout/Redirect */
function getScriptUrl() {
  return ScriptApp.getService().getUrl();
}