import React, { useState, useEffect, useRef } from 'react';
import { Plus, Minus, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Edit2, Trash2, Calendar } from 'lucide-react';
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

function getMonthLabelShort(date: Date) {
  return date.toLocaleString('cs-CZ', { month: '2-digit', year: '2-digit' }).replace('. ', '/');
}

const LOGIN_PASSWORD = process.env.REACT_APP_LOGIN_PASSWORD;

const KilometersTracker: React.FC = () => {
  const [records, setRecords] = useState<MileageRecord[]>([]);
  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [editingRecord, setEditingRecord] = useState<MileageRecord | null>(null);
  const [formData, setFormData] = useState<FormData>({
    date: '',
    totalKm: ''
  });
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [loginPassword, setLoginPassword] = useState<string>('');
  const [loginError, setLoginError] = useState<string>('');
  const mileageInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLDivElement>(null);

  // Konstanty pro leasing
  const LEASE_START = '2025-07-08';
  const leaseStartDate = new Date(LEASE_START);
  const TOTAL_ALLOWED_KM = 40000; // 20,000 km/rok * 2 roky
  const TOLERANCE_KM = 3000; // Tolerovaný nadlimit
  const TOTAL_WITH_TOLERANCE = TOTAL_ALLOWED_KM + TOLERANCE_KM; // 43,000 km
  const DAILY_ALLOWED_KM = 54.8; // 20,000 / 365

  useEffect(() => {
    // Check localStorage for login
    if (localStorage.getItem('isLoggedIn') === 'true') {
      setIsLoggedIn(true);
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginPassword === LOGIN_PASSWORD) {
      setIsLoggedIn(true);
      localStorage.setItem('isLoggedIn', 'true');
      setLoginError('');
    } else {
      setLoginError('Nesprávné heslo.');
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    localStorage.removeItem('isLoggedIn');
    setLoginPassword('');
  };

  // Načtení dat ze serveru při spuštění
  useEffect(() => {
    const loadRecords = async () => {
      try {
        const records = await apiService.getRecords();
        if (records.length === 0 && window.location.hostname === 'localhost') {
          const demoRecords = [
            { id: 1, date: '2025-07-11', totalKm: 100, createdAt: '2025-07-11T10:00:00Z' },
            { id: 2, date: '2025-07-31', totalKm: 300, createdAt: '2025-07-31T10:00:00Z' },
            { id: 3, date: '2025-08-15', totalKm: 600, createdAt: '2025-08-15T10:00:00Z' }
          ];
          setRecords(demoRecords);
        } else {
          setRecords(records);
        }
      } catch (error) {
        if (window.location.hostname === 'localhost') {
          const demoRecords = [
            { id: 1, date: '2025-07-11', totalKm: 100, createdAt: '2025-07-11T10:00:00Z' },
            { id: 2, date: '2025-07-31', totalKm: 300, createdAt: '2025-07-31T10:00:00Z' },
            { id: 3, date: '2025-08-15', totalKm: 600, createdAt: '2025-08-15T10:00:00Z' }
          ];
          setRecords(demoRecords);
        } else {
          // Fallback to localStorage if server is not available and not localhost
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
      .sort((a, b) => {
        const dateDiff = new Date(a.date).getTime() - new Date(b.date).getTime();
        if (dateDiff !== 0) return dateDiff;
        return a.totalKm - b.totalKm;
      });

    let km = 0;
    if (monthRecords.length > 0) {
      km = monthRecords[monthRecords.length - 1].totalKm;
    }
    const diff = km - MONTHLY_LIMIT;
    return { ...month, km, diff, over: diff > 0, first: monthRecords[0] || null, last: monthRecords[monthRecords.length - 1] || null };
  });

  // Prefill today's date for new record
  useEffect(() => {
    if (showAddForm && !editingRecord) {
      setFormData({
        date: new Date().toISOString().slice(0, 10),
        totalKm: ''
      });
      setTimeout(() => {
        mileageInputRef.current?.focus();
      }, 100);
    }
  }, [showAddForm, editingRecord]);

  // Scroll to form and focus mileage when editing
  useEffect(() => {
    if (showAddForm && (editingRecord || formRef.current)) {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setTimeout(() => {
        mileageInputRef.current?.focus();
      }, 100);
    }
  }, [showAddForm, editingRecord]);

  const handleSubmit = async (): Promise<void> => {
    if (!formData.date || !formData.totalKm) return;

    // Validation: mileage must not decrease for later dates
    const enteredKm = parseInt(formData.totalKm);
    const enteredDate = new Date(formData.date);
    const conflicting = records.find(r => new Date(r.date) < enteredDate && r.totalKm > enteredKm);
    if (conflicting) {
      alert('Nový záznam musí mít stav km stejný nebo vyšší než všechny předchozí záznamy.');
      return;
    }

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

  // Restore handleEdit, handleDelete, formatDate
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

  const today = new Date();
  const LEASE_END = '2027-07-08';
  const leaseEndDate = new Date(LEASE_END);
  const totalLeaseDays = Math.ceil((leaseEndDate.getTime() - leaseStartDate.getTime()) / (1000 * 60 * 60 * 24));
  const daysElapsed = Math.ceil((today.getTime() - leaseStartDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const leaseProgressPercent = Math.min(100, Math.round((daysElapsed / totalLeaseDays) * 100));

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <form onSubmit={handleLogin} className="bg-gray-800 p-8 rounded-lg shadow-lg w-full max-w-xs">
          <h2 className="text-lg font-semibold mb-4 text-white text-center">Přihlášení</h2>
          <input
            type="password"
            placeholder="Zadejte heslo"
            value={loginPassword}
            onChange={e => setLoginPassword(e.target.value)}
            className="w-full mb-3 px-3 py-2 rounded bg-gray-700 border border-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          {loginError && <div className="text-red-400 text-sm mb-2 text-center">{loginError}</div>}
          <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 py-2 rounded-lg font-medium text-white transition-colors">Přihlásit se</button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 shadow-lg">
        <div className="max-w-md mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src={require('./toyota.png')} alt="Toyota logo" className="h-8 w-auto object-contain" style={{marginRight: '0.5rem'}} />
              <div>
                <h1 className="text-xl font-bold">Evidence km</h1>
                <p className="text-gray-400 text-sm">Operativní leasing</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleLogout}
                className="ml-4 bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded-lg text-sm text-white border border-gray-600"
              >Odhlásit</button>
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="bg-blue-600 hover:bg-blue-700 p-2 rounded-full transition-colors"
              >
                {showAddForm ? <Minus className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Formulář pro přidání/editaci záznamu - now just below header */}
      {showAddForm && (
        <div ref={formRef} className="max-w-md mx-auto px-4 pt-6">
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
                  ref={mileageInputRef}
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
                <span className="font-semibold">{avgKmPerDay !== null ? `${Math.round(avgKmPerDay)} km` : 'N/A'}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm">Povoleno/den:</span>
                <span className="font-semibold">55 km</span>
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
            </div>

            <div className="mt-4">
              <div className="flex justify-between text-sm mb-1">
                <span>Průběh leasingu</span>
                <span>{leaseProgressPercent}% z {totalLeaseDays} dní</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div
                  className="h-2 rounded-full bg-green-500 transition-all duration-300"
                  style={{ width: `${leaseProgressPercent}%` }}
                ></div>
              </div>
            </div>
          </div>
        )}

        {/* Měsíční přehled */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Měsíční přehled</h2>
          <div className="space-y-2">
            {monthlyStats.map((m) => (
              <div key={m.key} className="flex items-center justify-between gap-3">
                <div className="w-16 text-sm text-gray-300 text-left">{getMonthLabelShort(m.start)}</div>
                <div className="flex-1 flex flex-row items-center justify-end gap-6">
                  <span className="text-sm font-semibold">
                    <span className={m.over ? 'text-red-400' : 'text-green-400'}>{m.km.toLocaleString()}</span>
                    <span className="text-white"> / 1,750 km</span>
                  </span>
                  <span className={`text-sm font-semibold ${m.over ? 'text-red-400' : 'text-green-400'}`}>{m.diff > 0 ? `- ${m.diff.toLocaleString()} km` : `+ ${Math.abs(m.diff).toLocaleString()} km`}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Historie záznamů */}
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