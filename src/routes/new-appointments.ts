import { Hono } from 'hono';
import type { Bindings, Variables } from '../types';
import { authMiddleware } from '../middleware/auth';

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// Apply authentication middleware to all routes
app.use('/*', authMiddleware);

// Get all new appointments
app.get('/', async (c) => {
  try {
    const userId = c.get('user')?.id;
    const { DB } = c.env;

    const { results: appointments } = await DB.prepare(`
      SELECT * FROM new_appointments
      WHERE sales_id = ?
      ORDER BY appointment_datetime DESC
    `).bind(userId).all();

    return c.json({
      success: true,
      appointments: appointments || []
    });
  } catch (error: any) {
    console.error('Get appointments error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Helper function to map appointment status to prospect status
function getProspectStatus(appointmentStatus: string): string {
  const statusMap: Record<string, string> = {
    '見込み外': 'not_qualified',
    '見込み化': 'qualified',
    '商談': 'negotiating',
    '契約': 'contracted',
    '入金済み': 'paid',
    '協業候補': 'partnership_candidate',
    '協業先': 'partnership'
  };
  return statusMap[appointmentStatus] || 'qualified';
}

// Helper function to check if status should create prospect
function shouldCreateProspect(status: string): boolean {
  return ['見込み化', '商談', '契約', '入金済み', '協業候補', '協業先'].includes(status);
}

// Helper function to determine if prospect is partnership
function isPartnership(status: string): number {
  return ['協業候補', '協業先'].includes(status) ? 1 : 0;
}

// Create new appointment
app.post('/', async (c) => {
  try {
    const userId = c.get('user')?.id;
    const { DB } = c.env;
    const data = await c.req.json();

    // Insert appointment
    const result = await DB.prepare(`
      INSERT INTO new_appointments (
        appointment_datetime, company_name, industry, contact_name, contact_position,
        email, phone, method, referrer_name, referrer_company, status, notes, sales_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      data.appointment_datetime,
      data.company_name,
      data.industry || null,
      data.contact_name,
      data.contact_position || null,
      data.email || null,
      data.phone || null,
      data.method,
      data.referrer_name || null,
      data.referrer_company || null,
      data.status || '見込み外',
      data.notes || null,
      userId
    ).run();

    const appointmentId = result.meta.last_row_id;
    let prospectId = null;

    // Auto-create prospect if status is qualified
    if (shouldCreateProspect(data.status)) {
      const prospectResult = await DB.prepare(`
        INSERT INTO prospects (
          company_name, industry, contact_name, contact_position,
          contact_email, contact_phone, sales_id, status, source, priority, notes, is_partnership
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        data.company_name,
        data.industry || null,
        data.contact_name,
        data.contact_position || null,
        data.email || null,
        data.phone || null,
        userId,
        getProspectStatus(data.status),
        'appointment',
        'medium',
        `[アポイントより自動作成]\n日時: ${data.appointment_datetime}\n方法: ${data.method}\n${data.notes || ''}`,
        isPartnership(data.status)
      ).run();
      
      prospectId = prospectResult.meta.last_row_id;
    }

    // Create referral record if referrer info exists
    if (data.referrer_name && prospectId) {
      await DB.prepare(`
        INSERT INTO referrals (
          referrer_name, referrer_company, prospect_id, referral_date, result_status, referral_notes, sales_id
        ) VALUES (?, ?, ?, DATE('now'), ?, ?, ?)
      `).bind(
        data.referrer_name,
        data.referrer_company || null,
        prospectId,
        shouldCreateProspect(data.status) ? 'contacted' : 'pending',
        `アポイント経由の紹介 (ID: ${appointmentId})`,
        userId
      ).run();
    }

    return c.json({
      success: true,
      appointment_id: appointmentId,
      prospect_id: prospectId,
      message: 'Appointment created successfully'
    });
  } catch (error: any) {
    console.error('Create appointment error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Update appointment
app.put('/:id', async (c) => {
  try {
    const userId = c.get('user')?.id;
    const { DB } = c.env;
    const appointmentId = c.req.param('id');
    const data = await c.req.json();

    // Get current appointment data
    const currentAppointment = await DB.prepare(`
      SELECT * FROM new_appointments WHERE id = ? AND sales_id = ?
    `).bind(appointmentId, userId).first();

    if (!currentAppointment) {
      return c.json({ success: false, error: 'Appointment not found' }, 404);
    }

    const oldStatus = currentAppointment.status as string;
    const newStatus = data.status;

    // Update appointment
    await DB.prepare(`
      UPDATE new_appointments
      SET appointment_datetime = ?, company_name = ?, industry = ?, contact_name = ?,
          contact_position = ?, email = ?, phone = ?, method = ?, referrer_name = ?,
          referrer_company = ?, status = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND sales_id = ?
    `).bind(
      data.appointment_datetime,
      data.company_name,
      data.industry || null,
      data.contact_name,
      data.contact_position || null,
      data.email || null,
      data.phone || null,
      data.method,
      data.referrer_name || null,
      data.referrer_company || null,
      newStatus,
      data.notes || null,
      appointmentId,
      userId
    ).run();

    // Check if we need to create or update prospect
    let prospectId = null;

    // Find existing prospect linked to this appointment
    const existingProspect = await DB.prepare(`
      SELECT id FROM prospects 
      WHERE company_name = ? AND contact_name = ? AND sales_id = ?
      ORDER BY created_at DESC LIMIT 1
    `).bind(data.company_name, data.contact_name, userId).first();

    if (existingProspect) {
      prospectId = existingProspect.id;
      
      // Update existing prospect if status changed to qualified status
      if (shouldCreateProspect(newStatus)) {
        await DB.prepare(`
          UPDATE prospects
          SET status = ?, industry = ?, contact_position = ?, 
              contact_email = ?, contact_phone = ?, notes = ?, is_partnership = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).bind(
          getProspectStatus(newStatus),
          data.industry || null,
          data.contact_position || null,
          data.email || null,
          data.phone || null,
          `[アポイントより更新]\n日時: ${data.appointment_datetime}\n方法: ${data.method}\n${data.notes || ''}`,
          isPartnership(newStatus),
          prospectId
        ).run();
      }
    } else if (shouldCreateProspect(newStatus) && !shouldCreateProspect(oldStatus)) {
      // Status changed from unqualified to qualified - create new prospect
      const prospectResult = await DB.prepare(`
        INSERT INTO prospects (
          company_name, industry, contact_name, contact_position,
          contact_email, contact_phone, sales_id, status, source, priority, notes, is_partnership
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        data.company_name,
        data.industry || null,
        data.contact_name,
        data.contact_position || null,
        data.email || null,
        data.phone || null,
        userId,
        getProspectStatus(newStatus),
        'appointment',
        'medium',
        `[アポイントより自動作成]\n日時: ${data.appointment_datetime}\n方法: ${data.method}\n${data.notes || ''}`,
        isPartnership(newStatus)
      ).run();
      
      prospectId = prospectResult.meta.last_row_id;
    }

    // Handle referral update
    if (data.referrer_name && prospectId) {
      // Check if referral exists
      const existingReferral = await DB.prepare(`
        SELECT id FROM referrals WHERE prospect_id = ?
      `).bind(prospectId).first();

      if (existingReferral) {
        // Update existing referral
        await DB.prepare(`
          UPDATE referrals
          SET referrer_name = ?, referrer_company = ?, result_status = ?
          WHERE id = ?
        `).bind(
          data.referrer_name,
          data.referrer_company || null,
          shouldCreateProspect(newStatus) ? 'contacted' : 'pending',
          existingReferral.id
        ).run();
      } else {
        // Create new referral
        await DB.prepare(`
          INSERT INTO referrals (
            referrer_name, referrer_company, prospect_id, referral_date, result_status, referral_notes, sales_id
          ) VALUES (?, ?, ?, DATE('now'), ?, ?, ?)
        `).bind(
          data.referrer_name,
          data.referrer_company || null,
          prospectId,
          shouldCreateProspect(newStatus) ? 'contacted' : 'pending',
          `アポイント経由の紹介 (ID: ${appointmentId})`,
          userId
        ).run();
      }
    }

    return c.json({
      success: true,
      prospect_id: prospectId,
      message: 'Appointment updated successfully'
    });
  } catch (error: any) {
    console.error('Update appointment error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Delete appointment
app.delete('/:id', async (c) => {
  try {
    const userId = c.get('user')?.id;
    const { DB } = c.env;
    const appointmentId = c.req.param('id');

    await DB.prepare(`
      DELETE FROM new_appointments
      WHERE id = ? AND sales_id = ?
    `).bind(appointmentId, userId).run();

    return c.json({
      success: true,
      message: 'Appointment deleted successfully'
    });
  } catch (error: any) {
    console.error('Delete appointment error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Convert appointment to prospect
app.post('/:id/convert', async (c) => {
  try {
    const userId = c.get('user')?.id;
    const { DB } = c.env;
    const appointmentId = c.req.param('id');

    // Get appointment data
    const appointment = await DB.prepare(`
      SELECT * FROM new_appointments WHERE id = ? AND sales_id = ?
    `).bind(appointmentId, userId).first();

    if (!appointment) {
      return c.json({ success: false, error: 'Appointment not found' }, 404);
    }

    // Create prospect from appointment
    const result = await DB.prepare(`
      INSERT INTO prospects (
        company_name, industry, contact_name, contact_position,
        contact_email, contact_phone, sales_id, status, source, priority, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      appointment.company_name,
      appointment.industry,
      appointment.contact_name,
      appointment.contact_position,
      appointment.email,
      appointment.phone,
      userId,
      'contacted',
      'appointment',
      'high',
      `アポイント日時: ${appointment.appointment_datetime}\n方法: ${appointment.method}\n${appointment.notes || ''}`
    ).run();

    // Update appointment status to '見込み化' (converted to prospect)
    await DB.prepare(`
      UPDATE new_appointments
      SET status = '見込み化', updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(appointmentId).run();

    return c.json({
      success: true,
      prospect_id: result.meta.last_row_id,
      message: 'Converted to prospect successfully'
    });
  } catch (error: any) {
    console.error('Convert appointment error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

export default app;
