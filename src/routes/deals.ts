// Deals API - 案件・取引管理（8段階ステージ管理）
// Layer 2 of 3-tier Nurturing CRM

import { Hono } from 'hono';
import type { Context } from 'hono';

type Bindings = {
  DB: D1Database;
};

const app = new Hono<{ Bindings: Bindings }>();

// 8-stage pipeline stages
const VALID_STAGES = [
  'prospect',          // 見込み
  'nurturing',         // 関係構築
  'scheduling',        // 日程調整中
  'meeting_held',      // 商談実施
  'proposal',          // 提案
  'won',               // 成約
  'payment_pending',   // 入金待ち
  'paid'               // 入金済み
];

// Helper function to generate deal number
function generateDealNumber(): string {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `DEAL-${year}-${random}`;
}

// Helper function to calculate days in stage
async function updateDaysInStage(DB: D1Database, dealId: number) {
  const result = await DB.prepare(`
    SELECT changed_at 
    FROM deal_stage_history 
    WHERE deal_id = ? 
    ORDER BY changed_at DESC 
    LIMIT 1
  `).bind(dealId).first();

  if (result) {
    const lastChange = new Date(result.changed_at as string);
    const now = new Date();
    const days = Math.floor((now.getTime() - lastChange.getTime()) / (1000 * 60 * 60 * 24));
    
    await DB.prepare(`
      UPDATE deals SET days_in_current_stage = ? WHERE id = ?
    `).bind(days, dealId).run();
  }
}

