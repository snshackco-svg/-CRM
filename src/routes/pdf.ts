import { Hono } from 'hono';
import type { Bindings, Variables } from '../types';
import { authMiddleware } from '../middleware/auth';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// Apply authentication middleware to all routes
app.use('/*', authMiddleware);

// Generate proposal PDF
app.post('/generate-proposal', async (c) => {
  try {
    const { prospect_id } = await c.req.json();
    const userId = c.get('user')?.id;
    const { DB } = c.env;

    // Get prospect information
    const prospect: any = await DB.prepare(`
      SELECT p.*, u.name as sales_name, u.email as sales_email
      FROM prospects p
      JOIN users u ON p.sales_id = u.id
      WHERE p.id = ? AND p.sales_id = ?
    `).bind(prospect_id, userId).first();

    if (!prospect) {
      return c.json({ success: false, error: 'Prospect not found' }, 404);
    }

    // Parse research data
    let aiResearch = null;
    let deepResearch = null;
    
    if (prospect.ai_research) {
      try {
        aiResearch = JSON.parse(prospect.ai_research);
      } catch (e) {
        console.error('Failed to parse ai_research:', e);
      }
    }
    
    if (prospect.deep_research) {
      try {
        deepResearch = JSON.parse(prospect.deep_research);
      } catch (e) {
        console.error('Failed to parse deep_research:', e);
      }
    }

    // Generate PDF
    const pdfBytes = await generateProposalPDF({
      prospect,
      aiResearch,
      deepResearch
    });

    // Return PDF as response
    return new Response(pdfBytes, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="proposal_${prospect.company_name}_${Date.now()}.pdf"`
      }
    });
  } catch (error: any) {
    console.error('Error generating proposal PDF:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Generate meeting minutes PDF
app.post('/generate-minutes', async (c) => {
  try {
    const { meeting_id } = await c.req.json();
    const userId = c.get('user')?.id;
    const { DB } = c.env;

    // Get meeting information
    const meeting: any = await DB.prepare(`
      SELECT m.*, p.company_name, p.contact_name, u.name as sales_name
      FROM meetings m
      JOIN prospects p ON m.prospect_id = p.id
      JOIN users u ON m.sales_id = u.id
      WHERE m.id = ? AND m.sales_id = ?
    `).bind(meeting_id, userId).first();

    if (!meeting) {
      return c.json({ success: false, error: 'Meeting not found' }, 404);
    }

    // Parse AI summary
    let aiSummary = null;
    if (meeting.ai_summary) {
      try {
        aiSummary = JSON.parse(meeting.ai_summary);
      } catch (e) {
        console.error('Failed to parse ai_summary:', e);
      }
    }

    // Generate PDF
    const pdfBytes = await generateMeetingMinutesPDF({
      meeting,
      aiSummary
    });

    // Return PDF as response
    return new Response(pdfBytes, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="minutes_${meeting.company_name}_${Date.now()}.pdf"`
      }
    });
  } catch (error: any) {
    console.error('Error generating minutes PDF:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// PDF Generation Functions

async function generateProposalPDF(data: any): Promise<Uint8Array> {
  const { prospect, aiResearch, deepResearch } = data;
  
  // Create a new PDF document
  const pdfDoc = await PDFDocument.create();
  
  // Embed fonts
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  // Add pages
  let page = pdfDoc.addPage([595, 842]); // A4 size
  const { width, height } = page.getSize();
  
  let yPosition = height - 50;
  const leftMargin = 50;
  const lineHeight = 20;
  
  // Title
  page.drawText('提案資料', {
    x: leftMargin,
    y: yPosition,
    size: 24,
    font: fontBold,
    color: rgb(0.2, 0.2, 0.8)
  });
  
  yPosition -= 40;
  
  // Company name
  page.drawText(`${prospect.company_name} 御中`, {
    x: leftMargin,
    y: yPosition,
    size: 18,
    font: fontBold
  });
  
  yPosition -= 30;
  
  // Date
  const today = new Date().toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  page.drawText(`提案日: ${today}`, {
    x: leftMargin,
    y: yPosition,
    size: 12,
    font
  });
  
  yPosition -= 40;
  
  // Section 1: 企業概要
  page.drawText('1. 企業概要', {
    x: leftMargin,
    y: yPosition,
    size: 16,
    font: fontBold
  });
  
  yPosition -= lineHeight;
  
  const overview = aiResearch?.company_overview || deepResearch?.company_overview || 
    `${prospect.company_name}様は${prospect.industry || ''}業界で活動されており、継続的な成長を目指されています。`;
  
  // Word wrap for overview
  const overviewLines = wrapText(overview, 80);
  for (const line of overviewLines) {
    if (yPosition < 100) {
      page = pdfDoc.addPage([595, 842]);
      yPosition = height - 50;
    }
    page.drawText(line, {
      x: leftMargin + 10,
      y: yPosition,
      size: 10,
      font
    });
    yPosition -= lineHeight;
  }
  
  yPosition -= 20;
  
  // Section 2: 提案内容
  if (yPosition < 150) {
    page = pdfDoc.addPage([595, 842]);
    yPosition = height - 50;
  }
  
  page.drawText('2. 提案内容', {
    x: leftMargin,
    y: yPosition,
    size: 16,
    font: fontBold
  });
  
  yPosition -= lineHeight;
  
  const proposalItems = [
    '• 課題解決型ソリューションの提供',
    '• 導入から運用までの一貫サポート',
    '• 効果測定とPDCAサイクルの確立',
    `• 予想投資額: ${prospect.estimated_value ? (prospect.estimated_value / 10000).toFixed(0) + '万円' : '要相談'}`
  ];
  
  for (const item of proposalItems) {
    if (yPosition < 100) {
      page = pdfDoc.addPage([595, 842]);
      yPosition = height - 50;
    }
    page.drawText(item, {
      x: leftMargin + 10,
      y: yPosition,
      size: 10,
      font
    });
    yPosition -= lineHeight;
  }
  
  yPosition -= 20;
  
  // Section 3: 導入効果
  if (yPosition < 150) {
    page = pdfDoc.addPage([595, 842]);
    yPosition = height - 50;
  }
  
  page.drawText('3. 期待される効果', {
    x: leftMargin,
    y: yPosition,
    size: 16,
    font: fontBold
  });
  
  yPosition -= lineHeight;
  
  const benefits = [
    '• 業務効率化: 30-50%の工数削減',
    '• コスト削減: 年間20%以上のコスト削減',
    '• 品質向上: エラー率90%削減',
    '• ROI達成: 12-18ヶ月での投資回収'
  ];
  
  for (const benefit of benefits) {
    if (yPosition < 100) {
      page = pdfDoc.addPage([595, 842]);
      yPosition = height - 50;
    }
    page.drawText(benefit, {
      x: leftMargin + 10,
      y: yPosition,
      size: 10,
      font
    });
    yPosition -= lineHeight;
  }
  
  yPosition -= 20;
  
  // Section 4: スケジュール
  if (yPosition < 200) {
    page = pdfDoc.addPage([595, 842]);
    yPosition = height - 50;
  }
  
  page.drawText('4. 導入スケジュール', {
    x: leftMargin,
    y: yPosition,
    size: 16,
    font: fontBold
  });
  
  yPosition -= lineHeight;
  
  const schedule = [
    'Phase 1 (1-2ヶ月): 要件定義・設計',
    'Phase 2 (2-3ヶ月): 開発・テスト',
    'Phase 3 (1ヶ月): 導入・トレーニング',
    'Phase 4 (継続): 運用・保守サポート'
  ];
  
  for (const item of schedule) {
    if (yPosition < 100) {
      page = pdfDoc.addPage([595, 842]);
      yPosition = height - 50;
    }
    page.drawText(item, {
      x: leftMargin + 10,
      y: yPosition,
      size: 10,
      font
    });
    yPosition -= lineHeight;
  }
  
  // Footer
  yPosition = 30;
  page.drawText(`担当: ${prospect.sales_name || '営業担当'}`, {
    x: leftMargin,
    y: yPosition,
    size: 8,
    font,
    color: rgb(0.5, 0.5, 0.5)
  });
  
  // Serialize the PDF to bytes
  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
}

async function generateMeetingMinutesPDF(data: any): Promise<Uint8Array> {
  const { meeting, aiSummary } = data;
  
  // Create a new PDF document
  const pdfDoc = await PDFDocument.create();
  
  // Embed fonts
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  // Add page
  let page = pdfDoc.addPage([595, 842]); // A4 size
  const { width, height } = page.getSize();
  
  let yPosition = height - 50;
  const leftMargin = 50;
  const lineHeight = 20;
  
  // Title
  page.drawText('商談議事録', {
    x: leftMargin,
    y: yPosition,
    size: 24,
    font: fontBold,
    color: rgb(0.2, 0.2, 0.8)
  });
  
  yPosition -= 40;
  
  // Meeting details
  page.drawText(`企業名: ${meeting.company_name}`, {
    x: leftMargin,
    y: yPosition,
    size: 12,
    font: fontBold
  });
  
  yPosition -= lineHeight;
  
  page.drawText(`担当者: ${meeting.contact_name}`, {
    x: leftMargin,
    y: yPosition,
    size: 12,
    font
  });
  
  yPosition -= lineHeight;
  
  const meetingDate = new Date(meeting.meeting_date).toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  
  page.drawText(`日時: ${meetingDate}`, {
    x: leftMargin,
    y: yPosition,
    size: 12,
    font
  });
  
  yPosition -= lineHeight;
  
  page.drawText(`場所: ${meeting.location || 'オンライン'}`, {
    x: leftMargin,
    y: yPosition,
    size: 12,
    font
  });
  
  yPosition -= 30;
  
  // AI Summary
  if (aiSummary) {
    page.drawText('AI要約', {
      x: leftMargin,
      y: yPosition,
      size: 16,
      font: fontBold
    });
    
    yPosition -= lineHeight;
    
    if (aiSummary.summary) {
      const summaryLines = wrapText(aiSummary.summary, 80);
      for (const line of summaryLines) {
        if (yPosition < 100) {
          page = pdfDoc.addPage([595, 842]);
          yPosition = height - 50;
        }
        page.drawText(line, {
          x: leftMargin + 10,
          y: yPosition,
          size: 10,
          font
        });
        yPosition -= lineHeight;
      }
    }
    
    yPosition -= 20;
    
    // Key points
    if (aiSummary.key_points && aiSummary.key_points.length > 0) {
      if (yPosition < 150) {
        page = pdfDoc.addPage([595, 842]);
        yPosition = height - 50;
      }
      
      page.drawText('重要ポイント', {
        x: leftMargin,
        y: yPosition,
        size: 14,
        font: fontBold
      });
      
      yPosition -= lineHeight;
      
      for (const point of aiSummary.key_points) {
        if (yPosition < 100) {
          page = pdfDoc.addPage([595, 842]);
          yPosition = height - 50;
        }
        page.drawText(`• ${point}`, {
          x: leftMargin + 10,
          y: yPosition,
          size: 10,
          font
        });
        yPosition -= lineHeight;
      }
      
      yPosition -= 20;
    }
    
    // Action items
    if (aiSummary.action_items && aiSummary.action_items.length > 0) {
      if (yPosition < 150) {
        page = pdfDoc.addPage([595, 842]);
        yPosition = height - 50;
      }
      
      page.drawText('アクションアイテム', {
        x: leftMargin,
        y: yPosition,
        size: 14,
        font: fontBold
      });
      
      yPosition -= lineHeight;
      
      for (const item of aiSummary.action_items) {
        if (yPosition < 100) {
          page = pdfDoc.addPage([595, 842]);
          yPosition = height - 50;
        }
        const status = item.status === 'completed' ? '[完了]' : '[未完]';
        page.drawText(`${status} ${item.task}`, {
          x: leftMargin + 10,
          y: yPosition,
          size: 10,
          font
        });
        yPosition -= lineHeight;
      }
    }
  } else {
    // Manual minutes
    page.drawText('議事内容', {
      x: leftMargin,
      y: yPosition,
      size: 16,
      font: fontBold
    });
    
    yPosition -= lineHeight;
    
    const minutesText = meeting.minutes || '議事録が記録されていません。';
    const minutesLines = wrapText(minutesText, 80);
    
    for (const line of minutesLines) {
      if (yPosition < 100) {
        page = pdfDoc.addPage([595, 842]);
        yPosition = height - 50;
      }
      page.drawText(line, {
        x: leftMargin + 10,
        y: yPosition,
        size: 10,
        font
      });
      yPosition -= lineHeight;
    }
  }
  
  // Footer
  yPosition = 30;
  page.drawText(`記録者: ${meeting.sales_name}`, {
    x: leftMargin,
    y: yPosition,
    size: 8,
    font,
    color: rgb(0.5, 0.5, 0.5)
  });
  
  // Serialize the PDF to bytes
  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
}

// Utility function to wrap text
function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';
  
  for (const word of words) {
    if ((currentLine + word).length <= maxChars) {
      currentLine += (currentLine ? ' ' : '') + word;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  
  if (currentLine) lines.push(currentLine);
  
  return lines;
}

export default app;
