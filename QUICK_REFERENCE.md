# Satsumi App V2 – Quick Reference Guide for Developers

**Target Audience:** Developers maintaining or extending Satsumi App  
**Last Updated:** February 17, 2026  
**Version:** 2.1.0

---

## 🚀 Quick Start

### Access the Project
```
Google Apps Script Editor
 ↓
Apps Script Dashboard → Open Project → " Satsumi App V2"
 ↓
appsscript.json → Shows all HTML/JS files included
```

### Project Properties (Secrets)
```
Apps Script Editor → Settings (⚙️) → Project Properties
 ↓
Add these BEFORE deployment:
  SECRET_KEY = "YourSecureKeyHere"
  SECRET_SALT = "YourSecureSaltHere"
```

### Deploy
```
Apps Script Editor → Deploy (▼) → New Deployment
 ↓
Type: Web app
Execute as: Your account
Who has access: Anyone (or domain for closed use)
 ↓
Copy deployment URL
```

---

## 📁 File Organization

### **System/Core (Sys_*)**
```
Sys_Js_Global.html         ← Global utils (encrypt, switchView, toast)
Sys_Js_Auth.html           ← Login logic, session, module loader
Sys_Srv_Auth.js            ← Token creation/validation (HMAC)
Sys_Srv_Config.js          ← Security config, secret getters
Sys_Srv_Main.js            ← Entry point (doGet, doPost)
Sys_Srv_Notif.js           ← Notifications (SMS, email)
Sys_Srv_Scanner.js         ← Scanner module backend
Sys_Srv_Setup.js           ← Initialization & folder creation
Sys_Css_Global.html        ← Global styles, z-index fixes
Sys_View_Index.html        ← Main HTML shell
Sys_View_Login.html        ← Login form UI
Sys_View_Scanner.html      ← Scanner full-page (camera)
Sys_View_Manifest.html     ← PWA manifest
```

### **Admin (Adm_*)**
```
Adm_Js_Core.html           ← Dashboard, CRUD logic
Adm_Srv_API.js             ← Admin APIs (users, settings, password)
Adm_View_Main.html         ← Admin main layout
Adm_View_Sidebar.html      ← Side navigation
Adm_View_Topbar.html       ← User profile bar
Adm_View_PageUsers.html    ← User management page
Adm_View_PageAbsensi.html  ← Attendance report page
Adm_View_PageOverview.html ← Dashboard stats page
Adm_View_PageSettings.html ← System settings page
Adm_View_Modals.html       ← Modal dialogs
Adm_Css_Adaptive.html      ← Responsive styles
```

### **Guru (Gru_*)**
```
Gru_Js_Core.html           ← Guru dashboard logic
Gru_Srv_API.js             ← Guru-specific APIs
Gru_View_Main.html         ← Guru main page
Gru_View_Sidebar.html      ← Guru sidebar
Gru_View_BottomNav.html    ← Mobile bottom navigation
```

---

## 🔐 Security Quick Reference

### Login Flow
```
User Input (email/password)
 ↓
checkLogin(creds)           [Sys_Srv_Auth.js]
 ↓
  Hash password → lookup in Master_User sheet
 ↓
createSessionToken_(nik)    [Sys_Srv_Auth.js]
 ↓
  Return: { status, token, user }
 ↓
Client: Save token to localStorage
  STORAGE.setItem('sess_t', token)
  STORAGE.setItem('sess_u_aes', encryptAES(user))
```

### API Call Flow
```
Client: google.script.run.callFunction(token, data)
 ↓
Server: checkRateLimit_(token)      [Adm_Srv_API.js]
 ↓
Server: checkAdminGatekeeper_(token)  [Adm_Srv_API.js]
 ↓
  parseSessionToken_()
  validateSessionToken()
  Check role includes 'ADMIN' or 'SUPER'
 ↓
Server: Execute function / return { status, message, data }
```

### Token Structure
```
Format: base64(payload).base64(signature)

Payload (JSON):
{
  "nik": "123456789",
  "t": 1708161234567        ← timestamp (ms)
}

Signature:
  HMAC_SHA256(payload_str, SECRET_KEY)
```

### Password Reset Flow
```
Admin: openResetModalFromBtn()
 ↓
Server: resetUserPassword(token, nik)
 ↓
  Generate temp: generateRandomPassword(8)
  Hash temp password
  Update Master_User sheet
  Return { status, message, temp }
 ↓
Client: openTempPassModal(temp, name, nik)
 ↓
  Modal shows temp password once
  Copy button uses clipboard API
  Close modal → temp password forgotten
```

---

## 🛠️ Common Development Tasks

### Add New Admin Function

