export const getEmailSubject = (clientName: string) => {
  return `Protokół z przeglądu urządzeń fiskalnych`;
};

export const getEmailHtml = (clientName: string, date: string) => {
  return `
    <div style="font-family: sans-serif; color: #333;">
      <p>Dzień dobry,</p>
      <p>W załączniku przesyłam protokół przeglądu technicznego drukarek fiskalnych wykonanego w dniu <strong>${date}</strong>.</p>
      <br>
      <p>Pozdrawiamy,</p>
      <p><strong>Zespół TAKMA</strong></p>
      <hr>
      <p style="font-size: 12px; color: #888;">Wiadomość wygenerowana automatycznie przez System przeglądów fiskalnych.</p>
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
