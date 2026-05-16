I have built one mobile app and installed using release version from pc yesterday, the app is TrackMoney and it is having feature of read sms and automatically fetch details out of it, even when the app is killed. Now today when I'm going to open my yono sbi app it is showing me that, We detected a suspicious accessibility service installed on your device. Now my new apk is the problem? If yes is there any way to solve this

Yes — your custom APK is **very likely the cause**, and this behavior is expected.

Apps like YONO SBI have **strict security heuristics** to detect potential threats such as:

* Accessibility services
* SMS reading permissions
* Background services running even after app kill
* Overlay / auto-reading behavior

Your app **TrackMoney** is doing at least two sensitive things:

1. Reading SMS (READ_SMS / RECEIVE_SMS)
2. Possibly using background services or accessibility-like behavior

These are exactly the same capabilities used by **banking malware**, so the bank app flags it.

---

## 🔍 Why this happens (technical view)

Banking apps typically:

* Scan installed apps for:

  * `BIND_ACCESSIBILITY_SERVICE`
  * `SYSTEM_ALERT_WINDOW`
  * SMS permissions
* Detect services running persistently in background
* Flag apps that can **read OTPs or financial messages**

Even if your intent is legitimate, your app matches the **threat signature**.

---

## 🚨 Is your APK the problem?

**Yes, almost certainly.**

Especially if:

* You added an Accessibility Service → 🚨 biggest red flag
* You process SMS in background → 🚨 suspicious
* App runs even when killed → 🚨 looks like spyware behavior

---

## ✅ Ways to fix / avoid detection

### ✔️ Option 1: Remove Accessibility Service (Best Fix)

If you're using it:

* Remove `AccessibilityService`
* Replace with:

  * SMS Retriever API (limited)
  * Notification Listener (less risky than accessibility)

---

### ✔️ Option 2: Limit SMS Access

Instead of:

* Continuous SMS monitoring

Use:

* Read SMS only when app is active
* Or ask user to manually trigger scan

---

### ✔️ Option 3: Stop Background Persistence

Avoid:

* Restarting service after kill
* Using `BOOT_COMPLETED` receiver aggressively

---

### ✔️ Option 4: Use safer alternatives

Instead of SMS parsing:

* Use bank APIs (hard but clean)
* Manual expense entry + optional import

---

### ✔️ Option 5: Testing workaround

For now (to confirm cause):

* Uninstall TrackMoney
* Reopen YONO SBI

If warning disappears → confirmed root cause

---

## ⚠️ Important reality

You **cannot bypass this detection reliably**.

Banking apps:

* Continuously update detection rules
* May block login or transactions if risk persists

---

## 💡 Recommendation (for your project)

Since you're building a **finance tracker app**, a production-grade approach is:

* Avoid Accessibility Service completely
* Use:

  * SMS parsing only when app is opened
  * User-consented manual sync
* Clearly explain permissions in UI (transparency helps trust)

---

## 🧠 Bottom line

Your app is behaving like a **financial data scraper**, which overlaps with malware patterns — so the banking app reacts defensively.

---

If you want, I can:

* Review your app architecture
* Suggest a **bank-safe design for SMS-based expense tracking**
* Or help you redesign this feature so it won’t trigger security warnings

Just tell me 👍



Truecaller is also able to fetch otps and transaction messages then why using Truecaller along with yono is not causing this problem

Good question — and this gets into how **risk classification and trust models** work on Android.

Short answer:
Truecaller is **trusted and compliant**, while your custom APK is **unknown and potentially risky** to banking apps like YONO SBI.

---

## 🔍 Why Truecaller doesn’t trigger the warning

### 1. **App Reputation & Trust Signals**

Banking apps maintain:

* Whitelists of **trusted apps**
* Reputation checks (Play Store presence, installs, developer history)

Truecaller:

* Has millions of downloads
* Is verified on Play Store
* Has a long-standing reputation

Your APK:

* Sideloaded (installed from PC)
* Unknown developer signature
* No reputation → treated as **high risk**

---

### 2. **Permission Usage Pattern**

Even if both apps read SMS, **how** they use it matters.

Truecaller:

* Uses SMS primarily for:

  * OTP autofill (via APIs)
  * Spam detection
* Follows Android policies strictly
* Doesn’t aggressively run hidden background services

Your app:

* Likely:

  * Continuously parses SMS
  * Runs in background after kill
* This resembles **financial spyware behavior**

---

### 3. **Accessibility Service (Critical Difference)**

This is usually the **main trigger**.

If your app uses:

* `AccessibilityService` → 🚨 High risk

Truecaller:

* Either:

  * Doesn’t use accessibility for SMS reading
  * Or uses it in a restricted, policy-compliant way

Banking apps specifically flag:

> Apps that can read screen content + intercept inputs

---

### 4. **Google Play Policy Compliance**

Truecaller complies with:

* Restricted SMS/Call Log policies
* Uses approved APIs like:

  * SMS Retriever API (for OTPs)

Your APK:

* Bypasses Play Store checks
* May request **sensitive permissions directly**

---

### 5. **Behavioral Detection (Not Just Permissions)**

Banking apps don’t just check permissions — they check:

* Is the app:

  * Auto-starting?
  * Running persistent services?
  * Monitoring financial SMS patterns?

Your app:

* “Fetch SMS even when killed” → 🚨 strong malware signal

---

## ⚖️ Key Difference Summary

