import React, { useState, useEffect } from 'react';
import { Car, Plus, Edit2, Trash2, Calendar, TrendingUp, TrendingDown, Minus, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { apiService, MileageRecord } from './api';

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

const MONTHLY_LIMIT = 1750;

function getMonthKey(date: Date) {
  return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
}

function getMonthNameCz(date: Date) {
  return date.toLocaleString('cs-CZ', { month: 'long', year: 'numeric' });
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
  const leaseStartDate = new Date(LEASE_START);
  const TOTAL_ALLOWED_KM = 40000; // 20,000 km/rok * 2 roky
  const TOLERANCE_KM = 3000; // Tolerovaný nadlimit
  const TOTAL_WITH_TOLERANCE = TOTAL_ALLOWED_KM + TOLERANCE_KM; // 43,000 km
  const DAILY_ALLOWED_KM = 54.8; // 20,000 / 365

  // Načtení dat ze serveru při spuštění
  useEffect(() => {
    const loadRecords = async () => {
      try {
        const records = await apiService.getRecords();
        setRecords(records);
      } catch (error) {
        console.error('Error loading records:', error);
        // Fallback to localStorage if server is not available
        const savedRecords = localStorage.getItem('mileageRecords');
        if (savedRecords) {
          try {
            const parsed = JSON.parse(savedRecords);
            setRecords(parsed);
          } catch (localError) {
            console.error('Error parsing saved records:', localError);
          }
        }
      }
    };

    loadRecords();
  }, []);

  // Výpočet statistik
  const calculateStats = (): Stats | null => {
    if (records.length === 0) return null;

    const sortedRecords = [...records].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const latestRecord = sortedRecords[sortedRecords.length - 1];
    const currentKm = latestRecord?.totalKm || 0;
    
    const today = new Date();
    const daysSinceStart = Math.ceil((today.getTime() - leaseStartDate.getTime()) / (1000 * 60 * 60 * 24));
    
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

  // Najdi poslední záznam a jeho datum
  const sortedByDate = [...records].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const lastRecord = sortedByDate[sortedByDate.length - 1];
  const lastRecordDate = lastRecord ? new Date(lastRecord.date) : null;

  // Výpočet dnů od začátku leasingu do posledního záznamu
  const daysElapsedFromStart = lastRecordDate ? Math.ceil((lastRecordDate.getTime() - leaseStartDate.getTime()) / (1000 * 60 * 60 * 24)) + 1 : 0;

  // Průměr/den podle posledního záznamu
  const avgKmPerDay = (lastRecord && daysElapsedFromStart > 0) ? Math.round((lastRecord.totalKm / daysElapsedFromStart) * 10) / 10 : null;

  // Celkový odhad podle posledního záznamu
  const totalProjection = (lastRecord && daysElapsedFromStart > 0)
    ? Math.round((lastRecord.totalKm / daysElapsedFromStart) * 730)
    : null;

  // Měsíce od začátku leasingu do posledního záznamu
  const months = [];
  if (lastRecordDate) {
    let d = new Date(leaseStartDate.getFullYear(), leaseStartDate.getMonth(), 1);
    const end = new Date(lastRecordDate.getFullYear(), lastRecordDate.getMonth(), 1);
    while (d <= end) {
      const start = new Date(d);
      const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      months.push({
        key: getMonthKey(start),
        name: getMonthNameCz(start),
        start,
        end: monthEnd,
      });
      d = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    }
  }

  // Pro každý měsíc najdi první a poslední záznam a spočítej rozdíl
  const monthlyStats = months.map((month, i) => {
    const monthRecords = records
      .filter(r => {
        const d = new Date(r.date);
        return d >= month.start && d <= month.end;
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    let km = 0;
    if (monthRecords.length === 1) {
      // Pokud je to první měsíc, použij hodnotu prvního záznamu
      km = i === 0 ? monthRecords[0].totalKm : 0;
    } else if (monthRecords.length > 1) {
      km = monthRecords[monthRecords.length - 1].totalKm - monthRecords[0].totalKm;
    }
    const diff = km - MONTHLY_LIMIT;
    return { ...month, km, diff, over: diff > 0, first: monthRecords[0] || null, last: monthRecords[monthRecords.length - 1] || null };
  });

  const handleSubmit = async (): Promise<void> => {
    if (!formData.date || !formData.totalKm) return;

    try {
      if (editingRecord) {
        // Update existing record
        const updatedRecord = await apiService.updateRecord(editingRecord.id, {
          date: formData.date,
          totalKm: parseInt(formData.totalKm)
        });
        setRecords(records.map(r => r.id === editingRecord.id ? updatedRecord : r));
      } else {
        // Create new record
        const newRecord = await apiService.createRecord({
          date: formData.date,
          totalKm: parseInt(formData.totalKm)
        });
        setRecords([...records, newRecord]);
      }

      setFormData({ date: '', totalKm: '' });
      setShowAddForm(false);
      setEditingRecord(null);
    } catch (error) {
      console.error('Error saving record:', error);
      alert('Chyba při ukládání záznamu. Zkuste to znovu.');
    }
  };

  const handleEdit = (record: MileageRecord): void => {
    setFormData({
      date: record.date,
      totalKm: record.totalKm.toString()
    });
    setEditingRecord(record);
    setShowAddForm(true);
  };

  const handleDelete = async (id: number): Promise<void> => {
    if (window.confirm('Opravdu chcete smazat tento záznam?')) {
      try {
        await apiService.deleteRecord(id);
        setRecords(records.filter(r => r.id !== id));
      } catch (error) {
        console.error('Error deleting record:', error);
        alert('Chyba při mazání záznamu. Zkuste to znovu.');
      }
    }
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('cs-CZ');
  };

  const sortedRecords = [...records].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Formulář pro přidání/editaci záznamu - always at the top */}
      {showAddForm && (
        <div className="max-w-md mx-auto px-4 pt-6">
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
        </div>
      )}
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
              {/* Rozdíl */}
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm">Rozdíl:</span>
                <div className={`flex items-center gap-1 ${stats.isUnderLimit ? 'text-green-400' : 'text-red-400'}`}> 
                  {stats.isUnderLimit ? <TrendingDown className="h-4 w-4" /> : <TrendingUp className="h-4 w-4" />}
                  <span className="font-semibold">{Math.abs(stats.difference).toLocaleString()} km</span>
                </div>
              </div>
              {/* Celkový odhad */}
              {totalProjection !== null && (
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm">Celkový odhad:</span>
                  <div className={`flex items-center gap-1 ${totalProjection > TOTAL_ALLOWED_KM ? 'text-red-400' : 'text-green-400'}`}> 
                    {totalProjection > TOTAL_ALLOWED_KM ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                    <span className="font-semibold">{totalProjection.toLocaleString()} km</span>
                  </div>
                </div>
              )}
              
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm">Průměr/den:</span>
                <span className="font-semibold">{avgKmPerDay !== null ? `${avgKmPerDay} km` : 'N/A'}</span>
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

        {/* Měsíční přehled */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Měsíční přehled</h2>
          <div className="space-y-2">
            {monthlyStats.map((m) => (
              <div key={m.key} className="flex items-center gap-3">
                <div className="w-28 text-sm text-gray-300">{m.name}</div>
                <div className="flex-1 h-3 bg-gray-700 rounded-full relative overflow-hidden">
                  <div
                    className={`h-3 rounded-full ${m.over ? 'bg-red-500' : 'bg-green-500'}`}
                    style={{ width: `${Math.min(Math.abs(m.km) / MONTHLY_LIMIT * 100, 100)}%` }}
                  ></div>
                </div>
                <div className={`ml-2 text-sm font-semibold ${m.over ? 'text-red-400' : 'text-green-400'}`}>
                  {m.km.toLocaleString()} / {MONTHLY_LIMIT} km
                </div>
                <div className={`ml-2 text-xs ${m.over ? 'text-red-400' : 'text-green-400'}`}>
                  {m.diff > 0 ? `Přesah: ${m.diff.toLocaleString()} km` : `Předběh: ${Math.abs(m.diff).toLocaleString()} km`}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default KilometersTracker;