import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serveStatic } from 'hono/cloudflare-workers';
import type { Bindings, Variables } from './types';

// Import Sales CRM routes
import prospectsRoutes from './routes/prospects';
import meetingsRoutes from './routes/meetings';
import networkingRoutes from './routes/networking';
import businessCardsRoutes from './routes/business-cards';
import referralsRoutes from './routes/referrals';
import newAppointmentsRoutes from './routes/new-appointments';
import salesDashboardRoutes from './routes/sales-dashboard';
import salesWeeklyReportsRoutes from './routes/sales-weekly-reports';
import salesCrmDashboardRoutes from './routes/sales-crm-dashboard';
import salesCrmTasksRoutes from './routes/sales-crm-tasks';
// Nurturing CRM routes (3-layer data model)
import masterContactsRoutes from './routes/master-contacts';
import dealsRoutes from './routes/deals';
import interactionsRoutes from './routes/interactions';

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// CORS middleware for API routes
app.use('/api/*', cors());

// Serve static files
app.use('/static/*', serveStatic({ root: './' }));

// Sales CRM API routes
app.route('/api/prospects', prospectsRoutes);
app.route('/api/meetings', meetingsRoutes);
app.route('/api/networking', networkingRoutes);
app.route('/api/business-cards', businessCardsRoutes);
app.route('/api/referrals', referralsRoutes);
app.route('/api/new-appointments', newAppointmentsRoutes);
app.route('/api/sales-dashboard', salesDashboardRoutes);
app.route('/api/sales-weekly-reports', salesWeeklyReportsRoutes);
app.route('/api/sales-crm/dashboard', salesCrmDashboardRoutes);
app.route('/api/sales-crm/tasks', salesCrmTasksRoutes);
// Nurturing CRM API routes (3-layer data model)
app.route('/api/master-contacts', masterContactsRoutes);
app.route('/api/deals', dealsRoutes);
app.route('/api/interactions', interactionsRoutes);

// Root route - Login page with simple authentication
app.get('/', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ja">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>営業CRM - ログイン</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
    </head>
    <body class="bg-gradient-to-br from-blue-50 to-indigo-100 min-h-screen flex items-center justify-center">
        <div class="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
            <div class="text-center mb-8">
                <i class="fas fa-handshake text-6xl text-indigo-600 mb-4"></i>
                <h1 class="text-3xl font-bold text-gray-800 mb-2">営業CRM</h1>
                <p class="text-gray-600">ナーチャリング特化型営業管理システム</p>
            </div>

            <div class="mb-6">
                <label class="block text-sm font-medium text-gray-700 mb-2">
                    ユーザーを選択
                </label>
                <select id="user-select" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500">
                    <option value="1">管理者 (Admin)</option>
                    <option value="2">PM担当 (PM)</option>
                    <option value="3">営業担当 (Sales)</option>
                </select>
            </div>

            <button onclick="login()" class="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-lg transition duration-200">
                <i class="fas fa-sign-in-alt mr-2"></i>ログイン
            </button>

            <div class="mt-6 pt-6 border-t border-gray-200">
                <h3 class="text-sm font-semibold text-gray-700 mb-2">システムの特徴：</h3>
                <ul class="text-xs text-gray-600 space-y-1">
                    <li><i class="fas fa-check text-green-500 mr-2"></i>3層データモデルによる関係構築重視</li>
                    <li><i class="fas fa-check text-green-500 mr-2"></i>8段階パイプライン管理</li>
                    <li><i class="fas fa-check text-green-500 mr-2"></i>接点ログによる関係性の可視化</li>
                    <li><i class="fas fa-check text-green-500 mr-2"></i>リアルタイムダッシュボード</li>
                </ul>
            </div>
        </div>

        <script>
            function login() {
                const userId = document.getElementById('user-select').value;
                // Simple authentication: store user ID as session token
                localStorage.setItem('session_token', userId);
                window.location.href = '/sales-crm';
            }
        </script>
    </body>
    </html>
  `);
});

// Sales CRM main page
app.get('/sales-crm', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ja">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>営業CRM</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
    </head>
    <body class="bg-gray-50 min-h-screen">
        <div id="app" class="container mx-auto px-4 py-6"></div>
        
        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/dayjs@1.11.10/dayjs.min.js"></script>
        <script src="/static/sales-crm.js"></script>
    </body>
    </html>
  `);
});

// Health check
app.get('/health', (c) => {
  return c.json({ status: 'ok', service: 'sales-crm' });
});

export default app;
