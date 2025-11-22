import { openDB, QUEUE_STORE_NAME, EmailQueueItem } from './db';

export const addToQueue = async (emailData: Omit<EmailQueueItem, 'createdAt'>): Promise<void> => {
    try {
        const db = await openDB();
        const transaction = db.transaction([QUEUE_STORE_NAME], 'readwrite');
        const store = transaction.objectStore(QUEUE_STORE_NAME);

        const item: EmailQueueItem = {
            ...emailData,
            createdAt: Date.now(),
        };

        return new Promise((resolve, reject) => {
            const request = store.add(item);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        console.error("Error adding to email queue:", error);
        throw error;
    }
};

export const processQueue = async (): Promise<void> => {
    if (!navigator.onLine) return;

    try {
        const db = await openDB();
        const transaction = db.transaction([QUEUE_STORE_NAME], 'readwrite');
        const store = transaction.objectStore(QUEUE_STORE_NAME);

        const request = store.getAll();

        request.onsuccess = async () => {
            const items = request.result as EmailQueueItem[];
            if (items.length === 0) return;

            console.log(`Processing ${items.length} queued emails...`);

            for (const item of items) {
                try {
                    const response = await fetch('/api/send-email', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            to: item.to,
                            subject: item.subject,
                            html: item.html,
                            attachments: item.attachments,
                        }),
                    });

                    if (response.ok) {
                        // Remove from queue on success
                        const deleteTx = db.transaction([QUEUE_STORE_NAME], 'readwrite');
                        deleteTx.objectStore(QUEUE_STORE_NAME).delete(item.id!);
                        console.log(`Email to ${item.to} sent and removed from queue.`);
                    } else {
                        console.error(`Failed to send queued email to ${item.to}:`, await response.text());
                    }
                } catch (err) {
                    console.error(`Error sending queued email to ${item.to}:`, err);
                }
            }
        };
    } catch (error) {
        console.error("Error processing email queue:", error);
    }
};
