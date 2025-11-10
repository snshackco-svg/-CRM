import { Hono } from 'hono';
import type { Bindings, Variables } from '../types';
import { authMiddleware } from '../middleware/auth';

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// Apply authentication middleware to all routes
app.use('/*', authMiddleware);

// Get all meetings for current user (with optional month filter)
app.get('/', async (c) => {
  try {
    const userId = c.get('user')?.id;
    const { DB } = c.env;
    const month = c.req.query('month'); // Format: YYYY-MM

    let query = `
      SELECT 
        m.*,
        p.company_name,
        p.contact_name,
        p.status as prospect_status
      FROM meetings m
      JOIN prospects p ON m.prospect_id = p.id
      WHERE m.sales_id = ?
    `;

    const params: any[] = [userId];

    // Month filter: Filter by meeting_date within the specified month
    if (month) {
      query += ` AND strftime('%Y-%m', m.meeting_date) = ?`;
      params.push(month);
    }

    query += ` ORDER BY m.meeting_date DESC`;

    const { results } = await DB.prepare(query).bind(...params).all();

    return c.json({ success: true, meetings: results });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Get all meetings for a prospect
app.get('/prospect/:prospectId', async (c) => {
  try {
    const prospectId = c.req.param('prospectId');
    const { DB } = c.env;

    const { results } = await DB.prepare(`
      SELECT 
        m.*,
        COUNT(DISTINCT t.id) as todo_count,
        COUNT(DISTINCT CASE WHEN t.status = 'completed' THEN t.id END) as completed_todo_count
      FROM meetings m
      LEFT JOIN meeting_todos t ON m.id = t.meeting_id
      WHERE m.prospect_id = ?
      GROUP BY m.id
      ORDER BY m.meeting_date DESC
    `).bind(prospectId).all();

    return c.json({ success: true, meetings: results });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Get single meeting with details
app.get('/:id', async (c) => {
  try {
    const meetingId = c.req.param('id');
    const { DB } = c.env;

    const meeting = await DB.prepare(`
      SELECT m.*, p.company_name, p.contact_name
      FROM meetings m
      JOIN prospects p ON m.prospect_id = p.id
      WHERE m.id = ?
    `).bind(meetingId).first();

    if (!meeting) {
      return c.json({ success: false, error: 'Meeting not found' }, 404);
    }

    // Get todos
    const { results: todos } = await DB.prepare(`
      SELECT * FROM meeting_todos WHERE meeting_id = ? ORDER BY due_date ASC
    `).bind(meetingId).all();

    // Get email templates
    const { results: emails } = await DB.prepare(`
      SELECT * FROM email_templates WHERE meeting_id = ? ORDER BY created_at DESC
    `).bind(meetingId).all();

    // Get PM report
    const pmReport = await DB.prepare(`
      SELECT * FROM pm_reports WHERE meeting_id = ? ORDER BY created_at DESC LIMIT 1
    `).bind(meetingId).first();

    return c.json({
      success: true,
      meeting,
      todos,
      emails,
      pmReport
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Create new meeting
app.post('/', async (c) => {
  try {
    const userId = c.get('user')?.id;
    const { DB } = c.env;
    const data = await c.req.json();

    const result = await DB.prepare(`
      INSERT INTO meetings (
        prospect_id, meeting_date, meeting_type, attendees, location,
        duration_minutes, agenda, minutes, good_points, improvement_points,
        next_actions, meeting_outcome, sales_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      data.prospect_id,
      data.meeting_date,
      data.meeting_type,
      data.attendees,
      data.location || null,
      data.duration_minutes || null,
      data.agenda || null,
      data.minutes || null,
      data.good_points || null,
      data.improvement_points || null,
      data.next_actions || null,
      data.meeting_outcome || null,
      userId
    ).run();

    return c.json({
      success: true,
      meeting_id: result.meta.last_row_id,
      message: 'Meeting created successfully'
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Update meeting
app.put('/:id', async (c) => {
  try {
    const meetingId = c.req.param('id');
    const { DB } = c.env;
    const data = await c.req.json();

    await DB.prepare(`
      UPDATE meetings SET
        meeting_date = COALESCE(?, meeting_date),
        meeting_type = COALESCE(?, meeting_type),
        attendees = COALESCE(?, attendees),
        location = COALESCE(?, location),
        duration_minutes = COALESCE(?, duration_minutes),
        agenda = COALESCE(?, agenda),
        minutes = COALESCE(?, minutes),
        good_points = COALESCE(?, good_points),
        improvement_points = COALESCE(?, improvement_points),
        next_actions = COALESCE(?, next_actions),
        meeting_outcome = COALESCE(?, meeting_outcome),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(
      data.meeting_date,
      data.meeting_type,
      data.attendees,
      data.location,
      data.duration_minutes,
      data.agenda,
      data.minutes,
      data.good_points,
      data.improvement_points,
      data.next_actions,
      data.meeting_outcome,
      meetingId
    ).run();

    return c.json({ success: true, message: 'Meeting updated successfully' });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// AI: Generate thank you emails (client + referrer)
app.post('/:id/generate-thank-you-emails', async (c) => {
  try {
    const meetingId = c.req.param('id');
    const { DB } = c.env;
    const { referrer_name, referrer_email } = await c.req.json();

    // Get meeting and prospect details
    const meeting = await DB.prepare(`
      SELECT m.*, p.*
      FROM meetings m
      JOIN prospects p ON m.prospect_id = p.id
      WHERE m.id = ?
    `).bind(meetingId).first();

    if (!meeting) {
      return c.json({ success: false, error: 'Meeting not found' }, 404);
    }

    // Generate thank you email for client
    const clientEmail = {
      subject: `${meeting.company_name}様 - 本日はありがとうございました`,
      body: `${meeting.contact_name}様

本日はお忙しい中、貴重なお時間をいただき誠にありがとうございました。

${meeting.good_points || 'お打ち合わせの内容'}についてお話しでき、大変有意義な時間となりました。

${meeting.next_actions ? `\n次のステップとして：\n${meeting.next_actions}\n` : ''}
今後とも何卒よろしくお願い申し上げます。

ご不明点やご質問がございましたら、お気軽にご連絡ください。

よろしくお願いいたします。`
    };

    await DB.prepare(`
      INSERT INTO email_templates (
        meeting_id, prospect_id, template_type, recipient_type, subject, body, ai_generated
      ) VALUES (?, ?, 'thank_you_client', 'client', ?, ?, 1)
    `).bind(meetingId, meeting.prospect_id, clientEmail.subject, clientEmail.body).run();

    // Generate thank you email for referrer (if provided)
    let referrerEmail = null;
    if (referrer_name && referrer_email) {
      referrerEmail = {
        subject: `${referrer_name}様 - ご紹介ありがとうございました`,
        body: `${referrer_name}様

いつもお世話になっております。

この度は${meeting.company_name}様をご紹介いただき、誠にありがとうございました。

本日、${meeting.contact_name}様とお打ち合わせをさせていただき、${meeting.meeting_outcome || '大変有意義な時間'}となりました。

${referrer_name}様のご厚意に深く感謝申し上げます。

引き続き何卒よろしくお願い申し上げます。`
      };

      await DB.prepare(`
        INSERT INTO email_templates (
          meeting_id, prospect_id, template_type, recipient_type, subject, body, ai_generated
        ) VALUES (?, ?, 'thank_you_referrer', 'referrer', ?, ?, 1)
      `).bind(meetingId, meeting.prospect_id, referrerEmail.subject, referrerEmail.body).run();
    }

    return c.json({
      success: true,
      emails: {
        client: clientEmail,
        referrer: referrerEmail
      }
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// AI: Generate PM report
app.post('/:id/generate-pm-report', async (c) => {
  try {
    const meetingId = c.req.param('id');
    const userId = c.get('user')?.id;
    const { DB } = c.env;

    // Get meeting and prospect details
    const meeting = await DB.prepare(`
      SELECT m.*, p.*
      FROM meetings m
      JOIN prospects p ON m.prospect_id = p.id
      WHERE m.id = ?
    `).bind(meetingId).first();

    if (!meeting) {
      return c.json({ success: false, error: 'Meeting not found' }, 404);
    }

    // Generate PM report
    const report = {
      summary: `【${meeting.company_name}様 商談報告】

日時: ${meeting.meeting_date}
参加者: ${meeting.attendees}
商談種別: ${meeting.meeting_type}`,
      key_points: meeting.good_points || '主要なポイントを整理中...',
      challenges: meeting.improvement_points || '課題を分析中...',
      next_steps: meeting.next_actions || '次のアクションを策定中...',
      support_needed: '必要なサポートを検討中...'
    };

    const result = await DB.prepare(`
      INSERT INTO pm_reports (
        meeting_id, prospect_id, report_date, summary, key_points,
        challenges, next_steps, support_needed, ai_generated, sales_id
      ) VALUES (?, ?, DATE('now'), ?, ?, ?, ?, ?, 1, ?)
    `).bind(
      meetingId,
      meeting.prospect_id,
      report.summary,
      report.key_points,
      report.challenges,
      report.next_steps,
      report.support_needed,
      userId
    ).run();

    return c.json({
      success: true,
      report_id: result.meta.last_row_id,
      report
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Create meeting todo
app.post('/:id/todos', async (c) => {
  try {
    const meetingId = c.req.param('id');
    const { DB } = c.env;
    const data = await c.req.json();

    const result = await DB.prepare(`
      INSERT INTO meeting_todos (
        meeting_id, prospect_id, title, description, assignee_id, due_date, status, priority
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      meetingId,
      data.prospect_id,
      data.title,
      data.description || null,
      data.assignee_id || null,
      data.due_date || null,
      data.status || 'pending',
      data.priority || 'medium'
    ).run();

    return c.json({
      success: true,
      todo_id: result.meta.last_row_id,
      message: 'Todo created successfully'
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Update todo status
app.put('/todos/:todoId', async (c) => {
  try {
    const todoId = c.req.param('todoId');
    const { DB } = c.env;
    const { status } = await c.req.json();

    await DB.prepare(`
      UPDATE meeting_todos SET
        status = ?,
        completed_at = CASE WHEN ? = 'completed' THEN CURRENT_TIMESTAMP ELSE completed_at END,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(status, status, todoId).run();

    return c.json({ success: true, message: 'Todo updated successfully' });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Delete meeting
app.delete('/:id', async (c) => {
  try {
    const meetingId = c.req.param('id');
    const { DB } = c.env;

    await DB.prepare(`
      DELETE FROM meetings WHERE id = ?
    `).bind(meetingId).run();

    return c.json({ success: true, message: 'Meeting deleted successfully' });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Delete todo
app.delete('/todos/:todoId', async (c) => {
  try {
    const todoId = c.req.param('todoId');
    const { DB } = c.env;

    await DB.prepare(`
      DELETE FROM meeting_todos WHERE id = ?
    `).bind(todoId).run();

    return c.json({ success: true, message: 'Todo deleted successfully' });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

export default app;
