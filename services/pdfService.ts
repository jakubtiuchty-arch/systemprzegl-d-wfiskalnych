import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { InspectionData } from '../types';

// Using local fonts for offline support (cached by PWA)
const FONT_URL_REGULAR = '/fonts/Roboto-Regular.ttf';
const FONT_URL_MEDIUM = '/fonts/Roboto-Medium.ttf';

// Helper to convert ArrayBuffer to Base64
const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
};

const fetchFont = async (url: string): Promise<string> => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch font: ${response.statusText}`);
  const buffer = await response.arrayBuffer();
  return arrayBufferToBase64(buffer);
};

// Fallback function to remove Polish chars if font fails
const normalizeText = (text: string) => {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, "").replace(/\u0142/g, "l").replace(/\u0141/g, "L");
};

export const generateAndDownloadPdf = async (data: InspectionData) => {
  // 1. Set orientation to Landscape
  const doc = new jsPDF({ orientation: 'landscape' });
  let fontLoaded = false;

  // 2. Load Fonts (Async)
  try {
    const [fontRegular, fontMedium] = await Promise.all([
      fetchFont(FONT_URL_REGULAR),
      fetchFont(FONT_URL_MEDIUM)
    ]);

    // Add fonts to VFS
    doc.addFileToVFS('Roboto-Regular.ttf', fontRegular);
    doc.addFileToVFS('Roboto-Medium.ttf', fontMedium);

    // Register fonts
    doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
    doc.addFont('Roboto-Medium.ttf', 'Roboto', 'bold');

    // Set active font
    doc.setFont('Roboto');
    fontLoaded = true;
  } catch (e) {
    console.error("Could not load fonts. Polish characters might be replaced.", e);
    doc.setFont("helvetica");
    alert("Uwaga: Nie udało się pobrać polskiej czcionki. Protokół zostanie wygenerowany bez polskich znaków.");
  }

  // Helper to process text based on font success
  const txt = (str: string) => fontLoaded ? str : normalizeText(str);

  const pageWidth = doc.internal.pageSize.getWidth();

  // Format date as dd.MM.yyyy explicitly
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();
  const dateStr = `${day}.${month}.${year}`;

  // --- HERO HEADER SECTION ---

  // Linia 1: PROTOKÓŁ (Duża, pogrubiona czcionka)
  doc.setFontSize(18);
  if (fontLoaded) doc.setFont("Roboto", "bold");
  else doc.setFont("helvetica", "bold");

  doc.text(txt("PROTOKÓŁ"), pageWidth / 2, 20, { align: "center" });

  // Location and Date in top right
  doc.setFontSize(10);
  if (fontLoaded) doc.setFont("Roboto", "normal");
  else doc.setFont("helvetica", "normal");

  const headerText = `Trzebnica, ${dateStr}`;

  doc.text(txt(headerText), pageWidth - 15, 15, { align: "right" });

  // Linia 2: (Mniejsza, normalna): "Spisany przez TAKMA... w dniu [DATA_TERAZ] w Nadleśnictwie [CLIENT_NAME] (NIP: [CLIENT_NIP])"
  doc.setFontSize(11);
  if (fontLoaded) doc.setFont("Roboto", "normal");
  else doc.setFont("helvetica", "normal");

  const line2 = `Spisany przez TAKMA NIP 9151004377 w dniu ${dateStr} w Nadleśnictwie ${data.clientName} (NIP: ${data.clientNip})`;
  doc.text(txt(line2), pageWidth / 2, 30, { align: "center" });

  // Linia 3: (Bold): "Przegląd i konserwację..."
  doc.setFontSize(11);
  if (fontLoaded) doc.setFont("Roboto", "bold");
  else doc.setFont("helvetica", "bold");

  const line3 = "Przegląd i konserwację (ew. naprawy) wykonano w następujących drukarkach fiskalnych:";
  doc.text(txt(line3), pageWidth / 2, 40, { align: "center" });

  // --- DEVICES TABLE ---
  const tableBody = data.devices.map((device, index) => {
    let status = device.isWorking ? "Sprawna" : "Niesprawna";
    if (!device.isWorking && device.takenToService) {
      status += " (Serwis)";
    }

    let description = "-";
    if (!device.isWorking) {
      description = device.issueDescription || "Brak opisu";
      if (device.takenToService) {
        description += " | Zabrano do serwisu";
      }
    }

    return [
      index + 1,
      txt(data.deviceModel || "-"),
      device.serialNumber,
      txt(status),
      txt(description)
    ];
  });

  autoTable(doc, {
    startY: 50,
    head: [[txt('Lp.'), txt('Urządzenie'), txt('Nr Unikatowy'), txt('Status'), txt('Uwagi')]],
    body: tableBody,
    styles: {
      font: fontLoaded ? 'Roboto' : 'helvetica',
      fontSize: 10,
      cellPadding: 3
    },
    headStyles: {
      fillColor: [41, 128, 185],
      textColor: 255,
      fontStyle: 'bold',
      font: fontLoaded ? 'Roboto' : 'helvetica'
    },
  });

  // --- SIGNATURES ---
  // Calculate Y based on table end
  const finalY = (doc as any).lastAutoTable.finalY + 20;

  // Serviceman Signature
  doc.setFontSize(10);
  if (fontLoaded) doc.setFont("Roboto", "normal");
  else doc.setFont("helvetica", "normal");

  doc.text(txt("Jakub Tiuchty"), 30, finalY);
  doc.text(txt("Nr uprawnień: 17740"), 30, finalY + 5);

  if (data.servicemanSignature) {
    doc.addImage(data.servicemanSignature, 'PNG', 30, finalY + 10, 50, 25);
  }
  doc.line(30, finalY + 40, 90, finalY + 40); // Underline

  // Client Signature
  const clientSigX = pageWidth - 90; // 30 margin from right approx

  doc.text(txt("Podpis Klienta:"), clientSigX, finalY);
  if (data.clientSignature) {
    doc.addImage(data.clientSignature, 'PNG', clientSigX, finalY + 5, 50, 25);
  }
  doc.line(clientSigX, finalY + 35, clientSigX + 60, finalY + 35); // Underline

  // Save
  const safeClientName = normalizeText(data.clientName).replace(/\s+/g, '_');
  const fileName = `Protokol_${safeClientName}_${dateStr}.pdf`;
  doc.save(fileName);

  const blob = doc.output('blob');
  return { fileName, blob };
};

export const generateCalendarEvent = (clientName: string): string => {
  const now = new Date();
  const targetDate = new Date(now.setFullYear(now.getFullYear() + 2));
  targetDate.setDate(targetDate.getDate() - 14);

  const formatDate = (date: Date) => date.toISOString().replace(/-|:|\.\d+/g, '');

  const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Takma//FiscalInspector//PL
BEGIN:VEVENT
UID:${Date.now()}@takma.pl
DTSTAMP:${formatDate(new Date())}
DTSTART:${formatDate(targetDate)}
DTEND:${formatDate(new Date(targetDate.getTime() + 3600000))}
SUMMARY:Przeglad Kas Fiskalnych - ${normalizeText(clientName)}
DESCRIPTION:Przypomnienie o przegladzie w Nadlesnictwie ${normalizeText(clientName)}
BEGIN:VALARM
TRIGGER:-P1D
ACTION:DISPLAY
DESCRIPTION:Reminder
END:VALARM
END:VEVENT
END:VCALENDAR`;

  return icsContent;
}