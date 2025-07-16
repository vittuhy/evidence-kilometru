export interface MileageRecord {
  id: number;
  date: string;
  totalKm: number;
  createdAt: string;
}

export interface CreateRecordData {
  date: string;
  totalKm: number;
}

export interface UpdateRecordData {
  date: string;
  totalKm: number;
}

class ApiService {
  private isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  private API_BASE_URL = process.env.REACT_APP_API_URL || '/.netlify/functions/api';

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    // For localhost, use localStorage instead of API calls
    if (this.isLocalhost) {
      throw new Error('Local development mode - using localStorage');
    }

    const url = `${this.API_BASE_URL}${endpoint}`;
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
    });

    // Special handling for DELETE 204 No Content
    if (options?.method === 'DELETE' && response.status === 204) {
      // @ts-expect-error: void return
      return;
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  // Get all records
  async getRecords(): Promise<MileageRecord[]> {
    if (this.isLocalhost) {
      // Always return demo data for local development
      return [
        { id: 1, date: '2025-07-11', totalKm: 100, createdAt: '2025-07-11T10:00:00Z' },
        { id: 2, date: '2025-07-31', totalKm: 300, createdAt: '2025-07-31T10:00:00Z' },
        { id: 3, date: '2025-08-15', totalKm: 750, createdAt: '2025-08-15T10:00:00Z' },
        { id: 4, date: '2025-09-30', totalKm: 2200, createdAt: '2025-09-30T10:00:00Z' },
        { id: 5, date: '2025-10-31', totalKm: 4200, createdAt: '2025-10-31T10:00:00Z' }
      ];
    }
    return this.request<MileageRecord[]>('/records');
  }

  // Create new record
  async createRecord(data: CreateRecordData): Promise<MileageRecord> {
    if (this.isLocalhost) {
      const savedRecords = localStorage.getItem('mileageRecords');
      const records = savedRecords ? JSON.parse(savedRecords) : [];
      const newRecord = {
        id: Date.now(),
        date: data.date,
        totalKm: data.totalKm,
        createdAt: new Date().toISOString(),
      };
      const updatedRecords = [...records, newRecord];
      localStorage.setItem('mileageRecords', JSON.stringify(updatedRecords));
      return newRecord;
    }
    return this.request<MileageRecord>('/records', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Update record
  async updateRecord(id: number, data: UpdateRecordData): Promise<MileageRecord> {
    if (this.isLocalhost) {
      const savedRecords = localStorage.getItem('mileageRecords');
      const records = savedRecords ? JSON.parse(savedRecords) : [];
      const updatedRecords = records.map((record: MileageRecord) => 
        record.id === id 
          ? { ...record, date: data.date, totalKm: data.totalKm, createdAt: new Date().toISOString() }
          : record
      );
      localStorage.setItem('mileageRecords', JSON.stringify(updatedRecords));
      return updatedRecords.find((r: MileageRecord) => r.id === id)!;
    }
    return this.request<MileageRecord>(`/records/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Delete record
  async deleteRecord(id: number): Promise<void> {
    if (this.isLocalhost) {
      const savedRecords = localStorage.getItem('mileageRecords');
      const records = savedRecords ? JSON.parse(savedRecords) : [];
      const updatedRecords = records.filter((record: MileageRecord) => record.id !== id);
      localStorage.setItem('mileageRecords', JSON.stringify(updatedRecords));
      return;
    }
    return this.request<void>(`/records/${id}`, {
      method: 'DELETE',
    });
  }

  // Health check
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    if (this.isLocalhost) {
      return { status: 'OK', timestamp: new Date().toISOString() };
    }
    return this.request<{ status: string; timestamp: string }>('/health');
  }
}

export const apiService = new ApiService(); 