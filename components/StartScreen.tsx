import React, { useState } from 'react';
import { ArrowRight, Settings, LogOut, Loader2 } from 'lucide-react';
import { supabase } from '../services/supabase';
import { FORESTRIES } from '../data/forestries';

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
  const [isSearchingNip, setIsSearchingNip] = useState(false);

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
    // Email is optional, but passed if present
    onStart(clientName, clientNip, clientEmail, deviceModel, location, inspectionType);
  };

  const handleClientNameChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setClientName(name);
    setError('');

    if (name.length < 3) return;

    // 1. Check Local Dictionary
    const normalizedName = name.trim().toLowerCase();
    // Try exact match or partial match if needed. For now, let's try direct key lookup.
    // Since keys are lowercase, we can try to find if the input matches a key.
    // Or better: check if any key is contained in the input (or vice versa).
    // Let's stick to simple key lookup for now to avoid false positives.

    // Check if we have a direct match in our dictionary
    if (FORESTRIES[normalizedName]) {
      setClientNip(FORESTRIES[normalizedName]);
      return;
    }

    // Also try to find by "nadleśnictwo [name]" or just "[name]"
    const nameWithoutPrefix = normalizedName.replace('nadleśnictwo', '').trim();
    if (FORESTRIES[nameWithoutPrefix]) {
      setClientNip(FORESTRIES[nameWithoutPrefix]);
      return;
    }

    // 2. Check Supabase History (Debounced ideally, but simple for now)
    // We only search if user stops typing for a bit, but here we trigger on every change > 3 chars?
    // That might be too many requests. Let's use a simple timeout/debounce.
    // Actually, for simplicity in this iteration, let's just do it. 
    // But to avoid spamming, maybe only search on blur? 
    // User requested "typing name... program fills NIP". 
    // Let's use a small debounce.
  };

  // Debounced Supabase Lookup
  React.useEffect(() => {
    const lookupNip = async () => {
      if (!clientName || clientName.length < 4) return;

      // Skip if NIP is already filled (user might have entered it manually or it was found locally)
      if (clientNip) return;

      setIsSearchingNip(true);
      try {
        const { data, error } = await supabase
          .from('inspections')
          .select('client_nip')
          .ilike('client_name', `%${clientName}%`)
          .not('client_nip', 'is', null)
          .limit(1)
          .maybeSingle();

        if (data && data.client_nip) {
          setClientNip(data.client_nip);
        }
      } catch (err) {
        console.error("Error looking up NIP:", err);
      } finally {
        setIsSearchingNip(false);
      }
    };

    const timer = setTimeout(lookupNip, 1000); // 1s debounce
    return () => clearTimeout(timer);
  }, [clientName]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="flex flex-col h-full justify-center items-center p-5 bg-gray-50 relative">
      <div className="bg-white p-5 rounded-2xl shadow-lg w-full max-w-md border border-gray-100 relative">
        <button
          onClick={handleSignOut}
          className="absolute top-3 right-3 text-gray-400 hover:text-red-600 transition-colors p-2"
          title="Wyloguj się"
        >
          <LogOut size={18} />
        </button>

        <div className="flex justify-center mb-2 text-blue-600">
          <Settings size={32} />
        </div>

        <h1 className="text-lg font-bold text-center mb-1 text-gray-800">
          Konfiguracja przeglądu
        </h1>
        <p className="text-center text-gray-500 mb-4 text-xs">
          Wprowadź dane klienta, aby rozpocząć nową sesję.
        </p>

        <div className="space-y-2">
          {/* Inspection Type Selector - Segmented Control */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1 text-center">
              Rodzaj przeglądu
            </label>
            <div className="flex bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => setInspectionType('annual')}
                className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${inspectionType === 'annual'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
                  }`}
              >
                Roczny
              </button>
              <button
                onClick={() => setInspectionType('biennial')}
                className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${inspectionType === 'biennial'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
                  }`}
              >
                Dwuletni
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-0.5">
              Nazwa Nadleśnictwa
            </label>
            <input
              type="text"
              value={clientName}
              onChange={handleClientNameChange}
              placeholder="np. Węgierska Górka"
              className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-0.5 flex justify-between">
              <span>NIP Klienta</span>
              {isSearchingNip && <Loader2 size={12} className="animate-spin text-blue-500" />}
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
            <label className="block text-xs font-medium text-gray-700 mb-0.5">
              Email klienta
            </label>
            <input
              type="email"
              value={clientEmail}
              onChange={(e) => setClientEmail(e.target.value)}
              placeholder="np. sekretariat@..."
              className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-0.5">
              Miejsce przeglądu
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="np. Trzebnica"
              className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-0.5">
              Urządzenie
            </label>
            <select
              value={deviceModel}
              onChange={(e) => setDeviceModel(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white text-sm"
            >
              <option value="Posnet Temo">Posnet Temo</option>
              <option value="Posnet Pospay">Posnet Pospay</option>
              <option value="Novitus Bono">Novitus Bono</option>
            </select>
          </div>

          {error && (
            <p className="text-red-500 text-xs mt-1 ml-1">{error}</p>
          )}

          <button
            onClick={handleStart}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors mt-2 text-sm"
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