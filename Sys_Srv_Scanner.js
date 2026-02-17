/**
 * MENGAMBIL DATA AKTIVITAS HARI INI BERDASARKAN STRUKTUR BARU
 */
function getScannerData() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName("PRESENSI");
    const data = sheet.getDataRange().getValues();
    
    // Gunakan format tanggal sesuai di sheet (dd/MM/yyyy)
    const today = Utilities.formatDate(new Date(), "GMT+7", "dd/MM/yyyy");
    
    let logs = [];
    let stats = { masuk: 0, izin: 0, sakit: 0, pulang: 0, lembur: 0 };
    let firstScan = null;

    // Loop dari baris paling bawah (data terbaru)
    for (let i = data.length - 1; i >= 1; i--) {
      // Pastikan format tanggal di Kolom A dikonversi ke string dd/MM/yyyy untuk perbandingan
      let rowDate = "";
      if (data[i][0] instanceof Date) {
        rowDate = Utilities.formatDate(data[i][0], "GMT+7", "dd/MM/yyyy");
      } else {
        rowDate = data[i][0].toString();
      }
      
      if (rowDate === today) {
        const entry = {
          nama: data[i][3],       // Kolom D: Nama Lengkap
          jabatan: data[i][4],    // Kolom E: Jabatan
          waktu: data[i][1].toString(), // Kolom B: Jam
          mode: data[i][5],       // Kolom F: Status (Masuk/Pulang/Lembur/Izin)
          keterangan: data[i][6],  // Kolom G: Keterangan
          foto: data[i][7]        // Kolom H: Foto
        };
        
        logs.push(entry);

        // Update Statistik berdasarkan Kolom F (Status)
        const status = entry.mode.toLowerCase();
        if (status === 'masuk') stats.masuk++;
        else if (status === 'pulang') stats.pulang++;
        else if (status === 'izin') stats.izin++;
        else if (status === 'sakit') stats.sakit++;
        else if (status === 'lembur') stats.lembur++;

        // First Scan (Early Bird) hari ini
        firstScan = entry; 
      }
    }

    return {
      logs: logs.slice(0, 15), // Ambil 15 aktivitas terbaru sesuai UI Anda
      stats: stats,
      first: firstScan
    };
  } catch (e) {
    console.error("Error getDashboardData: " + e.toString());
    return { logs: [], stats: { masuk: 0, izin: 0, sakit: 0, pulang: 0, lembur: 0 }, first: null };
  }
}