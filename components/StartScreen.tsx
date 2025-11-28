import React, { useState } from 'react';
import { ArrowRight, Settings, LogOut } from 'lucide-react';
import { supabase } from '../services/supabase';

interface StartScreenProps {
  initialLocation?: string;
  onStart: (clientName: string, clientNip: string, clientEmail: string, deviceModel: string, location: string, inspectionType: 'annual' | 'biennial') => void;
}

const StartScreen: React.FC<StartScreenProps> = ({ initialLocation, onStart }) => {
  const [clientName, setClientName] = useState('');
  const [clientNip, setClientNip] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [location, setLocation] = useState(initialLocation || '');
  const [deviceModel, setDeviceModel] = useState('Posnet Temo');
  const [inspectionType, setInspectionType] = useState<'annual' | 'biennial'>('annual');
  const [error, setError] = useState('');

  // Update local state if prop changes (e.g. GPS found later)
  React.useEffect(() => {
    if (initialLocation) {
      setLocation(initialLocation);
    }
  }, [initialLocation]);

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
    onStart(clientName, clientNip, clientEmail, deviceModel, location, inspectionType);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="flex flex-col h-full justify-center items-center p-6 bg-gray-50 relative">
      <div className="bg-white p-6 rounded-2xl shadow-lg w-full max-w-md border border-gray-100 relative">
        <button
          onClick={handleSignOut}
          className="absolute top-4 right-4 text-gray-400 hover:text-red-600 transition-colors p-2"
          title="Wyloguj się"
        >
          <LogOut size={20} />
        </button>

        <div className="flex justify-center mb-4 text-blue-600">
          <Settings size={40} />
        </div>

        <h1 className="text-xl font-bold text-center mb-1 text-gray-800">
          Konfiguracja przeglądu
        </h1>
        <p className="text-center text-gray-500 mb-6 text-sm">
          Wprowadź dane klienta, aby rozpocząć nową sesję.
        </p>

        <div className="space-y-4">
          {/* Inspection Type Selector - Segmented Control */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2 text-center">
              Rodzaj przeglądu
            </label>
            <div className="flex bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => setInspectionType('annual')}
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${inspectionType === 'annual'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
                  }`}
              >
                Roczny
              </button>
              <button
                onClick={() => setInspectionType('biennial')}
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${inspectionType === 'biennial'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
                  }`}
              >
                Dwuletni
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Nazwa Nadleśnictwa
            </label>
            <input
              type="text"
              value={clientName}
              onChange={(e) => {
                setClientName(e.target.value);
                setError('');
              }}
              placeholder="np. Węgierska Górka"
              className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              NIP Klienta
            </label>
            <input
              type="text"
              value={clientNip}
              onChange={(e) => {
                setClientNip(e.target.value);
                setError('');
              }}
              placeholder="np. 1234567890"
              className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Email klienta
            </label>
            <input
              type="email"
              value={clientEmail}
              onChange={(e) => setClientEmail(e.target.value)}
              placeholder="np. sekretariat@nadlesnictwo.pl"
              className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Miejsce przeglądu
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="np. Trzebnica (lub puste dla GPS)"
              className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Urządzenie
            </label>
            <select
              value={deviceModel}
              onChange={(e) => setDeviceModel(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white text-sm"
            >
              <option value="Posnet Temo">Posnet Temo</option>
              <option value="Posnet Pospay">Posnet Pospay</option>
              <option value="Novitus Bono Online">Novitus Bono Online</option>
            </select>
          </div>

          {error && (
            <p className="text-red-500 text-xs mt-1 ml-1">{error}</p>
          )}

          <button
            onClick={handleStart}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors mt-2 text-sm"
          >
            <span>Rozpocznij przegląd</span>
            <ArrowRight size={18} />
          </button>
        </div>
      </div>

      <div className="mt-4 text-center text-[10px] text-gray-400">
        <p>System Przeglądów Fiskalnych v2.1</p>
        <p>TAKMA NIP 9151004377</p>
      </div>
    </div>
  );
};

export default StartScreen;