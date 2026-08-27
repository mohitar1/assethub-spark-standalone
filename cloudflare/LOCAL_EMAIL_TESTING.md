# Local Email Testing with FakeSMTP

This guide explains how to test email functionality locally using FakeSMTP, without needing to configure OAuth2 or send real emails.

---

## 📋 Table of Contents

1. [What is FakeSMTP?](#what-is-fakesmtp)
2. [Prerequisites](#prerequisites)
3. [Setup Instructions](#setup-instructions)
4. [Configuration](#configuration)
5. [Running FakeSMTP](#running-fakesmtp)
6. [Testing Emails](#testing-emails)
7. [Troubleshooting](#troubleshooting)

---

## What is FakeSMTP?

FakeSMTP is a dummy SMTP server that:
- ✅ Accepts emails without actually sending them
- ✅ Saves emails as `.eml` files for inspection
- ✅ Provides a simple GUI to view received emails
- ✅ Requires no authentication or configuration
- ✅ Perfect for local development and testing

**Official Repository:** https://github.com/Nilhcem/FakeSMTP

---

## Prerequisites

- **Java Runtime Environment (JRE)** - FakeSMTP requires Java 8 or higher
- Check if Java is installed:
  ```bash
  java -version
  ```
  If not installed, download from: https://www.java.com/download/

---

## Setup Instructions

### Step 1: Download FakeSMTP

The project already includes FakeSMTP:

```
📁 spark/
  └── fakeSMTP-2.0.jar  ← Already included!
```

If the file is missing, download it:
- **Direct Download:** https://github.com/Nilhcem/FakeSMTP/releases/download/v2.0/fakeSMTP-2.0.jar
- Save it to the project root: `spark/fakeSMTP-2.0.jar`

---

### Step 2: Create `.dev.vars` File

Create or edit `cloudflare/.dev.vars` to enable local SMTP mode:

**File Location:** `cloudflare/.dev.vars`

```bash
# ============================================
# EMAIL CONFIGURATION - LOCAL DEVELOPMENT
# ============================================

# Enable FakeSMTP (local SMTP server)
USE_LOCAL_SMTP=true
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_FROM_NAME="Spark (Local Dev)"

# Optional: Custom from email address
# SMTP_FROM_EMAIL=noreply@spark.local
```

**Important Notes:**
- ✅ This file is already in `.gitignore` - **never commit it**
- ✅ Port `1025` is the FakeSMTP default
- ✅ Each developer can have their own `.dev.vars` configuration
- ✅ If `.dev.vars` doesn't exist, the system defaults to production OAuth2 mode

---

### Step 3: Create Batch Script (Windows) / Shell Script (Mac/Linux)

#### For Windows Users

The project includes a batch script:

**File Location:** `spark/start-fake-smtp.bat`

```batch
@echo off
echo Starting FakeSMTP on port 1025...
echo Saving emails to: received-emails/
echo.
echo Press Ctrl+C to stop
echo.

java -jar fakeSMTP-2.0.jar -s -p 1025 -o received-emails
```

**To run:**
```cmd
# From project root
start-fake-smtp.bat
```

#### For Mac/Linux Users

Create a shell script:

**File Location:** `spark/start-fake-smtp.sh`

```bash
#!/bin/bash
echo "Starting FakeSMTP on port 1025..."
echo "Saving emails to: received-emails/"
echo ""
echo "Press Ctrl+C to stop"
echo ""

java -jar fakeSMTP-2.0.jar -s -p 1025 -o received-emails
```

Make it executable:
```bash
chmod +x start-fake-smtp.sh
```

**To run:**
```bash
# From project root
./start-fake-smtp.sh
```

---

## Configuration

### FakeSMTP Command-Line Options

```bash
java -jar fakeSMTP-2.0.jar [options]

Options:
  -s              Start server automatically
  -p <port>       SMTP port (default: 25)
  -o <directory>  Output directory for .eml files
  -m <memory>     Memory buffer in MB (default: 50)
  -b              Background mode (no GUI)
```

### Our Configuration

```bash
java -jar fakeSMTP-2.0.jar -s -p 1025 -o received-emails
```

| Option | Value | Purpose |
|--------|-------|---------|
| `-s` | (flag) | Auto-start server on launch |
| `-p` | `1025` | Listen on port 1025 (non-privileged) |
| `-o` | `received-emails/` | Save `.eml` files here |

---

## Running FakeSMTP

### Method 1: Using the Batch/Shell Script (Recommended)

```bash
# Windows
start-fake-smtp.bat

# Mac/Linux
./start-fake-smtp.sh
```

### Method 2: Manual Command

```bash
# From project root
java -jar fakeSMTP-2.0.jar -s -p 1025 -o received-emails
```

### Method 3: GUI Mode (Without Auto-Start)

```bash
# Launch GUI, configure manually
java -jar fakeSMTP-2.0.jar
```

Then in the GUI:
1. Set port to `1025`
2. Choose output directory: `received-emails`
3. Click "Start Server"

---

## Testing Emails

### Step 1: Start FakeSMTP

```bash
start-fake-smtp.bat  # Windows
# OR
./start-fake-smtp.sh  # Mac/Linux
```

**Expected Output:**
```
Starting FakeSMTP on port 1025...
Saving emails to: received-emails/

Press Ctrl+C to stop

[FakeSMTP GUI opens]
Server started on port 1025
```

---

### Step 2: Start the Development Server

In a **separate terminal**:

```bash
# Terminal 2
cd cloudflare
npm run dev
```

**Expected Output:**
```
[Email] 🔧 Using LOCAL SMTP mode (no authentication)
⎔ Starting local server...
```

Look for the "LOCAL SMTP mode" message - this confirms `.dev.vars` is working!

---

### Step 3: Trigger an Email

Perform any action that sends an email, for example:
- Submit a rights request
- Assign a review
- Change request status

---

### Step 4: View Received Emails

#### Option A: FakeSMTP GUI

The FakeSMTP window shows:
- Number of emails received
- List of email subjects
- Click to preview email content

#### Option B: File System

```bash
# Emails are saved as .eml files
ls received-emails/
# Output: 040226045032535.eml, 040226045123456.eml, ...
```

Open `.eml` files with:
- Windows: Outlook, Thunderbird, or any email client
- Mac: Mail app, Thunderbird
- Linux: Thunderbird, Evolution
- Any text editor (to view raw email source)

---

## Troubleshooting

### ❌ "Port 1025 already in use"

**Problem:** Another process is using port 1025

**Solution:**
```bash
# Windows - Find and kill process
netstat -ano | findstr :1025
taskkill /PID <process_id> /F

# Mac/Linux - Find and kill process
lsof -i :1025
kill -9 <process_id>

# Alternative: Use a different port
# Update .dev.vars:
SMTP_PORT=2525
# And restart FakeSMTP:
java -jar fakeSMTP-2.0.jar -s -p 2525 -o received-emails
```

---

### ❌ "Java not found"

**Problem:** Java is not installed or not in PATH

**Solution:**
1. Download Java: https://www.java.com/download/
2. Install and restart terminal
3. Verify: `java -version`

---

### ❌ Emails Not Being Received

**Checklist:**
- [ ] FakeSMTP is running (check the GUI window)
- [ ] Port 1025 shows as "Listening"
- [ ] `.dev.vars` file exists in `cloudflare/` directory
- [ ] `USE_LOCAL_SMTP=true` is set (not `false` or commented out)
- [ ] Development server shows "LOCAL SMTP mode" message
- [ ] No typos in SMTP_HOST or SMTP_PORT

**Debug Logs:**

Check Cloudflare Workers dev console for:
```
[Email] 🔧 Using LOCAL SMTP mode (no authentication)
```

If you see:
```
[Email] 🔐 Using PRODUCTION SMTP mode (OAuth2)
```

Then `.dev.vars` is not being loaded correctly.

---

### ❌ ".dev.vars not being loaded"

**Problem:** Environment variables not working

**Solutions:**

1. **Verify file location:**
   ```
   ✅ cloudflare/.dev.vars  ← Correct
   ❌ .dev.vars             ← Wrong (root level)
   ❌ cloudflare/dev.vars   ← Wrong (missing dot)
   ```

2. **Check file content:**
   ```bash
   # No spaces around =
   USE_LOCAL_SMTP=true     ✅ Correct
   USE_LOCAL_SMTP = true   ❌ Wrong
   USE_LOCAL_SMTP ="true"  ❌ Wrong
   ```

3. **Restart dev server:**
   ```bash
   # Stop (Ctrl+C) and restart
   npm run dev
   ```

---

### ❌ Permission Denied (Port 1025)

**Problem:** Some systems require elevated privileges for ports < 1024

**Solution:** Use a higher port number:

**Update `.dev.vars`:**
```bash
SMTP_PORT=2525
```

**Restart FakeSMTP:**
```bash
java -jar fakeSMTP-2.0.jar -s -p 2525 -o received-emails
```

---

## Testing Checklist

Before testing email functionality:

- [ ] Java is installed (`java -version`)
- [ ] FakeSMTP jar file exists (`fakeSMTP-2.0.jar`)
- [ ] `.dev.vars` file created in `cloudflare/` directory
- [ ] `USE_LOCAL_SMTP=true` is set
- [ ] FakeSMTP is running on port 1025 (or configured port)
- [ ] Development server is running (`npm run dev`)
- [ ] Console shows "LOCAL SMTP mode" message
- [ ] `received-emails/` directory exists (created automatically)

---

## Advanced Configuration

### Custom Email From Address

```bash
# .dev.vars
SMTP_FROM_EMAIL=custom@example.com
```

### Save to Different Directory

```bash
# Change output directory
java -jar fakeSMTP-2.0.jar -s -p 1025 -o /path/to/emails
```

### Background Mode (No GUI)

```bash
# Headless mode - useful for CI/CD
java -jar fakeSMTP-2.0.jar -s -p 1025 -o received-emails -b
```

---

## Email Templates Location

All email templates are located in:

```
📁 cloudflare/src/email/templates/
  ├── rights-request-authorization.js
  ├── rights-request-authorization-success.js
  ├── rights-request-authorization-failed.js
  ├── rights-request-status-change.js
  └── rights-request-reviewer-assigned.js
```

---

## Switching to Production Mode

To test with real OAuth2 / Microsoft 365:

1. **Comment out or remove** `USE_LOCAL_SMTP` from `.dev.vars`:
   ```bash
   # USE_LOCAL_SMTP=true  ← Commented out
   ```

2. **Ensure production secrets are configured** (see main README.md)

3. **Restart dev server**

Console will show:
```
[Email] 🔐 Using PRODUCTION SMTP mode (OAuth2)
```

---

## Summary

### Quick Start (TL;DR)

```bash
# 1. Create .dev.vars
echo "USE_LOCAL_SMTP=true
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_FROM_NAME=\"Spark (Local Dev)\"" > cloudflare/.dev.vars

# 2. Start FakeSMTP
start-fake-smtp.bat  # Windows
# OR
./start-fake-smtp.sh  # Mac/Linux

# 3. Start dev server (separate terminal)
cd cloudflare && npm run dev

# 4. Trigger email action and check FakeSMTP GUI or received-emails/ folder
```

---

## Additional Resources

- **FakeSMTP GitHub:** https://github.com/Nilhcem/FakeSMTP
- **Cloudflare Workers Docs:** https://developers.cloudflare.com/workers/
- **Email Service Code:** `cloudflare/src/email/`
- **SMTP Client Implementation:** `cloudflare/src/email/smtp-client.js`

---

## Support

For issues or questions:
1. Check this guide's troubleshooting section
2. Review console logs for error messages
3. Verify FakeSMTP is running and listening
4. Confirm `.dev.vars` configuration

Happy testing! 🎉
