import { Hono } from 'hono';
import type { Bindings, Variables } from '../types';
import { authMiddleware } from '../middleware/auth';

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// Apply authentication middleware to all routes
app.use('/*', authMiddleware);

// Get all prospects for current sales user
app.get('/', async (c) => {
  try {
    const userId = c.get('user')?.id;
    const { DB } = c.env;
    
    // Get query parameters for filtering and sorting
    const status = c.req.query('status');
    const is_partnership = c.req.query('is_partnership');
    const month = c.req.query('month'); // Format: YYYY-MM
    const sort_by = c.req.query('sort_by') || 'updated_at'; // next_meeting_date, contact_count, last_contact_date, updated_at
    const sort_order = c.req.query('sort_order') || 'DESC';

    let query = `
      SELECT 
        p.*,
        COUNT(DISTINCT m.id) as meeting_count,
        COUNT(DISTINCT t.id) as todo_count,
        MAX(m.meeting_date) as last_meeting_date,
        NULL as next_scheduled_meeting
      FROM prospects p
      LEFT JOIN meetings m ON p.id = m.prospect_id
      LEFT JOIN meeting_todos t ON p.id = t.prospect_id AND t.status != 'completed'
      WHERE p.sales_id = ?
    `;

    const params: any[] = [userId];

    if (status && status !== 'all') {
      query += ` AND p.status = ?`;
      params.push(status);
    }

    if (is_partnership !== undefined) {
      query += ` AND p.is_partnership = ?`;
      params.push(parseInt(is_partnership));
    }

    // Month filter: Filter by updated_at within the specified month
    if (month) {
      query += ` AND strftime('%Y-%m', p.updated_at) = ?`;
      params.push(month);
    }

    query += ` GROUP BY p.id`;

    // Add sorting
    const validSortColumns = ['next_meeting_date', 'contact_count', 'last_contact_date', 'updated_at', 'created_at'];
    const sortColumn = validSortColumns.includes(sort_by) ? sort_by : 'updated_at';
    const sortDirection = sort_order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    
    query += ` ORDER BY p.${sortColumn} ${sortDirection}`;

    const { results } = await DB.prepare(query).bind(...params).all();

    // Parse JSON fields for each prospect
    const parsedResults = results.map((prospect: any) => {
      if (prospect.ai_research) {
        try {
          prospect.ai_research = JSON.parse(prospect.ai_research);
        } catch (e) {
          prospect.ai_research = null;
        }
      }
      
      if (prospect.deep_research) {
        try {
          prospect.deep_research = JSON.parse(prospect.deep_research);
        } catch (e) {
          prospect.deep_research = null;
        }
      }
      
      return prospect;
    });

    return c.json({ success: true, prospects: parsedResults });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Get single prospect with details
app.get('/:id', async (c) => {
  try {
    const prospectId = c.req.param('id');
    const userId = c.get('user')?.id;
    const { DB } = c.env;

    // Get prospect details
    const prospect = await DB.prepare(`
      SELECT * FROM prospects WHERE id = ? AND sales_id = ?
    `).bind(prospectId, userId).first();

    if (!prospect) {
      return c.json({ success: false, error: 'Prospect not found' }, 404);
    }

    // Parse JSON fields
    if (prospect.ai_research) {
      try {
        prospect.ai_research = JSON.parse(prospect.ai_research as string);
      } catch (e) {
        prospect.ai_research = null;
      }
    }
    
    if (prospect.deep_research) {
      try {
        prospect.deep_research = JSON.parse(prospect.deep_research as string);
      } catch (e) {
        prospect.deep_research = null;
      }
    }

    // Get pre-meeting research
    const research = await DB.prepare(`
      SELECT * FROM pre_meeting_research WHERE prospect_id = ? ORDER BY created_at DESC LIMIT 1
    `).bind(prospectId).first();

    // Get meetings
    const { results: meetings } = await DB.prepare(`
      SELECT * FROM meetings WHERE prospect_id = ? ORDER BY meeting_date DESC
    `).bind(prospectId).all();

    // Get todos
    const { results: todos } = await DB.prepare(`
      SELECT * FROM meeting_todos WHERE prospect_id = ? AND status != 'completed' ORDER BY due_date ASC
    `).bind(prospectId).all();

    // Get connection matches
    const { results: matches } = await DB.prepare(`
      SELECT 
        cm.*,
        nc.person_name,
        nc.company,
        nc.position,
        nc.industry
      FROM connection_matches cm
      JOIN networking_connections nc ON cm.connection_id = nc.id
      WHERE cm.prospect_id = ? AND cm.status IN ('suggested', 'approved')
      ORDER BY cm.match_score DESC
    `).bind(prospectId).all();

    return c.json({
      success: true,
      prospect,
      research,
      meetings,
      todos,
      matches
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Create new prospect
app.post('/', async (c) => {
  try {
    const userId = c.get('user')?.id;
    const { DB } = c.env;
    const data = await c.req.json();

    const result = await DB.prepare(`
      INSERT INTO prospects (
        company_name, company_url, industry, company_size,
        contact_name, contact_position, contact_email, contact_phone,
        sales_id, status, source, priority, estimated_value, expected_close_date, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      data.company_name,
      data.company_url || null,
      data.industry || null,
      data.company_size || null,
      data.contact_name || null,
      data.contact_position || null,
      data.contact_email || null,
      data.contact_phone || null,
      userId,
      data.status || 'new',
      data.source || null,
      data.priority || 'medium',
      data.estimated_value || null,
      data.expected_close_date || null,
      data.notes || null
    ).run();

    const prospectId = result.meta.last_row_id;

    // If next_meeting_date is provided, create a schedule entry
    if (data.next_meeting_date) {
      await DB.prepare(`
        INSERT INTO prospect_schedules (prospect_id, scheduled_date, meeting_type, status)
        VALUES (?, ?, ?, 'scheduled')
      `).bind(prospectId, data.next_meeting_date, data.meeting_type || 'initial').run();
    }

    // If notta_link is provided, trigger analysis (placeholder for now)
    if (data.notta_link) {
      await DB.prepare(`
        INSERT INTO notta_analyses (prospect_id, notta_link)
        VALUES (?, ?)
      `).bind(prospectId, data.notta_link).run();
      
      // TODO: Trigger actual Notta analysis via AI
    }

    return c.json({
      success: true,
      prospect_id: prospectId,
      message: 'Prospect created successfully'
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Update prospect
app.put('/:id', async (c) => {
  try {
    const prospectId = c.req.param('id');
    const userId = c.get('user')?.id;
    const { DB } = c.env;
    const data = await c.req.json();

    await DB.prepare(`
      UPDATE prospects SET
        company_name = COALESCE(?, company_name),
        company_url = COALESCE(?, company_url),
        industry = COALESCE(?, industry),
        company_size = COALESCE(?, company_size),
        contact_name = COALESCE(?, contact_name),
        contact_position = COALESCE(?, contact_position),
        contact_email = COALESCE(?, contact_email),
        contact_phone = COALESCE(?, contact_phone),
        status = COALESCE(?, status),
        priority = COALESCE(?, priority),
        estimated_value = COALESCE(?, estimated_value),
        expected_close_date = COALESCE(?, expected_close_date),
        notes = COALESCE(?, notes),
        ai_research = COALESCE(?, ai_research),
        deep_research = COALESCE(?, deep_research),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND sales_id = ?
    `).bind(
      data.company_name,
      data.company_url,
      data.industry,
      data.company_size,
      data.contact_name,
      data.contact_position,
      data.contact_email,
      data.contact_phone,
      data.status,
      data.priority,
      data.estimated_value,
      data.expected_close_date,
      data.notes,
      data.ai_research ? JSON.stringify(data.ai_research) : null,
      data.deep_research ? JSON.stringify(data.deep_research) : null,
      prospectId,
      userId
    ).run();

    return c.json({ success: true, message: 'Prospect updated successfully' });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Delete prospect
app.delete('/:id', async (c) => {
  try {
    const prospectId = c.req.param('id');
    const userId = c.get('user')?.id;
    const { DB } = c.env;

    await DB.prepare(`
      DELETE FROM prospects WHERE id = ? AND sales_id = ?
    `).bind(prospectId, userId).run();

    return c.json({ success: true, message: 'Prospect deleted successfully' });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// AI: Generate pre-meeting research
app.post('/:id/research', async (c) => {
  try {
    const prospectId = c.req.param('id');
    const { DB } = c.env;

    // Get prospect details
    const prospect = await DB.prepare(`
      SELECT * FROM prospects WHERE id = ?
    `).bind(prospectId).first();

    if (!prospect) {
      return c.json({ success: false, error: 'Prospect not found' }, 404);
    }

    // TODO: Call AI API to generate research
    // For now, create placeholder
    const aiResearch = {
      business_overview: `${prospect.company_name}は${prospect.industry}業界で活動する企業です。`,
      key_personnel: `担当者: ${prospect.contact_name} (${prospect.contact_position})`,
      recent_news: '最近のニュースを調査中...',
      pain_points: '業界における一般的な課題を分析中...',
      opportunities: '潜在的な商機を特定中...',
      competitor_analysis: '競合分析を実施中...',
      suggested_approach: '推奨アプローチを策定中...',
      research_sources: 'Web検索、業界レポート、企業サイト'
    };

    const result = await DB.prepare(`
      INSERT INTO pre_meeting_research (
        prospect_id, business_overview, key_personnel, recent_news,
        pain_points, opportunities, competitor_analysis,
        suggested_approach, research_sources, ai_generated
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `).bind(
      prospectId,
      aiResearch.business_overview,
      aiResearch.key_personnel,
      aiResearch.recent_news,
      aiResearch.pain_points,
      aiResearch.opportunities,
      aiResearch.competitor_analysis,
      aiResearch.suggested_approach,
      aiResearch.research_sources
    ).run();

    return c.json({
      success: true,
      research_id: result.meta.last_row_id,
      research: aiResearch
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

export default app;
