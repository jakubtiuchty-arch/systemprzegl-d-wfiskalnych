import React, { useState } from 'react';
import { InspectionData } from '../types';
import SignaturePad from './SignaturePad';
import { generateAndDownloadPdf, generateCalendarEvent } from '../services/pdfService';
import { getEmailSubject, getEmailHtml, getReminderEmailSubject, getReminderEmailHtml } from '../services/emailTemplates';
import { saveInspectionToDb } from '../services/db';
import { supabase } from '../services/supabase';
import { addToQueue } from '../services/syncService';
import { Download, Calendar, CheckCircle, Mail, Loader2, Save } from 'lucide-react';

interface FinalizeScreenProps {
  data: InspectionData;
  onUpdateData: (data: InspectionData) => void;
  onBack: () => void;
}

const FinalizeScreen: React.FC<FinalizeScreenProps> = ({ data, onUpdateData, onBack }) => {
  // Initialize from data.clientEmail captured in StartScreen
  const [email, setEmail] = useState(data.clientEmail || '');
  const [location, setLocation] = useState<string>('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [pdfFile, setPdfFile] = useState<{ blob: Blob, fileName: string } | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showEmailSuccessModal, setShowEmailSuccessModal] = useState(false);

  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  React.useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          // Only fetch address if online
          if (navigator.onLine) {
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
            const data = await response.json();
            const city = data.address.city || data.address.town || data.address.village || "Nieznana lokalizacja";
            setLocation(city);
          } else {
            setLocation(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
          }
        } catch (error) {
          console.error("Error fetching location:", error);
        }
      }, (error) => {
        console.error("Geolocation error:", error);
      });
    }
  }, []);

  const handleSignature = (signature: string | null) => {
    onUpdateData({
      ...data,
      servicemanSignature: signature
    });
  };

  const handleFinish = async () => {
    if (!data.servicemanSignature) {
      alert("Podpis serwisanta jest wymagany!");
      return;
    }

    setIsGenerating(true);

    try {
      // Update email in global state before generating if changed
      const currentData = { ...data, clientEmail: email, location: location };
      onUpdateData(currentData);

      // 1. Generate PDF (Async now because it loads fonts)
      const { blob, fileName } = await generateAndDownloadPdf(currentData);
      setPdfFile({ blob, fileName });

      // 2. Save to Database (IndexedDB)
      await saveInspectionToDb(currentData);

      // 3. Save to Supabase (Cloud) - Only if Online
      if (isOnline) {
        try {
          const { error } = await supabase.from('inspections').insert({
            client_name: currentData.clientName,
            client_email: currentData.clientEmail,
            inspection_date: new Date().toISOString(),
            next_inspection_date: new Date(new Date().setFullYear(new Date().getFullYear() + 2)).toISOString(),
            location: currentData.location,
            reminder_sent: false
          });
          if (error) throw error;
          console.log("Saved to Supabase");
        } catch (supaError) {
          console.error("Supabase save error:", supaError);
          // Don't block user flow if cloud save fails (e.g. offline)
        }
      } else {
        console.log("Offline - skipping cloud save");
      }

      setIsSubmitted(true);
    } catch (error) {
      console.error("Error during finalization:", error);
      alert("Wystąpił błąd podczas zapisywania danych lub generowania PDF.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSendEmail = async () => {
    if (!pdfFile || !email) return;

    if (!isOnline) {
      // Add to queue instead of alerting
      setIsGenerating(true);
      try {
        const reader = new FileReader();
        reader.readAsDataURL(pdfFile.blob);
        reader.onloadend = async () => {
          const base64data = reader.result as string;
          const content = base64data.split(',')[1];

          // Queue client email only
          await addToQueue({
            to: email,
            subject: getEmailSubject(data.clientName),
            html: getEmailHtml(data.clientName, new Date().toLocaleDateString()),
            attachments: [{ filename: pdfFile.fileName, content: content }]
          });

          alert("Brak sieci. Mail do klienta dodany do kolejki i zostanie wysłany automatycznie po odzyskaniu zasięgu.");
          setIsGenerating(false);
        };
      } catch (error) {
        console.error("Error queueing emails:", error);
        alert("Błąd podczas dodawania do kolejki.");
        setIsGenerating(false);
      }
      return;
    }

    setIsGenerating(true); // Reuse loading state

    try {
      // Convert Blob to Base64
      const reader = new FileReader();
      reader.readAsDataURL(pdfFile.blob);
      reader.onloadend = async () => {
        const base64data = reader.result as string;
        // Remove data:application/pdf;base64, prefix
        const content = base64data.split(',')[1];

        try {
          const sendClientEmail = await fetch('/api/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: email,
              subject: getEmailSubject(data.clientName),
              html: getEmailHtml(data.clientName, new Date().toLocaleDateString()),
              attachments: [{ filename: pdfFile.fileName, content: content }]
            }),
          });

          if (sendClientEmail.ok) {
            setShowEmailSuccessModal(true);
          } else {
            throw new Error("Błąd wysyłania maila");
          }
        } catch (error) {
          console.error("Error sending email:", error);
          alert("Wystąpił problem z wysyłką maila.");
        } finally {
          setIsGenerating(false);
        }
      };
    } catch (error) {
      console.error("Error preparing email:", error);
      setIsGenerating(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="flex flex-col h-full items-center justify-center p-8 text-center bg-green-50 relative">
        {showEmailSuccessModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-xl text-center transform transition-all scale-100">
              <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={32} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Wysłano pomyślnie!</h3>
              <p className="text-gray-600 mb-6">Protokół został wysłany na adres <span className="font-medium text-gray-900">{email}</span>.</p>
              <button
                onClick={() => setShowEmailSuccessModal(false)}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition-colors"
              >
                OK
              </button>
            </div>
          </div>
        )}

        <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6">
          <CheckCircle size={48} />
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Zakończono pomyślnie!</h2>
        <p className="text-gray-600 mb-2">Protokół PDF został pobrany.</p>
        <p className="text-gray-500 text-sm mb-8 flex items-center justify-center gap-1">
          <Save size={14} />
          <span>Dane przeglądu zapisano w bazie.</span>
        </p>

        {email && (
          <button onClick={handleSendEmail} className={`${isOnline ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-400 hover:bg-gray-500'} text-white px-6 py-3 rounded-lg font-bold flex items-center gap-2 transition-colors`}>
            <Mail size={20} />
            {isOnline ? 'Wyślij Email (Resend)' : 'Brak sieci - Pobierz PDF'}
          </button>
        )}

        <button
          onClick={() => window.location.reload()}
          className="mt-6 text-gray-500 underline hover:text-gray-800"
        >
          Rozpocznij nowy przegląd
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="bg-white p-4 shadow-sm border-b border-gray-200 flex items-center gap-3">
        <button onClick={onBack} disabled={isGenerating} className="text-gray-500 hover:text-gray-800 text-sm font-bold disabled:opacity-50">
          &larr; Wróć
        </button>
        <h2 className="text-lg font-bold text-gray-800">Finalizacja</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-6">
          <h3 className="font-bold text-gray-800 mb-4 border-b pb-2">Podpisy</h3>

          <SignaturePad
            label="Podpis Serwisanta"
            onSave={handleSignature}
          />
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-6">
          <h3 className="font-bold text-gray-800 mb-4 border-b pb-2">Kontakt</h3>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email Klienta (Opcjonalnie)</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isGenerating}
            placeholder="klient@nadlesnictwo.pl"
            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none"
          />
          <p className="text-xs text-gray-500 mt-2">
            Wpisanie adresu ułatwi wysłanie maila po wygenerowaniu dokumentu.
          </p>
        </div>
      </div>

      <div className="p-4 bg-white border-t border-gray-200">
        <button
          onClick={handleFinish}
          disabled={isGenerating}
          className="w-full bg-blue-600 text-white py-4 rounded-lg font-bold text-lg shadow-lg hover:bg-blue-700 flex items-center justify-center gap-3 disabled:opacity-70 disabled:cursor-wait"
        >
          {isGenerating ? (
            <>
              <Loader2 className="animate-spin" size={24} />
              <span>Zapisywanie i Generowanie...</span>
            </>
          ) : (
            <>
              <Download size={24} />
              <span>Zakończ Przegląd</span>
            </>
          )}
        </button>
        {!isGenerating && (
          <p className="text-center text-xs text-gray-400 mt-2 flex items-center justify-center gap-1">
            <Calendar size={12} />
            <span>Zapis do bazy + Przypomnienie w kalendarzu</span>
          </p>
        )}
      </div>
    </div>
  );
};

export default FinalizeScreen;