**Step 1: Server API** (`Adm_Srv_API.js`)
```javascript
function myNewFunction(token, params) {
  checkRateLimit_(token);              // 1. Rate limit
  checkAdminGatekeeper_(token);         // 2. Auth check
  
  // 3. Your logic
  const result = performAction(params);
  
  // 4. Return response
  return { status: 'success', message: 'Done!', data: result };
}
```

**Step 2: Client Call** (`Adm_Js_Core.html`)
```javascript
function handleMyButton() {
  const token = STORAGE.getItem('sess_t');
  google.script.run
    .withSuccessHandler(res => {
      if (res.status === 'success') {
        showToast(res.message, 'success');
        // Refresh UI
      } else {
        showToast(res.message, 'error');
      }
    })
    .withFailureHandler(err => {
      console.error('API error:', err);
      showToast('Error: ' + err.message, 'error');
    })
    .myNewFunction(token, { param1: value1 });
}
```

**Step 3: HTML Button** (e.g., `Adm_View_PageUsers.html`)
```html
<button onclick="handleMyButton()">Click Me</button>
```

Note: The `onclick` will be auto-converted to event listener by `Sys_Js_Global.html` on page load.

---

### Add New Navigation Page

**Step 1: Create HTML** (`Adm_View_PageNewFeature.html`)
```html
<div id="page-newfeature" class="content-section">
  <h2>New Feature Title</h2>
  <div id="content-area">Loading...</div>
</div>
```

**Step 2: Include in Main** (`Adm_View_Main.html`)
```html
<?!= HtmlService.createHtmlOutput(HtmlService.createTemplateFromFile('Adm_View_PageNewFeature').evaluate()).getContent(); ?>
```

**Step 3: Add Navigation** (`Adm_View_Sidebar.html`)
```html
<div class="nav-item" onclick="navTo('newfeature')" id="nav-newfeature">
  <i class="bi bi-star"></i> New Feature
</div>
```

**Step 4: Add Load Handler** (`Adm_Js_Core.html`)
```javascript
if(pageId === 'newfeature') loadNewFeature(token);

function loadNewFeature(token) {
  const token = STORAGE.getItem("sess_t");
  google.script.run
    .withSuccessHandler(data => {
      document.getElementById('content-area').innerHTML = /* render data */;
    })
    .getNewFeatureData(token);
}
```

**Step 5: Add Server Function** (`Adm_Srv_API.js`)
```javascript
function getNewFeatureData(token) {
  checkRateLimit_(token);
  checkAdminGatekeeper_(token);
  return { /* your data */ };
}
```

---

### Fix Z-Index / Overlay Issue

**Common Symptoms:**
- Modal appears but can't click
- Toast hides modal
- Loading spinner won't clear

**Solution:**
1. Open browser DevTools (`F12` → Elements)
2. Inspect the element causing issue
3. Check Computed Styles → z-index
4. Edit `Sys_Css_Global.html`:
   ```css
   .problem-element { z-index: 100; }    /* Lower */
   #modal-overlay { z-index: 1000002; }  /* Higher */
   ```
5. Refresh → Test

---

### Debug Token Issues

**Issue: "Signature token tidak cocok"**

Run in Apps Script console:
```javascript
// Check if SECRET_KEY is set
const props = PropertiesService.getScriptProperties();
const key = props.getProperty('SECRET_KEY');
console.log('SECRET_KEY exists:', !!key);

// Generate a test token
const testToken = createSessionToken_('1234567890');
console.log('Test token:', testToken);

// Try to parse it back
const parsed = parseSessionToken_(testToken);
console.log('Parsed:', parsed);
```

**Issue: Session expires too fast**

In `Sys_Srv_Auth.js`, look for the expiry check:
```javascript
if (now - parseInt(obj.t) > 24 * 60 * 60 * 1000) {
  // Token older than 24 hours
  return { valid: false, reason: 'Sesi kedaluwarsa' };
}
```
Change `24 * 60 * 60` to your desired hours.

---

### Test Rate-Limiting

In browser console:
```javascript
// Make 6 rapid requests
for (let i = 0; i < 6; i++) {
  google.script.run
    .withSuccessHandler(res => console.log('Success:', res))
    .withFailureHandler(err => console.log('Error:', err))
    .getAdminDashboardData(STORAGE.getItem('sess_t'));
}
```

6th request should fail with: "Terlalu banyak permintaan"

---

### Enable Maintenance Mode

```javascript
// In Apps Script console:
PropertiesService.getScriptProperties().setProperty('MAINTENANCE', 'true');

// Non-super users will see: "Sistem sedang dalam PERBAIKAN."
// Super users can still log in
```

