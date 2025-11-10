import { Hono } from 'hono';
import type { Bindings, Variables } from '../types';
import { authMiddleware } from '../middleware/auth';

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// Apply authentication middleware to all routes
app.use('/*', authMiddleware);

// Get dashboard statistics
app.get('/stats', async (c) => {
  try {
    const userId = c.get('user')?.id;
    const { DB } = c.env;

    // Get current date info
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const thisWeekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Monthly appointments count (including all statuses)
    const monthlyAppts = await DB.prepare(`
      SELECT COUNT(*) as count FROM new_appointments
      WHERE sales_id = ? AND DATE(created_at) >= ?
    `).bind(userId, thisMonthStart).first();

    // Weekly appointments count (including all statuses)
    const weeklyAppts = await DB.prepare(`
      SELECT COUNT(*) as count FROM new_appointments
      WHERE sales_id = ? AND DATE(created_at) >= ?
    `).bind(userId, thisWeekStart).first();

    // Total prospects count
    const prospectsCount = await DB.prepare(`
      SELECT COUNT(*) as count FROM prospects WHERE sales_id = ?
    `).bind(userId).first();

    // Active deals count (negotiating status)
    const activeDeals = await DB.prepare(`
      SELECT COUNT(*) as count FROM prospects 
      WHERE sales_id = ? AND status IN ('negotiating', 'proposal_sent')
    `).bind(userId).first();

    // Recent appointments (last 10)
    const { results: recentAppointments } = await DB.prepare(`
      SELECT * FROM new_appointments
      WHERE sales_id = ?
      ORDER BY created_at DESC
      LIMIT 10
    `).bind(userId).all();

    // Active deals by priority
    const { results: activeDealsData } = await DB.prepare(`
      SELECT id, company_name, contact_name, priority, status, estimated_value, expected_close_date
      FROM prospects
      WHERE sales_id = ? AND status IN ('negotiating', 'proposal_sent')
      ORDER BY 
        CASE priority 
          WHEN 'high' THEN 1 
          WHEN 'medium' THEN 2 
          WHEN 'low' THEN 3 
          ELSE 4 
        END,
        expected_close_date ASC
      LIMIT 10
    `).bind(userId).all();

    // Top referrers (TOP 5)
    const { results: topReferrers } = await DB.prepare(`
      SELECT 
        referrer_name,
        referrer_company,
        COUNT(*) as referral_count,
        SUM(CASE WHEN p.status = 'contracted' THEN 1 ELSE 0 END) as converted_count
      FROM referrals r
      INNER JOIN prospects p ON r.prospect_id = p.id
      WHERE p.sales_id = ?
      GROUP BY referrer_name, referrer_company
      ORDER BY referral_count DESC
      LIMIT 5
    `).bind(userId).all();

    // Weekly activity summary
    const weeklyNewAppts = await DB.prepare(`
      SELECT COUNT(*) as count FROM new_appointments
      WHERE sales_id = ? AND DATE(created_at) >= ?
    `).bind(userId, thisWeekStart).first();

    const weeklyQualified = await DB.prepare(`
      SELECT COUNT(*) as count FROM new_appointments
      WHERE sales_id = ? AND DATE(created_at) >= ? 
      AND status IN ('見込み化', '商談', '契約', '入金済み', '協業候補', '協業先')
    `).bind(userId, thisWeekStart).first();

    const weeklyDeals = await DB.prepare(`
      SELECT COUNT(*) as count FROM prospects
      WHERE sales_id = ? AND DATE(created_at) >= ?
      AND status IN ('contracted')
    `).bind(userId, thisWeekStart).first();

    // Conversion rate
    const totalAppts = await DB.prepare(`
      SELECT COUNT(*) as count FROM new_appointments WHERE sales_id = ?
    `).bind(userId).first();

    const qualifiedAppts = await DB.prepare(`
      SELECT COUNT(*) as count FROM new_appointments 
      WHERE sales_id = ? 
      AND status IN ('見込み化', '商談', '契約', '入金済み', '協業候補', '協業先')
    `).bind(userId).first();

    const conversionRate = totalAppts && (totalAppts.count as number) > 0
      ? Math.round(((qualifiedAppts?.count as number || 0) / (totalAppts.count as number)) * 100)
      : 0;

    return c.json({
      success: true,
      stats: {
        monthlyAppointments: monthlyAppts?.count || 0,
        weeklyAppointments: weeklyAppts?.count || 0,
        totalProspects: prospectsCount?.count || 0,
        activeDeals: activeDeals?.count || 0,
        conversionRate: conversionRate
      },
      recentAppointments: recentAppointments || [],
      activeDealsData: activeDealsData || [],
      topReferrers: topReferrers || [],
      weeklyActivity: {
        newAppointments: weeklyNewAppts?.count || 0,
        qualified: weeklyQualified?.count || 0,
        deals: weeklyDeals?.count || 0
      }
    });
  } catch (error: any) {
    console.error('Get dashboard stats error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

export default app;
