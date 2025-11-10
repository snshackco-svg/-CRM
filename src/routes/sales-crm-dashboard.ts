import { Hono } from 'hono';
import type { Bindings, Variables } from '../types';
import { authMiddleware } from '../middleware/auth';

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// Apply authentication middleware
app.use('*', authMiddleware);

/**
 * GET /api/sales-crm/dashboard
 * 営業CRMダッシュボードデータ取得
 * 
 * Query Parameters:
 * - user_id: ユーザーID（省略時は認証ユーザー）
 * - date: 基準日（省略時は今日）
 */
app.get('/', async (c) => {
  try {
    const { DB } = c.env;
    const user = c.get('user');
    const userId = parseInt(c.req.query('user_id') || user?.id?.toString() || '1');
    const baseDate = c.req.query('date') || new Date().toISOString().split('T')[0];

    // 今日の日付情報
    const today = new Date(baseDate);
    const todayStr = today.toISOString().split('T')[0];
    
    // 今週の開始日と終了日（月曜始まり）
    const dayOfWeek = today.getDay();
    const diffToMonday = (dayOfWeek === 0 ? -6 : 1 - dayOfWeek);
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() + diffToMonday);
    const weekStartStr = weekStart.toISOString().split('T')[0];
    
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    const weekEndStr = weekEnd.toISOString().split('T')[0];

    // 今月の開始日と終了日
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthStartStr = monthStart.toISOString().split('T')[0];
    
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    const monthEndStr = monthEnd.toISOString().split('T')[0];

    // ===========================================
    // 1. 今日のタスク（next_action_dateが今日の案件）
    // ===========================================
    const todayTasksQuery = await DB.prepare(`
      SELECT 
        d.id,
        d.deal_name,
        d.company_name,
        d.stage,
        d.priority,
        d.next_action_date,
        d.next_action_description,
        d.estimated_value,
        d.health_status,
        mc.name as contact_name
      FROM deals d
      LEFT JOIN master_contacts mc ON d.master_contact_id = mc.id
      WHERE d.owner_id = ?
        AND d.deal_status = 'active'
        AND d.next_action_date = ?
      ORDER BY d.priority DESC, d.next_action_date ASC
      LIMIT 10
    `).bind(userId, todayStr).all();

    // ===========================================
    // 2. 今日のアポイント
    // ===========================================
    const todayAppointmentsQuery = await DB.prepare(`
      SELECT 
        id,
        appointment_datetime,
        company_name,
        contact_name,
        contact_position,
        method,
        status,
        notes
      FROM new_appointments
      WHERE sales_id = ?
        AND DATE(appointment_datetime) = ?
      ORDER BY appointment_datetime ASC
    `).bind(userId, todayStr).all();

    // ===========================================
    // 3. 今月の実績
    // ===========================================
    // 成約数
    const monthlyWonDealsQuery = await DB.prepare(`
      SELECT COUNT(*) as count, SUM(actual_value) as revenue
      FROM deals
      WHERE owner_id = ?
        AND stage IN ('won', 'paid')
        AND DATE(actual_close_date) BETWEEN ? AND ?
    `).bind(userId, monthStartStr, monthEndStr).all();

    // アポ数
    const monthlyAppointmentsQuery = await DB.prepare(`
      SELECT COUNT(*) as count
      FROM new_appointments
      WHERE sales_id = ?
        AND DATE(appointment_datetime) BETWEEN ? AND ?
    `).bind(userId, monthStartStr, monthEndStr).all();

    // 成約率計算用（今月作成された案件数）
    const monthlyTotalDealsQuery = await DB.prepare(`
      SELECT COUNT(*) as count
      FROM deals
      WHERE owner_id = ?
        AND DATE(created_at) BETWEEN ? AND ?
    `).bind(userId, monthStartStr, monthEndStr).all();

    const monthlyWon = monthlyWonDealsQuery.results[0] || { count: 0, revenue: 0 };
    const monthlyAppts = monthlyAppointmentsQuery.results[0]?.count || 0;
    const monthlyTotal = monthlyTotalDealsQuery.results[0]?.count || 0;
    const monthlyConversionRate = monthlyTotal > 0 ? ((monthlyWon.count / monthlyTotal) * 100).toFixed(1) : '0.0';

    // ===========================================
    // 4. 今週の実績
    // ===========================================
    const weeklyWonDealsQuery = await DB.prepare(`
      SELECT COUNT(*) as count, SUM(actual_value) as revenue
      FROM deals
      WHERE owner_id = ?
        AND stage IN ('won', 'paid')
        AND DATE(actual_close_date) BETWEEN ? AND ?
    `).bind(userId, weekStartStr, weekEndStr).all();

    const weeklyAppointmentsQuery = await DB.prepare(`
      SELECT COUNT(*) as count
      FROM new_appointments
      WHERE sales_id = ?
        AND DATE(appointment_datetime) BETWEEN ? AND ?
    `).bind(userId, weekStartStr, weekEndStr).all();

    const weeklyWon = weeklyWonDealsQuery.results[0] || { count: 0, revenue: 0 };
    const weeklyAppts = weeklyAppointmentsQuery.results[0]?.count || 0;

    // ===========================================
    // 5. パイプライン（8段階別の案件数と金額）
    // ===========================================
    const pipelineQuery = await DB.prepare(`
      SELECT 
        stage,
        COUNT(*) as count,
        SUM(estimated_value) as total_value
      FROM deals
      WHERE owner_id = ?
        AND deal_status = 'active'
      GROUP BY stage
      ORDER BY 
        CASE stage
          WHEN 'prospect' THEN 1
          WHEN 'nurturing' THEN 2
          WHEN 'scheduling' THEN 3
          WHEN 'meeting_held' THEN 4
          WHEN 'proposal' THEN 5
          WHEN 'won' THEN 6
          WHEN 'payment_pending' THEN 7
          WHEN 'paid' THEN 8
          ELSE 9
        END
    `).bind(userId).all();

    // ステージ名の日本語マッピング
    const stageLabels: Record<string, string> = {
      'prospect': '見込み',
      'nurturing': '関係構築',
      'scheduling': '日程調整中',
      'meeting_held': '商談実施',
      'proposal': '提案',
      'won': '成約',
      'payment_pending': '入金待ち',
      'paid': '入金済み'
    };

    const pipeline = pipelineQuery.results.map((row: any) => ({
      stage: row.stage,
      stage_label: stageLabels[row.stage] || row.stage,
      count: row.count,
      total_value: row.total_value || 0
    }));

    // ===========================================
    // 6. KPI達成率（今月の目標 vs 実績）
    // ===========================================
    // 仮の目標値（将来的にはkpi_monthly_goalsテーブルから取得）
    const monthlyGoals = {
      deals: 5,           // 月間成約目標: 5件
      appointments: 20,   // 月間アポ目標: 20件
      revenue: 2000000    // 月間売上目標: 200万円
    };

    const dealsAchievement = monthlyGoals.deals > 0 
      ? ((monthlyWon.count / monthlyGoals.deals) * 100).toFixed(0) 
      : '0';
    
    const apptsAchievement = monthlyGoals.appointments > 0 
      ? ((monthlyAppts / monthlyGoals.appointments) * 100).toFixed(0) 
      : '0';
    
    const revenueAchievement = monthlyGoals.revenue > 0 
      ? (((monthlyWon.revenue || 0) / monthlyGoals.revenue) * 100).toFixed(0) 
      : '0';

    // ===========================================
    // 7. チーム全体の状況
    // ===========================================
    const teamWonDealsQuery = await DB.prepare(`
      SELECT COUNT(*) as count, SUM(actual_value) as revenue
      FROM deals
      WHERE stage IN ('won', 'paid')
        AND DATE(actual_close_date) BETWEEN ? AND ?
    `).bind(monthStartStr, monthEndStr).all();

    const teamPipelineQuery = await DB.prepare(`
      SELECT SUM(estimated_value) as total_value
      FROM deals
      WHERE deal_status = 'active'
        AND stage NOT IN ('won', 'paid')
    `).all();

    const teamWon = teamWonDealsQuery.results[0] || { count: 0, revenue: 0 };
    const teamPipelineValue = teamPipelineQuery.results[0]?.total_value || 0;

    // ===========================================
    // 8. アラート（期限超過、リスク案件、要対応）
    // ===========================================
    // 期限超過（next_action_dateが過去）
    const overdueQuery = await DB.prepare(`
      SELECT COUNT(*) as count
      FROM deals
      WHERE owner_id = ?
        AND deal_status = 'active'
        AND next_action_date < ?
        AND next_action_date IS NOT NULL
    `).bind(userId, todayStr).all();

    // リスク案件（health_status = 'at_risk' または 'needs_attention'）
    const riskQuery = await DB.prepare(`
      SELECT COUNT(*) as count
      FROM deals
      WHERE owner_id = ?
        AND deal_status = 'active'
        AND health_status IN ('at_risk', 'needs_attention')
    `).bind(userId).all();

    // 要対応（next_action_dateが未設定 or 7日以上放置）
    const needsAttentionQuery = await DB.prepare(`
      SELECT COUNT(*) as count
      FROM deals
      WHERE owner_id = ?
        AND deal_status = 'active'
        AND (
          next_action_date IS NULL
          OR julianday(?) - julianday(last_interaction_date) > 7
        )
    `).bind(userId, todayStr).all();

    const alerts = {
      overdue: overdueQuery.results[0]?.count || 0,
      at_risk: riskQuery.results[0]?.count || 0,
      needs_attention: needsAttentionQuery.results[0]?.count || 0
    };

    // ===========================================
    // レスポンス構築
    // ===========================================
    return c.json({
      success: true,
      data: {
        user_id: userId,
        base_date: baseDate,
        today_tasks: todayTasksQuery.results,
        today_appointments: todayAppointmentsQuery.results,
        monthly_stats: {
          won_deals: monthlyWon.count,
          revenue: monthlyWon.revenue || 0,
          appointments: monthlyAppts,
          conversion_rate: monthlyConversionRate,
          period: {
            start: monthStartStr,
            end: monthEndStr
          }
        },
        weekly_stats: {
          won_deals: weeklyWon.count,
          revenue: weeklyWon.revenue || 0,
          appointments: weeklyAppts,
          period: {
            start: weekStartStr,
            end: weekEndStr
          }
        },
        pipeline,
        kpi: {
          deals: {
            goal: monthlyGoals.deals,
            actual: monthlyWon.count,
            achievement: dealsAchievement
          },
          appointments: {
            goal: monthlyGoals.appointments,
            actual: monthlyAppts,
            achievement: apptsAchievement
          },
          revenue: {
            goal: monthlyGoals.revenue,
            actual: monthlyWon.revenue || 0,
            achievement: revenueAchievement
          }
        },
        team_stats: {
          total_won_deals: teamWon.count,
          total_revenue: teamWon.revenue || 0,
          pipeline_value: teamPipelineValue
        },
        alerts
      }
    });

  } catch (error: any) {
    console.error('Dashboard data fetch failed:', error);
    return c.json({
      success: false,
      error: error.message
    }, 500);
  }
});

export default app;
