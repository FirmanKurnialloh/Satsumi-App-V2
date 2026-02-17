/**
 * ==========================================
 * SATSUMI GURU: SERVER CONTROLLER & API
 * ==========================================
 */

function checkGuruGatekeeper_(token) {
  if (!token) throw new Error("Akses Ditolak: Sesi kosong.");
  try {
    const parsed = parseSessionToken_(token);
    if (!parsed.valid) throw new Error('Sesi tidak valid.');
    const tokenNik = parsed.nik;
    const dbUser = getUserByNik_(tokenNik); 
    if (!dbUser || !dbUser.role.toUpperCase().includes('GURU')) {
      throw new Error("Akses Ditolak: Area Khusus Guru.");
    }
    return true;
  } catch(e) { throw new Error("Sesi tidak valid."); }
}

function getGuruDashboardData(token) {
  checkGuruGatekeeper_(token);
  // Ini data simulasi, nantinya bisa ditarik dari sheet Jadwal/Nilai
  return {
    jadwalHariIni: 3,
    tugasDiperiksa: 12,
    pesanMasuk: 2
  };
}
