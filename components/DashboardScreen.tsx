```javascript
import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { getInspectionsStats, MonthlyStats, deleteInspection } from '../services/db';
import { LogOut, TrendingUp, Calendar, FileText, Printer, Loader2, Trash2 } from 'lucide-react';
import { generateMonthlySettlement } from '../services/pdfService';

const DashboardScreen: React.FC = () => {
    const [stats, setStats] = useState<{ monthly: MonthlyStats[], total: any, raw: any[] } | null>(null);
    const [loading, setLoading] = useState(true);
    const [year, setYear] = useState(new Date().getFullYear());
    const [userEmail, setUserEmail] = useState('');

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
        } catch (error) {
            console.error("Error loading dashboard data:", error);
            alert("Błąd ładowania danych.");
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

    const handlePrintReport = async (monthStats: MonthlyStats) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // We need to pass the user email or name for the report
            // Assuming user metadata has full_name or we use email
            const servicemanName = user.user_metadata?.full_name || user.email || 'Serwisant';

            generateMonthlySettlement(monthStats, servicemanName);
        } catch (error) {
            console.error("Error generating report:", error);
            alert("Błąd generowania raportu.");
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
                            <span className="text-sm font-medium text-gray-500">Twój Zarobek (Na rękę)</span>
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
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-3">Miesiąc</th>
                                    <th className="px-6 py-3">Ilość Przeglądów</th>
                                    <th className="px-6 py-3">Twój Zarobek</th>
                                    <th className="px-6 py-3">Przychód Firmy</th>
                                    <th className="px-6 py-3 text-right">Akcje</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {stats?.monthly.map((month) => (
                                    <tr key={month.month} className="hover:bg-gray-50 transition-colors">
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
                                        <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
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
                    <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                        <h2 className="font-bold text-gray-800 flex items-center gap-2">
                            <FileText size={20} className="text-gray-500" />
                            Lista Szczegółowa (Edycja)
                        </h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-3">Data</th>
                                    <th className="px-6 py-3">Klient</th>
                                    <th className="px-6 py-3">NIP</th>
                                    <th className="px-6 py-3 text-right">Akcje</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {stats?.raw.map((inspection) => (
                                    <tr key={inspection.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 text-gray-900">
                                            {new Date(inspection.inspection_date).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 text-gray-600">{inspection.client_name}</td>
                                        <td className="px-6 py-4 text-gray-500">{inspection.client_nip}</td>
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
```
