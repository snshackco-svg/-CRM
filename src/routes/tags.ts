import { Hono } from 'hono';
import type { Bindings, Variables } from '../types';
import { authMiddleware } from '../middleware/auth';

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// Apply authentication middleware to all routes
app.use('/*', authMiddleware);

// Get all tags for a prospect
app.get('/prospect/:prospectId', async (c) => {
  try {
    const prospectId = c.req.param('prospectId');
    const { DB } = c.env;

    const { results } = await DB.prepare(`
      SELECT tag FROM prospect_tags
      WHERE prospect_id = ?
      ORDER BY created_at DESC
    `).bind(prospectId).all();

    return c.json({
      success: true,
      tags: results?.map((r: any) => r.tag) || []
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Add tag to prospect
app.post('/prospect/:prospectId', async (c) => {
  try {
    const prospectId = c.req.param('prospectId');
    const { DB } = c.env;
    const { tag } = await c.req.json();

    await DB.prepare(`
      INSERT OR IGNORE INTO prospect_tags (prospect_id, tag)
      VALUES (?, ?)
    `).bind(prospectId, tag).run();

    return c.json({
      success: true,
      message: 'Tag added successfully'
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Remove tag from prospect
app.delete('/prospect/:prospectId/:tag', async (c) => {
  try {
    const prospectId = c.req.param('prospectId');
    const tag = c.req.param('tag');
    const { DB } = c.env;

    await DB.prepare(`
      DELETE FROM prospect_tags
      WHERE prospect_id = ? AND tag = ?
    `).bind(prospectId, tag).run();

    return c.json({
      success: true,
      message: 'Tag removed successfully'
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Get all unique tags (for autocomplete)
app.get('/all', async (c) => {
  try {
    const { DB } = c.env;

    const { results } = await DB.prepare(`
      SELECT DISTINCT tag, COUNT(*) as count
      FROM prospect_tags
      GROUP BY tag
      ORDER BY count DESC, tag ASC
    `).all();

    return c.json({
      success: true,
      tags: results || []
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

export default app;
