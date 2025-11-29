export const getEmailSubject = (clientName: string) => {
  return `Protokół z przeglądu urządzeń fiskalnych`;
};

export const getEmailHtml = (clientName: string, date: string, inspectionType: 'annual' | 'biennial' = 'annual', sampleSerial?: string) => {
  const typeText = inspectionType === 'biennial' ? 'dwuletniego' : 'rocznego';
  return `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
      <div style="background-color: #2563eb; padding: 20px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Protokół Przeglądu</h1>
      </div>
      
      <div style="padding: 30px;">
        <p style="font-size: 16px; line-height: 1.5;">Dzień dobry,</p>
        
        <p style="font-size: 16px; line-height: 1.5;">
          W załączniku przesyłamy <strong>protokół przeglądu technicznego (${typeText}) drukarek fiskalnych</strong>, który został wykonany w dniu ${date}.
        </p>
        
        <div style="background-color: #f8fafc; border-left: 4px solid #2563eb; padding: 15px; margin: 20px 0;">
          <p style="margin: 0; font-weight: bold; color: #1e40af;">Prosimy o:</p>
          <ol style="margin: 10px 0 0 20px; padding: 0; color: #334155;">
            <li style="margin-bottom: 5px;">Wydrukowanie protokołu</li>
            <li style="margin-bottom: 5px;">Podpisanie dokumentu</li>
            <li style="margin-bottom: 5px;">Odesłanie skanu na adres: <a href="mailto:fiskalne@takma.com.pl" style="color: #2563eb; text-decoration: none; font-weight: bold;">fiskalne@takma.com.pl</a></li>
            <li style="margin-bottom: 5px;"><strong>W treści maila zwrotnego prosimy o podanie nazwy Urzędu Skarbowego, pod który podlega Nadleśnictwo.</strong></li>
          </ol>
        </div>

        <div style="background-color: #ecfdf5; border: 1px solid #10b981; border-radius: 8px; padding: 20px; margin: 30px 0; text-align: center;">
          <h3 style="margin: 0 0 10px 0; color: #047857; font-size: 18px;">Elektroniczny Panel Klienta</h3>
          <p style="margin: 0 0 15px 0; font-size: 14px; color: #065f46;">
            Wszystkie protokoły, terminy kolejnych przeglądów oraz historię urządzeń możesz sprawdzić online.
          </p>
          
          <a href="https://rejestratory.info/panel-klienta/dashboard" style="display: inline-block; background-color: #10b981; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold; font-size: 16px; margin-bottom: 15px;">
            Przejdź do Panelu Klienta
          </a>

          ${sampleSerial ? `
          <p style="margin: 0; font-size: 13px; color: #065f46;">
            Aby się zalogować, wpisz numer seryjny dowolnego urządzenia z przeglądu, np.:<br>
            <strong style="font-size: 16px; color: #047857; background-color: #d1fae5; padding: 2px 6px; border-radius: 4px; display: inline-block; margin-top: 5px;">${sampleSerial}</strong>
          </p>
          ` : ''}
        </div>

        <p style="font-size: 16px; line-height: 1.5; margin-top: 30px;">
          W razie pytań pozostajemy do dyspozycji.
        </p>
        
        <div style="margin-top: 40px; border-top: 1px solid #e0e0e0; padding-top: 20px;">
          <p style="margin: 0; font-weight: bold; color: #1e293b;">Zespół TAKMA</p>
          <p style="margin: 5px 0 0 0; font-size: 14px; color: #64748b;">
            <a href="mailto:kontakt@rejestratory.info" style="color: #64748b; text-decoration: none;">kontakt@rejestratory.info</a> | 
            <a href="https://rejestratory.info" style="color: #64748b; text-decoration: none;">rejestratory.info</a>
          </p>
        </div>
      </div>
      
      <div style="background-color: #f1f5f9; padding: 15px; text-align: center; font-size: 12px; color: #94a3b8;">
        Wiadomość wygenerowana automatycznie przez System Przeglądów Fiskalnych
      </div>
    </div>
  `;
};

export const getReminderEmailSubject = (clientName: string, deadlineDate: string) => {
  return `[TERMINARZ] ${clientName} - Kolejny przegląd do: ${deadlineDate}`;
};

export const getReminderEmailHtml = (clientName: string, deadlineDate: string, reminderDate: string) => {
  return `
    <div style="font-family: sans-serif; color: #333;">
      <h2>Rejestracja Przeglądu</h2>
      <p>Wykonano przegląd dla: <strong>${clientName}</strong></p>
      <p>Termin kolejnego przeglądu mija: <strong style="color: #d32f2f;">${deadlineDate}</strong></p>
      <p>Sugerowany kontakt z klientem (14 dni przed): <strong>${reminderDate}</strong></p>
      <br>
      <p><em>Pamiętaj, aby dodać to wydarzenie do kalendarza (plik .ics).</em></p>
      <hr>
      <p style="font-size: 12px; color: #888;">System przeglądów fiskalnych</p>
    </div>
  `;
};
