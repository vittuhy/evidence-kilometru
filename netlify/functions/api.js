const { google } = require('googleapis');

const SHEET_ID = '1QvIQpN0Yr4dee1aNf3_ubwyWpWCIULfRWOOAqWAmywM'; // Your sheet ID
const SHEET_NAME = 'Sheet1'; // Change if your sheet/tab is named differently

function getAuth() {
  const creds = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT);
  return new google.auth.GoogleAuth({
    credentials: creds,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
}

async function getSheet() {
  const auth = await getAuth().getClient();
  const sheets = google.sheets({ version: 'v4', auth });
  return sheets;
}

async function getRows() {
  const sheets = await getSheet();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${SHEET_NAME}!A2:D`,
  });
  const rows = res.data.values || [];
  return rows.map(([id, date, totalKm, createdAt]) => ({
    id: Number(id),
    date,
    totalKm: Number(totalKm),
    createdAt,
  }));
}

async function appendRow(record) {
  const sheets = await getSheet();
  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: `${SHEET_NAME}!A:D`,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: {
      values: [[record.id, record.date, record.totalKm, record.createdAt]],
    },
  });
}

async function updateRow(id, newData) {
  const sheets = await getSheet();
  const rows = await getRows();
  const rowIndex = rows.findIndex(r => r.id === id);
  if (rowIndex === -1) return false;
  const rowNumber = rowIndex + 2; // +2 because of header and 0-index
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `${SHEET_NAME}!A${rowNumber}:D${rowNumber}`,
    valueInputOption: 'RAW',
    requestBody: {
      values: [[id, newData.date, newData.totalKm, newData.createdAt]],
    },
  });
  return true;
}

async function deleteRow(id) {
  const sheets = await getSheet();
  const rows = await getRows();
  const rowIndex = rows.findIndex(r => r.id === id);
  if (rowIndex === -1) return false;
  const rowNumber = rowIndex + 2; // +2 for header
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SHEET_ID,
    requestBody: {
      requests: [{
        deleteDimension: {
          range: {
            sheetId: 0, // Default first sheet, change if needed
            dimension: 'ROWS',
            startIndex: rowNumber - 1,
            endIndex: rowNumber,
          },
        },
      }],
    },
  });
  return true;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: '' };
  }
  try {
    const { path: requestPath, httpMethod, body } = event;
    const endpoint = requestPath.replace('/.netlify/functions/api', '');

    // Health check
    if (endpoint === '/health' && httpMethod === 'GET') {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
        body: JSON.stringify({ status: 'OK', timestamp: new Date().toISOString() }),
      };
    }

    // GET all records
    if (endpoint === '/records' && httpMethod === 'GET') {
      const rows = await getRows();
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
        body: JSON.stringify(rows),
      };
    }

    // POST create record
    if (endpoint === '/records' && httpMethod === 'POST') {
      const { date, totalKm } = JSON.parse(body);
      if (!date || !totalKm) {
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
          body: JSON.stringify({ error: 'Date and totalKm are required' }),
        };
      }
      const newRecord = {
        id: Date.now(),
        date,
        totalKm: Number(totalKm),
        createdAt: new Date().toISOString(),
      };
      await appendRow(newRecord);
      return {
        statusCode: 201,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
        body: JSON.stringify(newRecord),
      };
    }

    // PUT update record
    const putMatch = endpoint.match(/^\/records\/(\d+)$/);
    if (putMatch && httpMethod === 'PUT') {
      const id = Number(putMatch[1]);
      const { date, totalKm } = JSON.parse(body);
      if (!date || !totalKm) {
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
          body: JSON.stringify({ error: 'Date and totalKm are required' }),
        };
      }
      const updated = await updateRow(id, {
        date,
        totalKm: Number(totalKm),
        createdAt: new Date().toISOString(),
      });
      if (!updated) {
        return {
          statusCode: 404,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
          body: JSON.stringify({ error: 'Record not found' }),
        };
      }
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
        body: JSON.stringify({ id, date, totalKm: Number(totalKm), createdAt: new Date().toISOString() }),
      };
    }

    // DELETE record
    const delMatch = endpoint.match(/^\/records\/(\d+)$/);
    if (delMatch && httpMethod === 'DELETE') {
      const id = Number(delMatch[1]);
      const deleted = await deleteRow(id);
      if (!deleted) {
        return {
          statusCode: 404,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
          body: JSON.stringify({ error: 'Record not found' }),
        };
      }
      return { statusCode: 204, headers: corsHeaders, body: '' };
    }

    // 404 fallback
    return {
      statusCode: 404,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
      body: JSON.stringify({ error: 'Endpoint not found' }),
    };
  } catch (error) {
    console.error('Function error:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
      body: JSON.stringify({ error: 'Internal server error', details: error.message }),
    };
  }
}; 