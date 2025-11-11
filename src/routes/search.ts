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
        estimated_value, next_meeting_date, is_partnership,
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

export default app;