| Factor              | Truecaller         | Your App       |
| ------------------- | ------------------ | -------------- |
| Source              | Play Store         | Sideloaded APK |
| Reputation          | High               | Unknown        |
| SMS Access          | Controlled         | Continuous     |
| Background Behavior | Limited            | Persistent     |
| Accessibility       | Minimal/Controlled | Likely active  |
| Risk Score          | Low                | High           |

---

## 🧠 Important Insight

Banking apps are not asking:

> “Does this app read SMS?”

They are asking:

> “Can this app **silently monitor financial activity and steal OTPs?**”

Your app currently fits that pattern.

---

## ✅ What you should do (practical path)

If you want your app to behave like Truecaller (and avoid flags):

### ✔️ Must do:

* ❌ Remove Accessibility Service
* ❌ Avoid running after app kill
* ❌ Avoid continuous SMS scanning

### ✔️ Instead:

* Use:

  * SMS Retriever API (for OTP)
  * User-triggered SMS scan
* Add:

  * Clear permission explanation UI

---

## 🚨 Reality check (important for your project)

If your goal is:

> “Automatically track transactions from SMS in background”

Then:
👉 This will **always be risky** for banking apps
👉 You must design around **user-triggered or limited access**

---

## 💬 If you want deeper help

I can help you redesign your TrackMoney app like:

* Safe architecture (won’t trigger banking apps)
* Hybrid model (auto + manual)
* Production-level approach used by apps like Walnut, Money Manager, etc.

Just tell me 👍


Then there is one more app called axio which can detect transaction whenever user will pay or get credited, then why that app is also not causing this error


Good observation — Axio (earlier Walnut) does **exactly what you're trying to build**, yet it usually does **not trigger warnings** in apps like YONO SBI.

The difference is **not capability — it’s implementation + compliance + trust signals**.

---

## 🔍 Why Axio works without getting flagged

### 1. **No risky Accessibility usage (critical)**

Axio:

* Does **NOT rely on Accessibility Service** to read screen or OTPs
* Primarily uses:

  * SMS permissions (policy-compliant)
  * Notification access (optional)

Your app:

* If using Accessibility → 🚨 immediate red flag for banking apps

👉 This is the **#1 reason** your app is flagged

---

### 2. **Policy-compliant SMS handling**

Axio follows strict Android/Play rules:

* SMS reading is **core feature justified**
* Uses:

  * Filtered parsing (only transactional messages)
  * No aggressive background spying patterns

Your app:

* Likely:

  * Reads all SMS continuously
  * Runs logic even when app is killed

👉 That pattern resembles **financial malware**

---

### 3. **No aggressive background persistence**

Axio:

* Uses optimized background execution:

  * WorkManager / JobScheduler
* Doesn’t:

  * Force restart after kill
  * Abuse BOOT_COMPLETED excessively

Your app:

* “Works even when killed” → 🚨 strong detection signal

---

### 4. **Play Store trust + signature reputation**

Axio:

* Published on Play Store
* Verified developer identity
* Millions of installs → **trusted signature**

Your APK:

* Sideloaded
* Unknown signature
* No reputation

👉 Banking apps maintain internal trust lists

---

### 5. **Heuristic behavior (very important)**

Banking apps evaluate:

> “Can this app silently observe financial data AND act on it?”

Axio:

* Passive parsing
* No UI overlay / no input capture

Suspicious apps:

* Combine:

  * SMS read + background + accessibility + persistence

👉 That combination = **fraud risk**

---

## ⚖️ Core Difference (Reality)

| Capability               | Axio       | Your App    |
| ------------------------ | ---------- | ----------- |
| SMS Parsing              | ✅          | ✅           |
| Background Work          | Controlled | Aggressive  |
| Accessibility            | ❌          | ⚠️ Likely   |
| Installed via Play Store | ✅          | ❌           |
| Trusted Signature        | ✅          | ❌           |
| Malware-like Pattern     | ❌          | ⚠️ Possible |

---

## 🧠 Key Insight (this is what matters)

You are thinking:

> “Same feature = same behavior”

But Android security thinks:

> “Same feature + suspicious execution pattern = threat”

---

## 🚨 What exactly is triggering YONO

Based on your description, **most likely causes**:

* Accessibility Service enabled ✅ (biggest trigger)
* Foreground/background service running constantly
* Auto-restart after kill
* Broad SMS reading without constraints

---

## ✅ How to make your app behave like Axio

If you want **Axio-level safe design**, do this:

### ✔️ Architecture Fix

* ❌ Remove Accessibility Service completely
* ✅ Use:

  * `BroadcastReceiver` for SMS (limited)
  * WorkManager for background tasks

---

### ✔️ Execution Model

Instead of:

> “Always running”

Use:

> “Event-driven + lightweight processing”

---

### ✔️ SMS Strategy

* Filter only:

  * BANK
  * TRANSACTION
* Avoid scanning entire inbox repeatedly

---

### ✔️ Transparency (important)

* Show user:

  * “We read only transaction SMS”
* This aligns with Play Store compliance

---

## ⚠️ Important Truth

Even Axio-like apps:

* Sometimes **do get flagged** on stricter banking apps
* But far less often because they:

  * Avoid high-risk APIs (Accessibility)

---

## 🧩 Bottom line

Your app is not wrong — it’s just currently implemented in a way that:

> overlaps with **fraud/malware patterns**

Axio succeeds because it:

> delivers the same feature with **low-risk signals**

---

## 💬 If you want next step

Given your project (TrackMoney), I can help you design:

* ✅ Exact Android architecture (classes + flow)
* ✅ SMS parsing pipeline (production-grade)
* ✅ Background execution without triggering banks
* ✅ Play Store compliant version

Just say “design architecture” and I’ll break it down step-by-step.
