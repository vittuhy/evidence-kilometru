const API_BASE_URL = process.env.REACT_APP_API_URL || '/.netlify/functions/api';

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
  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
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
    return this.request<MileageRecord[]>('/records');
  }

  // Create new record
  async createRecord(data: CreateRecordData): Promise<MileageRecord> {
    return this.request<MileageRecord>('/records', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Update record
  async updateRecord(id: number, data: UpdateRecordData): Promise<MileageRecord> {
    return this.request<MileageRecord>(`/records/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Delete record
  async deleteRecord(id: number): Promise<void> {
    return this.request<void>(`/records/${id}`, {
      method: 'DELETE',
    });
  }

  // Health check
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    return this.request<{ status: string; timestamp: string }>('/health');
  }
}

export const apiService = new ApiService(); 