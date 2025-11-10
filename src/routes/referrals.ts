import { Hono } from 'hono';
import type { Bindings, Variables } from '../types';
import { authMiddleware } from '../middleware/auth';

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// Apply authentication middleware to all routes
app.use('/*', authMiddleware);

// GET /api/referrals - Get all referrals
app.get('/', async (c) => {
  try {
    const userId = c.get('user')?.id;
    const { DB } = c.env;

    const { results } = await DB.prepare(`
      SELECT 
        r.*,
        p.company_name,
        p.contact_name,
        p.status as prospect_status
      FROM referrals r
      LEFT JOIN prospects p ON r.prospect_id = p.id
      WHERE p.sales_id = ?
      ORDER BY r.referral_date DESC
    `).bind(userId).all();

    return c.json({
      success: true,
      referrals: results
    });
  } catch (error: any) {
    console.error('Failed to fetch referrals:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// GET /api/referrals/:id - Get specific referral
app.get('/:id', async (c: Context) => {
  try {
    const referralId = c.req.param('id');
    const { DB } = c.env;

    const { results } = await DB.prepare(`
      SELECT 
        r.*,
        p.company_name,
        p.contact_name,
        p.status as prospect_status
      FROM referrals r
      LEFT JOIN prospects p ON r.prospect_id = p.id
      WHERE r.id = ?
    `).bind(referralId).all();

    if (results.length === 0) {
      return c.json({ success: false, error: 'Referral not found' }, 404);
    }

    return c.json({
      success: true,
      referral: results[0]
    });
  } catch (error: any) {
    console.error('Failed to fetch referral:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// POST /api/referrals - Create new referral
app.post('/', async (c: Context) => {
  try {
    const { DB } = c.env;
    const data = await c.req.json();

    const result = await DB.prepare(`
      INSERT INTO referrals (
        referrer_name, referrer_company, prospect_id, referral_date,
        status, conversion_value, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      data.referrer_name,
      data.referrer_company || null,
      data.prospect_id,
      data.referral_date || new Date().toISOString().split('T')[0],
      data.status || 'active',
      data.conversion_value || 0,
      data.notes || null
    ).run();

    return c.json({
      success: true,
      referral_id: result.meta.last_row_id
    });
  } catch (error: any) {
    console.error('Failed to create referral:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// PUT /api/referrals/:id - Update referral
app.put('/:id', async (c: Context) => {
  try {
    const referralId = c.req.param('id');
    const { DB } = c.env;
    const data = await c.req.json();

    await DB.prepare(`
      UPDATE referrals
      SET 
        referrer_name = ?,
        referrer_company = ?,
        prospect_id = ?,
        referral_date = ?,
        status = ?,
        conversion_value = ?,
        notes = ?
      WHERE id = ?
    `).bind(
      data.referrer_name,
      data.referrer_company || null,
      data.prospect_id,
      data.referral_date,
      data.status,
      data.conversion_value || 0,
      data.notes || null,
      referralId
    ).run();

    return c.json({ success: true });
  } catch (error: any) {
    console.error('Failed to update referral:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// DELETE /api/referrals/:id - Delete referral
app.delete('/:id', async (c: Context) => {
  try {
    const referralId = c.req.param('id');
    const { DB } = c.env;

    await DB.prepare('DELETE FROM referrals WHERE id = ?').bind(referralId).run();

    return c.json({ success: true });
  } catch (error: any) {
    console.error('Failed to delete referral:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

export default app;
