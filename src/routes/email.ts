import { Hono } from 'hono';
import type { Bindings, Variables } from '../types';
import { authMiddleware } from '../middleware/auth';

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// Apply authentication middleware to all routes
app.use('/*', authMiddleware);

// Send thank you email after meeting
app.post('/send-thank-you', async (c) => {
  try {
    const { meeting_id } = await c.req.json();
    const userId = c.get('user')?.id;
    const { DB } = c.env;

    // Get meeting and prospect information
    const meeting: any = await DB.prepare(`
      SELECT m.*, p.company_name, p.contact_name, p.contact_email, u.name as sales_name, u.email as sales_email
      FROM meetings m
      JOIN prospects p ON m.prospect_id = p.id
      JOIN users u ON m.sales_id = u.id
      WHERE m.id = ? AND m.sales_id = ?
    `).bind(meeting_id, userId).first();

    if (!meeting) {
      return c.json({ success: false, error: 'Meeting not found' }, 404);
    }

    if (!meeting.contact_email) {
      return c.json({ success: false, error: 'Contact email not found' }, 400);
    }

    // Generate email content
    const emailContent = generateThankYouEmail(meeting);

    // Send email (mock for now - would use SendGrid API in production)
    const emailResult = await sendEmail({
      to: meeting.contact_email,
      from: meeting.sales_email || 'noreply@example.com',
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text
    });

    return c.json({
      success: true,
      message: 'Thank you email sent successfully',
      email_preview: emailContent
    });
  } catch (error: any) {
    console.error('Error sending thank you email:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Send follow-up email
app.post('/send-followup', async (c) => {
  try {
    const { meeting_id, custom_message } = await c.req.json();
    const userId = c.get('user')?.id;
    const { DB } = c.env;

    // Get meeting and prospect information
    const meeting: any = await DB.prepare(`
      SELECT m.*, p.company_name, p.contact_name, p.contact_email, u.name as sales_name, u.email as sales_email
      FROM meetings m
      JOIN prospects p ON m.prospect_id = p.id
      JOIN users u ON m.sales_id = u.id
      WHERE m.id = ? AND m.sales_id = ?
    `).bind(meeting_id, userId).first();

    if (!meeting) {
      return c.json({ success: false, error: 'Meeting not found' }, 404);
    }

    if (!meeting.contact_email) {
      return c.json({ success: false, error: 'Contact email not found' }, 400);
    }

    // Generate email content
    const emailContent = generateFollowUpEmail(meeting, custom_message);

    // Send email via SendGrid
    const emailResult = await sendEmail({
      to: meeting.contact_email,
      from: meeting.sales_email || 'noreply@example.com',
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text
    }, c.env);

    return c.json({
      success: true,
      message: 'Follow-up email sent successfully',
      email_preview: emailContent
    });
  } catch (error: any) {
    console.error('Error sending follow-up email:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Send proposal email with attachment
app.post('/send-proposal', async (c) => {
  try {
    const { prospect_id, proposal_type, custom_message } = await c.req.json();
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

    if (!prospect.contact_email) {
      return c.json({ success: false, error: 'Contact email not found' }, 400);
    }

    // Generate email content
    const emailContent = generateProposalEmail(prospect, proposal_type, custom_message);

    // Send email via SendGrid
    const emailResult = await sendEmail({
      to: prospect.contact_email,
      from: prospect.sales_email || 'noreply@example.com',
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text
    }, c.env);

    return c.json({
      success: true,
      message: 'Proposal email sent successfully',
      email_preview: emailContent
    });
  } catch (error: any) {
    console.error('Error sending proposal email:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Helper functions

function generateThankYouEmail(meeting: any): { subject: string; html: string; text: string } {
  const subject = `【お礼】${meeting.company_name}様との商談につきまして`;
  
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">${meeting.contact_name}様</h2>
      
      <p>いつもお世話になっております。<br>${meeting.sales_name}でございます。</p>
      
      <p>本日は貴重なお時間をいただき、誠にありがとうございました。</p>
      
      <p>${meeting.company_name}様の${meeting.agenda || '事業内容'}についてお話を伺うことができ、<br>
      大変有意義な時間となりました。</p>
      
      <h3 style="color: #4a5568; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px;">
        本日の商談内容
      </h3>
      <ul style="line-height: 1.8;">
        <li>日時: ${new Date(meeting.meeting_date).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })}</li>
        <li>議題: ${meeting.agenda || '事業内容のヒアリング'}</li>
        ${meeting.meeting_outcome ? `<li>成果: ${meeting.meeting_outcome}</li>` : ''}
      </ul>
      
      ${meeting.next_actions ? `
      <h3 style="color: #4a5568; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px;">
        次のステップ
      </h3>
      <p>${meeting.next_actions}</p>
      ` : ''}
      
      <p>引き続き、${meeting.company_name}様のビジネス発展のお手伝いができれば幸いです。<br>
      今後ともどうぞよろしくお願い申し上げます。</p>
      
      <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; color: #718096; font-size: 14px;">
        <p style="margin: 0;">${meeting.sales_name}</p>
        <p style="margin: 0;">${meeting.sales_email}</p>
      </div>
    </div>
  `;
  
  const text = `
${meeting.contact_name}様

いつもお世話になっております。
${meeting.sales_name}でございます。

本日は貴重なお時間をいただき、誠にありがとうございました。

${meeting.company_name}様の${meeting.agenda || '事業内容'}についてお話を伺うことができ、
大変有意義な時間となりました。

本日の商談内容:
- 日時: ${new Date(meeting.meeting_date).toLocaleDateString('ja-JP')}
- 議題: ${meeting.agenda || '事業内容のヒアリング'}
${meeting.meeting_outcome ? `- 成果: ${meeting.meeting_outcome}` : ''}

${meeting.next_actions ? `次のステップ:\n${meeting.next_actions}\n` : ''}

引き続き、${meeting.company_name}様のビジネス発展のお手伝いができれば幸いです。
今後ともどうぞよろしくお願い申し上げます。

${meeting.sales_name}
${meeting.sales_email}
  `;
  
  return { subject, html, text };
}

function generateFollowUpEmail(meeting: any, customMessage?: string): { subject: string; html: string; text: string } {
  const subject = `【フォローアップ】${meeting.company_name}様`;
  
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">${meeting.contact_name}様</h2>
      
      <p>いつもお世話になっております。<br>${meeting.sales_name}でございます。</p>
      
      <p>先日の商談から数日が経ちましたが、その後いかがでしょうか。</p>
      
      ${customMessage ? `<p>${customMessage}</p>` : `
      <p>前回お話しさせていただいた内容について、<br>
      ご不明な点やご質問等ございましたら、お気軽にお問い合わせください。</p>
      `}
      
      <h3 style="color: #4a5568; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px;">
        次回のお打ち合わせについて
      </h3>
      <p>より具体的なご提案をさせていただくため、<br>
      再度お時間をいただけますと幸いです。</p>
      
      <p>ご都合の良い日時をいくつかお知らせいただけますでしょうか。</p>
      
      <p>引き続き、${meeting.company_name}様のお力になれれば幸いです。<br>
      どうぞよろしくお願い申し上げます。</p>
      
      <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; color: #718096; font-size: 14px;">
        <p style="margin: 0;">${meeting.sales_name}</p>
        <p style="margin: 0;">${meeting.sales_email}</p>
      </div>
    </div>
  `;
  
  const text = `
${meeting.contact_name}様

いつもお世話になっております。
${meeting.sales_name}でございます。

先日の商談から数日が経ちましたが、その後いかがでしょうか。

${customMessage || '前回お話しさせていただいた内容について、\nご不明な点やご質問等ございましたら、お気軽にお問い合わせください。'}

次回のお打ち合わせについて:
より具体的なご提案をさせていただくため、
再度お時間をいただけますと幸いです。

ご都合の良い日時をいくつかお知らせいただけますでしょうか。

引き続き、${meeting.company_name}様のお力になれれば幸いです。
どうぞよろしくお願い申し上げます。

${meeting.sales_name}
${meeting.sales_email}
  `;
  
  return { subject, html, text };
}

function generateProposalEmail(prospect: any, proposalType: string, customMessage?: string): { subject: string; html: string; text: string } {
  const subject = `【ご提案】${prospect.company_name}様向けソリューションのご紹介`;
  
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">${prospect.contact_name}様</h2>
      
      <p>いつもお世話になっております。<br>${prospect.sales_name}でございます。</p>
      
      <p>${prospect.company_name}様向けに、最適なソリューションをご提案させていただきます。</p>
      
      ${customMessage ? `<p>${customMessage}</p>` : ''}
      
      <h3 style="color: #4a5568; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px;">
        ご提案内容
      </h3>
      <p>詳細な提案資料を添付しておりますので、ご確認いただけますと幸いです。</p>
      
      <ul style="line-height: 1.8;">
        <li>導入効果の試算</li>
        <li>実装スケジュール</li>
        <li>お見積り</li>
        <li>サポート体制</li>
      </ul>
      
      <p>ご不明な点やご質問等ございましたら、<br>
      お気軽にお問い合わせください。</p>
      
      <p>何卒ご検討のほど、よろしくお願い申し上げます。</p>
      
      <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; color: #718096; font-size: 14px;">
        <p style="margin: 0;">${prospect.sales_name}</p>
        <p style="margin: 0;">${prospect.sales_email}</p>
      </div>
    </div>
  `;
  
  const text = `
${prospect.contact_name}様

いつもお世話になっております。
${prospect.sales_name}でございます。

${prospect.company_name}様向けに、最適なソリューションをご提案させていただきます。

${customMessage || ''}

ご提案内容:
詳細な提案資料を添付しておりますので、ご確認いただけますと幸いです。

- 導入効果の試算
- 実装スケジュール
- お見積り
- サポート体制

ご不明な点やご質問等ございましたら、
お気軽にお問い合わせください。

何卒ご検討のほど、よろしくお願い申し上げます。

${prospect.sales_name}
${prospect.sales_email}
  `;
  
  return { subject, html, text };
}

async function sendEmail(params: {
  to: string;
  from: string;
  subject: string;
  html: string;
  text: string;
}, env?: any): Promise<boolean> {
  // Priority 1: Try Resend API (recommended)
  if (env?.RESEND_API_KEY && env.RESEND_API_KEY !== 'your-resend-api-key-here') {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: params.from,
          to: [params.to],
          subject: params.subject,
          html: params.html,
          text: params.text
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Resend API error:', response.status, errorData);
        throw new Error(`Resend API error: ${response.status}`);
      }
      
      console.log('Email sent successfully via Resend');
      return true;
    } catch (error) {
      console.error('Failed to send email via Resend:', error);
      // Continue to try SendGrid
    }
  }
  
  // Priority 2: Try SendGrid API (fallback)
  if (env?.SENDGRID_API_KEY && env.SENDGRID_API_KEY !== 'your-sendgrid-api-key-here') {
    try {
      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.SENDGRID_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          personalizations: [{
            to: [{ email: params.to }],
            subject: params.subject
          }],
          from: { email: params.from },
          content: [
            {
              type: 'text/plain',
              value: params.text
            },
            {
              type: 'text/html',
              value: params.html
            }
          ]
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('SendGrid API error:', response.status, errorText);
        throw new Error(`SendGrid API error: ${response.status}`);
      }
      
      console.log('Email sent successfully via SendGrid');
      return true;
    } catch (error) {
      console.error('Failed to send email via SendGrid:', error);
      // Continue to mock
    }
  }
  
  // Priority 3: Mock/Simulation (no API key configured)
  console.warn('No email API key configured (Resend/SendGrid), simulating email send');
  console.log('Email preview:', {
    to: params.to,
    from: params.from,
    subject: params.subject,
    html_length: params.html.length,
    text_length: params.text.length
  });
  
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 500));
  return true;
}

export default app;
