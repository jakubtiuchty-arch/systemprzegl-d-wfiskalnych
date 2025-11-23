import React, { useState } from 'react';
import { ArrowRight, Settings, LogOut } from 'lucide-react';
import { supabase } from '../services/supabase';

interface StartScreenProps {
  onStart: (clientName: string, clientNip: string, clientEmail: string, deviceModel: string) => void;
}

const StartScreen: React.FC<StartScreenProps> = ({ onStart }) => {
  const [clientName, setClientName] = useState('');
  const [clientNip, setClientNip] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [deviceModel, setDeviceModel] = useState('Posnet Temo');
  const [error, setError] = useState('');

  const handleStart = () => {
    if (!clientName.trim()) {
      setError('Nazwa Nadleśnictwa jest wymagana.');
      return;
    }
    if (!clientNip.trim()) {
      setError('NIP Klienta jest wymagany.');
      return;
    }
    // Email is optional, but passed if present
    onStart(clientName, clientNip, clientEmail, deviceModel);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const handleTestReminder = async () => {
    try {
      const today = new Date();
      const targetDate = new Date(today);
      targetDate.setDate(today.getDate() + 14);
      const targetDateStr = targetDate.toISOString().split('T')[0];

      const { error } = await supabase.from('inspections').insert({
        client_name: 'TEST PRZYPOMNIENIA',
        client_email: 'test@example.com',
        inspection_date: new Date().toISOString().split('T')[0],
        next_inspection_date: targetDateStr,
        reminder_sent: false,
        user_id: (await supabase.auth.getUser()).data.user?.id
      });

      if (error) throw error;
      alert(`Dodano rekord testowy na dzień: ${targetDateStr}. Teraz wejdź na: /api/cron/send-reminders`);
    } catch (e: any) {
      alert('Błąd dodawania testu: ' + e.message);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-gray-800">Nowy Przegląd</h1>
          <button onClick={handleSignOut} className="text-sm text-red-600 hover:text-red-800 font-medium">
            Wyloguj
          </button>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nazwa Nadleśnictwa
            </label>
            <input
              type="text"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              placeholder="np. Trzebnica"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              NIP
            </label>
            <input
              type="text"
              value={clientNip}
              onChange={(e) => setClientNip(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              placeholder="np. 1234567890"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email klienta
            </label>
            <input
              type="email"
              value={clientEmail}
              onChange={(e) => setClientEmail(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              placeholder="np. biuro@nadlesnictwo.pl"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Urządzenie
            </label>
            <div className="relative">
              <select
                value={deviceModel}
                onChange={(e) => setDeviceModel(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all appearance-none bg-white"
              >
                <option value="Posnet Temo">Posnet Temo</option>
                <option value="Posnet Pospay">Posnet Pospay</option>
                <option value="Novitus Bono Online">Novitus Bono Online</option>
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>

          <button
            onClick={handleStart}
            disabled={!clientName || !clientNip || !clientEmail}
            className={`w-full py-3 rounded-lg font-bold text-white transition-all transform active:scale-95 ${clientName && clientNip && clientEmail
              ? 'bg-blue-600 hover:bg-blue-700 shadow-md hover:shadow-lg'
              : 'bg-gray-300 cursor-not-allowed'
              }`}
          >
            Rozpocznij Przegląd
          </button>

          <button
            onClick={handleTestReminder}
            className="w-full py-2 mt-4 text-xs text-gray-400 hover:text-gray-600 border border-dashed border-gray-300 rounded"
          >
            [DEBUG] Dodaj test przypomnienia (za 14 dni)
          </button>
        </div>

        <div className="mt-8 text-center text-xs text-gray-400">
          System Przeglądów Fiskalnych v2.1
        </div>
      </div>
    </div>
  );
};

export default StartScreen;