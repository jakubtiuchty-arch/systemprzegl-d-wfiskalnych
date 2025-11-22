import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

import { VitePWA } from 'vite-plugin-pwa';
import { Resend } from 'resend';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');

  // Custom middleware for handling email sending locally
  const emailMiddleware = () => ({
    name: 'configure-server',
    configureServer(server) {
      server.middlewares.use('/api/send-email', async (req, res, next) => {
        if (req.method === 'POST') {
          try {
            const buffers = [];
            for await (const chunk of req) {
              buffers.push(chunk);
            }
            const data = JSON.parse(Buffer.concat(buffers).toString());

            const resend = new Resend(env.RESEND_API_KEY);

            const { data: emailData, error } = await resend.emails.send({
              from: 'Fiscal Inspector <onboarding@resend.dev>', // Default Resend testing domain
              to: [data.to],
              subject: data.subject,
              html: data.html,
              attachments: data.attachments,
            });

            if (error) {
              console.error('Resend Error:', error);
              res.statusCode = 400;
              res.end(JSON.stringify({ error }));
              return;
            }

            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(emailData));
          } catch (err) {
            console.error('Middleware Error:', err);
            res.statusCode = 500;
            res.end(JSON.stringify({ error: err.message }));
          }
        } else {
          next();
        }
      });
    },
  });

  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [
      react(),
      emailMiddleware(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
        manifest: {
          name: 'System przeglądów fiskalnych',
          short_name: 'Przeglądy',
          description: 'Aplikacja do przeglądów fiskalnych',
          theme_color: '#ffffff',
          background_color: '#ffffff',
          display: 'fullscreen',
          orientation: 'portrait',
          start_url: '/',
          icons: [
            {
              src: 'pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png'
            }
          ]
        }
      })
    ],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.RESEND_API_KEY': JSON.stringify(env.RESEND_API_KEY)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
