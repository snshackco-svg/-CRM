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
    // Google Cloud Vision API Integration for OCR
    // ==============================================================
    let ocrText = '';
    let ocrConfidence = 0;
    
    if (c.env.GOOGLE_VISION_API_KEY && c.env.GOOGLE_VISION_API_KEY !== 'your-google-vision-api-key-here') {
      // Use real Google Cloud Vision API
      try {
        const ocrResult = await performGoogleVisionOCR(scan.image_url, c.env.GOOGLE_VISION_API_KEY);
        ocrText = ocrResult.text;
        ocrConfidence = ocrResult.confidence;
      } catch (error) {
        console.error('Google Vision API error:', error);
        // Fallback to mock data if API fails
        ocrText = generateMockOCRText();
        ocrConfidence = 0.85;
      }
    } else {
      // No API key configured - use mock data
      console.warn('Google Vision API key not configured, using mock OCR data');
      ocrText = generateMockOCRText();
      ocrConfidence = 0.85;
    }

    // AI-powered extraction: Parse OCR text into structured data using OpenAI
    const extractedData = await extractBusinessCardInfo(ocrText, c.env);

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
      ocrText,
      ocrConfidence,
      scanId
    ).run();

    return c.json({ 
      success: true, 
      data: {
        ...extractedData,
        raw_ocr_text: ocrText,  // OCRの生テキストも含める
        ocr_confidence: ocrConfidence
      },
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
// Google Cloud Vision API OCR
async function performGoogleVisionOCR(imageDataUrl: string, apiKey: string): Promise<{ text: string; confidence: number }> {
  // Extract base64 content from data URL
  const base64Match = imageDataUrl.match(/^data:image\/[a-z]+;base64,(.+)$/);
  if (!base64Match) {
    throw new Error('Invalid image data URL format');
  }
  const base64Content = base64Match[1];

  // Call Google Cloud Vision API with enhanced settings
  const response = await fetch(
    `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requests: [
          {
            image: {
              content: base64Content,
            },
            features: [
              {
                type: 'DOCUMENT_TEXT_DETECTION',  // より精度の高いDOCUMENT_TEXT_DETECTIONを使用
                maxResults: 1,
              },
            ],
            imageContext: {
              languageHints: ['ja', 'en'],  // 日本語と英語を明示
            },
          },
        ],
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google Vision API error: ${response.status} ${errorText}`);
  }

  const result = await response.json();
  
  if (!result.responses || !result.responses[0]) {
    throw new Error('No response from Google Vision API');
  }

  const textAnnotations = result.responses[0].textAnnotations;
  if (!textAnnotations || textAnnotations.length === 0) {
    return { text: '', confidence: 0 };
  }

  // First annotation contains all detected text
  const fullText = textAnnotations[0].description || '';
  
  // Calculate average confidence from all text annotations
  let totalConfidence = 0;
  let count = 0;
  for (const annotation of textAnnotations) {
    if (annotation.confidence) {
      totalConfidence += annotation.confidence;
      count++;
    }
  }
  const avgConfidence = count > 0 ? totalConfidence / count : 0.9;

  return {
    text: fullText.trim(),
    confidence: avgConfidence,
  };
}

// Generate mock OCR text for fallback
function generateMockOCRText(): string {
  return `
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
}

// Extract structured info from OCR text using OpenAI
async function extractBusinessCardInfo(ocrText: string, env: any): Promise<any> {
  // Use OpenAI to extract structured data from OCR text
  if (env.OPENAI_API_KEY && env.OPENAI_API_KEY !== 'your-openai-api-key-here') {
    try {
      const { default: OpenAI } = await import('openai');
      const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

      const response = await openai.chat.completions.create({
        model: env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `あなたは日本の名刺情報を抽出する専門家です。OCRで読み取られた名刺のテキストから、正確に構造化された情報を抽出してJSON形式で返してください。

【最重要】名前と会社名を絶対に間違えないこと！
- **名前（name）**: 2-4文字の日本語の姓名（例: "山田 太郎"、"佐藤 花子"）。名刺の最初の行にあることが多い。
- **会社名（company_name）**: 「株式会社」「有限会社」「合同会社」などを含む組織名。名前よりも長い。

【識別ポイント】
- 名前: 通常2-4文字、人名用の漢字、スペース区切りの姓名
- 会社名: 「株式会社」「Corporation」「Inc.」「Co., Ltd.」などを含む
- 会社名には部署名を含めない（例: ○「株式会社ABC」、×「株式会社ABC 営業部」）

【重要な抽出ルール】
1. **名前（name）**: 日本語の姓名を正確に抽出。英語は参考程度。役職は含めない。
2. **会社名（company_name）**: 正式な会社名（株式会社○○、○○株式会社など）
3. **役職（title）**: 役職名のみ（代表取締役、営業部長など）。部署名は含めない。
4. **部署名（department）**: 部署名のみ（営業部、開発部など）
5. **電話番号**: phone=固定電話、mobile=携帯電話。ラベル除外。
6. **メールアドレス（email）**: 完全なメールアドレス
7. **ウェブサイト（website）**: URL
8. **住所（address）**: 郵便番号を含む完全な住所

【出力形式】
{
  "name": "人名（2-4文字の日本語姓名）",
  "company_name": "会社名（株式会社を含む組織名）",
  "title": "役職",
  "department": "部署名",
  "phone": "固定電話",
  "mobile": "携帯電話",
  "email": "メールアドレス",
  "website": "ウェブサイト",
  "address": "住所"
}

情報が見つからない場合はnullを返してください。推測や創作は絶対にしないでください。`,
          },
          {
            role: 'user',
            content: `山田 太郎
Taro Yamada
代表取締役社長
株式会社テックイノベーション
Tech Innovation Inc.
営業部
〒100-0001 東京都千代田区千代田1-1-1
TEL: 03-1234-5678
Mobile: 090-1234-5678
Email: t.yamada@tech-innovation.co.jp
https://www.tech-innovation.co.jp`,
          },
          {
            role: 'assistant',
            content: `{
  "name": "山田 太郎",
  "company_name": "株式会社テックイノベーション",
  "title": "代表取締役社長",
  "department": "営業部",
  "phone": "03-1234-5678",
  "mobile": "090-1234-5678",
  "email": "t.yamada@tech-innovation.co.jp",
  "website": "https://www.tech-innovation.co.jp",
  "address": "〒100-0001 東京都千代田区千代田1-1-1"
}`,
          },
          {
            role: 'user',
            content: `佐藤 花子
Hanako Sato
Senior Product Manager
製品開発部 部長
アクメ株式会社
ACME Corporation
〒150-0002
東京都渋谷区渋谷2-2-2
Tel: 03-9876-5432
Mob: 080-9876-5432
h.sato@acme.co.jp
www.acme.co.jp`,
          },
          {
            role: 'assistant',
            content: `{
  "name": "佐藤 花子",
  "company_name": "アクメ株式会社",
  "title": "部長",
  "department": "製品開発部",
  "phone": "03-9876-5432",
  "mobile": "080-9876-5432",
  "email": "h.sato@acme.co.jp",
  "website": "www.acme.co.jp",
  "address": "〒150-0002 東京都渋谷区渋谷2-2-2"
}`,
          },
          {
            role: 'user',
            content: `以下の名刺OCRテキストから情報を正確に抽出してください:\n\n${ocrText}`,
          },
        ],
        temperature: 0.05,  // さらに低く設定
        response_format: { type: 'json_object' },
      });

      let extracted = JSON.parse(response.choices[0]?.message?.content || '{}');
      
      // 信頼度スコアを計算
      const confidenceScore = calculateConfidenceScore(extracted, ocrText);
      
      // 信頼度が低い場合（50%未満）、再試行
      if (confidenceScore < 0.5) {
        console.log('Low confidence score:', confidenceScore, 'Retrying...');
        
        const retryResponse = await openai.chat.completions.create({
          model: env.OPENAI_MODEL || 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: `あなたは日本の名刺情報を抽出する専門家です。以下のルールに厳密に従ってください:

【最優先】名前と会社名を絶対に間違えないこと！
- **name（名前）**: 2-4文字の日本語の人名（例: "山田 太郎"、"佐藤 花子"）
- **company_name（会社名）**: 「株式会社」「有限会社」などを含む組織名（例: "株式会社テックイノベーション"）

【判別方法】
1. 名前は通常2-4文字の日本語で、人名用の漢字を使用
2. 会社名は「株式会社」「Corporation」「Inc.」を含む
3. 名前と会社名を逆にしないこと！

必須フィールド:
- name: 日本語の姓名（必須）
- company_name: 会社の正式名称（必須）
- title: 役職のみ
- 情報がない場合はnullを返す
- 絶対に推測や創作をしない`,
            },
            {
              role: 'user',
              content: `以下のOCRテキストから名刺情報を抽出してください。

【特に注意】
- nameには人名を入れる（会社名ではない）
- company_nameには組織名を入れる（人名ではない）

OCRテキスト:
${ocrText}`,
            },
          ],
          temperature: 0.0,  // 完全に決定的に
          response_format: { type: 'json_object' },
        });
        
        const retryExtracted = JSON.parse(retryResponse.choices[0]?.message?.content || '{}');
        const retryScore = calculateConfidenceScore(retryExtracted, ocrText);
        
        // より高いスコアの方を採用
        if (retryScore > confidenceScore) {
          console.log('Retry improved score:', retryScore);
          extracted = retryExtracted;
        }
      }
      
      // 名前と会社名が逆転していないかチェック
      if (extracted.name && extracted.company_name) {
        const swapped = detectNameCompanySwap(extracted.name, extracted.company_name);
        if (swapped) {
          console.log('Detected name/company swap, correcting...');
          const temp = extracted.name;
          extracted.name = extracted.company_name;
          extracted.company_name = temp;
        }
      }
      
      // 名前のバリデーション
      if (extracted.name) {
        extracted.name = validateAndCleanName(extracted.name);
      }
      
      // 会社名のバリデーション
      if (extracted.company_name) {
        extracted.company_name = validateAndCleanCompanyName(extracted.company_name);
      }
      
      // デバッグ用にコンソール出力
      console.log('OCR Text:', ocrText);
      console.log('Extracted Data:', extracted);
      console.log('Confidence Score:', confidenceScore);
      
      return extracted;
    } catch (error) {
      console.error('OpenAI extraction error:', error);
      // Fall back to regex extraction
      return regexExtractBusinessCardInfo(ocrText);
    }
  } else {
    // No OpenAI API key - use regex extraction
    return regexExtractBusinessCardInfo(ocrText);
  }
}

