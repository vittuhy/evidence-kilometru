const fs = require('fs').promises;
const path = require('path');

// Path to the data file in the functions directory
const DATA_FILE = path.join(__dirname, 'data', 'mileage-records.json');

// Ensure data directory exists
async function ensureDataDir() {
  try {
    await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
  } catch (error) {
    console.error('Error creating data directory:', error);
  }
}

// Read data from file
async function readData() {
  try {
    const data = await fs.readFile(DATA_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      // File doesn't exist, return empty array
      return [];
    }
    throw error;
  }
}

// Write data to file
async function writeData(data) {
  await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2));
}

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
};

exports.handler = async (event, context) => {
  // Handle CORS preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: ''
    };
  }

  try {
    await ensureDataDir();
    
    const { path: requestPath, httpMethod, body } = event;
    
    // Extract the endpoint from the path
    // /api/records -> /records
    const endpoint = requestPath.replace('/.netlify/functions/api', '');
    
    // Health check endpoint
    if (endpoint === '/health' && httpMethod === 'GET') {
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        },
        body: JSON.stringify({
          status: 'OK',
          timestamp: new Date().toISOString()
        })
      };
    }
    
    // Records endpoints
    if (endpoint === '/records') {
      if (httpMethod === 'GET') {
        // Get all records
        const records = await readData();
        return {
          statusCode: 200,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          },
          body: JSON.stringify(records)
        };
      }
      
      if (httpMethod === 'POST') {
        // Create new record
        const { date, totalKm } = JSON.parse(body);
        
        if (!date || !totalKm) {
          return {
            statusCode: 400,
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders
            },
            body: JSON.stringify({ error: 'Date and totalKm are required' })
          };
        }

        const records = await readData();
        const newRecord = {
          id: Date.now(),
          date,
          totalKm: parseInt(totalKm),
          createdAt: new Date().toISOString()
        };

        records.push(newRecord);
        await writeData(records);
        
        return {
          statusCode: 201,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          },
          body: JSON.stringify(newRecord)
        };
      }
    }
    
    // Handle /records/:id endpoints
    const recordIdMatch = endpoint.match(/^\/records\/(\d+)$/);
    if (recordIdMatch) {
      const recordId = parseInt(recordIdMatch[1]);
      
      if (httpMethod === 'PUT') {
        // Update record
        const { date, totalKm } = JSON.parse(body);
        
        if (!date || !totalKm) {
          return {
            statusCode: 400,
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders
            },
            body: JSON.stringify({ error: 'Date and totalKm are required' })
          };
        }

        const records = await readData();
        const recordIndex = records.findIndex(r => r.id === recordId);
        
        if (recordIndex === -1) {
          return {
            statusCode: 404,
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders
            },
            body: JSON.stringify({ error: 'Record not found' })
          };
        }

        const updatedRecord = {
          ...records[recordIndex],
          date,
          totalKm: parseInt(totalKm)
        };

        records[recordIndex] = updatedRecord;
        await writeData(records);
        
        return {
          statusCode: 200,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          },
          body: JSON.stringify(updatedRecord)
        };
      }
      
      if (httpMethod === 'DELETE') {
        // Delete record
        const records = await readData();
        const filteredRecords = records.filter(r => r.id !== recordId);
        
        if (filteredRecords.length === records.length) {
          return {
            statusCode: 404,
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders
            },
            body: JSON.stringify({ error: 'Record not found' })
          };
        }

        await writeData(filteredRecords);
        return {
          statusCode: 204,
          headers: corsHeaders,
          body: ''
        };
      }
    }
    
    // 404 for unknown endpoints
    return {
      statusCode: 404,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      },
      body: JSON.stringify({ error: 'Endpoint not found' })
    };
    
  } catch (error) {
    console.error('Function error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      },
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
}; 