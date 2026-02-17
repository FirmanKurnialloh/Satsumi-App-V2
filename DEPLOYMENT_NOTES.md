# Satsumi App V2 – Deployment & Configuration Guide

## 📋 Pre-Deployment Checklist

### 1. Project Properties (Secret Configuration)
Before deploying, set the following in Google Apps Script **Project Settings** → **Project Properties**:

| Property Name | Example Value | Description |
|---|---|---|
| `SECRET_KEY` | `YourSecureKey_2026` | HMAC signing key for session tokens (use strong random string) |
| `SECRET_SALT` | `YourSecureSalt_2026` | Salt for additional hashing (use strong random string) |

**How to Set:**
1. In Apps Script editor: **Project Settings** (gear icon, right panel)
2. Add these keys under "Deployment"
3. Generate secure values using `Math.random().toString(36).slice(2)` or similar

### 2. Required Spreadsheet Structure
Ensure the spreadsheet has these sheets:

| Sheet Name | Purpose | Key Columns |
|---|---|---|
| `Master_User` | Admin/Guru/Tendik/Siswa database | NIK, Email, Password (hashed), Nama, Role, Status |
| `Log_Presensi` | Attendance logs | Tanggal, Nama, Waktu, Status |
| `Settings` | Global config & app metadata | Setting Name, Value, Deskripsi |

### 3. Settings Sheet Configuration
Populate the `Settings` sheet with:

```
APP_NAME | Satsumi App | Nama Aplikasi
VERSION | v2.1.0 | Versi Aplikasi
NAMA_SEKOLAH | SMP Negeri 1 | Nama Sekolah/Institusi
INFO_TICKER | Selamat datang di SIPGTK | Info teks berjalan
MAINTENANCE | false | Mode perbaikan (true/false)
```

---

## 🔒 Security Hardening Summary

### Token System
- **Type:** HMAC-SHA256 signed JWT-like tokens
- **Format:** `{base64(payload)}.{base64(signature)}`
- **Expiry:** 24 hours
- **Storage (Client):** localStorage keys `sess_t` (token) and `sess_u_aes` (AES-encrypted user data)

### Password Hashing
- **Client-Side:** CryptoJS SHA256 (for display only, never send raw passwords)
- **Server-Side:** Native Google Utilities.Hash or fallback hash
- Temporary passwords are 8 chars, cryptographically random

### Network Security
- All server functions validate tokens before any data access
- Admin functions use `checkAdminGatekeeper_(token)` to verify role
- Rate-limiting: max 5 requests per 60 seconds per token (to prevent brute-force)

### Script Injection & CSP
- ✅ Removed inline blob URL injection (unsafe in Apps Script)
- ✅ Scanner page loaded via top-level redirect (`?v=scanner`)
- ✅ Inline onclick handlers converted to event listeners
- ✅ No hardcoded secrets in source code

---

## 🚀 Deployment Steps

### Step 1: Update Project Properties
```javascript
// In Apps Script console, run once:
PropertiesService.getScriptProperties().setProperty('SECRET_KEY', 'GenerateStrongKeyHere');
PropertiesService.getScriptProperties().setProperty('SECRET_SALT', 'GenerateStrongSaltHere');
```

### Step 2: Deploy as Web App
1. **Apps Script Editor** → **Deploy** (top right)
2. Select **New deployment** → Type: **Web app**
3. **Execute as:** Your account
4. **Who has access:** Anyone (if public kiosk) or specific domain
5. **Deploy** and copy the deployment URL

### Step 3: Test Login Flow
- Open deployment URL in incognito/private browser
- Login with test admin account (check Master_User sheet)
- Verify dashboard loads without flicker
- Test navigation: Dashboard → Users → Absensi → Settings

### Step 4: Test Scanner (Deep-Link)
```
https://{deployment-url}?v=scanner
```
- Should load scanner directly without login
- Camera permission dialog should appear
- Should scan and log NIK to presence sheet

### Step 5: Test Admin Functions
1. **Add User:** Click "Tambah Akun" → Fill form → Temp password shown in modal → Copy & send to user
2. **Reset Password:** Click reset icon → Temp password modal → Copy & send
3. **Edit User:** Click edit → Change email/name/role → Save
4. **Delete User:** Click delete → Confirm → User removed from Master_User