// ==================== GET /api/deals ====================
// Get all deals with filtering and pagination
app.get('/', async (c: Context) => {
  try {
    const { DB } = c.env as Bindings;
    const { 
      stage, 
      deal_status,
      priority,
      owner_id,
      master_contact_id,
      search,
      limit = '50',
      offset = '0',
      sort_by = 'updated_at',
      sort_order = 'DESC'
    } = c.req.query();

    let query = `
      SELECT 
        d.*,
        mc.name as contact_name,
        mc.company_name as contact_company,
        u.name as owner_name,
        COUNT(DISTINCT i.id) as interaction_count
      FROM deals d
      LEFT JOIN master_contacts mc ON d.master_contact_id = mc.id
      LEFT JOIN users u ON d.owner_id = u.id
      LEFT JOIN interactions i ON i.deal_id = d.id
      WHERE 1=1
    `;

    const params: any[] = [];

    if (stage) {
      query += ` AND d.stage = ?`;
      params.push(stage);
    }

    if (deal_status) {
      query += ` AND d.deal_status = ?`;
      params.push(deal_status);
    }

    if (priority) {
      query += ` AND d.priority = ?`;
      params.push(priority);
    }

    if (owner_id) {
      query += ` AND d.owner_id = ?`;
      params.push(parseInt(owner_id));
    }

    if (master_contact_id) {
      query += ` AND d.master_contact_id = ?`;
      params.push(parseInt(master_contact_id));
    }

    if (search) {
      query += ` AND (
        d.deal_name LIKE ? OR 
        d.company_name LIKE ? OR 
        mc.name LIKE ?
      )`;
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }

    query += ` GROUP BY d.id`;
    query += ` ORDER BY d.${sort_by} ${sort_order}`;
    query += ` LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await DB.prepare(query).bind(...params).all();

    // Get total count
    let countQuery = `SELECT COUNT(*) as total FROM deals d WHERE 1=1`;
    const countParams: any[] = [];

    if (stage) {
      countQuery += ` AND d.stage = ?`;
      countParams.push(stage);
    }

    if (deal_status) {
      countQuery += ` AND d.deal_status = ?`;
      countParams.push(deal_status);
    }

    if (priority) {
      countQuery += ` AND d.priority = ?`;
      countParams.push(priority);
    }

    if (owner_id) {
      countQuery += ` AND d.owner_id = ?`;
      countParams.push(parseInt(owner_id));
    }

    if (master_contact_id) {
      countQuery += ` AND d.master_contact_id = ?`;
      countParams.push(parseInt(master_contact_id));
    }

    if (search) {
      countQuery += ` AND (
        d.deal_name LIKE ? OR 
        d.company_name LIKE ?
      )`;
      const searchPattern = `%${search}%`;
      countParams.push(searchPattern, searchPattern);
    }

    const countResult = await DB.prepare(countQuery).bind(...countParams).first();

    return c.json({
      success: true,
      deals: result.results || [],
      pagination: {
        total: countResult?.total || 0,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });

  } catch (error: any) {
    console.error('Get deals error:', error);
    return c.json({
      success: false,
      error: '案件の取得に失敗しました',
      details: error.message
    }, 500);
  }
});

// ==================== GET /api/deals/kanban ====================
// Get deals organized by stage for kanban view
app.get('/kanban', async (c: Context) => {
  try {
    const { DB } = c.env as Bindings;
    const { owner_id, deal_status = 'active' } = c.req.query();

    let query = `
      SELECT 
        d.*,
        mc.name as contact_name,
        mc.company_name as contact_company,
        u.name as owner_name
      FROM deals d
      LEFT JOIN master_contacts mc ON d.master_contact_id = mc.id
      LEFT JOIN users u ON d.owner_id = u.id
      WHERE d.deal_status = ?
    `;

    const params: any[] = [deal_status];

    if (owner_id) {
      query += ` AND d.owner_id = ?`;
      params.push(parseInt(owner_id));
    }

    query += ` ORDER BY d.priority DESC, d.updated_at DESC`;

    const result = await DB.prepare(query).bind(...params).all();
    const deals = result.results || [];

    // Organize by stage
    const kanban: Record<string, any[]> = {};
    VALID_STAGES.forEach(stage => {
      kanban[stage] = deals.filter((d: any) => d.stage === stage);
    });

    return c.json({
      success: true,
      kanban,
      stages: VALID_STAGES
    });

  } catch (error: any) {
    console.error('Get kanban deals error:', error);
    return c.json({
      success: false,
      error: 'カンバンデータの取得に失敗しました',
      details: error.message
    }, 500);
  }
});

// ==================== GET /api/deals/:id ====================
// Get single deal with full details
app.get('/:id', async (c: Context) => {
  try {
    const { DB } = c.env as Bindings;
    const dealId = parseInt(c.req.param('id'));

    // Get deal details
    const deal = await DB.prepare(`
      SELECT 
        d.*,
        mc.name as contact_name,
        mc.email as contact_email,
        mc.phone as contact_phone,
        mc.company_name as contact_company,
        u.name as owner_name,
        creator.name as created_by_name
      FROM deals d
      LEFT JOIN master_contacts mc ON d.master_contact_id = mc.id
      LEFT JOIN users u ON d.owner_id = u.id
      LEFT JOIN users creator ON d.created_by = creator.id
      WHERE d.id = ?
    `).bind(dealId).first();

    if (!deal) {
      return c.json({
        success: false,
        error: '案件が見つかりません'
      }, 404);
    }

    // Get stage history
    const stageHistory = await DB.prepare(`
      SELECT 
        dsh.*,
        u.name as changed_by_name
      FROM deal_stage_history dsh
      LEFT JOIN users u ON dsh.changed_by = u.id
      WHERE dsh.deal_id = ?
      ORDER BY dsh.changed_at DESC
    `).bind(dealId).all();

    // Get interactions
    const interactions = await DB.prepare(`
      SELECT 
        i.*,
        u.name as created_by_name
      FROM interactions i
      LEFT JOIN users u ON i.created_by = u.id
      WHERE i.deal_id = ?
      ORDER BY i.interaction_date DESC
    `).bind(dealId).all();

    // Update days in stage
    await updateDaysInStage(DB, dealId);

    return c.json({
      success: true,
      deal,
      stage_history: stageHistory.results || [],
      interactions: interactions.results || []
    });

  } catch (error: any) {
    console.error('Get deal detail error:', error);
    return c.json({
      success: false,
      error: '案件詳細の取得に失敗しました',
      details: error.message
    }, 500);
  }
});

// ==================== POST /api/deals ====================
// Create new deal
app.post('/', async (c: Context) => {
  try {
    const { DB } = c.env as Bindings;
    const data = await c.req.json();

    const {
      deal_name,
      master_contact_id,
      prospect_id,
      company_name,
      stage = 'prospect',
      estimated_value = 0,
      currency = 'JPY',
      expected_close_date,
      priority = 'medium',
      deal_status = 'active',
      deal_score = 0,
      health_status = 'healthy',
      sla_status = 'on_time',
      next_action_date,
      next_action_description,
      notes,
      custom_fields,
      owner_id,
      created_by
    } = data;

    // Validation
    if (!deal_name || !master_contact_id || !owner_id || !created_by) {
      return c.json({
        success: false,
        error: '必須項目が不足しています'
      }, 400);
    }

    if (!VALID_STAGES.includes(stage)) {
      return c.json({
        success: false,
        error: '無効なステージです'
      }, 400);
    }

    // Generate deal number
    const dealNumber = generateDealNumber();

    const result = await DB.prepare(`
      INSERT INTO deals (
        deal_name, deal_number, master_contact_id, prospect_id, company_name,
        stage, estimated_value, currency, expected_close_date,
        priority, deal_status, deal_score, health_status, sla_status,
        next_action_date, next_action_description,
        notes, custom_fields,
        owner_id, created_by,
        last_response_date, total_interactions, days_in_current_stage
      ) VALUES (
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?,
        ?, ?,
        ?, ?,
        CURRENT_TIMESTAMP, 0, 0
      )
    `).bind(
      deal_name, dealNumber, master_contact_id, prospect_id || null, company_name || null,
      stage, estimated_value, currency, expected_close_date || null,
      priority, deal_status, deal_score, health_status, sla_status,
      next_action_date || null, next_action_description || null,
      notes || null, custom_fields || null,
      owner_id, created_by
    ).run();

    const dealId = result.meta.last_row_id;

    // Create initial stage history record
    await DB.prepare(`
      INSERT INTO deal_stage_history (
        deal_id, from_stage, to_stage, changed_by, change_reason
      ) VALUES (?, NULL, ?, ?, ?)
    `).bind(dealId, stage, created_by, '案件作成').run();

    return c.json({
      success: true,
      deal_id: dealId,
      deal_number: dealNumber,
      message: '案件を作成しました'
    });

  } catch (error: any) {
    console.error('Create deal error:', error);
    return c.json({
      success: false,
      error: '案件の作成に失敗しました',
      details: error.message
    }, 500);
  }
});

// ==================== PUT /api/deals/:id ====================
// Update deal
app.put('/:id', async (c: Context) => {
  try {
    const { DB } = c.env as Bindings;
    const dealId = parseInt(c.req.param('id'));
    const data = await c.req.json();

    // Get current deal
    const current = await DB.prepare(`
      SELECT * FROM deals WHERE id = ?
    `).bind(dealId).first();

    if (!current) {
      return c.json({
        success: false,
        error: '案件が見つかりません'
      }, 404);
    }

    // Check if stage is changing
    const stageChanged = data.stage && data.stage !== current.stage;

    // Build update query
    const updateFields: string[] = [];
    const updateValues: any[] = [];

    const allowedFields = [
      'deal_name', 'company_name', 'stage', 'estimated_value', 'actual_value',
      'currency', 'expected_close_date', 'actual_close_date',
      'priority', 'deal_status', 'loss_reason',
      'deal_score', 'health_status', 'sla_status',
      'next_action_date', 'next_action_description',
      'notes', 'custom_fields', 'owner_id'
    ];

    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        updateFields.push(`${field} = ?`);
        updateValues.push(data[field]);
      }
    }

    if (updateFields.length === 0) {
      return c.json({
        success: false,
        error: '更新するフィールドがありません'
      }, 400);
    }

    updateFields.push('updated_at = CURRENT_TIMESTAMP');

    // If stage changed, reset days_in_current_stage
    if (stageChanged) {
      updateFields.push('days_in_current_stage = 0');
    }

    updateValues.push(dealId);

    await DB.prepare(`
      UPDATE deals 
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `).bind(...updateValues).run();

    // Record stage change
    if (stageChanged) {
      const daysInPrevious = current.days_in_current_stage || 0;
      
      await DB.prepare(`
        INSERT INTO deal_stage_history (
          deal_id, from_stage, to_stage, changed_by, 
          change_reason, days_in_previous_stage
        ) VALUES (?, ?, ?, ?, ?, ?)
      `).bind(
        dealId, 
        current.stage, 
        data.stage, 
        data.changed_by || data.owner_id, 
        data.change_reason || 'ステージ変更',
        daysInPrevious
      ).run();
    }

    return c.json({
      success: true,
      message: '案件を更新しました'
    });

  } catch (error: any) {
    console.error('Update deal error:', error);
    return c.json({
      success: false,
      error: '案件の更新に失敗しました',
      details: error.message
    }, 500);
  }
});

// ==================== DELETE /api/deals/:id ====================
// Delete deal
app.delete('/:id', async (c: Context) => {
  try {
    const { DB } = c.env as Bindings;
    const dealId = parseInt(c.req.param('id'));

    const existing = await DB.prepare(`
      SELECT id FROM deals WHERE id = ?
    `).bind(dealId).first();

    if (!existing) {
      return c.json({
        success: false,
        error: '案件が見つかりません'
      }, 404);
    }

    await DB.prepare(`
      DELETE FROM deals WHERE id = ?
    `).bind(dealId).run();

    return c.json({
      success: true,
      message: '案件を削除しました'
    });

  } catch (error: any) {
    console.error('Delete deal error:', error);
    return c.json({
      success: false,
      error: '案件の削除に失敗しました',
      details: error.message
    }, 500);
  }
});

// ==================== POST /api/deals/:id/advance-stage ====================
// Move deal to next stage
app.post('/:id/advance-stage', async (c: Context) => {
  try {
    const { DB } = c.env as Bindings;
    const dealId = parseInt(c.req.param('id'));
    const { changed_by, change_reason } = await c.req.json();

    const deal = await DB.prepare(`
      SELECT * FROM deals WHERE id = ?
    `).bind(dealId).first();

    if (!deal) {
      return c.json({
        success: false,
        error: '案件が見つかりません'
      }, 404);
    }

    const currentStageIndex = VALID_STAGES.indexOf(deal.stage as string);
    if (currentStageIndex === -1 || currentStageIndex === VALID_STAGES.length - 1) {
      return c.json({
        success: false,
        error: 'これ以上ステージを進められません'
      }, 400);
    }

    const nextStage = VALID_STAGES[currentStageIndex + 1];
    const daysInPrevious = deal.days_in_current_stage || 0;

    await DB.prepare(`
      UPDATE deals 
      SET stage = ?, 
          days_in_current_stage = 0,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(nextStage, dealId).run();

    await DB.prepare(`
      INSERT INTO deal_stage_history (
        deal_id, from_stage, to_stage, changed_by, 
        change_reason, days_in_previous_stage
      ) VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      dealId, deal.stage, nextStage, changed_by, 
      change_reason || 'ステージ進行', daysInPrevious
    ).run();

    return c.json({
      success: true,
      new_stage: nextStage,
      message: `ステージを「${nextStage}」に進めました`
    });

  } catch (error: any) {
    console.error('Advance stage error:', error);
    return c.json({
      success: false,
      error: 'ステージの進行に失敗しました',
      details: error.message
    }, 500);
  }
});

export default app;
