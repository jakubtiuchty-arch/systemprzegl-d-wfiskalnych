import React, { useState, useEffect } from 'react';
import { AppScreen, InspectionData, Device } from './types';
import StartScreen from './components/StartScreen';
import ScanScreen from './components/ScanScreen';
import FinalizeScreen from './components/FinalizeScreen';
import LoginScreen from './components/LoginScreen';
import { supabase } from './services/supabase';
import { Session } from '@supabase/supabase-js';
import { processQueue } from './services/syncService';

const App: React.FC = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentScreen, setCurrentScreen] = useState<AppScreen>(AppScreen.START);

  // Global State
  const [data, setData] = useState<InspectionData>({
    clientName: '',
    clientNip: '',
    clientEmail: '',
    deviceModel: '',
    devices: [],
    servicemanSignature: null,
    clientSignature: null,
  });

  useEffect(() => {
    // Auth Check
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    // Background Sync Listener
    const handleOnline = () => {
      console.log("Network restored. Processing offline queue...");
      processQueue();
    };
    window.addEventListener('online', handleOnline);

    // Process queue on app start if online
    if (navigator.onLine) {
      processQueue();
    }

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  if (loading) {
    return <div className="h-screen w-full flex items-center justify-center bg-gray-100">Ładowanie...</div>;
  }

  if (!session) {
    return <LoginScreen />;
  }

  // Step 1: Start Screen -> Capture Client Name, NIP, Email and Device Model
  const handleStart = (clientName: string, clientNip: string, clientEmail: string, deviceModel: string) => {
    setData(prev => ({ ...prev, clientName, clientNip, clientEmail, deviceModel }));
    setCurrentScreen(AppScreen.SCAN);
  };

  // Step 2: Scan Screen -> Update Devices
  const handleUpdateDevices = (devices: Device[]) => {
    setData(prev => ({ ...prev, devices }));
  };

  // Step 3: Finalize -> Generate PDF
  const handleGoToFinalize = () => {
    setCurrentScreen(AppScreen.FINALIZE);
  };

  const handleUpdateData = (newData: InspectionData) => {
    setData(newData);
  };

  return (
    <div className="h-screen w-full overflow-hidden bg-gray-100 font-sans">
      <div className="h-full w-full max-w-xl mx-auto bg-white shadow-2xl overflow-hidden relative">

        {currentScreen === AppScreen.START && (
          <StartScreen onStart={handleStart} />
        )}

        {currentScreen === AppScreen.SCAN && (
          <ScanScreen
            clientName={data.clientName}
            devices={data.devices}
            onUpdateDevices={handleUpdateDevices}
            onFinish={handleGoToFinalize}
          />
        )}

        {currentScreen === AppScreen.FINALIZE && (
          <FinalizeScreen
            data={data}
            onUpdateData={handleUpdateData}
            onBack={() => setCurrentScreen(AppScreen.SCAN)}
          />
        )}
      </div>
    </div>
  );
};

export default App;