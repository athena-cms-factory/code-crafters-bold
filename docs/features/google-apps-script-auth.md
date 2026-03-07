# Google Apps Script Authorization Issues

## The Problem
When using custom Google Sheet tools (like the Image Uploader or "Live Zetten" button), you may encounter persistent `Authorization is required` or `ScriptError` messages, even after clicking "Allow".

This is primarily caused by **Google's Multi-Account Conflict**. When multiple Google accounts are signed into the same browser session (Session 0, 1, 2, etc.), Google Apps Script often fails to resolve the correct authorization token for the specific script execution.

## Symptoms
- Popup windows that stay blank or show "Authorization required".
- Console errors mentioning `authuser=1` or `authuser=2`.
- "ScriptError" messages in the Sheet interface after clicking buttons.

## The Solutions

### 1. The Definitive Fix (Recommended)
If browser profiles or incognito mode fail, the most robust solution is to **log out of the Operating System session** (e.g., ChromeOS or your OS user) and log back in using **only** the account associated with the project (`athena.cms.factory@gmail.com`).

This ensures that the underlying system tokens and browser session IDs are 100% clean and mapped to a single identity.

### 2. Browser-Level Workaround
- **Separate Chrome Profiles:** Create a dedicated Chrome Profile for the `athena.cms.factory@gmail.com` account. Never sign into other accounts within this profile.
- **Full Logout:** Log out of ALL Google accounts in your main browser, then log in only with the project account.

## Why "Live Zetten" might work while "Uploader" fails
- **Live Zetten:** Uses `UrlFetchApp` (server-side). Once authorized, it relies on stored properties (like the GitHub PAT).
- **Image Uploader:** Uses a `HtmlService` dialog (client-side iframe). This requires a direct, active link to the user's Google Drive session, which is highly sensitive to multi-account conflicts.

## Client Impact
This issue is usually a **developer-only problem**. Clients who typically use only one Google account will not experience these conflicts. They will see the "Authorization Required" popup once, grant permission, and the tools will work indefinitely.
