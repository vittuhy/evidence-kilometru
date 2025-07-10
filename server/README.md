# Evidence Kilometrů Backend

This is the backend API for the Evidence Kilometrů app.

## Local Development

1. Install dependencies:
   ```sh
   npm install
   ```
2. Start the server:
   ```sh
   node server.js
   ```
   The server will run on `http://localhost:3001` by default.

## Deployment (Railway/Render/Heroku)

- The server will start with `node server.js` (see `Procfile`).
- Exposes endpoints at `/api/records` and `/api/health`.
- Data is stored in `data/mileage-records.json` (local file).

### Environment Variables
- `PORT` (optional): The port to listen on (default: 3001).

## API Endpoints
- `GET    /api/records`   - List all records
- `POST   /api/records`   - Create a new record
- `PUT    /api/records/:id` - Update a record
- `DELETE /api/records/:id` - Delete a record
- `GET    /api/health`    - Health check 