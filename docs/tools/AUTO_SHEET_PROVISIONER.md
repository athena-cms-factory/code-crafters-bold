# Auto-Sheet Provisioner (The Holy Grail)

## Overview
The Auto-Sheet Provisioner is responsible for automatically creating, configuring, and linking a Google Sheet CMS to an Athena data source or site.

## Architecture (OAuth 2.0 vs. Service Account)
Since January 2026, the system has used a hybrid authentication model to bypass Google's storage quotas:

1.  **Creation (OAuth 2.0):** The robot acts on behalf of the **personal user** to copy the 'Master Template'. This makes the file the property of the user, counting towards their 15GB storage limit.
2.  **Management (Service Account):** Once the sheet is created, the Service Account (configured as `GOOGLE_SERVICE_ACCOUNT_EMAIL` in `.env`) is added as an **Editor**. This account performs daily data syncs.

## Requirements (.env)
The following variables are essential for operation:
- `GOOGLE_CLIENT_ID` & `GOOGLE_CLIENT_SECRET`: For the OAuth connection.
- `GOOGLE_REFRESH_TOKEN`: The 'eternal' key of the user.
- `MASTER_TEMPLATE_ID`: The ID of the source sheet (must be shared with the robot!).
- `DRIVE_PROJECTS_FOLDER_ID`: The ID of the folder where new sheets are placed.

## Workflow
1.  **Dashboard:** Click the 'Sheet' button for a site or data source.
2.  **Magic Wand:** Click the 'Auto-provision' icon.
3.  **Process:**
    *   System copies the Master Template to the target folder.
    *   System shares the sheet with the Service Account.
    *   System generates `url-sheet.json` in the site's configuration folder.
4.  **Result:** The site is immediately ready for 'Fetch Data' or 'Save visual edits'.

## Troubleshooting
- **File Not Found:** Ensure the `MASTER_TEMPLATE_ID` is shared with the Service Account email address (configured in `.env`). Although we use OAuth for creation, the API needs read permissions on the source file.
- **Quota Exceeded:** This no longer happens with the OAuth method unless the *personal* Google Drive is full.
