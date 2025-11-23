import { InspectionData } from '../types';

const DB_NAME = 'FiscalInspectorDB';
const DB_VERSION = 2;
const STORE_NAME = 'inspections';
const QUEUE_STORE_NAME = 'email_queue';

export interface InspectionRecord extends InspectionData {
  id?: number;
  completedAt: string; // ISO String date
  timestamp: number;   // Unix timestamp for sorting
}

export interface EmailQueueItem {
  id?: number;
  to: string;
  subject: string;
  html: string;
  attachments?: { filename: string; content: string }[];
  createdAt: number;
}

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        // Create store with autoIncrement ID
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }

      if (!db.objectStoreNames.contains(QUEUE_STORE_NAME)) {
        db.createObjectStore(QUEUE_STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    };

    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };

    request.onerror = (event) => {
      reject((event.target as IDBOpenDBRequest).error);
    };
  });
};

export const saveInspectionToDb = async (data: InspectionData): Promise<void> => {
  try {
    const db = await openDB();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    const record: InspectionRecord = {
      ...data,
      completedAt: new Date().toISOString(),
      timestamp: Date.now(),
    };

    return new Promise((resolve, reject) => {
      const request = store.add(record);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error("Error saving to database:", error);
    throw error;
  }
};

export const getAllInspections = async (): Promise<InspectionRecord[]> => {
  try {
    const db = await openDB();
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
      const request = store.getAll();

      request.onsuccess = () => {
        // Sort by timestamp descending (newest first)
        const results = request.result as InspectionRecord[];
        results.sort((a, b) => b.timestamp - a.timestamp);
        resolve(results);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error("Error fetching inspections:", error);
    return [];
  }
};

export { openDB, QUEUE_STORE_NAME };

import { supabase } from './supabase';

export interface MonthlyStats {
  month: string; // YYYY-MM
  count: number;
  earnings: number; // count * 50
  revenue: number; // count * 200
  inspections: any[];
}

export const getInspectionsStats = async (userId: string, year: number) => {
  const startDate = `${year}-01-01`;
  const endDate = `${year}-12-31`;

  const { data, error } = await supabase
    .from('inspections')
    .select('*')
    .eq('user_id', userId)
    .gte('inspection_date', startDate)
    .lte('inspection_date', endDate)
    .order('inspection_date', { ascending: false });

  if (error) throw error;

  // Group by month
  const statsByMonth: Record<string, MonthlyStats> = {};
  let totalCount = 0;
  let totalEarnings = 0;
  let totalRevenue = 0;

  data.forEach(inspection => {
    const date = new Date(inspection.inspection_date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    if (!statsByMonth[monthKey]) {
      statsByMonth[monthKey] = {
        month: monthKey,
        count: 0,
        earnings: 0,
        revenue: 0,
        inspections: []
      };
    }

    statsByMonth[monthKey].count++;
    statsByMonth[monthKey].earnings += 50;
    statsByMonth[monthKey].revenue += 200;
    statsByMonth[monthKey].inspections.push(inspection);

    totalCount++;
    totalEarnings += 50;
    totalRevenue += 200;
  });

  return {
    monthly: Object.values(statsByMonth).sort((a, b) => b.month.localeCompare(a.month)),
    total: {
      count: totalCount,
      earnings: totalEarnings,
      revenue: totalRevenue
    },
    raw: data
  };
};