---

## 🐛 Troubleshooting

### Issue: "Signature token tidak cocok"
**Cause:** SECRET_KEY doesn't match between login and subsequent requests
**Fix:** Verify SECRET_KEY is set correctly in Project Properties (no typos)

### Issue: Modal doesn't appear or is unclickable
**Cause:** Z-index conflicts or modal not appended to body
**Fix:** Check browser console (F12) → Console tab. Look for CSS/z-index errors. Modal should have z-index 1000002+.

### Issue: Scanner page shows login briefly then 404
**Cause:** Server not returning Sys_View_Scanner HTML for `?v=scanner`
**Fix:** Check that the doGet() function handles `v=scanner` and returns HtmlService.createHtmlOutput(HtmlService.createTemplateFromFile('Sys_View_Scanner').evaluate());

### Issue: Password reset shows "-" instead of actual password
**Cause:** Temp password not passed to modal
**Fix:** Check `openResetModalFromBtn` in admin JS – ensure it calls `openTempPassModal` with correct params

### Issue: Logout not working
**Cause:** localStorage not clearing or redirect URL wrong
**Fix:** Check browser console for JavaScript errors. Ensure `BASE_URL` is defined in global scope.

---

## 📊 Monitoring & Maintenance

### View Rate-Limit Status
```javascript
// In Apps Script console:
const props = PropertiesService.getUserProperties();
const keys = props.getKeys();
keys.filter(k => k.startsWith('ratelimit_')).forEach(k => {
  Logger.log(k + ': ' + props.getProperty(k));
});
```

### Clear Old Rate-Limit Entries
```javascript
const props = PropertiesService.getUserProperties();
const keys = props.getKeys();
keys.filter(k => k.startsWith('ratelimit_')).forEach(k => {
  props.deleteProperty(k);
});
```

### Enable Maintenance Mode
```javascript
// Prevent non-Super users from logging in
PropertiesService.getScriptProperties().setProperty('MAINTENANCE', 'true');
```

---

## 📝 File Structure Overview

```
Satsumi App V2/
├── Sys_Js_Global.html           ← Global utilities, routing, encryption
├── Sys_Js_Auth.html             ← Login/session logic, scanner loader
├── Sys_Srv_Auth.js              ← Token creation/validation, HMAC
├── Sys_Srv_Config.js            ← Secret getters, config constants
├── Sys_Css_Global.html          ← Global styles, z-index fixes
├── Sys_View_Index.html          ← Main HTML shell, early CSS hide
├── Sys_View_Scanner.html        ← Scanner module (full page, modern JS)
├── Sys_View_Login.html          ← Login form UI
│
├── Adm_Js_Core.html             ← Admin dashboard logic
├── Adm_Srv_API.js               ← Admin CRUD APIs (with rate-limit)
├── Adm_View_PageUsers.html      ← Users management page
├── Adm_View_Modals.html         ← Modal overlays (temp-pass, logout, etc)
├── Adm_View_Sidebar.html        ← Admin sidebar navigation
├── Adm_View_Topbar.html         ← Admin topbar (user profile)
│
├── Gru_Js_Core.html             ← Guru dashboard logic
├── Gru_View_Main.html           ← Guru main page
│
└── appsscript.json              ← Apps Script manifest
```

---

## ✅ Security Best Practices

1. **Always use HTTPS** (Apps Script does this by default)
2. **Rotate SECRET_KEY & SECRET_SALT periodically** (e.g., monthly)
3. **Monitor failed login attempts** (add to Log_Presensi or separate log)
4. **Keep password reset logs** for audit trails
5. **Never share temporary passwords in plain text via email** – use system notifications or SMS
6. **Test in incognito mode regularly** to detect cached auth issues
7. **Check browser console (F12)** for JavaScript warnings on every deployment

---

## 📞 Support & Escalation

| Issue | Contact |
|---|---|
| Apps Script errors | Check `Ctrl+Shift+J` (browser console) & Apps Script logs |
| Spreadsheet permission | Check Master_User sheet access |
| Token expiry | Verify system time is correct & SECRET_KEY matches |
| Scanner hardware | Test camera permissions in browser settings |

---

**Last Updated:** February 17, 2026  
**Version:** v2.1.0  
**Maintainer:** Satsumi Admin Team
