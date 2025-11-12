import { Hono } from 'hono';
import type { Bindings, Variables } from '../types';
import { authMiddleware } from '../middleware/auth';

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// Apply authentication middleware to all routes
app.use('/*', authMiddleware);

// Global search across prospects, meetings, and contacts
app.get('/', async (c) => {
  try {
    const userId = c.get('user')?.id;
    const { DB } = c.env;
    const query = c.req.query('q');

    if (!query || query.trim().length === 0) {
      return c.json({
        success: true,
        results: {
          prospects: [],
          meetings: [],
          contacts: [],
          appointments: []
        }
      });
    }

    const searchPattern = `%${query.trim()}%`;

    // Search prospects
    const { results: prospects } = await DB.prepare(`
      SELECT 
        id, company_name, contact_name, contact_position, industry, status, 
        estimated_value, is_partnership,
        'prospect' as result_type
      FROM prospects
      WHERE sales_id = ?
        AND (
          company_name LIKE ? OR
          contact_name LIKE ? OR
          industry LIKE ? OR
          notes LIKE ?
        )
      ORDER BY 
        CASE 
          WHEN company_name LIKE ? THEN 1
          WHEN contact_name LIKE ? THEN 2
          ELSE 3
        END,
        updated_at DESC
      LIMIT 20
    `).bind(
      userId,
      searchPattern, searchPattern, searchPattern, searchPattern,
      searchPattern, searchPattern
    ).all();

    // Search meetings
    const { results: meetings } = await DB.prepare(`
      SELECT 
        m.id, m.meeting_date, m.meeting_type, m.meeting_outcome,
        p.company_name, p.contact_name,
        'meeting' as result_type
      FROM meetings m
      JOIN prospects p ON m.prospect_id = p.id
      WHERE m.sales_id = ?
        AND (
          p.company_name LIKE ? OR
          p.contact_name LIKE ? OR
          m.minutes LIKE ? OR
          m.agenda LIKE ?
        )
      ORDER BY m.meeting_date DESC
      LIMIT 20
    `).bind(userId, searchPattern, searchPattern, searchPattern, searchPattern).all();

    // Search master contacts
    const { results: contacts } = await DB.prepare(`
      SELECT 
        id, name, company, position, email, phone,
        'contact' as result_type
      FROM master_contacts
      WHERE sales_id = ?
        AND (
          name LIKE ? OR
          company LIKE ? OR
          position LIKE ? OR
          email LIKE ? OR
          phone LIKE ?
        )
      ORDER BY 
        CASE 
          WHEN name LIKE ? THEN 1
          WHEN company LIKE ? THEN 2
          ELSE 3
        END,
        updated_at DESC
      LIMIT 20
    `).bind(
      userId,
      searchPattern, searchPattern, searchPattern, searchPattern, searchPattern,
      searchPattern, searchPattern
    ).all();

    // Search new appointments
    const { results: appointments } = await DB.prepare(`
      SELECT 
        id, appointment_datetime, company_name, contact_name, status, method,
        'appointment' as result_type
      FROM new_appointments
      WHERE sales_id = ?
        AND (
          company_name LIKE ? OR
          contact_name LIKE ? OR
          notes LIKE ?
        )
      ORDER BY appointment_datetime DESC
      LIMIT 20
    `).bind(userId, searchPattern, searchPattern, searchPattern).all();

    return c.json({
      success: true,
      query,
      results: {
        prospects: prospects || [],
        meetings: meetings || [],
        contacts: contacts || [],
        appointments: appointments || []
      },
      total: (prospects?.length || 0) + (meetings?.length || 0) + 
             (contacts?.length || 0) + (appointments?.length || 0)
    });
  } catch (error: any) {
    console.error('Search error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Advanced search with filters for Sales CRM
app.get('/sales-crm', async (c) => {
  try {
    const userId = c.get('user')?.id;
    const { DB } = c.env;
    
    // Get query parameters
    const keyword = c.req.query('q') || '';
    const statuses = c.req.query('statuses')?.split(',').filter(Boolean) || [];
    const priorities = c.req.query('priorities')?.split(',').filter(Boolean) || [];
    const amountMin = c.req.query('amount_min');
    const amountMax = c.req.query('amount_max');
    const dateStart = c.req.query('date_start');
    const dateEnd = c.req.query('date_end');
    const tags = c.req.query('tags');
    
    // Build WHERE clauses
    const conditions: string[] = ['d.owner_id = ?'];
    const bindings: any[] = [userId];
    
    // Keyword search (fuzzy matching)
    if (keyword.trim().length > 0) {
      const searchPattern = `%${keyword.trim()}%`;
      conditions.push(`(
        d.company_name LIKE ? OR
        mc.name LIKE ? OR
        mc.company_name LIKE ? OR
        mc.industry LIKE ? OR
        mc.tags LIKE ? OR
        d.notes LIKE ? OR
        d.custom_fields LIKE ?
      )`);
      bindings.push(searchPattern, searchPattern, searchPattern, searchPattern, searchPattern, searchPattern, searchPattern);
    }
    
    // Status filter
    if (statuses.length > 0) {
      const statusPlaceholders = statuses.map(() => '?').join(',');
      conditions.push(`d.stage IN (${statusPlaceholders})`);
      bindings.push(...statuses);
    }
    
    // Priority filter
    if (priorities.length > 0) {
      const priorityPlaceholders = priorities.map(() => '?').join(',');
      conditions.push(`d.priority IN (${priorityPlaceholders})`);
      bindings.push(...priorities);
    }
    
    // Amount range filter
    if (amountMin) {
      conditions.push('d.estimated_value >= ?');
      bindings.push(parseFloat(amountMin));
    }
    if (amountMax) {
      conditions.push('d.estimated_value <= ?');
      bindings.push(parseFloat(amountMax));
    }
    
    // Date range filter
    if (dateStart) {
      conditions.push('DATE(d.updated_at) >= ?');
      bindings.push(dateStart);
    }
    if (dateEnd) {
      conditions.push('DATE(d.updated_at) <= ?');
      bindings.push(dateEnd);
    }
    
    // Tags filter (using custom_fields as JSON search)
    if (tags && tags.trim().length > 0) {
      const tagList = tags.split(',').map(t => t.trim()).filter(Boolean);
      if (tagList.length > 0) {
        const tagConditions = tagList.map(() => 'd.custom_fields LIKE ?').join(' OR ');
        conditions.push(`(${tagConditions})`);
        tagList.forEach(tag => bindings.push(`%${tag}%`));
      }
    }
    
    // Build final query
    const whereClause = conditions.join(' AND ');
    const query = `
      SELECT 
        d.*,
        mc.name as contact_person,
        (
          SELECT COUNT(*) 
          FROM interactions i 
          WHERE i.deal_id = d.id
        ) as interaction_count,
        (
          SELECT MAX(i.interaction_date) 
          FROM interactions i 
          WHERE i.deal_id = d.id
        ) as last_interaction_date
      FROM deals d
      LEFT JOIN master_contacts mc ON d.master_contact_id = mc.id
      WHERE ${whereClause}
      ORDER BY 
        CASE 
          WHEN d.company_name LIKE ? THEN 1
          WHEN mc.name LIKE ? THEN 2
          ELSE 3
        END,
        d.updated_at DESC
      LIMIT 100
    `;
    
    // Add keyword pattern for ORDER BY if keyword exists
    if (keyword.trim().length > 0) {
      const keywordPattern = `%${keyword.trim()}%`;
      bindings.push(keywordPattern, keywordPattern);
    } else {
      bindings.push('', '');
    }
    
    const { results } = await DB.prepare(query).bind(...bindings).all();
    
    return c.json({
      success: true,
      query: keyword,
      filters: {
        statuses,
        priorities,
        amountMin,
        amountMax,
        dateStart,
        dateEnd,
        tags
      },
      results: results || [],
      total: results?.length || 0
    });
    
  } catch (error: any) {
    console.error('Advanced search error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Get all saved searches for current user
app.get('/saved', async (c) => {
  try {
    const userId = c.get('user')?.id;
    const { DB } = c.env;
    
    const { results } = await DB.prepare(`
      SELECT * FROM saved_searches
      WHERE user_id = ?
      ORDER BY is_default DESC, name ASC
    `).bind(userId).all();
    
    return c.json({
      success: true,
      saved_searches: results || []
    });
  } catch (error: any) {
    console.error('Get saved searches error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Create a new saved search
app.post('/saved', async (c) => {
  try {
    const userId = c.get('user')?.id;
    const { DB } = c.env;
    const body = await c.req.json();
    
    const { name, description, search_params, is_default } = body;
    
    if (!name || !search_params) {
      return c.json({ success: false, error: 'Name and search_params are required' }, 400);
    }
    
    // If setting as default, unset other defaults first
    if (is_default) {
      await DB.prepare(`
        UPDATE saved_searches 
        SET is_default = 0 
        WHERE user_id = ?
      `).bind(userId).run();
    }
    
    const result = await DB.prepare(`
      INSERT INTO saved_searches (user_id, name, description, search_params, is_default)
      VALUES (?, ?, ?, ?, ?)
    `).bind(
      userId, 
      name, 
      description || null, 
      JSON.stringify(search_params),
      is_default ? 1 : 0
    ).run();
    
    return c.json({
      success: true,
      saved_search: {
        id: result.meta.last_row_id,
        name,
        description,
        search_params,
        is_default: is_default ? 1 : 0
      }
    });
  } catch (error: any) {
    console.error('Create saved search error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Update a saved search
app.put('/saved/:id', async (c) => {
  try {
    const userId = c.get('user')?.id;
    const { DB } = c.env;
    const id = c.req.param('id');
    const body = await c.req.json();
    
    const { name, description, search_params, is_default } = body;
    
    // If setting as default, unset other defaults first
    if (is_default) {
      await DB.prepare(`
        UPDATE saved_searches 
        SET is_default = 0 
        WHERE user_id = ? AND id != ?
      `).bind(userId, id).run();
    }
    
    await DB.prepare(`
      UPDATE saved_searches 
      SET name = ?, description = ?, search_params = ?, is_default = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?
    `).bind(
      name,
      description || null,
      JSON.stringify(search_params),
      is_default ? 1 : 0,
      id,
      userId
    ).run();
    
    return c.json({
      success: true,
      saved_search: { id, name, description, search_params, is_default }
    });
  } catch (error: any) {
    console.error('Update saved search error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Delete a saved search
app.delete('/saved/:id', async (c) => {
  try {
    const userId = c.get('user')?.id;
    const { DB } = c.env;
    const id = c.req.param('id');
    
    await DB.prepare(`
      DELETE FROM saved_searches 
      WHERE id = ? AND user_id = ?
    `).bind(id, userId).run();
    
    return c.json({
      success: true,
      message: 'Saved search deleted successfully'
    });
  } catch (error: any) {
    console.error('Delete saved search error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

export default app;
