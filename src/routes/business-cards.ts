import { Hono } from 'hono';
import type { Bindings, Variables } from '../types';
import { authMiddleware } from '../middleware/auth';

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// Apply authentication middleware to all routes
app.use('/*', authMiddleware);

// Get all business card scans
app.get('/', async (c) => {
  try {
    const userId = c.get('user')?.id;
    const { DB } = c.env;

    const { results } = await DB.prepare(`
      SELECT 
        bc.*,
        nc.id as imported_connection_id,
        nc.person_name as imported_connection_name
      FROM business_card_scans bc
      LEFT JOIN networking_connections nc ON bc.connection_id = nc.id
      WHERE bc.sales_id = ?
      ORDER BY bc.created_at DESC
    `).bind(userId).all();

    return c.json({ success: true, data: results });
  } catch (error: any) {
    console.error('Get business cards error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Get single business card scan
app.get('/:id', async (c) => {
  try {
    const userId = c.get('user')?.id;
    const { DB } = c.env;
    const scanId = c.req.param('id');

    const scan = await DB.prepare(`
      SELECT * FROM business_card_scans
      WHERE id = ? AND sales_id = ?
    `).bind(scanId, userId).first();

    if (!scan) {
      return c.json({ success: false, error: 'Business card not found' }, 404);
    }

    return c.json({ success: true, data: scan });
  } catch (error: any) {
    console.error('Get business card error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Upload and process business card image
app.post('/upload', async (c) => {
  try {
    const userId = c.get('user')?.id;
    const { DB } = c.env;
    const formData = await c.req.formData();
    const imageFront = formData.get('image_front') as File;
    const imageBack = formData.get('image_back') as File | null;

    if (!imageFront) {
      return c.json({ success: false, error: 'No front image provided' }, 400);
    }

    // Check file size (limit to 10MB each)
    if (imageFront.size > 10 * 1024 * 1024) {
      return c.json({ success: false, error: 'Front image file too large (max 10MB)' }, 400);
    }
    if (imageBack && imageBack.size > 10 * 1024 * 1024) {
      return c.json({ success: false, error: 'Back image file too large (max 10MB)' }, 400);
    }

    // Convert front image to base64 data URL
    const imageFrontBuffer = await imageFront.arrayBuffer();
    const base64ImageFront = btoa(
      new Uint8Array(imageFrontBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
    );
    const imageUrlFront = `data:${imageFront.type};base64,${base64ImageFront}`;

    // Convert back image to base64 data URL if provided
    let imageUrlBack = null;
    if (imageBack) {
      const imageBackBuffer = await imageBack.arrayBuffer();
      const base64ImageBack = btoa(
        new Uint8Array(imageBackBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
      );
      imageUrlBack = `data:${imageBack.type};base64,${base64ImageBack}`;
    }

    // Create initial record (OCR will be processed separately)
    const result = await DB.prepare(`
      INSERT INTO business_card_scans (
        sales_id, image_url, image_url_back, status
      ) VALUES (?, ?, ?, 'pending')
    `).bind(userId, imageUrlFront, imageUrlBack).run();

    const scanId = result.meta.last_row_id;

    return c.json({ 
      success: true, 
      data: { 
        id: scanId,
        image_url: imageUrlFront,
        image_url_back: imageUrlBack,
        status: 'pending'
      } 
    });
  } catch (error: any) {
    console.error('Upload business card error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Process OCR for a business card (AI-powered extraction)
app.post('/:id/process-ocr', async (c) => {
  try {
    const userId = c.get('user')?.id;
    const { DB } = c.env;
    const scanId = c.req.param('id');

    const scan = await DB.prepare(`
      SELECT * FROM business_card_scans
      WHERE id = ? AND sales_id = ?
    `).bind(scanId, userId).first();

    if (!scan) {
      return c.json({ success: false, error: 'Business card not found' }, 404);
    }

    // ==============================================================
    // TODO: Integrate real OCR API (Google Vision, AWS Textract, etc.)
    // ==============================================================
    // For now, simulate OCR extraction with mock data
    const mockOcrText = `
山田 太郎
Taro Yamada
株式会社テックイノベーション
Tech Innovation Inc.
営業部 部長
Sales Department Manager
〒100-0001 東京都千代田区千代田1-1-1
TEL: 03-1234-5678
Mobile: 090-1234-5678
Email: t.yamada@tech-innovation.co.jp
Website: https://www.tech-innovation.co.jp
    `.trim();

    // AI-powered extraction: Parse OCR text into structured data
    // In production, use OpenAI/Claude API to extract structured data
    const extractedData = await extractBusinessCardInfo(mockOcrText);

    // Update the record with OCR results
    await DB.prepare(`
      UPDATE business_card_scans SET
        name = ?,
        company_name = ?,
        title = ?,
        department = ?,
        phone = ?,
        mobile = ?,
        email = ?,
        website = ?,
        address = ?,
        raw_ocr_text = ?,
        ocr_confidence = ?,
        ai_processed = 1,
        status = 'reviewed',
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(
      extractedData.name,
      extractedData.company_name,
      extractedData.title,
      extractedData.department,
      extractedData.phone,
      extractedData.mobile,
      extractedData.email,
      extractedData.website,
      extractedData.address,
      mockOcrText,
      0.95,
      scanId
    ).run();

    return c.json({ 
      success: true, 
      data: extractedData,
      message: 'OCR processing completed'
    });
  } catch (error: any) {
    console.error('Process OCR error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Update business card information (manual correction)
app.put('/:id', async (c) => {
  try {
    const userId = c.get('user')?.id;
    const { DB } = c.env;
    const scanId = c.req.param('id');
    const body = await c.req.json();

    await DB.prepare(`
      UPDATE business_card_scans SET
        name = ?,
        company_name = ?,
        title = ?,
        department = ?,
        phone = ?,
        mobile = ?,
        email = ?,
        website = ?,
        address = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND sales_id = ?
    `).bind(
      body.name,
      body.company_name,
      body.title,
      body.department,
      body.phone,
      body.mobile,
      body.email,
      body.website,
      body.address,
      scanId,
      userId
    ).run();

    return c.json({ success: true, message: 'Business card updated' });
  } catch (error: any) {
    console.error('Update business card error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Import to networking connections
app.post('/:id/import', async (c) => {
  try {
    const userId = c.get('user')?.id;
    const { DB } = c.env;
    const scanId = c.req.param('id');

    const scan = await DB.prepare(`
      SELECT * FROM business_card_scans
      WHERE id = ? AND sales_id = ?
    `).bind(scanId, userId).first();

    if (!scan) {
      return c.json({ success: false, error: 'Business card not found' }, 404);
    }

    // Check if already imported
    if (scan.connection_id) {
      return c.json({ 
        success: false, 
        error: 'Already imported to networking connections' 
      }, 400);
    }

    // Create networking connection
    const connectionResult = await DB.prepare(`
      INSERT INTO networking_connections (
        sales_id, person_name, company, title, 
        phone, email, website, notes, 
        relationship_strength, last_contact_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'warm', CURRENT_TIMESTAMP)
    `).bind(
      userId,
      scan.name,
      scan.company_name,
      scan.title,
      scan.mobile || scan.phone,
      scan.email,
      scan.website,
      `Imported from business card scan\nDepartment: ${scan.department || 'N/A'}\nAddress: ${scan.address || 'N/A'}`
    ).run();

    const connectionId = connectionResult.meta.last_row_id;

    // Update scan record
    await DB.prepare(`
      UPDATE business_card_scans SET
        connection_id = ?,
        status = 'imported',
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(connectionId, scanId).run();

    return c.json({ 
      success: true, 
      data: { connection_id: connectionId },
      message: 'Business card imported to networking connections'
    });
  } catch (error: any) {
    console.error('Import business card error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Delete business card scan
app.delete('/:id', async (c) => {
  try {
    const userId = c.get('user')?.id;
    const { DB } = c.env;
    const scanId = c.req.param('id');

    await DB.prepare(`
      DELETE FROM business_card_scans
      WHERE id = ? AND sales_id = ?
    `).bind(scanId, userId).run();

    return c.json({ success: true, message: 'Business card deleted' });
  } catch (error: any) {
    console.error('Delete business card error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Helper function: AI-powered business card info extraction
async function extractBusinessCardInfo(ocrText: string): Promise<any> {
  // ==============================================================
  // TODO: Use real AI API (OpenAI GPT-4o, Claude, etc.)
  // ==============================================================
  // Prompt example:
  // "Extract structured information from this business card OCR text.
  // Return JSON with fields: name, company_name, title, department, 
  // phone, mobile, email, website, address"
  
  // For now, use simple regex extraction as placeholder
  const emailMatch = ocrText.match(/[\w\.-]+@[\w\.-]+\.\w+/);
  const phoneMatch = ocrText.match(/0\d{1,4}-\d{1,4}-\d{4}/);
  const mobileMatch = ocrText.match(/0[789]0-\d{4}-\d{4}/);
  const urlMatch = ocrText.match(/https?:\/\/[\w\.-]+\.\w+/);

  // Mock extraction - in production, use AI
  return {
    name: '山田 太郎',
    company_name: '株式会社テックイノベーション',
    title: '営業部 部長',
    department: '営業部',
    phone: phoneMatch ? phoneMatch[0] : '03-1234-5678',
    mobile: mobileMatch ? mobileMatch[0] : '090-1234-5678',
    email: emailMatch ? emailMatch[0] : 't.yamada@tech-innovation.co.jp',
    website: urlMatch ? urlMatch[0] : 'https://www.tech-innovation.co.jp',
    address: '〒100-0001 東京都千代田区千代田1-1-1'
  };
}

export default app;
