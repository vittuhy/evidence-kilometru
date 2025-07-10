// For Netlify Functions, we'll use a simple in-memory storage with fallback
// In production, you'd want to use a database like Supabase, MongoDB, etc.

let inMemoryData = [];

// Read data (try file first, then use in-memory)
async function readData() {
  try {
    // For now, return in-memory data
    // In a real app, you'd connect to a database here
    return inMemoryData;
  } catch (error) {
    console.error('Error reading data:', error);
    return [];
  }
}

// Write data (store in memory for now)
async function writeData(data) {
  try {
    inMemoryData = data;
    // In a real app, you'd save to a database here
    return true;
  } catch (error) {
    console.error('Error writing data:', error);
    throw error;
  }
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