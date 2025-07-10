import React, { useState, useEffect } from 'react';
import { Car, Plus, Edit2, Trash2, Calendar, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface MileageRecord {
  id: number;
  date: string;
  totalKm: number;
  createdAt: string;
}

interface FormData {
  date: string;
  totalKm: string;
}

interface Stats {
  currentKm: number;
  expectedKm: number;
  difference: number;
  avgKmPerDay: number;
  daysSinceStart: number;
  isUnderLimit: boolean;
}

const KilometersTracker: React.FC = () => {
  const [records, setRecords] = useState<MileageRecord[]>([]);
  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [editingRecord, setEditingRecord] = useState<MileageRecord | null>(null);
  const [formData, setFormData] = useState<FormData>({
    date: '',
    totalKm: ''
  });

  // Konstanty pro leasing
  const LEASE_START = '2025-07-08';
  const LEASE_END = '2027-07-08';
  const TOTAL_ALLOWED_KM = 40000; // 20,000 km/rok * 2 roky
  const TOLERANCE_KM = 3000; // Tolerovaný nadlimit
  const TOTAL_WITH_TOLERANCE = TOTAL_ALLOWED_KM + TOLERANCE_KM; // 43,000 km
  const DAILY_ALLOWED_KM = 54.8; // 20,000 / 365

  // Načtení dat z localStorage při spuštění
  useEffect(() => {
    const savedRecords = localStorage.getItem('mileageRecords');
    if (savedRecords) {
      try {
        const parsed = JSON.parse(savedRecords);
        setRecords(parsed);
      } catch (error) {
        console.error('Error parsing saved records:', error);
      }
    }
  }, []);

  // Uložení dat do localStorage při změně
  useEffect(() => {
    localStorage.setItem('mileageRecords', JSON.stringify(records));
  }, [records]);

  // Výpočet statistik
  const calculateStats = (): Stats | null => {
    if (records.length === 0) return null;

    const sortedRecords = [...records].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const latestRecord = sortedRecords[sortedRecords.length - 1];
    const currentKm = latestRecord?.totalKm || 0;
    
    const today = new Date();
    const leaseStart = new Date(LEASE_START);
    const daysSinceStart = Math.ceil((today.getTime() - leaseStart.getTime()) / (1000 * 60 * 60 * 24));
    
    const expectedKm = daysSinceStart * DAILY_ALLOWED_KM;
    const difference = expectedKm - currentKm;
    
    // Výpočet průměrných km/den
    const avgKmPerDay = currentKm / daysSinceStart;
    
    return {
      currentKm,
      expectedKm: Math.round(expectedKm),
      difference: Math.round(difference),
      avgKmPerDay: Math.round(avgKmPerDay * 10) / 10,
      daysSinceStart,
      isUnderLimit: difference > 0
    };
  };

  const stats = calculateStats();

  const handleSubmit = (): void => {
    if (!formData.date || !formData.totalKm) return;

    const newRecord: MileageRecord = {
      id: editingRecord?.id || Date.now(),
      date: formData.date,
      totalKm: parseInt(formData.totalKm),
      createdAt: editingRecord?.createdAt || new Date().toISOString()
    };

    if (editingRecord) {
      setRecords(records.map(r => r.id === editingRecord.id ? newRecord : r));
    } else {
      setRecords([...records, newRecord]);
    }

    setFormData({ date: '', totalKm: '' });
    setShowAddForm(false);
    setEditingRecord(null);
  };

  const handleEdit = (record: MileageRecord): void => {
    setFormData({
      date: record.date,
      totalKm: record.totalKm.toString()
    });
    setEditingRecord(record);
    setShowAddForm(true);
  };

  const handleDelete = (id: number): void => {
    if (window.confirm('Opravdu chcete smazat tento záznam?')) {
      setRecords(records.filter(r => r.id !== id));
    }
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('cs-CZ');
  };

  const sortedRecords = [...records].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 shadow-lg">
        <div className="max-w-md mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Car className="h-8 w-8 text-blue-400" />
              <div>
                <h1 className="text-xl font-bold">Evidence kilometrů</h1>
                <p className="text-gray-400 text-sm">Operativní leasing</p>
              </div>
            </div>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="bg-blue-600 hover:bg-blue-700 p-2 rounded-full transition-colors"
            >
              {showAddForm ? <Minus className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-6 space-y-6">
        {/* Statistiky */}
        {stats && (
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Přehled</h2>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-400">
                  {stats.currentKm.toLocaleString()}
                </div>
                <div className="text-sm text-gray-400">Aktuální km</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-300">
                  {stats.expectedKm.toLocaleString()}
                </div>
                <div className="text-sm text-gray-400">Očekávané km</div>
              </div>
            </div>

            <div className="border-t border-gray-700 pt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm">Rozdíl:</span>
                <div className={`flex items-center gap-1 ${stats.isUnderLimit ? 'text-green-400' : 'text-red-400'}`}>
                  {stats.isUnderLimit ? <TrendingDown className="h-4 w-4" /> : <TrendingUp className="h-4 w-4" />}
                  <span className="font-semibold">
                    {Math.abs(stats.difference).toLocaleString()} km
                  </span>
                </div>
              </div>
              
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm">Průměr/den:</span>
                <span className="font-semibold">{stats.avgKmPerDay} km</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm">Povoleno/den:</span>
                <span className="font-semibold">{DAILY_ALLOWED_KM} km</span>
              </div>
            </div>

            {/* Progress bar */}
            <div className="mt-4">
              <div className="flex justify-between text-sm mb-1">
                <span>Využití limitu</span>
                <span>{Math.round((stats.currentKm / TOTAL_ALLOWED_KM) * 100)}% z {TOTAL_ALLOWED_KM.toLocaleString()} km</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-300 ${
                    stats.currentKm <= TOTAL_ALLOWED_KM ? 'bg-blue-600' : 
                    stats.currentKm <= TOTAL_WITH_TOLERANCE ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${Math.min((stats.currentKm / TOTAL_WITH_TOLERANCE) * 100, 100)}%` }}
                ></div>
              </div>
              <div className="text-xs text-gray-400 mt-1">
                Limit: {TOTAL_ALLOWED_KM.toLocaleString()} km • 
                Tolerance: +{TOLERANCE_KM.toLocaleString()} km • 
                Maximum: {TOTAL_WITH_TOLERANCE.toLocaleString()} km
              </div>
            </div>
          </div>
        )}

        {/* Formulář pro přidání/editaci záznamu */}
        {showAddForm && (
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">
              {editingRecord ? 'Upravit záznam' : 'Nový záznam'}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Datum</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({...formData, date: e.target.value})}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Celkový nájezd (km)</label>
                <input
                  type="number"
                  value={formData.totalKm}
                  onChange={(e) => setFormData({...formData, totalKm: e.target.value})}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="např. 15000"
                  required
                />
              </div>
              
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleSubmit}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 py-2 rounded-lg font-medium transition-colors"
                >
                  {editingRecord ? 'Uložit změny' : 'Přidat záznam'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    setEditingRecord(null);
                    setFormData({ date: '', totalKm: '' });
                  }}
                  className="px-4 py-2 border border-gray-600 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Zrušit
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Seznam záznamů */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Historie záznamů</h2>
          
          {sortedRecords.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Zatím žádné záznamy</p>
              <p className="text-sm">Přidejte první záznam tlačítkem +</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedRecords.map((record) => (
                <div key={record.id} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                  <div>
                    <div className="font-medium">{record.totalKm.toLocaleString()} km</div>
                    <div className="text-sm text-gray-400">{formatDate(record.date)}</div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(record)}
                      className="p-2 text-blue-400 hover:bg-gray-600 rounded-lg transition-colors"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(record.id)}
                      className="p-2 text-red-400 hover:bg-gray-600 rounded-lg transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default KilometersTracker;