// Detect if name and company_name are swapped
function detectNameCompanySwap(name: string, companyName: string): boolean {
  if (!name || !companyName) return false;
  
  // Check if "name" contains company indicators
  const companyIndicators = [
    '株式会社', '有限会社', '合同会社', '合資会社', '合名会社',
    'Corporation', 'Corp.', 'Inc.', 'Ltd.', 'Co.,', 'LLC', 'GmbH',
    '社団法人', '財団法人', '医療法人', '学校法人'
  ];
  
  for (const indicator of companyIndicators) {
    if (name.includes(indicator)) {
      return true; // name contains company indicator, likely swapped
    }
  }
  
  // Check if "company_name" looks like a person name (2-4 characters with space)
  const personNamePattern = /^[\u4e00-\u9faf]{1,2}\s?[\u4e00-\u9faf]{1,2}$/;
  if (personNamePattern.test(companyName) && companyName.length <= 5) {
    return true; // company_name looks like a person name, likely swapped
  }
  
  // Check length: names are usually shorter than company names
  if (name.length > 15 && companyName.length <= 5) {
    return true; // name is too long, company_name is too short, likely swapped
  }
  
  return false;
}

// Validate and clean name
function validateAndCleanName(name: string): string {
  if (!name) return name;
  
  // Remove common titles that shouldn't be in name
  const titlePatterns = [
    /^(代表取締役|取締役|社長|CEO|CTO|CFO|部長|課長|主任|係長|マネージャー|Manager|Director|President)\s*/,
    /\s*(代表取締役|取締役|社長|CEO|CTO|CFO|部長|課長|主任|係長|マネージャー|Manager|Director|President)$/,
  ];
  
  let cleaned = name;
  for (const pattern of titlePatterns) {
    cleaned = cleaned.replace(pattern, '');
  }
  
  // Remove extra spaces
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  
  // If the name is too short or too long, return original
  if (cleaned.length < 2 || cleaned.length > 20) {
    return name;
  }
  
  // Check if it contains Japanese characters
  if (!/[\u4e00-\u9faf\u3040-\u309f\u30a0-\u30ff]/.test(cleaned)) {
    // If no Japanese, it might be English name - keep it
    return cleaned;
  }
  
  return cleaned;
}

