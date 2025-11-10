import { Hono } from 'hono';
import type { Bindings, Variables } from '../types';
import { authMiddleware } from '../middleware/auth';

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// Apply authentication middleware to all routes
app.use('/*', authMiddleware);

// Get all connections for current user
app.get('/connections', async (c) => {
  try {
    const userId = c.get('user')?.id;
    const { DB } = c.env;

    const { results } = await DB.prepare(`
      SELECT * FROM networking_connections
      WHERE sales_id = ?
      ORDER BY last_contact_date DESC, created_at DESC
    `).bind(userId).all();

    return c.json({ success: true, connections: results });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Create new connection (支持两个路径: / 和 /connections)
app.post('/', async (c) => {
  try {
    const userId = c.get('user')?.id;
    const { DB } = c.env;
    const data = await c.req.json();

    const result = await DB.prepare(`
      INSERT INTO networking_connections (
        person_name, company, position, email, phone, linkedin_url,
        industry, expertise, relationship_strength, last_contact_date,
        notes, tags, sales_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      data.name || data.person_name,
      data.company || null,
      data.position || null,
      data.email || null,
      data.phone || null,
      data.linkedin_url || null,
      data.industry || null,
      data.expertise || null,
      data.relationship_strength || 'moderate',
      data.last_contact_date || null,
      data.notes || null,
      data.tags || null,
      userId
    ).run();

    return c.json({
      success: true,
      connection_id: result.meta.last_row_id,
      message: 'Connection created successfully'
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Create new connection (alternative path)
app.post('/connections', async (c) => {
  try {
    const userId = c.get('user')?.id;
    const { DB } = c.env;
    const data = await c.req.json();

    const result = await DB.prepare(`
      INSERT INTO networking_connections (
        person_name, company, position, email, phone, linkedin_url,
        industry, expertise, relationship_strength, last_contact_date,
        notes, tags, sales_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      data.name || data.person_name,
      data.company || null,
      data.position || null,
      data.email || null,
      data.phone || null,
      data.linkedin_url || null,
      data.industry || null,
      data.expertise || null,
      data.relationship_strength || 'moderate',
      data.last_contact_date || null,
      data.notes || null,
      data.tags || null,
      userId
    ).run();

    return c.json({
      success: true,
      connection_id: result.meta.last_row_id,
      message: 'Connection created successfully'
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Update connection
app.put('/connections/:id', async (c) => {
  try {
    const connectionId = c.req.param('id');
    const userId = c.get('user')?.id;
    const { DB } = c.env;
    const data = await c.req.json();

    await DB.prepare(`
      UPDATE networking_connections SET
        person_name = COALESCE(?, person_name),
        company = COALESCE(?, company),
        position = COALESCE(?, position),
        email = COALESCE(?, email),
        phone = COALESCE(?, phone),
        linkedin_url = COALESCE(?, linkedin_url),
        instagram_url = COALESCE(?, instagram_url),
        facebook_url = COALESCE(?, facebook_url),
        tiktok_url = COALESCE(?, tiktok_url),
        company_website_url = COALESCE(?, company_website_url),
        industry = COALESCE(?, industry),
        expertise = COALESCE(?, expertise),
        relationship_strength = COALESCE(?, relationship_strength),
        last_contact_date = COALESCE(?, last_contact_date),
        notes = COALESCE(?, notes),
        tags = COALESCE(?, tags),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND sales_id = ?
    `).bind(
      data.person_name,
      data.company,
      data.position,
      data.email,
      data.phone,
      data.linkedin_url,
      data.instagram_url,
      data.facebook_url,
      data.tiktok_url,
      data.company_website_url,
      data.industry,
      data.expertise,
      data.relationship_strength,
      data.last_contact_date,
      data.notes,
      data.tags,
      connectionId,
      userId
    ).run();

    return c.json({ success: true, message: 'Connection updated successfully' });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// AI: Find matching connections for a prospect
app.post('/matches/:prospectId/generate', async (c) => {
  try {
    const prospectId = c.req.param('prospectId');
    const userId = c.get('user')?.id;
    const { DB } = c.env;

    // Get prospect details
    const prospect = await DB.prepare(`
      SELECT * FROM prospects WHERE id = ? AND sales_id = ?
    `).bind(prospectId, userId).first();

    if (!prospect) {
      return c.json({ success: false, error: 'Prospect not found' }, 404);
    }

    // Get all connections
    const { results: connections } = await DB.prepare(`
      SELECT * FROM networking_connections WHERE sales_id = ?
    `).bind(userId).all();

    // Simple matching algorithm (can be enhanced with AI)
    const matches = [];
    for (const connection of connections) {
      let matchScore = 0;
      let matchReasons = [];

      // Industry match
      if (connection.industry && prospect.industry && 
          connection.industry.toLowerCase().includes(prospect.industry.toLowerCase())) {
        matchScore += 0.4;
        matchReasons.push('同じ業界');
      }

      // Expertise relevance (placeholder logic)
      if (connection.expertise) {
        matchScore += 0.2;
        matchReasons.push('関連する専門知識');
      }

      // Strong relationships get bonus
      if (connection.relationship_strength === 'strong') {
        matchScore += 0.2;
        matchReasons.push('強固な関係性');
      }

      // Recent contact gets bonus
      if (connection.last_contact_date) {
        const lastContact = new Date(connection.last_contact_date);
        const daysSince = (Date.now() - lastContact.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSince < 90) {
          matchScore += 0.2;
          matchReasons.push('最近の接触あり');
        }
      }

      // Only suggest matches with score > 0.3
      if (matchScore > 0.3) {
        const introText = `${prospect.company_name}様をご紹介いたします。

${prospect.company_name}は${prospect.industry || ''}業界で活動されており、${connection.person_name}様の${connection.expertise || '専門知識'}が役立つ可能性がございます。

双方にとって有益な出会いになると考え、ご紹介させていただきます。`;

        // Insert match suggestion
        await DB.prepare(`
          INSERT INTO connection_matches (
            prospect_id, connection_id, match_reason, match_score,
            introduction_text, status, ai_generated
          ) VALUES (?, ?, ?, ?, ?, 'suggested', 1)
        `).bind(
          prospectId,
          connection.id,
          matchReasons.join('、'),
          matchScore,
          introText
        ).run();

        matches.push({
          connection,
          matchScore,
          matchReasons,
          introText
        });
      }
    }

    // Sort by match score
    matches.sort((a, b) => b.matchScore - a.matchScore);

    return c.json({
      success: true,
      matches,
      message: `${matches.length}件のマッチングを見つけました`
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Get matches for a prospect
app.get('/matches/:prospectId', async (c) => {
  try {
    const prospectId = c.req.param('prospectId');
    const { DB } = c.env;

    const { results } = await DB.prepare(`
      SELECT 
        cm.*,
        nc.person_name,
        nc.company,
        nc.position,
        nc.email,
        nc.phone,
        nc.industry,
        nc.expertise,
        nc.relationship_strength
      FROM connection_matches cm
      JOIN networking_connections nc ON cm.connection_id = nc.id
      WHERE cm.prospect_id = ?
      ORDER BY cm.match_score DESC, cm.created_at DESC
    `).bind(prospectId).all();

    return c.json({ success: true, matches: results });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Update match status
app.put('/matches/:matchId/status', async (c) => {
  try {
    const matchId = c.req.param('matchId');
    const { DB } = c.env;
    const { status } = await c.req.json();

    await DB.prepare(`
      UPDATE connection_matches SET
        status = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(status, matchId).run();

    return c.json({ success: true, message: 'Match status updated successfully' });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// AI: Generate introduction email for group
app.post('/matches/:matchId/generate-introduction', async (c) => {
  try {
    const matchId = c.req.param('matchId');
    const { DB } = c.env;

    // Get match details with prospect and connection
    const match = await DB.prepare(`
      SELECT 
        cm.*,
        p.company_name, p.contact_name, p.contact_position, p.industry as prospect_industry,
        nc.person_name, nc.company as connection_company, nc.position as connection_position,
        nc.email as connection_email, nc.industry as connection_industry, nc.expertise
      FROM connection_matches cm
      JOIN prospects p ON cm.prospect_id = p.id
      JOIN networking_connections nc ON cm.connection_id = nc.id
      WHERE cm.id = ?
    `).bind(matchId).first();

    if (!match) {
      return c.json({ success: false, error: 'Match not found' }, 404);
    }

    // Generate introduction email
    const introduction = {
      subject: `【ご紹介】${match.contact_name}様 × ${match.person_name}様`,
      body_to_prospect: `${match.contact_name}様

いつもお世話になっております。

この度、${match.person_name}様（${match.connection_company} ${match.connection_position}）をご紹介させていただきたく、ご連絡いたしました。

${match.person_name}様は${match.connection_industry}業界で${match.expertise}の分野において豊富な経験をお持ちです。

${match.company_name}様の${match.prospect_industry}分野において、有益な情報交換ができるのではないかと考えております。

もしご興味がございましたら、ぜひ一度お話しする機会を設けていただければ幸いです。

何卒よろしくお願い申し上げます。`,
      body_to_connection: `${match.person_name}様

いつもお世話になっております。

この度、${match.contact_name}様（${match.company_name} ${match.contact_position}）をご紹介させていただきたく、ご連絡いたしました。

${match.company_name}様は${match.prospect_industry}業界で活動されており、${match.person_name}様の${match.expertise}に関してご興味をお持ちかと存じます。

双方にとって有益な情報交換の機会になると考えておりますので、もしご興味がございましたら、ぜひご検討いただければ幸いです。

何卒よろしくお願い申し上げます。`
    };

    // Save introduction email templates
    await DB.prepare(`
      INSERT INTO email_templates (
        prospect_id, template_type, recipient_type, subject, body, ai_generated
      ) VALUES (?, 'introduction', 'prospect', ?, ?, 1)
    `).bind(match.prospect_id, introduction.subject, introduction.body_to_prospect).run();

    await DB.prepare(`
      INSERT INTO email_templates (
        prospect_id, template_type, recipient_type, subject, body, ai_generated
      ) VALUES (?, 'introduction', 'other', ?, ?, 1)
    `).bind(match.prospect_id, introduction.subject, introduction.body_to_connection).run();

    return c.json({
      success: true,
      introduction
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

export default app;
