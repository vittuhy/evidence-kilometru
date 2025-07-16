import React, { useState, useEffect, useRef } from 'react';
import { Plus, Minus, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Edit2, Trash2, Calendar, ChevronDown, ChevronRight, BarChart3 } from 'lucide-react';
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
  const monthName = date.toLocaleString('cs-CZ', { month: 'long', year: 'numeric' });
  // Ensure first letter is capitalized
  return monthName.charAt(0).toUpperCase() + monthName.slice(1);
}

function getMonthLabelShort(date: Date) {
  return date.toLocaleString('cs-CZ', { month: '2-digit', year: '2-digit' }).replace('. ', '/');
}

const LOGIN_PASSWORD = process.env.REACT_APP_LOGIN_PASSWORD;

// New RecordHistory component
interface RecordHistoryProps {
  records: MileageRecord[];
  onEdit: (record: MileageRecord) => void;
  onDelete: (id: number) => void;
  monthlyStats: Array<{
    key: string;
    name: string;
    start: Date;
    end: Date;
    km: number;
    diff: number;
    over: boolean;
    first: MileageRecord | null;
    last: MileageRecord | null;
  }>;
}

const RecordHistory: React.FC<RecordHistoryProps> = ({ records, onEdit, onDelete, monthlyStats }) => {
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());
  const today = new Date();
  const currentMonthKey = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}`;

  // Expand current month by default
  useEffect(() => {
    setExpandedMonths(new Set([currentMonthKey]));
  }, [currentMonthKey]);

  const toggleMonth = (monthKey: string) => {
    const newExpanded = new Set(expandedMonths);
    if (newExpanded.has(monthKey)) {
      newExpanded.delete(monthKey);
    } else {
      newExpanded.add(monthKey);
    }
    setExpandedMonths(newExpanded);
  };

  const getMonthRecords = (monthKey: string) => {
    const [year, month] = monthKey.split('-').map(Number);
    return records
      .filter(record => {
        const recordDate = new Date(record.date);
        return recordDate.getFullYear() === year && recordDate.getMonth() === month - 1;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); // Newest first
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('cs-CZ');
  };

  const isCurrentMonth = (monthKey: string) => monthKey === currentMonthKey;

  if (records.length === 0) {
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4">Historie záznamů</h2>
        <div className="text-center py-8 text-gray-400">
          <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>Zatím žádné záznamy</p>
          <p className="text-sm">Přidejte první záznam tlačítkem +</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h2 className="text-lg font-semibold mb-4">Historie záznamů</h2>
      <div className="space-y-3">
        {[...monthlyStats].reverse().map((month) => {
          const monthRecords = getMonthRecords(month.key);
          const isExpanded = expandedMonths.has(month.key);
          const isCurrent = isCurrentMonth(month.key);

          return (
            <div key={month.key} className="border border-gray-700 rounded-lg overflow-hidden">
              {/* Month Header */}
              <button
                onClick={() => toggleMonth(month.key)}
                className={`w-full p-4 flex items-center justify-between transition-colors ${
                  isCurrent ? 'bg-blue-900/20 border-b border-blue-700/30' : 'bg-gray-750 hover:bg-gray-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="transition-transform duration-200">
                    {isExpanded ? (
                      <ChevronDown className="h-5 w-5 text-gray-400" />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                  <div className="text-left">
                    {isExpanded ? (
                      <div className="font-semibold">{month.name}</div>
                    ) : (
                      <div className="font-semibold">{month.name}</div>
                    )}
                  </div>
                </div>
                {isCurrent && false && (
                  <span className="px-2 py-1 bg-blue-600 text-white text-xs rounded-full">
                    Aktuální
                  </span>
                )}
              </button>

              {/* Month Content */}
              {isExpanded && (
                <div className="bg-gray-750 border-t border-gray-700">
                  <div className="p-4 space-y-3">
                    {monthRecords.length === 0 ? (
                      <div className="text-center py-4 text-gray-400 text-sm">
                        Žádné záznamy v tomto měsíci
                      </div>
                    ) : (
                      monthRecords.map((record) => (
                        <div
                          key={record.id}
                          className="flex items-center justify-between p-3 bg-gray-700 rounded-lg hover:bg-gray-650 transition-colors"
                        >
                          <div>
                            <div className="font-medium">{record.totalKm.toLocaleString()} km</div>
                            <div className="text-sm text-gray-400">{formatDate(record.date)}</div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => onEdit(record)}
                              className="p-2 text-blue-400 hover:bg-gray-600 rounded-lg transition-colors"
                              title="Upravit"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => onDelete(record.id)}
                              className="p-2 text-red-400 hover:bg-gray-600 rounded-lg transition-colors"
                              title="Smazat"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Chart component for monthly overview
interface MonthlyChartProps {
  monthlyStats: Array<{
    key: string;
    name: string;
    start: Date;
    end: Date;
    km: number;
    diff: number;
    over: boolean;
    first: MileageRecord | null;
    last: MileageRecord | null;
  }>;
}

const MonthlyChart: React.FC<MonthlyChartProps> = ({ monthlyStats }) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const [chartWidth, setChartWidth] = useState(0);
  // Removed hoveredMonth state as it's not being used
  const [tooltipData, setTooltipData] = useState<{
    month: string;
    km: number;
    diff: number;
    over: boolean;
    x: number;
    y: number;
  } | null>(null);

  useEffect(() => {
    const updateChartWidth = () => {
      if (chartRef.current) {
        setChartWidth(chartRef.current.offsetWidth);
      }
    };

    // Use a small delay to ensure the DOM is ready
    const timer = setTimeout(updateChartWidth, 100);
    window.addEventListener('resize', updateChartWidth);
    
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateChartWidth);
    };
  }, [monthlyStats]); // Re-run when monthlyStats changes

  if (monthlyStats.length === 0) return null;

  // Use monthlyStats directly (oldest to newest) instead of reversing
  const maxKm = Math.max(...monthlyStats.map(m => m.km), 1750);
  const minKm = 0; // Always start from 0 for monthly kilometers
  const range = maxKm - minKm;

  const chartHeight = 120;
  const padding = 20;

  // Filter out months with 0 km (no records)
  const validStats = monthlyStats.filter(m => m.km > 0);

  // Don't render chart if no valid data
  if (validStats.length === 0) {
    return (
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 className="h-4 w-4 text-blue-400" />
          <h3 className="text-sm font-medium text-gray-300">Průběh měsíčních kilometrů</h3>
        </div>
        <div 
          ref={chartRef}
          className="relative bg-gray-750 rounded-lg p-4 border border-gray-700"
          style={{ height: chartHeight }}
        >
          <div className="flex items-center justify-center h-full text-gray-400">
            Žádná data k zobrazení
          </div>
        </div>
      </div>
    );
  }
  
  // Use a fallback width if chartWidth is not available yet
  const effectiveWidth = chartWidth || 400; // Fallback to 400px if not calculated yet
  const availableWidth = effectiveWidth - padding * 2;
  const availableHeight = chartHeight - padding * 2;

  // Show loading state only if we really don't have any width
  if (chartWidth === 0) {
    return (
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 className="h-4 w-4 text-blue-400" />
          <h3 className="text-sm font-medium text-gray-300">Průběh měsíčních kilometrů</h3>
        </div>
        <div 
          ref={chartRef}
          className="relative bg-gray-750 rounded-lg p-4 border border-gray-700"
          style={{ height: chartHeight }}
        >
          <div className="flex items-center justify-center h-full text-gray-400">
            Načítání grafu...
          </div>
        </div>
      </div>
    );
  }

  // Calculate step widths (each month gets equal width, but leave space for future months)
  const maxMonthsToShow = 12; // Show whole year (12 months)
  const stepWidth = availableWidth / maxMonthsToShow;

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <BarChart3 className="h-4 w-4 text-blue-400" />
        <h3 className="text-sm font-medium text-gray-300">Průběh měsíčních kilometrů</h3>
      </div>
      <div 
        ref={chartRef}
        className="relative bg-gray-750 rounded-lg p-4 border border-gray-700"
        style={{ height: chartHeight }}
      >
        <svg
          width="100%"
          height="100%"
          className="absolute inset-0"
          style={{ width: effectiveWidth, height: chartHeight }}
        >
          {/* Limit line */}
          <line
            x1={padding}
            y1={padding + availableHeight - ((1750 - minKm) / range) * availableHeight}
            x2={padding + availableWidth}
            y2={padding + availableHeight - ((1750 - minKm) / range) * availableHeight}
            stroke="#EF4444"
            strokeWidth="2"
            strokeDasharray="4,4"
          />

          {/* Step chart rectangles */}
          {validStats.map((month, index) => {
            const x = padding + index * stepWidth;
            const y = padding + availableHeight - ((month.km - minKm) / range) * availableHeight;
            const rectHeight = availableHeight - (y - padding);
            
            return (
              <g key={index}>
                {/* Area fill */}
                <rect
                  x={x}
                  y={y}
                  width={stepWidth}
                  height={rectHeight}
                  fill={month.over ? "#EF4444" : "#10B981"}
                  opacity="0.3"
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const chartRect = chartRef.current?.getBoundingClientRect();
                    if (chartRect) {
                      setTooltipData({
                        month: getMonthNameCz(month.start),
                        km: month.km,
                        diff: month.diff,
                        over: month.over,
                        x: rect.left - chartRect.left + rect.width / 2,
                        y: rect.top - chartRect.top - 10
                      });
                    }
                  }}
                  onMouseLeave={() => {
                    setTooltipData(null);
                  }}
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const chartRect = chartRef.current?.getBoundingClientRect();
                    if (chartRect) {
                      setTooltipData({
                        month: getMonthNameCz(month.start),
                        km: month.km,
                        diff: month.diff,
                        over: month.over,
                        x: rect.left - chartRect.left + rect.width / 2,
                        y: rect.top - chartRect.top - 10
                      });
                    }
                    // Hide tooltip after 3 seconds on touch devices
                    setTimeout(() => setTooltipData(null), 3000);
                  }}
                />
                {/* Border */}
                <rect
                  x={x + 1}
                  y={y + 1}
                  width={stepWidth - 2}
                  height={rectHeight - 2}
                  fill="none"
                  stroke={month.over ? "#EF4444" : "#10B981"}
                  strokeWidth="2"
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const chartRect = chartRef.current?.getBoundingClientRect();
                    if (chartRect) {
                      setTooltipData({
                        month: getMonthNameCz(month.start),
                        km: month.km,
                        diff: month.diff,
                        over: month.over,
                        x: rect.left - chartRect.left + rect.width / 2,
                        y: rect.top - chartRect.top - 10
                      });
                    }
                  }}
                  onMouseLeave={() => {
                    setTooltipData(null);
                  }}
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const chartRect = chartRef.current?.getBoundingClientRect();
                    if (chartRect) {
                      setTooltipData({
                        month: getMonthNameCz(month.start),
                        km: month.km,
                        diff: month.diff,
                        over: month.over,
                        x: rect.left - chartRect.left + rect.width / 2,
                        y: rect.top - chartRect.top - 10
                      });
                    }
                    // Hide tooltip after 3 seconds on touch devices
                    setTimeout(() => setTooltipData(null), 3000);
                  }}
                />
                


              </g>
            );
          })}

          {/* Gradients */}
          <defs>
            <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.1" />
            </linearGradient>
            <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#3B82F6" />
              <stop offset="100%" stopColor="#60A5FA" />
            </linearGradient>
          </defs>
        </svg>

        {/* Tooltip */}
        {tooltipData && (
          <div
            className="absolute z-10 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm shadow-lg pointer-events-none"
            style={{
              left: `${tooltipData.x}px`,
              top: `${tooltipData.y}px`,
              transform: 'translateX(-50%) translateY(-100%)'
            }}
          >
            <div className="font-semibold text-white mb-1">{tooltipData.month}</div>
            <div className="text-gray-300">
              <div>{tooltipData.km.toLocaleString()} km</div>
              <div className={tooltipData.over ? 'text-red-400' : 'text-green-400'}>
                {tooltipData.over 
                  ? `+${tooltipData.diff.toLocaleString()} km` 
                  : `-${Math.abs(tooltipData.diff).toLocaleString()} km`
                }
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

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

  // Načtení dat při spuštění
  useEffect(() => {
    const loadRecords = async () => {
      try {
        const records = await apiService.getRecords();
        setRecords(records);
      } catch (error) {
        console.error('Error loading records:', error);
        // Fallback to empty array if there's an error
        setRecords([]);
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
  interface MonthInfo {
    key: string;
    name: string;
    start: Date;
    end: Date;
  }
  
  const months: MonthInfo[] = [];
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
        return (
          d.getFullYear() === month.start.getFullYear() &&
          d.getMonth() === month.start.getMonth()
        );
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let km = 0;
    let previousMonthLastKm = 0;

    // Najdi poslední záznam z předchozího měsíce
    if (i > 0) {
      const previousMonth = months[i - 1];
      const previousMonthRecords = records
        .filter(r => {
          const d = new Date(r.date);
          return (
            d.getFullYear() === previousMonth.start.getFullYear() &&
            d.getMonth() === previousMonth.start.getMonth()
          );
        })
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      if (previousMonthRecords.length > 0) {
        previousMonthLastKm = previousMonthRecords[previousMonthRecords.length - 1].totalKm;
      }
    }

    // Spočítej skutečné kilometry za tento měsíc
    if (monthRecords.length > 0) {
      const currentMonthLastKm = monthRecords[monthRecords.length - 1].totalKm;
      if (i === 0) {
        // Pro první měsíc použij celkový stav jako měsíční spotřebu
        // (předpokládáme, že auto začalo s 0 km na začátku leasingu)
        km = currentMonthLastKm;
      } else {
        km = currentMonthLastKm - previousMonthLastKm;
      }
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

  // Removed unused formatDate and sortedRecords variables

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
          
          {/* Chart */}
          <MonthlyChart monthlyStats={monthlyStats} />
          
          {/* Legend */}
          <div className="flex justify-end items-center gap-4 text-xs -mt-4 mb-4">
            <div className="flex items-center gap-1">
              <div className="w-3 h-0.5 bg-blue-500"></div>
              <span className="text-gray-400">Skutečné km</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-0.5 bg-red-500 border-dashed"></div>
              <span className="text-gray-400">Limit 1,750 km</span>
            </div>
          </div>
          

          
          <div className="space-y-2">
            {[...monthlyStats].reverse().map((m) => (
              <div key={m.key} className="flex justify-between items-center">
                <div className="text-sm text-gray-300 flex-1">{getMonthLabelShort(m.start)}</div>
                <div className="text-sm font-semibold text-right whitespace-nowrap flex-1">
                  <span className={m.over ? 'text-red-400' : 'text-green-400'}>{m.km.toLocaleString()}</span>
                  <span className="text-white"> / 1,750 km</span>
                </div>
                <div className={`text-sm font-semibold text-right ${m.over ? 'text-red-400' : 'text-green-400'} flex-1`}>
                  {m.diff > 0 ? `- ${m.diff.toLocaleString()} km` : `+ ${Math.abs(m.diff).toLocaleString()} km`}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Historie záznamů */}
        <RecordHistory
          records={records}
          onEdit={handleEdit}
          onDelete={handleDelete}
          monthlyStats={monthlyStats}
        />
      </div>
    </div>
  );
};

export default KilometersTracker;