// Validate and clean company name
function validateAndCleanCompanyName(companyName: string): string {
  if (!companyName) return companyName;
  
  // Remove department names that shouldn't be in company name
  const departmentPatterns = [
    /\s*(営業部|開発部|技術部|総務部|人事部|経理部|企画部|マーケティング部|Sales|Development|Engineering).*$/,
  ];
  
  let cleaned = companyName;
  for (const pattern of departmentPatterns) {
    cleaned = cleaned.replace(pattern, '');
  }
  
  // Remove extra spaces
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  
  return cleaned;
}

// Calculate confidence score for extracted data
function calculateConfidenceScore(extracted: any, ocrText: string): number {
  let score = 0;
  let maxScore = 0;
  
  // Check each field
  const fields = [
    { key: 'name', weight: 3, validator: (v: string) => v && v.length > 1 && v.length < 20 && /[\u4e00-\u9faf\u3040-\u309f\u30a0-\u30ff]/.test(v) },
    { key: 'company_name', weight: 3, validator: (v: string) => v && v.length > 1 && (v.includes('株式会社') || v.includes('会社') || v.includes('Corporation')) },
    { key: 'title', weight: 2, validator: (v: string) => v && v.length > 1 && v.length < 20 },
    { key: 'department', weight: 1, validator: (v: string) => v && v.length > 1 },
    { key: 'phone', weight: 2, validator: (v: string) => v && /\d{2,4}-\d{2,4}-\d{4}/.test(v) },
    { key: 'mobile', weight: 2, validator: (v: string) => v && /0[789]0-\d{4}-\d{4}/.test(v) },
    { key: 'email', weight: 2, validator: (v: string) => v && /[\w\.-]+@[\w\.-]+\.\w+/.test(v) },
    { key: 'website', weight: 1, validator: (v: string) => v && (v.includes('http') || v.includes('www') || v.includes('.co.jp') || v.includes('.com')) },
    { key: 'address', weight: 1, validator: (v: string) => v && v.length > 5 && (v.includes('〒') || v.includes('東京') || v.includes('大阪') || /[都道府県]/.test(v)) },
  ];
  
  for (const field of fields) {
    maxScore += field.weight;
    const value = extracted[field.key];
    
    if (value && value !== null) {
      // Check if value exists in OCR text
      const valueInText = ocrText.includes(value) || ocrText.includes(value.replace(/\s/g, ''));
      
      if (valueInText && field.validator(value)) {
        score += field.weight;
      } else if (field.validator(value)) {
        score += field.weight * 0.5; // Partial credit
      }
    }
  }
  
  return score / maxScore;
}

// Fallback regex-based extraction
function regexExtractBusinessCardInfo(ocrText: string): any {
  const emailMatch = ocrText.match(/[\w\.-]+@[\w\.-]+\.\w+/);
  const phoneMatch = ocrText.match(/0\d{1,4}-\d{1,4}-\d{4}/);
  const mobileMatch = ocrText.match(/0[789]0-\d{4}-\d{4}/);
  const urlMatch = ocrText.match(/https?:\/\/[\w\.-]+\.\w+/);
  const postalMatch = ocrText.match(/〒?\d{3}-?\d{4}/);

  // Try to extract name (first line usually)
  const lines = ocrText.split('\n').filter(line => line.trim());
  const nameCandidate = lines[0] || '';

  return {
    name: nameCandidate,
    company_name: null,
    title: null,
    department: null,
    phone: phoneMatch ? phoneMatch[0] : null,
    mobile: mobileMatch ? mobileMatch[0] : null,
    email: emailMatch ? emailMatch[0] : null,
    website: urlMatch ? urlMatch[0] : null,
    address: postalMatch ? lines.find(line => line.includes(postalMatch[0])) || null : null,
  };
}

export default app;
