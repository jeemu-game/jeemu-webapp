/**
 * ==============================================================================
 * JEEMU GOOGLE SHEETS LIVE SYNC SCRIPT (Google Apps Script)
 * ==============================================================================
 * 
 * INSTRUCTIONS:
 * 1. Open Google Sheets (https://sheets.new)
 * 2. Click "Extensions" > "Apps Script" in the top menu
 * 3. Delete any code in the editor, and paste THIS ENTIRE FILE
 * 4. Click "Deploy" > "New deployment"
 * 5. Select type: "Web app"
 * 6. Set Description: "Jeemu Webhook"
 * 7. Set "Execute as": "Me"
 * 8. Set "Who has access": "Anyone"  <-- CRITICAL! (So your webapp can post data)
 * 9. Click "Deploy", approve permissions, and copy the "Web app URL"
 * 10. Paste into your .env file:
 *     GOOGLE_SHEET_WEBHOOK_URL="https://script.google.com/macros/s/XXXXX/exec"
 * ==============================================================================
 */

function doPost(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var contents = e.postData ? e.postData.contents : null;
    
    if (!contents) {
      return ContentService.createTextOutput(JSON.stringify({ error: "No post data received" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    var data = JSON.parse(contents);

    // Initialize headers if sheet is empty
    ensureHeaders(sheet);

    var email = (data.email || '').toLowerCase().trim();
    if (!email) {
      return ContentService.createTextOutput(JSON.stringify({ error: "Missing email" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // Search for existing row by email (Column C)
    var dataRange = sheet.getDataRange();
    var values = dataRange.getValues();
    var rowIndex = -1;

    for (var i = 1; i < values.length; i++) {
      if ((values[i][2] || '').toString().toLowerCase().trim() === email) {
        rowIndex = i + 1; // 1-indexed for Sheets API
        break;
      }
    }

    var rowValues = [
      data.timestamp || new Date().toISOString(),
      data.name || 'Friend',
      email,
      data.referralCode || '',
      data.referredBy || 'Direct',
      Number(data.friendsReferred || 0),
      data.isVip || 'NO',
      Number(data.depositAmount || 0),
      data.stripeChargeId || 'N/A',
      data.unsubscribed || 'NO',
      new Date().toISOString()
    ];

    if (rowIndex > 0) {
      // Update existing row
      sheet.getRange(rowIndex, 1, 1, rowValues.length).setValues([rowValues]);
    } else {
      // Append new row
      sheet.appendRow(rowValues);
      rowIndex = sheet.getLastRow();
    }

    // Apply visual styling to VIP cells
    var vipCell = sheet.getRange(rowIndex, 7);
    if ((data.isVip || '').toString().indexOf('YES') !== -1) {
      vipCell.setBackground('#dcfce7').setFontColor('#15803d').setFontWeight('bold');
    }

    // Apply visual styling to Unsubscribed cells
    var unsubCell = sheet.getRange(rowIndex, 10);
    if ((data.unsubscribed || '').toString().indexOf('YES') !== -1) {
      unsubCell.setBackground('#fee2e2').setFontColor('#b91c1c').setFontWeight('bold');
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      email: email,
      action: rowIndex > 0 ? "updated" : "appended"
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: "online",
    service: "Jeemu Google Sheets Webhook Connector",
    timestamp: new Date().toISOString()
  })).setMimeType(ContentService.MimeType.JSON);
}

function ensureHeaders(sheet) {
  if (sheet.getLastRow() === 0) {
    var headers = [
      'Signup Timestamp',
      'Full Name',
      'Email Address',
      'Referral Code',
      'Referred By',
      'Friends Referred',
      'VIP Backer ($1 Deposit)',
      'Deposit Amount ($)',
      'Stripe Ref ID',
      'Unsubscribed',
      'Last Updated'
    ];
    sheet.appendRow(headers);

    // Format header row: bold, dark background, white text, frozen row
    var headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setFontWeight('bold')
               .setBackground('#111827')
               .setFontColor('#ffffff')
               .setHorizontalAlignment('center');

    sheet.setFrozenRows(1);
    sheet.autoResizeColumns(1, headers.length);
  }
}
