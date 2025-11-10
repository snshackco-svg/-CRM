// Master Contacts API - マスター連絡先管理
// Layer 1 of 3-tier Nurturing CRM

import { Hono } from 'hono';
import type { Context } from 'hono';

type Bindings = {
  DB: D1Database;
};

const app = new Hono<{ Bindings: Bindings }>();

// ==================== GET /api/master-contacts ====================
// Get all master contacts with filtering and pagination
app.get('/', async (c: Context) => {
  try {
    const { DB } = c.env as Bindings;
    const { 
      contact_type, 
      relationship_strength, 
      owner_id,
      search,
      limit = '50',
      offset = '0',
      sort_by = 'updated_at',
      sort_order = 'DESC'
    } = c.req.query();

    let query = `
      SELECT 
        mc.*,
        u.name as owner_name,
        COUNT(DISTINCT d.id) as active_deals_count,
        COUNT(DISTINCT i.id) as total_interactions,
        MAX(i.interaction_date) as last_interaction_date
      FROM master_contacts mc
      LEFT JOIN users u ON mc.owner_id = u.id
      LEFT JOIN deals d ON d.master_contact_id = mc.id AND d.deal_status = 'active'
      LEFT JOIN interactions i ON i.master_contact_id = mc.id
      WHERE 1=1
    `;

    const params: any[] = [];

    if (contact_type) {
      query += ` AND mc.contact_type = ?`;
      params.push(contact_type);
    }

    if (relationship_strength) {
      query += ` AND mc.relationship_strength = ?`;
      params.push(relationship_strength);
    }

    if (owner_id) {
      query += ` AND mc.owner_id = ?`;
      params.push(parseInt(owner_id));
    }

    if (search) {
      query += ` AND (
        mc.name LIKE ? OR 
        mc.company_name LIKE ? OR 
        mc.email LIKE ? OR 
        mc.phone LIKE ?
      )`;
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern, searchPattern);
    }

    query += ` GROUP BY mc.id`;
    query += ` ORDER BY mc.${sort_by} ${sort_order}`;
    query += ` LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await DB.prepare(query).bind(...params).all();

    // Get total count
    let countQuery = `SELECT COUNT(*) as total FROM master_contacts mc WHERE 1=1`;
    const countParams: any[] = [];

    if (contact_type) {
      countQuery += ` AND mc.contact_type = ?`;
      countParams.push(contact_type);
    }

    if (relationship_strength) {
      countQuery += ` AND mc.relationship_strength = ?`;
      countParams.push(relationship_strength);
    }

    if (owner_id) {
      countQuery += ` AND mc.owner_id = ?`;
      countParams.push(parseInt(owner_id));
    }

    if (search) {
      countQuery += ` AND (
        mc.name LIKE ? OR 
        mc.company_name LIKE ? OR 
        mc.email LIKE ? OR 
        mc.phone LIKE ?
      )`;
      const searchPattern = `%${search}%`;
      countParams.push(searchPattern, searchPattern, searchPattern, searchPattern);
    }

    const countResult = await DB.prepare(countQuery).bind(...countParams).first();

    return c.json({
      success: true,
      contacts: result.results || [],
      pagination: {
        total: countResult?.total || 0,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });

  } catch (error: any) {
    console.error('Get master contacts error:', error);
    return c.json({
      success: false,
      error: 'マスター連絡先の取得に失敗しました',
      details: error.message
    }, 500);
  }
});

// ==================== GET /api/master-contacts/:id ====================
// Get single master contact with related data
app.get('/:id', async (c: Context) => {
  try {
    const { DB } = c.env as Bindings;
    const contactId = parseInt(c.req.param('id'));

    // Get contact details
    const contact = await DB.prepare(`
      SELECT 
        mc.*,
        u.name as owner_name,
        creator.name as created_by_name
      FROM master_contacts mc
      LEFT JOIN users u ON mc.owner_id = u.id
      LEFT JOIN users creator ON mc.created_by = creator.id
      WHERE mc.id = ?
    `).bind(contactId).first();

    if (!contact) {
      return c.json({
        success: false,
        error: 'マスター連絡先が見つかりません'
      }, 404);
    }

    // Get related deals
    const deals = await DB.prepare(`
      SELECT 
        id, deal_name, stage, deal_status, estimated_value, 
        expected_close_date, deal_score, priority
      FROM deals
      WHERE master_contact_id = ?
      ORDER BY created_at DESC
    `).bind(contactId).all();

    // Get recent interactions
    const interactions = await DB.prepare(`
      SELECT 
        i.*,
        u.name as created_by_name
      FROM interactions i
      LEFT JOIN users u ON i.created_by = u.id
      WHERE i.master_contact_id = ?
      ORDER BY i.interaction_date DESC
      LIMIT 20
    `).bind(contactId).all();

    // Get contact relationships
    const relationships = await DB.prepare(`
      SELECT 
        cr.*,
        mc.name as related_contact_name,
        mc.company_name as related_company_name
      FROM contact_relationships cr
      LEFT JOIN master_contacts mc ON (
        CASE 
          WHEN cr.contact_a_id = ? THEN cr.contact_b_id
          ELSE cr.contact_a_id
        END = mc.id
      )
      WHERE cr.contact_a_id = ? OR cr.contact_b_id = ?
    `).bind(contactId, contactId, contactId).all();

    return c.json({
      success: true,
      contact,
      deals: deals.results || [],
      interactions: interactions.results || [],
      relationships: relationships.results || []
    });

  } catch (error: any) {
    console.error('Get master contact detail error:', error);
    return c.json({
      success: false,
      error: 'マスター連絡先の詳細取得に失敗しました',
      details: error.message
    }, 500);
  }
});

// ==================== POST /api/master-contacts ====================
// Create new master contact
app.post('/', async (c: Context) => {
  try {
    const { DB } = c.env as Bindings;
    const data = await c.req.json();

    const {
      contact_type = 'person',
      name,
      company_name,
      position,
      department,
      email,
      phone,
      mobile,
      address,
      linkedin_url,
      facebook_url,
      twitter_url,
      instagram_url,
      tiktok_url,
      website_url,
      industry,
      company_size,
      annual_revenue,
      relationship_strength = 'cold',
      contact_source,
      tags,
      lead_score = 0,
      engagement_score = 0,
      notes,
      custom_fields,
      owner_id,
      created_by
    } = data;

    // Validation
    if (!name) {
      return c.json({
        success: false,
        error: '名前は必須です'
      }, 400);
    }

    if (!owner_id || !created_by) {
      return c.json({
        success: false,
        error: '担当者情報は必須です'
      }, 400);
    }

    const result = await DB.prepare(`
      INSERT INTO master_contacts (
        contact_type, name, company_name, position, department,
        email, phone, mobile, address,
        linkedin_url, facebook_url, twitter_url, instagram_url, tiktok_url, website_url,
        industry, company_size, annual_revenue,
        relationship_strength, contact_source, tags,
        lead_score, engagement_score,
        notes, custom_fields,
        owner_id, created_by,
        last_contact_date
      ) VALUES (
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?,
        ?, ?,
        ?, ?,
        ?, ?,
        CURRENT_TIMESTAMP
      )
    `).bind(
      contact_type, name, company_name || null, position || null, department || null,
      email || null, phone || null, mobile || null, address || null,
      linkedin_url || null, facebook_url || null, twitter_url || null, 
      instagram_url || null, tiktok_url || null, website_url || null,
      industry || null, company_size || null, annual_revenue || null,
      relationship_strength, contact_source || null, tags || null,
      lead_score, engagement_score,
      notes || null, custom_fields || null,
      owner_id, created_by
    ).run();

    return c.json({
      success: true,
      contact_id: result.meta.last_row_id,
      message: 'マスター連絡先を作成しました'
    });

  } catch (error: any) {
    console.error('Create master contact error:', error);
    return c.json({
      success: false,
      error: 'マスター連絡先の作成に失敗しました',
      details: error.message
    }, 500);
  }
});

// ==================== PUT /api/master-contacts/:id ====================
// Update master contact
app.put('/:id', async (c: Context) => {
  try {
    const { DB } = c.env as Bindings;
    const contactId = parseInt(c.req.param('id'));
    const data = await c.req.json();

    // Check if contact exists
    const existing = await DB.prepare(`
      SELECT id FROM master_contacts WHERE id = ?
    `).bind(contactId).first();

    if (!existing) {
      return c.json({
        success: false,
        error: 'マスター連絡先が見つかりません'
      }, 404);
    }

    // Build update query dynamically
    const updateFields: string[] = [];
    const updateValues: any[] = [];

    const allowedFields = [
      'contact_type', 'name', 'company_name', 'position', 'department',
      'email', 'phone', 'mobile', 'address',
      'linkedin_url', 'facebook_url', 'twitter_url', 'instagram_url', 'tiktok_url', 'website_url',
      'industry', 'company_size', 'annual_revenue',
      'relationship_strength', 'contact_source', 'tags',
      'lead_score', 'engagement_score',
      'notes', 'custom_fields',
      'owner_id'
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
    updateValues.push(contactId);

    await DB.prepare(`
      UPDATE master_contacts 
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `).bind(...updateValues).run();

    return c.json({
      success: true,
      message: 'マスター連絡先を更新しました'
    });

  } catch (error: any) {
    console.error('Update master contact error:', error);
    return c.json({
      success: false,
      error: 'マスター連絡先の更新に失敗しました',
      details: error.message
    }, 500);
  }
});

// ==================== DELETE /api/master-contacts/:id ====================
// Delete master contact (cascade deletes related data)
app.delete('/:id', async (c: Context) => {
  try {
    const { DB } = c.env as Bindings;
    const contactId = parseInt(c.req.param('id'));

    // Check if contact exists
    const existing = await DB.prepare(`
      SELECT id FROM master_contacts WHERE id = ?
    `).bind(contactId).first();

    if (!existing) {
      return c.json({
        success: false,
        error: 'マスター連絡先が見つかりません'
      }, 404);
    }

    // Delete will cascade to deals, interactions, and relationships
    await DB.prepare(`
      DELETE FROM master_contacts WHERE id = ?
    `).bind(contactId).run();

    return c.json({
      success: true,
      message: 'マスター連絡先を削除しました'
    });

  } catch (error: any) {
    console.error('Delete master contact error:', error);
    return c.json({
      success: false,
      error: 'マスター連絡先の削除に失敗しました',
      details: error.message
    }, 500);
  }
});

// ==================== POST /api/master-contacts/:id/update-last-contact ====================
// Update last contact date (called when interaction is created)
app.post('/:id/update-last-contact', async (c: Context) => {
  try {
    const { DB } = c.env as Bindings;
    const contactId = parseInt(c.req.param('id'));

    await DB.prepare(`
      UPDATE master_contacts 
      SET last_contact_date = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(contactId).run();

    return c.json({
      success: true,
      message: '最終接触日を更新しました'
    });

  } catch (error: any) {
    console.error('Update last contact error:', error);
    return c.json({
      success: false,
      error: '最終接触日の更新に失敗しました',
      details: error.message
    }, 500);
  }
});

export default app;
