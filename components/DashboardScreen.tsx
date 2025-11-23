import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { getInspectionsStats, MonthlyStats, deleteInspection, deleteInspections } from '../services/db';
import { LogOut, TrendingUp, Calendar, FileText, Printer, Loader2, Trash2, CheckSquare, Square } from 'lucide-react';
import { generateMonthlySettlement, generateBulkMonthlySettlement } from '../services/pdfService';

const DashboardScreen: React.FC = () => {
    const [stats, setStats] = useState<{ monthly: MonthlyStats[], total: any, raw: any[] } | null>(null);
    const [loading, setLoading] = useState(true);
    const [year, setYear] = useState(new Date().getFullYear());
    const [userEmail, setUserEmail] = useState('');
    const [selectedMonths, setSelectedMonths] = useState<string[]>([]);
    const [selectedInspections, setSelectedInspections] = useState<number[]>([]);

    useEffect(() => {
        loadData();
    }, [year]);

    const loadData = async () => {
        try {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            setUserEmail(user.email || '');
            const data = await getInspectionsStats(user.id, year);
            setStats(data);
            setSelectedMonths([]); // Reset selection on reload
            setSelectedInspections([]);
        } catch (error: any) {
            console.error("Error loading dashboard data:", error);
            alert("Błąd ładowania danych: " + (error.message || error));
        } finally {
            setLoading(false);
        }
    };

    const handleSignOut = async () => {
        await supabase.auth.signOut();
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm('Czy na pewno chcesz usunąć ten przegląd? Operacja jest nieodwracalna.')) return;

        try {
            await deleteInspection(id);
            await loadData(); // Reload data
        } catch (error) {
            console.error("Error deleting inspection:", error);
            alert("Błąd usuwania przeglądu.");
        }
    };

    const handleBulkDelete = async () => {
        if (selectedInspections.length === 0) return;
        if (!window.confirm(`Czy na pewno chcesz usunąć ${selectedInspections.length} przeglądów? Operacja jest nieodwracalna.`)) return;

        try {
            await deleteInspections(selectedInspections);
            await loadData();
        } catch (error) {
            console.error("Error deleting inspections:", error);
            alert("Błąd usuwania przeglądów.");
        }
    };

    const toggleInspectionSelection = (id: number) => {
        setSelectedInspections(prev =>
            prev.includes(id)
                ? prev.filter(i => i !== id)
                : [...prev, id]
        );
    };

    const toggleSelectAllInspections = () => {
        if (!stats) return;
        if (selectedInspections.length === stats.raw.length) {
            setSelectedInspections([]);
        } else {
            setSelectedInspections(stats.raw.map(i => i.id));
        }
    };

    const handlePrintReport = async (monthStats: MonthlyStats) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            const servicemanName = user.user_metadata?.full_name || user.email || 'Serwisant';
            generateMonthlySettlement(monthStats, servicemanName);
        } catch (error) {
            console.error("Error generating report:", error);
            alert("Błąd generowania raportu.");
        }
    };

    const handlePrintSelected = async () => {
        if (selectedMonths.length === 0) return;

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            const servicemanName = user.user_metadata?.full_name || user.email || 'Serwisant';

            // Filter stats for selected months
            const selectedStats = stats?.monthly.filter(m => selectedMonths.includes(m.month)) || [];

            // Sort by month descending (or ascending if preferred)
            selectedStats.sort((a, b) => b.month.localeCompare(a.month));

            await generateBulkMonthlySettlement(selectedStats, servicemanName);
        } catch (error) {
            console.error("Error generating bulk report:", error);
            alert("Błąd generowania raportu zbiorczego.");
        }
    };

    const toggleMonthSelection = (month: string) => {
        setSelectedMonths(prev =>
            prev.includes(month)
                ? prev.filter(m => m !== month)
                : [...prev, month]
        );
    };

    const toggleSelectAll = () => {
        if (!stats) return;
        if (selectedMonths.length === stats.monthly.length) {
            setSelectedMonths([]);
        } else {
            setSelectedMonths(stats.monthly.map(m => m.month));
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Loader2 className="animate-spin text-blue-600" size={48} />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 font-sans">
            {/* Navbar */}
            <nav className="bg-white shadow-sm border-b border-gray-200 px-6 py-4 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="bg-blue-600 p-2 rounded-lg text-white">
                        <TrendingUp size={24} />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-gray-800">Panel Serwisanta</h1>
                        <p className="text-xs text-gray-500">Zalogowany jako: {userEmail}</p>
                    </div>
                </div>
                <button
                    onClick={handleSignOut}
                    className="text-gray-500 hover:text-red-600 transition-colors flex items-center gap-2 text-sm font-medium"
                >
                    <LogOut size={18} />
                    Wyloguj
                </button>
            </nav>

            <div className="max-w-7xl mx-auto p-6">
                {/* Year Selector */}
                <div className="flex justify-end mb-6">
                    <select
                        value={year}
                        onChange={(e) => setYear(Number(e.target.value))}
                        className="bg-white border border-gray-300 rounded-lg px-4 py-2 text-sm font-medium text-gray-700 shadow-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                        <option value={2024}>Rok 2024</option>
                        <option value={2025}>Rok 2025</option>
                        <option value={2026}>Rok 2026</option>
                    </select>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                        <div className="flex items-center gap-4 mb-2">
                            <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                                <Printer size={24} />
                            </div>
                            <span className="text-sm font-medium text-gray-500">Wykonane Przeglądy</span>
                        </div>
                        <p className="text-3xl font-bold text-gray-900">{stats?.total.count}</p>
                        <p className="text-xs text-gray-400 mt-1">W roku {year}</p>
                    </div>

                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                        <div className="flex items-center gap-4 mb-2">
                            <div className="p-3 bg-green-50 text-green-600 rounded-lg">
                                <TrendingUp size={24} />
                            </div>
                            <span className="text-sm font-medium text-gray-500">Twój Zarobek</span>
                        </div>
                        <p className="text-3xl font-bold text-gray-900">{stats?.total.earnings} PLN</p>
                        <p className="text-xs text-gray-400 mt-1">Stawka: 50 PLN / szt.</p>
                    </div>

                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                        <div className="flex items-center gap-4 mb-2">
                            <div className="p-3 bg-purple-50 text-purple-600 rounded-lg">
                                <FileText size={24} />
                            </div>
                            <span className="text-sm font-medium text-gray-500">Przychód Firmy (Netto)</span>
                        </div>
                        <p className="text-3xl font-bold text-gray-900">{stats?.total.revenue} PLN</p>
                        <p className="text-xs text-gray-400 mt-1">Stawka: 200 PLN / szt.</p>
                    </div>
                </div>

                {/* Monthly Breakdown */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                        <h2 className="font-bold text-gray-800 flex items-center gap-2">
                            <Calendar size={20} className="text-gray-500" />
                            Rozliczenie Miesięczne
                        </h2>
                        {selectedMonths.length > 0 && (
                            <button
                                onClick={handlePrintSelected}
                                className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                            >
                                <Printer size={16} />
                                Drukuj Zaznaczone ({selectedMonths.length})
                            </button>
                        )}
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-3 w-12">
                                        <button onClick={toggleSelectAll} className="text-gray-400 hover:text-gray-600">
                                            {stats?.monthly.length && selectedMonths.length === stats.monthly.length ? (
                                                <CheckSquare size={20} className="text-blue-600" />
                                            ) : (
                                                <Square size={20} />
                                            )}
                                        </button>
                                    </th>
                                    <th className="px-6 py-3">Miesiąc</th>
                                    <th className="px-6 py-3">Ilość Przeglądów</th>
                                    <th className="px-6 py-3">Twój Zarobek</th>
                                    <th className="px-6 py-3">Przychód Firmy</th>
                                    <th className="px-6 py-3 text-right">Akcje</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {stats?.monthly.map((month) => (
                                    <tr key={month.month} className={`hover:bg-gray-50 transition-colors ${selectedMonths.includes(month.month) ? 'bg-blue-50' : ''}`}>
                                        <td className="px-6 py-4">
                                            <button onClick={() => toggleMonthSelection(month.month)} className="text-gray-400 hover:text-gray-600">
                                                {selectedMonths.includes(month.month) ? (
                                                    <CheckSquare size={20} className="text-blue-600" />
                                                ) : (
                                                    <Square size={20} />
                                                )}
                                            </button>
                                        </td>
                                        <td className="px-6 py-4 font-medium text-gray-900">{month.month}</td>
                                        <td className="px-6 py-4 text-gray-600">{month.count} szt.</td>
                                        <td className="px-6 py-4 text-green-600 font-bold">{month.earnings} PLN</td>
                                        <td className="px-6 py-4 text-gray-600">{month.revenue} PLN</td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => handlePrintReport(month)}
                                                className="text-blue-600 hover:text-blue-800 font-medium text-xs border border-blue-200 hover:border-blue-400 px-3 py-1 rounded-full transition-all"
                                            >
                                                Drukuj Raport
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {stats?.monthly.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                                            Brak danych za wybrany rok.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Detailed Inspections List */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mt-8">
                    <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                        <h2 className="font-bold text-gray-800 flex items-center gap-2">
                            <FileText size={20} className="text-gray-500" />
                            Lista przeglądów
                        </h2>
                        {selectedInspections.length > 0 && (
                            <button
                                onClick={handleBulkDelete}
                                className="bg-red-600 hover:bg-red-700 text-white text-sm font-bold px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                            >
                                <Trash2 size={16} />
                                Usuń Zaznaczone ({selectedInspections.length})
                            </button>
                        )}
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-3 w-12">
                                        <button onClick={toggleSelectAllInspections} className="text-gray-400 hover:text-gray-600">
                                            {stats?.raw.length && selectedInspections.length === stats.raw.length ? (
                                                <CheckSquare size={20} className="text-blue-600" />
                                            ) : (
                                                <Square size={20} />
                                            )}
                                        </button>
                                    </th>
                                    <th className="px-6 py-3">Data</th>
                                    <th className="px-6 py-3">Nadleśnictwo</th>
                                    <th className="px-6 py-3 text-right">Akcje</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {stats?.raw.map((inspection) => (
                                    <tr key={inspection.id} className={`hover:bg-gray-50 transition-colors ${selectedInspections.includes(inspection.id) ? 'bg-red-50' : ''}`}>
                                        <td className="px-6 py-4">
                                            <button onClick={() => toggleInspectionSelection(inspection.id)} className="text-gray-400 hover:text-gray-600">
                                                {selectedInspections.includes(inspection.id) ? (
                                                    <CheckSquare size={20} className="text-blue-600" />
                                                ) : (
                                                    <Square size={20} />
                                                )}
                                            </button>
                                        </td>
                                        <td className="px-6 py-4 text-gray-900">
                                            {new Date(inspection.inspection_date).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 text-gray-600">
                                            {inspection.client_name}
                                            <span className="text-xs text-gray-400 ml-2">
                                                ({inspection.device_count || 1} szt.)
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => handleDelete(inspection.id)}
                                                className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition-colors"
                                                title="Usuń ten przegląd"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DashboardScreen;