To disable:
```javascript
PropertiesService.getScriptProperties().setProperty('MAINTENANCE', 'false');
```

---

## 🐛 Debugging Tips

### Enable Detailed Logging
```javascript
// In Sys_Js_Global.html, add to top of scripts:
window.DEBUG = true;

// Then in functions:
if (window.DEBUG) console.log('Debug info', value);
```

### Check Token in Console
```javascript
const token = STORAGE.getItem('sess_t');
console.log('Token:', token);

const user = decryptAES(STORAGE.getItem('sess_u_aes'));
console.log('User:', user);
```

### Monitor API Calls
```javascript
// Open Network tab in DevTools
// Each google.script.run call will show as request
// Look for:
//  - Status code (should be 200)
//  - Response (check res.status === 'success')
//  - Timing (if slow, check sheet queries)
```

### View Server Logs
```
Apps Script Editor → Executions (clock icon)
 ↓
Shows all function runs with:
  - Status (Success/Error)
  - Duration
  - Logs (console.log output)
```

---

## 📞 Common Errors & Fixes

| Error | Cause | Fix |
|-------|-------|-----|
| "Unexpected token 'class'" | Inline modern JS being executed | Use top-level redirect or external script src |
| "window.initSystem is not a function" | Function called from wrong context (iframe) | Pass function reference when switching context |
| "TypeError: obj is undefined" | Null pointer / missing data | Add defensive checks: `if (obj) { ... }` |
| "Signature token tidak cocok" | SECRET_KEY mismatch | Verify SECRET_KEY in Project Properties |
| "Terlalu banyak permintaan" | Rate-limit exceeded | Wait 60 seconds or clear UserProperties |
| Modal unclickable | Z-index too low or `pointer-events: none` | Check `Sys_Css_Global.html` z-index values |

---

## 📚 Key Functions Cheat Sheet

### Client-Side (`Sys_Js_Global.html`)
```javascript
showLoading("Message")              // Show loading spinner
switchView('view-id')               // Switch between main views
showToast("Message", "type")        // Show toast (info/success/error)
encryptAES(data)                    // Encrypt user data
decryptAES(cipher)                  // Decrypt user data
navToGuru('page')                   // (Guru module)
navTo('page')                       // (Admin module)
```

### Auth (`Sys_Js_Auth.html`)
```javascript
handleLogin(e)                      // Process login form
logout()                            // Start logout flow
confirmLogout()                     // Complete logout
routeUserToDashboard(user)          // Route to correct dashboard
loadSdmModule(v)                    // Load scanner/admin module
```

### Admin (`Adm_Js_Core.html`)
```javascript
initDashboard(user)                 // Initialize admin dashboard
navTo(pageId)                       // Navigate admin pages
openAddUserModal()                  // Show add user dialog
openResetModalFromBtn(btn)          // Show password reset dialog
openTempPassModal(pass, name, nik)  // Show temp password
handleUserSubmit(e)                 // Save new user
```

### Server Auth (`Sys_Srv_Auth.js`)
```javascript
checkLogin(creds)                   // Validate email/password
createSessionToken_(nik)            // Create HMAC token
validateSessionToken(token, user)   // Verify token + user
parseSessionToken_(token)           // Decode token
getUserByNik_(nik)                  // Lookup user in DB
```

### Server Admin (`Adm_Srv_API.js`)
```javascript
checkAdminGatekeeper_(token)        // Verify admin role
checkRateLimit_(token)              // Throttle requests
generateRandomPassword(len)         // Create temp password
saveUser(token, form)               // Add new user
resetUserPassword(token, nik)       // Generate temp password
deleteUser(token, nik)              // Remove user
```

---

## 🎯 Testing Checklist

Before committing code:
- [ ] Test in Chrome DevTools console (no errors)
- [ ] Test on mobile (responsive)
- [ ] Test on Firefox (compatibility)
- [ ] Test with slow network (3G simulation)
- [ ] Run `Ctrl+Shift+J` (console) and scan for errors
- [ ] Check `Apps Script Editor → Executions` for server errors
- [ ] Test rate-limiting (6 requests in 60s)
- [ ] Test token expiry (simulate 25h old token)
- [ ] Test role-based access (non-admin can't delete users)

---

## 📖 Further Reading

- **Deployment:** See `DEPLOYMENT_NOTES.md`
- **Security:** See `SECURITY_AUDIT.md`
- **Changelog:** See `CHANGELOG.md`
- **Google Apps Script Docs:** https://developers.google.com/apps-script
- **CryptoJS Docs:** https://cryptojs.org/

---

**Happy Coding! 🚀**

Questions? Check the inline comments in each file or review the SECURITY_AUDIT.md for detailed explanations.
