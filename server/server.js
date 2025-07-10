const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;
const DATA_FILE = path.join(__dirname, 'data', 'mileage-records.json');

// Middleware
app.use(cors());
app.use(bodyParser.json());

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

// API Routes

// GET /api/records - Get all records
app.get('/api/records', async (req, res) => {
  try {
    const records = await readData();
    res.json(records);
  } catch (error) {
    console.error('Error reading records:', error);
    res.status(500).json({ error: 'Failed to read records' });
  }
});

// POST /api/records - Create new record
app.post('/api/records', async (req, res) => {
  try {
    const { date, totalKm } = req.body;
    
    if (!date || !totalKm) {
      return res.status(400).json({ error: 'Date and totalKm are required' });
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
    
    res.status(201).json(newRecord);
  } catch (error) {
    console.error('Error creating record:', error);
    res.status(500).json({ error: 'Failed to create record' });
  }
});

// PUT /api/records/:id - Update record
app.put('/api/records/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { date, totalKm } = req.body;
    
    if (!date || !totalKm) {
      return res.status(400).json({ error: 'Date and totalKm are required' });
    }

    const records = await readData();
    const recordIndex = records.findIndex(r => r.id === parseInt(id));
    
    if (recordIndex === -1) {
      return res.status(404).json({ error: 'Record not found' });
    }

    const updatedRecord = {
      ...records[recordIndex],
      date,
      totalKm: parseInt(totalKm)
    };

    records[recordIndex] = updatedRecord;
    await writeData(records);
    
    res.json(updatedRecord);
  } catch (error) {
    console.error('Error updating record:', error);
    res.status(500).json({ error: 'Failed to update record' });
  }
});

// DELETE /api/records/:id - Delete record
app.delete('/api/records/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const records = await readData();
    const filteredRecords = records.filter(r => r.id !== parseInt(id));
    
    if (filteredRecords.length === records.length) {
      return res.status(404).json({ error: 'Record not found' });
    }

    await writeData(filteredRecords);
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting record:', error);
    res.status(500).json({ error: 'Failed to delete record' });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Initialize and start server
async function startServer() {
  await ensureDataDir();
  
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Data file: ${DATA_FILE}`);
  });
}

startServer().catch(console.error); 