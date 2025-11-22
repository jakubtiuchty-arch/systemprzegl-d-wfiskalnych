import React, { useState, useRef, useEffect } from 'react';
import { Device } from '../types';
import { QrCode, CheckCircle, AlertCircle, Plus, Trash2, X, Camera } from 'lucide-react';
import CameraScanner from './CameraScanner';

interface ScanScreenProps {
  clientName: string;
  devices: Device[];
  onUpdateDevices: (devices: Device[]) => void;
  onFinish: () => void;
}

// Safe ID generator that works in all WebView contexts
const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    try {
      return crypto.randomUUID();
    } catch (e) {
      // Fallback if secure context missing
    }
  }
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

const ScanScreen: React.FC<ScanScreenProps> = ({ clientName, devices, onUpdateDevices, onFinish }) => {
  const [inputSerial, setInputSerial] = useState('');
  const [showCamera, setShowCamera] = useState(false);

  // Modal State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDescription, setEditDescription] = useState('');
  const [editTakenToService, setEditTakenToService] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  const handleAddDevice = (serial: string) => {
    if (!serial.trim()) return;

    const newDevice: Device = {
      id: generateId(),
      serialNumber: serial.trim(),
      isWorking: true,
      timestamp: Date.now(),
    };

    // Important: use the callback/latest state logic if calling from outside, 
    // but here we rely on the parent passing fresh 'devices' prop on re-render.
    // To ensure we don't lose data if rapid scans happen, ideally we handle this upstream,
    // but for this structure:
    onUpdateDevices([newDevice, ...devices]);
    setInputSerial('');
  };

  // Expose global function for Android Intent integration
  // Android Code usage: webView.evaluateJavascript("window.onScan('12345')", null);
  useEffect(() => {
    window.onScan = (serial: string) => {
      handleAddDevice(serial);
    };
    return () => {
      // cleanup
      (window as any).onScan = undefined;
    };
  }, [devices]); // Re-bind when devices change to ensure closure has latest list

  // Focus input on mount
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddDevice(inputSerial);
    }
  };

  const handleStatusClick = (id: string) => {
    const device = devices.find(d => d.id === id);
    if (!device) return;

    if (device.isWorking) {
      setEditingId(id);
      setEditDescription(device.issueDescription || '');
      setEditTakenToService(device.takenToService || false);

      const updated = devices.map(d => d.id === id ? { ...d, isWorking: false } : d);
      onUpdateDevices(updated);
    } else {
      const updated = devices.map(d =>
        d.id === id ? { ...d, isWorking: true, issueDescription: undefined, takenToService: undefined } : d
      );
      onUpdateDevices(updated);
      setEditingId(null);
    }
  };

  const saveFaultDetails = () => {
    if (!editingId) return;
    const updated = devices.map(d =>
      d.id === editingId ? { ...d, issueDescription: editDescription, takenToService: editTakenToService } : d
    );
    onUpdateDevices(updated);
    setEditingId(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const removeDevice = (id: string) => {
    onUpdateDevices(devices.filter(d => d.id !== id));
  };

  return (
    <div className="flex flex-col h-full bg-gray-100 relative">
      {/* Header */}
      <div className="bg-white p-4 shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="flex justify-between items-center mb-2">
          <div>
            <h2 className="text-lg font-bold text-gray-800">Przegląd</h2>
            <p className="text-sm text-gray-500 font-medium">Nadleśnictwo {clientName}</p>
          </div>
          <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-bold">
            Ilość: {devices.length}
          </div>
        </div>

        {/* Simulated Scanner Input */}
        <div className="relative flex gap-2">
          <div className="relative flex-1">
            <input
              ref={inputRef}
              type="text"
              value={inputSerial}
              onChange={(e) => setInputSerial(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Skanuj kod lub wpisz..."
              className="w-full pl-10 pr-12 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none shadow-sm"
            />
            <QrCode className="absolute left-3 top-3.5 text-gray-400" size={20} />
            <button
              onClick={() => handleAddDevice(inputSerial)}
              className="absolute right-2 top-2 bg-blue-600 text-white p-1.5 rounded-md hover:bg-blue-700"
            >
              <Plus size={20} />
            </button>
          </div>

          <button
            onClick={() => setShowCamera(true)}
            className="bg-gray-800 text-white p-3 rounded-lg hover:bg-gray-700 transition-colors flex items-center justify-center"
            title="Skanuj kamerą"
          >
            <Camera size={24} />
          </button>
        </div>
        {inputSerial.length > 3 && (
          <p className="text-xs text-amber-600 mt-1 text-center">
            Jeśli skaner nie dodaje automatycznie, kliknij "+" lub skonfiguruj "Send Enter" w DataWedge.
          </p>
        )}
      </div>

      {/* Device List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {devices.length === 0 && (
          <div className="flex flex-col items-center justify-center h-48 text-gray-400">
            <QrCode size={48} className="mb-2 opacity-20" />
            <p>Zeskanuj pierwsze urządzenie</p>
            <p className="text-xs mt-2 text-gray-300">Użyj skanera wbudowanego lub kamery</p>
          </div>
        )}

        {devices.map((device) => (
          <div key={device.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="flex items-center p-4">
              {/* Status Indicator / Toggle */}
              <button
                onClick={() => handleStatusClick(device.id)}
                className={`mr-4 p-2 rounded-full transition-colors ${device.isWorking
                  ? 'bg-green-100 text-green-600 hover:bg-green-200'
                  : 'bg-red-100 text-red-600 hover:bg-red-200'
                  }`}
              >
                {device.isWorking ? <CheckCircle size={24} /> : <AlertCircle size={24} />}
              </button>

              {/* Details */}
              <div className="flex-1">
                <p className="font-mono font-bold text-gray-800 text-lg">{device.serialNumber}</p>
                <div className="flex items-center gap-2">
                  <p className={`text-sm ${device.isWorking ? 'text-green-600' : 'text-red-600'}`}>
                    {device.isWorking ? 'Sprawna' : 'Niesprawna'}
                  </p>
                  {!device.isWorking && (
                    <button onClick={() => handleStatusClick(device.id)} className="text-xs text-blue-600 underline">
                      Edytuj szczegóły
                    </button>
                  )}
                </div>
                {!device.isWorking && device.issueDescription && (
                  <p className="text-xs text-gray-500 mt-1 truncate max-w-[200px]">
                    {device.issueDescription}
                  </p>
                )}
              </div>

              {/* Delete Action */}
              <button onClick={() => removeDevice(device.id)} className="text-gray-300 hover:text-red-500 p-2">
                <Trash2 size={20} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Footer Action */}
      <div className="p-4 bg-white border-t border-gray-200">
        <button
          onClick={onFinish}
          disabled={devices.length === 0}
          className={`w-full py-3.5 rounded-lg font-bold text-lg shadow-lg transition-all ${devices.length === 0
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
            : 'bg-green-600 text-white hover:bg-green-700'
            }`}
        >
          Zakończ i Podpisz
        </button>
      </div>

      {/* Fault Reporting Modal */}
      {editingId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden transform transition-all scale-100">
            <div className="bg-red-600 p-4 flex justify-between items-center text-white">
              <div className="flex items-center gap-2">
                <AlertCircle size={24} />
                <h3 className="font-bold text-lg">Zgłoszenie Usterki</h3>
              </div>
              <button onClick={cancelEdit} className="hover:bg-red-700 p-1 rounded">
                <X size={24} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Opis usterki</label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Np. Błąd mechanizmu drukującego..."
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none min-h-[100px]"
                />
              </div>

              <label className="flex items-center gap-3 p-3 border border-red-100 bg-red-50 rounded-lg cursor-pointer">
                <input
                  type="checkbox"
                  checked={editTakenToService}
                  onChange={(e) => setEditTakenToService(e.target.checked)}
                  className="w-5 h-5 text-red-600 rounded focus:ring-red-500"
                />
                <span className="font-medium text-gray-800">Pobrano na serwis</span>
              </label>
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-100 flex gap-3">
              <button
                onClick={cancelEdit}
                className="flex-1 py-3 font-semibold text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Anuluj
              </button>
              <button
                onClick={saveFaultDetails}
                className="flex-1 py-3 font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-md transition-colors"
              >
                Zapisz
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Camera Scanner Overlay */}
      {showCamera && (
        <CameraScanner
          onScan={(decodedText) => {
            handleAddDevice(decodedText);
            setShowCamera(false);
          }}
          onClose={() => setShowCamera(false)}
        />
      )}
    </div>
  );
};

export default ScanScreen;