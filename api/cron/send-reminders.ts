import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

// Initialize Supabase with Service Role Key (Admin access)
// This key should NEVER be exposed to the client
const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const resend = new Resend(process.env.RESEND_API_KEY);

export async function GET(request: Request) {
    // Verify Vercel Cron signature (optional but recommended for security)
    // const authHeader = request.headers.get('authorization');
    // if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    //   return new Response('Unauthorized', { status: 401 });
    // }

    try {
        const hasServiceKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;

        // 1. Calculate target date: Today + 14 days
        const url = new URL(request.url);
        const overrideDate = url.searchParams.get('date');

        let targetDateStr;
        if (overrideDate) {
            targetDateStr = overrideDate;
            console.log(`Using override date: ${targetDateStr}`);
        } else {
            const today = new Date();
            const targetDate = new Date(today);
            targetDate.setDate(today.getDate() + 14);
            targetDateStr = targetDate.toISOString().split('T')[0];
        }

        console.log(`Checking for inspections expiring on: ${targetDateStr}`);

        // 2. Query inspections due for reminder
        const { data: inspections, error } = await supabase
            .from('inspections')
            .select('*')
            .eq('next_inspection_date', targetDateStr)
            .eq('reminder_sent', false);

        if (error) throw error;

        if (!inspections || inspections.length === 0) {
            return new Response(`
                <html>
                <body style="font-family: sans-serif; padding: 20px;">
                    <h1>Status Automatu</h1>
                    ${!hasServiceKey ? '<p style="color: red; font-weight: bold;">⚠️ BŁĄD: Brak klucza SUPABASE_SERVICE_ROLE_KEY! Automat nie ma dostępu do bazy.</p>' : ''}
                    <p>📅 Sprawdzana data: <strong>${targetDateStr}</strong></p>
                    <p>ℹ️ Wynik: <strong>Brak przeglądów do przypomnienia na ten dzień.</strong></p>
                    <hr>
                    <p><small>Możesz wymusić inną datę dodając ?date=YYYY-MM-DD do adresu.</small></p>
                </body>
                </html>
            `, {
                status: 200,
                headers: { 'Content-Type': 'text/html; charset=utf-8' },
            });
        }

        console.log(`Found ${inspections.length} inspections to remind.`);

        const results = [];

        // 3. Loop through and send emails
        for (const inspection of inspections) {
            try {
                // Send email to office
                const { data: emailData, error: emailError } = await resend.emails.send({
                    from: 'TAKMA <kontakt@rejestratory.info>',
                    to: ['jakub.tiuchty@takma.com.pl'], // Send to office
                    subject: `[TERMINARZ] Przypomnienie o przeglądzie: ${inspection.client_name}`,
                    html: `
            <div style="font-family: sans-serif; color: #333;">
              <h2>Przypomnienie o przeglądzie</h2>
              <p>Za 14 dni mija termin przeglądu dla klienta:</p>
              <p><strong>${inspection.client_name}</strong></p>
              <p>Data przeglądu: <strong>${inspection.next_inspection_date}</strong></p>
              <br>
              <p>Skontaktuj się z klientem: <a href="mailto:${inspection.client_email}">${inspection.client_email}</a></p>
              <hr>
              <p style="font-size: 12px; color: #888;">System Przeglądów Fiskalnych - Automat</p>
            </div>
          `,
                });

                if (emailError) {
                    console.error(`Failed to send email for ${inspection.id}:`, emailError);
                    results.push({ id: inspection.id, status: 'failed', error: emailError });
                } else {
                    // 4. Update reminder_sent flag
                    const { error: updateError } = await supabase
                        .from('inspections')
                        .update({ reminder_sent: true })
                        .eq('id', inspection.id);

                    if (updateError) {
                        console.error(`Failed to update status for ${inspection.id}:`, updateError);
                        results.push({ id: inspection.id, status: 'email_sent_but_db_failed', error: updateError });
                    } else {
                        results.push({ id: inspection.id, status: 'success' });
                    }
                }
            } catch (innerError) {
                console.error(`Error processing inspection ${inspection.id}:`, innerError);
                results.push({ id: inspection.id, status: 'error', error: innerError });
            }
        }

        return new Response(`
            <html>
            <body style="font-family: sans-serif; padding: 20px;">
                <h1>Status Automatu</h1>
                <p>📅 Sprawdzana data: <strong>${targetDateStr}</strong></p>
                <p>✅ Przetworzono: <strong>${results.length}</strong> przypomnień.</p>
                <ul>
                    ${results.map(r => `<li>ID: ${r.id} - Status: ${r.status}</li>`).join('')}
                </ul>
            </body>
            </html>
        `, {
            status: 200,
            headers: { 'Content-Type': 'text/html; charset=utf-8' },
        });

    } catch (err: any) {
        console.error('Cron job failed:', err);
        return new Response(`
            <html>
            <body style="font-family: sans-serif; padding: 20px; color: red;">
                <h1>Błąd Automatu</h1>
                <p>${err.message}</p>
            </body>
            </html>
        `, {
            status: 500,
            headers: { 'Content-Type': 'text/html; charset=utf-8' },
        });
    }
}
