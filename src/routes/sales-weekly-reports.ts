import { Hono } from 'hono';
import type { Bindings, Variables } from '../types';
import { authMiddleware } from '../middleware/auth';

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// Apply authentication middleware to all routes
app.use('/*', authMiddleware);

// GET /api/sales-weekly-reports/stats - Get weekly stats for report
app.get('/stats', async (c) => {
  try {
    const userId = c.get('user')?.id;
    const { DB } = c.env;
    
    // Get query parameters
    const weekStart = c.req.query('week_start') || getWeekStart();
    const weekEnd = c.req.query('week_end') || getWeekEnd(weekStart);

    // Count new prospects created this week
    const { results: newProspects } = await DB.prepare(`
      SELECT COUNT(*) as count
      FROM prospects
      WHERE sales_id = ? 
        AND created_at >= ? 
        AND created_at <= ?
        AND status != 'not_qualified'
    `).bind(userId, weekStart, weekEnd + ' 23:59:59').all();

    // Count new appointments this week
    const { results: newAppointments } = await DB.prepare(`
      SELECT COUNT(*) as count
      FROM new_appointments
      WHERE sales_id = ?
        AND created_at >= ?
        AND created_at <= ?
    `).bind(userId, weekStart, weekEnd + ' 23:59:59').all();

    // Count meetings held this week (from prospects with last_meeting_date)
    const { results: meetings } = await DB.prepare(`
      SELECT COUNT(*) as count
      FROM meetings
      WHERE sales_id = ?
        AND meeting_date >= ?
        AND meeting_date <= ?
    `).bind(userId, weekStart, weekEnd + ' 23:59:59').all();

    // Count deals won this week
    const { results: dealsWon } = await DB.prepare(`
      SELECT COUNT(*) as count, COALESCE(SUM(estimated_value), 0) as revenue
      FROM prospects
      WHERE sales_id = ?
        AND status IN ('won', 'contracted', 'paid')
        AND updated_at >= ?
        AND updated_at <= ?
    `).bind(userId, weekStart, weekEnd + ' 23:59:59').all();

    // Count deals lost this week
    const { results: dealsLost } = await DB.prepare(`
      SELECT COUNT(*) as count
      FROM prospects
      WHERE sales_id = ?
        AND status = 'lost'
        AND updated_at >= ?
        AND updated_at <= ?
    `).bind(userId, weekStart, weekEnd + ' 23:59:59').all();

    // Get referrals for this week
    const { results: referrals } = await DB.prepare(`
      SELECT COUNT(*) as count
      FROM referrals r
      JOIN prospects p ON r.prospect_id = p.id
      WHERE p.sales_id = ?
        AND r.referral_date >= ?
        AND r.referral_date <= ?
    `).bind(userId, weekStart, weekEnd).all();

    return c.json({
      success: true,
      stats: {
        week_start: weekStart,
        week_end: weekEnd,
        new_prospects_count: newProspects[0]?.count || 0,
        new_appointments_count: newAppointments[0]?.count || 0,
        meetings_held: meetings[0]?.count || 0,
        deals_won: dealsWon[0]?.count || 0,
        deals_lost: dealsLost[0]?.count || 0,
        revenue_generated: dealsWon[0]?.revenue || 0,
        referrals_count: referrals[0]?.count || 0
      }
    });
  } catch (error: any) {
    console.error('Failed to fetch weekly stats:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// POST /api/sales-weekly-reports - Create or update weekly report
app.post('/', async (c) => {
  try {
    const userId = c.get('user')?.id;
    const { DB } = c.env;
    const data = await c.req.json();

    // Check if report exists for this week
    const existingReport = await DB.prepare(`
      SELECT id FROM weekly_reports
      WHERE sales_id = ? AND week_start_date = ?
    `).bind(userId, data.week_start_date).first();

    if (existingReport) {
      // Update existing report
      await DB.prepare(`
        UPDATE weekly_reports
        SET week_end_date = ?,
            new_prospects_count = ?,
            meetings_held = ?,
            calls_made = ?,
            emails_sent = ?,
            deals_won = ?,
            deals_lost = ?,
            revenue_generated = ?,
            key_achievements = ?,
            challenges_faced = ?,
            next_week_plan = ?,
            submitted_at = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).bind(
        data.week_end_date,
        data.new_prospects_count || 0,
        data.meetings_held || 0,
        data.calls_made || 0,
        data.emails_sent || 0,
        data.deals_won || 0,
        data.deals_lost || 0,
        data.revenue_generated || 0,
        data.key_achievements || null,
        data.challenges_faced || null,
        data.next_week_plan || null,
        data.submitted ? new Date().toISOString() : null,
        existingReport.id
      ).run();

      return c.json({
        success: true,
        report_id: existingReport.id,
        message: data.submitted ? '週報を提出しました' : '週報を更新しました'
      });
    } else {
      // Create new report
      const result = await DB.prepare(`
        INSERT INTO weekly_reports (
          sales_id, week_start_date, week_end_date,
          new_prospects_count, meetings_held, calls_made, emails_sent,
          deals_won, deals_lost, revenue_generated,
          key_achievements, challenges_faced, next_week_plan, submitted_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        userId,
        data.week_start_date,
        data.week_end_date,
        data.new_prospects_count || 0,
        data.meetings_held || 0,
        data.calls_made || 0,
        data.emails_sent || 0,
        data.deals_won || 0,
        data.deals_lost || 0,
        data.revenue_generated || 0,
        data.key_achievements || null,
        data.challenges_faced || null,
        data.next_week_plan || null,
        data.submitted ? new Date().toISOString() : null
      ).run();

      return c.json({
        success: true,
        report_id: result.meta.last_row_id,
        message: data.submitted ? '週報を提出しました' : '週報を保存しました'
      });
    }
  } catch (error: any) {
    console.error('Failed to save weekly report:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// GET /api/sales-weekly-reports - Get all weekly reports for current user
app.get('/', async (c) => {
  try {
    const userId = c.get('user')?.id;
    const { DB } = c.env;

    const { results } = await DB.prepare(`
      SELECT *
      FROM weekly_reports
      WHERE sales_id = ?
      ORDER BY week_start_date DESC
      LIMIT 10
    `).bind(userId).all();

    return c.json({
      success: true,
      reports: results
    });
  } catch (error: any) {
    console.error('Failed to fetch weekly reports:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Helper functions
function getWeekStart(): string {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  return weekStart.toISOString().split('T')[0];
}

function getWeekEnd(weekStart: string): string {
  const start = new Date(weekStart);
  const weekEnd = new Date(start);
  weekEnd.setDate(start.getDate() + 6);
  return weekEnd.toISOString().split('T')[0];
}

export default app;
