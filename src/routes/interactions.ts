// Interactions API - 接点ログ管理
// Layer 3 of 3-tier Nurturing CRM

import { Hono } from 'hono';
import type { Context } from 'hono';

type Bindings = {
  DB: D1Database;
};

const app = new Hono<{ Bindings: Bindings }>();

const VALID_INTERACTION_TYPES = [
  'call', 'email', 'meeting', 'video_call',
  'line', 'instagram_dm', 'tiktok_dm', 'facebook_dm', 'twitter_dm', 'linkedin',
  'sms', 'other'
];

// ==================== GET /api/interactions ====================
// Get all interactions with filtering
app.get('/', async (c: Context) => {
  try {
    const { DB } = c.env as Bindings;
    const { 
      master_contact_id,
      deal_id,
      interaction_type,
      created_by,
      start_date,
      end_date,
      limit = '50',
      offset = '0',
      sort_order = 'DESC'
    } = c.req.query();

    let query = `
      SELECT 
        i.*,
        mc.name as contact_name,
        mc.company_name as contact_company,
        d.deal_name,
        u.name as created_by_name
      FROM interactions i
      LEFT JOIN master_contacts mc ON i.master_contact_id = mc.id
      LEFT JOIN deals d ON i.deal_id = d.id
      LEFT JOIN users u ON i.created_by = u.id
      WHERE 1=1
    `;

    const params: any[] = [];

    if (master_contact_id) {
      query += ` AND i.master_contact_id = ?`;
      params.push(parseInt(master_contact_id));
    }

    if (deal_id) {
      query += ` AND i.deal_id = ?`;
      params.push(parseInt(deal_id));
    }

    if (interaction_type) {
      query += ` AND i.interaction_type = ?`;
      params.push(interaction_type);
    }

    if (created_by) {
      query += ` AND i.created_by = ?`;
      params.push(parseInt(created_by));
    }

    if (start_date) {
      query += ` AND DATE(i.interaction_date) >= ?`;
      params.push(start_date);
    }

    if (end_date) {
      query += ` AND DATE(i.interaction_date) <= ?`;
      params.push(end_date);
    }

    query += ` ORDER BY i.interaction_date ${sort_order}`;
    query += ` LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await DB.prepare(query).bind(...params).all();

    // Get total count
    let countQuery = `SELECT COUNT(*) as total FROM interactions i WHERE 1=1`;
    const countParams: any[] = [];

    if (master_contact_id) {
      countQuery += ` AND i.master_contact_id = ?`;
      countParams.push(parseInt(master_contact_id));
    }

    if (deal_id) {
      countQuery += ` AND i.deal_id = ?`;
      countParams.push(parseInt(deal_id));
    }

    if (interaction_type) {
      countQuery += ` AND i.interaction_type = ?`;
      countParams.push(interaction_type);
    }

    if (created_by) {
      countQuery += ` AND i.created_by = ?`;
      countParams.push(parseInt(created_by));
    }

    if (start_date) {
      countQuery += ` AND DATE(i.interaction_date) >= ?`;
      countParams.push(start_date);
    }

    if (end_date) {
      countQuery += ` AND DATE(i.interaction_date) <= ?`;
      countParams.push(end_date);
    }

    const countResult = await DB.prepare(countQuery).bind(...countParams).first();

    return c.json({
      success: true,
      interactions: result.results || [],
      pagination: {
        total: countResult?.total || 0,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });

  } catch (error: any) {
    console.error('Get interactions error:', error);
    return c.json({
      success: false,
      error: '接点ログの取得に失敗しました',
      details: error.message
    }, 500);
  }
});

// ==================== GET /api/interactions/timeline ====================
// Get interactions timeline for a contact or deal
app.get('/timeline', async (c: Context) => {
  try {
    const { DB } = c.env as Bindings;
    const { master_contact_id, deal_id } = c.req.query();

    if (!master_contact_id && !deal_id) {
      return c.json({
        success: false,
        error: 'master_contact_id または deal_id が必要です'
      }, 400);
    }

    let query = `
      SELECT 
        i.*,
        u.name as created_by_name,
        d.deal_name
      FROM interactions i
      LEFT JOIN users u ON i.created_by = u.id
      LEFT JOIN deals d ON i.deal_id = d.id
      WHERE 1=1
    `;

    const params: any[] = [];

    if (master_contact_id) {
      query += ` AND i.master_contact_id = ?`;
      params.push(parseInt(master_contact_id));
    }

    if (deal_id) {
      query += ` AND i.deal_id = ?`;
      params.push(parseInt(deal_id));
    }

    query += ` ORDER BY i.interaction_date DESC`;

    const result = await DB.prepare(query).bind(...params).all();

    // Group by date
    const timeline: Record<string, any[]> = {};
    (result.results || []).forEach((interaction: any) => {
      const date = interaction.interaction_date.split('T')[0];
      if (!timeline[date]) {
        timeline[date] = [];
      }
      timeline[date].push(interaction);
    });

    return c.json({
      success: true,
      timeline,
      total_interactions: result.results?.length || 0
    });

  } catch (error: any) {
    console.error('Get timeline error:', error);
    return c.json({
      success: false,
      error: 'タイムラインの取得に失敗しました',
      details: error.message
    }, 500);
  }
});

// ==================== GET /api/interactions/stats ====================
// Get interaction statistics
app.get('/stats', async (c: Context) => {
  try {
    const { DB } = c.env as Bindings;
    const { master_contact_id, deal_id, created_by, start_date, end_date } = c.req.query();

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];

    if (master_contact_id) {
      whereClause += ` AND master_contact_id = ?`;
      params.push(parseInt(master_contact_id));
    }

    if (deal_id) {
      whereClause += ` AND deal_id = ?`;
      params.push(parseInt(deal_id));
    }

    if (created_by) {
      whereClause += ` AND created_by = ?`;
      params.push(parseInt(created_by));
    }

    if (start_date) {
      whereClause += ` AND DATE(interaction_date) >= ?`;
      params.push(start_date);
    }

    if (end_date) {
      whereClause += ` AND DATE(interaction_date) <= ?`;
      params.push(end_date);
    }

    // Get interaction count by type
    const byType = await DB.prepare(`
      SELECT 
        interaction_type,
        COUNT(*) as count,
        AVG(duration_minutes) as avg_duration
      FROM interactions
      ${whereClause}
      GROUP BY interaction_type
      ORDER BY count DESC
    `).bind(...params).all();

    // Get interaction count by sentiment
    const bySentiment = await DB.prepare(`
      SELECT 
        sentiment,
        COUNT(*) as count
      FROM interactions
      ${whereClause}
      AND sentiment IS NOT NULL
      GROUP BY sentiment
    `).bind(...params).all();

    // Get interaction trend (last 30 days)
    const trend = await DB.prepare(`
      SELECT 
        DATE(interaction_date) as date,
        COUNT(*) as count
      FROM interactions
      ${whereClause}
      AND interaction_date >= DATE('now', '-30 days')
      GROUP BY DATE(interaction_date)
      ORDER BY date
    `).bind(...params).all();

    return c.json({
      success: true,
      stats: {
        by_type: byType.results || [],
        by_sentiment: bySentiment.results || [],
        trend: trend.results || []
      }
    });

  } catch (error: any) {
    console.error('Get interaction stats error:', error);
    return c.json({
      success: false,
      error: '統計情報の取得に失敗しました',
      details: error.message
    }, 500);
  }
});

// ==================== GET /api/interactions/:id ====================
// Get single interaction
app.get('/:id', async (c: Context) => {
  try {
    const { DB } = c.env as Bindings;
    const interactionId = parseInt(c.req.param('id'));

    const interaction = await DB.prepare(`
      SELECT 
        i.*,
        mc.name as contact_name,
        mc.company_name as contact_company,
        d.deal_name,
        u.name as created_by_name
      FROM interactions i
      LEFT JOIN master_contacts mc ON i.master_contact_id = mc.id
      LEFT JOIN deals d ON i.deal_id = d.id
      LEFT JOIN users u ON i.created_by = u.id
      WHERE i.id = ?
    `).bind(interactionId).first();

    if (!interaction) {
      return c.json({
        success: false,
        error: '接点ログが見つかりません'
      }, 404);
    }

    return c.json({
      success: true,
      interaction
    });

  } catch (error: any) {
    console.error('Get interaction detail error:', error);
    return c.json({
      success: false,
      error: '接点ログの詳細取得に失敗しました',
      details: error.message
    }, 500);
  }
});

// ==================== POST /api/interactions ====================
// Create new interaction
app.post('/', async (c: Context) => {
  try {
    const { DB } = c.env as Bindings;
    const data = await c.req.json();

    const {
      master_contact_id,
      deal_id,
      interaction_type,
      interaction_date,
      duration_minutes,
      direction,
      subject,
      summary,
      notes,
      outcome,
      sentiment,
      engagement_quality,
      next_follow_up_date,
      next_follow_up_action,
      attachments,
      related_meeting_id,
      tags,
      custom_fields,
      created_by
    } = data;

    // Validation
    if (!master_contact_id || !interaction_type || !interaction_date || !summary || !created_by) {
      return c.json({
        success: false,
        error: '必須項目が不足しています'
      }, 400);
    }

    if (!VALID_INTERACTION_TYPES.includes(interaction_type)) {
      return c.json({
        success: false,
        error: '無効な接点タイプです'
      }, 400);
    }

    const result = await DB.prepare(`
      INSERT INTO interactions (
        master_contact_id, deal_id, interaction_type, interaction_date,
        duration_minutes, direction, subject, summary, notes, outcome,
        sentiment, engagement_quality,
        next_follow_up_date, next_follow_up_action,
        attachments, related_meeting_id, tags, custom_fields,
        created_by
      ) VALUES (
        ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?,
        ?, ?,
        ?, ?, ?, ?,
        ?
      )
    `).bind(
      master_contact_id, deal_id || null, interaction_type, interaction_date,
      duration_minutes || null, direction || null, subject || null, summary, notes || null, outcome || null,
      sentiment || null, engagement_quality || null,
      next_follow_up_date || null, next_follow_up_action || null,
      attachments || null, related_meeting_id || null, tags || null, custom_fields || null,
      created_by
    ).run();

    const interactionId = result.meta.last_row_id;

    // Update master contact last_contact_date
    await DB.prepare(`
      UPDATE master_contacts 
      SET last_contact_date = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(interaction_date, master_contact_id).run();

    // Update deal's interaction count and last_interaction_date
    if (deal_id) {
      await DB.prepare(`
        UPDATE deals 
        SET total_interactions = total_interactions + 1,
            last_interaction_date = ?,
            last_response_date = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).bind(interaction_date, interaction_date, deal_id).run();
    }

    return c.json({
      success: true,
      interaction_id: interactionId,
      message: '接点ログを記録しました'
    });

  } catch (error: any) {
    console.error('Create interaction error:', error);
    return c.json({
      success: false,
      error: '接点ログの記録に失敗しました',
      details: error.message
    }, 500);
  }
});

// ==================== PUT /api/interactions/:id ====================
// Update interaction
app.put('/:id', async (c: Context) => {
  try {
    const { DB } = c.env as Bindings;
    const interactionId = parseInt(c.req.param('id'));
    const data = await c.req.json();

    const existing = await DB.prepare(`
      SELECT id FROM interactions WHERE id = ?
    `).bind(interactionId).first();

    if (!existing) {
      return c.json({
        success: false,
        error: '接点ログが見つかりません'
      }, 404);
    }

    // Build update query
    const updateFields: string[] = [];
    const updateValues: any[] = [];

    const allowedFields = [
      'interaction_type', 'interaction_date', 'duration_minutes', 'direction',
      'subject', 'summary', 'notes', 'outcome',
      'sentiment', 'engagement_quality',
      'next_follow_up_date', 'next_follow_up_action',
      'attachments', 'tags', 'custom_fields'
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
    updateValues.push(interactionId);

    await DB.prepare(`
      UPDATE interactions 
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `).bind(...updateValues).run();

    return c.json({
      success: true,
      message: '接点ログを更新しました'
    });

  } catch (error: any) {
    console.error('Update interaction error:', error);
    return c.json({
      success: false,
      error: '接点ログの更新に失敗しました',
      details: error.message
    }, 500);
  }
});

// ==================== DELETE /api/interactions/:id ====================
// Delete interaction
app.delete('/:id', async (c: Context) => {
  try {
    const { DB } = c.env as Bindings;
    const interactionId = parseInt(c.req.param('id'));

    const existing = await DB.prepare(`
      SELECT id, deal_id FROM interactions WHERE id = ?
    `).bind(interactionId).first();

    if (!existing) {
      return c.json({
        success: false,
        error: '接点ログが見つかりません'
      }, 404);
    }

    await DB.prepare(`
      DELETE FROM interactions WHERE id = ?
    `).bind(interactionId).run();

    // Update deal's interaction count if applicable
    if (existing.deal_id) {
      await DB.prepare(`
        UPDATE deals 
        SET total_interactions = total_interactions - 1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).bind(existing.deal_id).run();
    }

    return c.json({
      success: true,
      message: '接点ログを削除しました'
    });

  } catch (error: any) {
    console.error('Delete interaction error:', error);
    return c.json({
      success: false,
      error: '接点ログの削除に失敗しました',
      details: error.message
    }, 500);
  }
});

export default app;
