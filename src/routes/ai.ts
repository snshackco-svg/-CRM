import { Hono } from 'hono';
import type { Bindings, Variables } from '../types';
import { authMiddleware } from '../middleware/auth';
import OpenAI from 'openai';

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// Apply authentication middleware to all routes
app.use('/*', authMiddleware);

// Generate talk script for meeting preparation
app.post('/generate-talk-script', async (c) => {
  try {
    const { prospect_id, is_first_meeting } = await c.req.json();
    const { DB } = c.env;

    // Get prospect information
    const prospect: any = await DB.prepare(`
      SELECT p.*, 
        (SELECT COUNT(*) FROM meetings WHERE prospect_id = p.id) as meeting_count
      FROM prospects p 
      WHERE p.id = ?
    `).bind(prospect_id).first();

    if (!prospect) {
      return c.json({ success: false, error: 'Prospect not found' }, 404);
    }

    // Parse JSON fields
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

    // Prepare context for AI
    const context = {
      company_name: prospect.company_name,
      industry: prospect.industry,
      company_size: prospect.company_size,
      contact_name: prospect.contact_name,
      contact_position: prospect.contact_position,
      status: prospect.status,
      estimated_value: prospect.estimated_value,
      is_first_meeting,
      meeting_count: prospect.meeting_count,
      has_research: !!aiResearch || !!deepResearch,
      key_insights: aiResearch?.key_insights || deepResearch?.strategic_proposal || null
    };

    // Generate talk script using OpenAI
    const talkScript = await generateTalkScriptWithAI(context, c.env);

    return c.json({
      success: true,
      talk_script: talkScript
    });
  } catch (error: any) {
    console.error('Error generating talk script:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Generate follow-up plan after meeting
app.post('/generate-followup-plan', async (c) => {
  try {
    const { meeting_id } = await c.req.json();
    const { DB } = c.env;

    // Get meeting and prospect information
    const meeting: any = await DB.prepare(`
      SELECT m.*, p.company_name, p.contact_name, p.status, p.industry
      FROM meetings m
      JOIN prospects p ON m.prospect_id = p.id
      WHERE m.id = ?
    `).bind(meeting_id).first();

    if (!meeting) {
      return c.json({ success: false, error: 'Meeting not found' }, 404);
    }

    // Parse ai_summary if exists
    let aiSummary = null;
    if (meeting.ai_summary) {
      try {
        aiSummary = JSON.parse(meeting.ai_summary);
      } catch (e) {
        console.error('Failed to parse ai_summary:', e);
      }
    }

    // Prepare context for AI
    const context = {
      company_name: meeting.company_name,
      meeting_type: meeting.meeting_type,
      meeting_date: meeting.meeting_date,
      meeting_outcome: meeting.meeting_outcome,
      agenda: meeting.agenda,
      minutes: meeting.minutes,
      next_actions: meeting.next_actions,
      ai_summary: aiSummary,
      prospect_status: meeting.status
    };

    // Generate follow-up plan using OpenAI
    const followUpPlan = await generateFollowUpPlanWithAI(context, c.env);

    return c.json({
      success: true,
      followup_plan: followUpPlan
    });
  } catch (error: any) {
    console.error('Error generating follow-up plan:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Generate AI research for prospect
app.post('/generate-research', async (c) => {
  try {
    const { prospect_id, research_type } = await c.req.json();
    const { DB } = c.env;

    // Get prospect information
    const prospect: any = await DB.prepare(`
      SELECT * FROM prospects WHERE id = ?
    `).bind(prospect_id).first();

    if (!prospect) {
      return c.json({ success: false, error: 'Prospect not found' }, 404);
    }

    // Prepare context for AI
    const context = {
      company_name: prospect.company_name,
      company_url: prospect.company_url,
      industry: prospect.industry,
      company_size: prospect.company_size,
      contact_name: prospect.contact_name,
      contact_position: prospect.contact_position,
      research_type // 'basic' or 'deep'
    };

    // Generate research using OpenAI
    const research = await generateResearchWithAI(context, c.env);

    return c.json({
      success: true,
      research
    });
  } catch (error: any) {
    console.error('Error generating research:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// OpenAI API functions
async function generateTalkScriptWithAI(context: any, env: Bindings): Promise<any> {
  const isFirstMeeting = context.is_first_meeting;
  
  // Check if OpenAI API key is configured
  if (!env.OPENAI_API_KEY || env.OPENAI_API_KEY === 'your-openai-api-key-here') {
    console.warn('OpenAI API key not configured, using fallback mock data');
    return generateMockTalkScript(context);
  }
  
  try {
    const openai = new OpenAI({
      apiKey: env.OPENAI_API_KEY
    });
    
    const prompt = `あなたは経験豊富な営業コンサルタントです。以下の企業情報をもとに、効果的な商談トークスクリプトを作成してください。

【企業情報】
- 企業名: ${context.company_name}
- 業界: ${context.industry || '不明'}
- 企業規模: ${context.company_size || '不明'}
- 担当者: ${context.contact_name} (${context.contact_position || '役職不明'})
- 予算感: ${context.estimated_value ? `${(context.estimated_value / 10000).toFixed(0)}万円` : '未定'}
- 商談タイプ: ${isFirstMeeting ? '初回アポイント' : 'フォローアップ商談'}
- 過去の商談回数: ${context.meeting_count}回
${context.key_insights ? `- 事前リサーチ情報: ${context.key_insights}` : ''}

【要件】
1. ${isFirstMeeting ? '初回商談' : 'フォローアップ商談'}に適した4つのフェーズに分けてください
2. 各フェーズには具体的なトークスクリプトを3-4個含めてください
3. 企業情報を活かした個別化されたスクリプトにしてください
4. 自然で親しみやすい日本語を使ってください

JSONフォーマットで回答してください：
{
  "phases": [
    {
      "phase": "フェーズ名（所要時間）",
      "scripts": ["スクリプト1", "スクリプト2", ...]
    }
  ]
}`;

    const response = await openai.chat.completions.create({
      model: env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: '営業トークスクリプトを生成する経験豊富なコンサルタントとして回答してください。JSONフォーマットで出力してください。' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' }
    });
    
    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }
    
    return JSON.parse(content);
  } catch (error) {
    console.error('OpenAI API error, falling back to mock data:', error);
    return generateMockTalkScript(context);
  }
}

// Fallback mock function
function generateMockTalkScript(context: any): any {
  const isFirstMeeting = context.is_first_meeting;
  
  if (isFirstMeeting) {
    return {
      phases: [
        {
          phase: "1. アイスブレイク（5分）",
          scripts: [
            `本日はお時間をいただきありがとうございます。${context.contact_name}様、${context.company_name}様のことをもっと知りたいと思っております。`,
            `最近、${context.industry}業界では○○というトレンドが見られますが、御社ではどのように感じていらっしゃいますか？`,
            "まずは軽く自己紹介から始めさせていただいてもよろしいでしょうか？"
          ]
        },
        {
          phase: "2. ヒアリング（15分）",
          scripts: [
            "現在、事業運営で最も課題と感じられていることは何でしょうか？",
            "その課題によって、具体的にどのような影響が出ていますか？",
            "理想的な状態があるとしたら、それはどのようなものでしょうか？",
            "これまでに何か対策は試されましたか？その結果はいかがでしたか？"
          ]
        },
        {
          phase: "3. 提案の方向性（10分）",
          scripts: [
            "お話を伺った限りでは、○○という課題が特に重要そうですね。",
            "私どものサービスは、まさにそのような課題解決に特化しております。",
            "具体的には、△△という機能で××を実現できます。",
            `${context.estimated_value ? `予算感としては${(context.estimated_value / 10000).toFixed(0)}万円程度` : '予算'}についてはいかがお考えでしょうか？`
          ]
        },
        {
          phase: "4. クロージング（5分）",
          scripts: [
            "本日のお話を踏まえて、具体的な提案資料を作成させていただきます。",
            "次回は○○についてより詳しくお話しできればと思いますが、いかがでしょうか？",
            "1〜2週間後にもう一度お時間をいただけますでしょうか？",
            "本日は貴重なお時間をありがとうございました。"
          ]
        }
      ]
    };
  } else {
    return {
      phases: [
        {
          phase: "1. 前回の振り返り（5分）",
          scripts: [
            "前回お話しした内容について、その後社内でご検討いただけましたでしょうか？",
            "前回の提案について、何かご質問やご懸念点はございましたか？",
            `${context.company_name}様の中で、特に関心を持たれた部分はどこでしょうか？`
          ]
        },
        {
          phase: "2. 深掘りヒアリング（15分）",
          scripts: [
            "前回お伺いした課題について、もう少し詳しく教えていただけますか？",
            "現場の方々の反応や、実際の業務フローはどうなっていますか？",
            "導入する場合、どのような体制で進めることになりそうでしょうか？",
            "決裁までのプロセスについて教えていただけますか？"
          ]
        },
        {
          phase: "3. 詳細提案（15分）",
          scripts: [
            "前回のフィードバックを踏まえて、より具体的な提案を用意いたしました。",
            "導入ステップとしては、Phase1で○○、Phase2で△△を想定しています。",
            "ROIとしては、○ヶ月で××という効果が期待できます。",
            "サポート体制についてもご説明させていただきます。"
          ]
        },
        {
          phase: "4. 合意形成（10分）",
          scripts: [
            "今回の提案内容について、どのようにお感じになられましたか？",
            "進めるにあたって、何かクリアすべき課題はございますか？",
            "次のステップとして、○○を進めさせていただいてもよろしいでしょうか？",
            "スケジュール感としては、いつ頃を想定されていますか？"
          ]
        }
      ]
    };
  }
}

async function generateFollowUpPlanWithAI(context: any, env: Bindings): Promise<any> {
  // Check if OpenAI API key is configured
  if (!env.OPENAI_API_KEY || env.OPENAI_API_KEY === 'your-openai-api-key-here') {
    console.warn('OpenAI API key not configured, using fallback mock data');
    return generateMockFollowUpPlan(context);
  }
  
  try {
    const openai = new OpenAI({
      apiKey: env.OPENAI_API_KEY
    });
    
    const prompt = `あなたは営業プロセスのエキスパートです。以下の商談情報をもとに、効果的なフォローアップ計画を作成してください。

【商談情報】
- 企業名: ${context.company_name}
- 商談タイプ: ${context.meeting_type}
- 商談日: ${context.meeting_date}
- 商談結果: ${context.meeting_outcome || '記録なし'}
- 議題: ${context.agenda || '記録なし'}
- 議事録: ${context.minutes || '記録なし'}
${context.ai_summary ? `- AI要約: ${JSON.stringify(context.ai_summary)}` : ''}

【要件】
1. immediate_actions: 24-48時間以内に行うべき即時アクション（3-4個）
2. follow_up_actions: 今後1-2週間で行うフォローアップアクション（3-4個）
3. next_meeting_recommendation: 次回商談の推奨タイミングと議題
4. notes: その他の重要な注意事項

各アクションには以下を含めてください：
- task: 具体的なタスク内容
- priority: high/medium/low
- deadline: 期限（「24時間以内」「3日以内」など）
- status: pending（固定）

JSONフォーマットで回答してください。`;

    const response = await openai.chat.completions.create({
      model: env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'フォローアップ計画を作成する営業プロセスのエキスパートとして回答してください。JSONフォーマットで出力してください。' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' }
    });
    
    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }
    
    return JSON.parse(content);
  } catch (error) {
    console.error('OpenAI API error, falling back to mock data:', error);
    return generateMockFollowUpPlan(context);
  }
}

// Fallback mock function
function generateMockFollowUpPlan(context: any): any {
  
  const nextMeetingDate = new Date();
  nextMeetingDate.setDate(nextMeetingDate.getDate() + 7);
  
  return {
    immediate_actions: [
      {
        task: "商談議事録の作成と共有",
        priority: "high",
        deadline: "本日中",
        status: "pending"
      },
      {
        task: "お礼メールの送信",
        priority: "high",
        deadline: "24時間以内",
        status: "pending"
      },
      {
        task: `${context.company_name}様向けカスタマイズ提案資料の作成`,
        priority: "high",
        deadline: "3日以内",
        status: "pending"
      }
    ],
    follow_up_actions: [
      {
        task: "社内での検討状況フォローアップ",
        priority: "medium",
        deadline: "3日後",
        status: "pending"
      },
      {
        task: "追加質問への回答準備",
        priority: "medium",
        deadline: "1週間以内",
        status: "pending"
      },
      {
        task: "次回商談の日程調整",
        priority: "high",
        deadline: "5日以内",
        status: "pending"
      }
    ],
    next_meeting_recommendation: {
      timing: nextMeetingDate.toISOString().split('T')[0],
      agenda: [
        "前回提案内容への質疑応答",
        "詳細な導入計画の提示",
        "ROI試算の共有",
        "次のステップの合意"
      ],
      preparation: [
        "カスタマイズ提案資料の準備",
        "導入事例の選定",
        "見積書の作成",
        "契約書類の準備"
      ]
    },
    notes: [
      `${context.meeting_outcome || '商談結果'}を踏まえた対応が必要`,
      "決裁者への報告も視野に入れる",
      "競合の動きにも注意を払う"
    ]
  };
}

async function generateResearchWithAI(context: any, env: Bindings): Promise<any> {
  // Check if Perplexity API key is configured
  if (!env.PERPLEXITY_API_KEY || env.PERPLEXITY_API_KEY === 'your-perplexity-api-key-here') {
    console.warn('Perplexity API key not configured, using fallback mock data');
    return generateMockResearch(context);
  }
  
  try {
    const isDeep = context.research_type === 'deep';
    
    // Create search query for Perplexity to find real information
    const searchQuery = `企業名: ${context.company_name}${context.company_url ? ` (${context.company_url})` : ''}。
業界: ${context.industry || '不明'}、企業規模: ${context.company_size || '不明'}。
この企業について、最新の情報を調べて、${isDeep ? '包括的な' : '基本的な'}企業リサーチレポートを作成してください。`;
    
    const prompt = `あなたは企業リサーチの専門家です。Web検索で得た最新の情報をもとに、${isDeep ? '包括的な' : '基本的な'}企業リサーチレポートを作成してください。

【企業情報】
- 企業名: ${context.company_name}
- 企業URL: ${context.company_url || 'なし'}
- 業界: ${context.industry || '不明'}
- 企業規模: ${context.company_size || '不明'}
- 担当者: ${context.contact_name} (${context.contact_position || '役職不明'})

【要件 - ${isDeep ? 'Deepリサーチ' : '基本リサーチ'}】
${isDeep ? `
1. company_overview: 企業概要（事業内容、ビジネスモデル）
2. business_model: 収益モデルと主要サービス
3. key_insights: 重要な洞察（3-5項目の配列）
4. decision_makers: 意思決定者情報（配列）
5. approach_strategy: アプローチ戦略
6. financial_analysis: 財務分析（売上、利益率、成長性）
7. competitor_analysis: 競合分析（主要競合3社と当社の優位性）
8. market_trends: 市場動向と業界トレンド
9. swot_analysis: SWOT分析（Strength、Weakness、Opportunity、Threat各項目を配列で）
10. strategic_proposal: 戦略的提案（Phase別の具体的アプローチ）
` : `
1. company_overview: 企業概要
2. business_model: ビジネスモデル
3. key_insights: 重要な洞察（配列）
4. decision_makers: 意思決定者情報（配列）
5. approach_strategy: アプローチ戦略
`}

**重要**: Web検索で得た実際の情報を使用してください。情報が見つからない場合のみ、業界標準や一般的な仮定に基づいて推測してください。
必ずJSONフォーマットで回答してください。`;

    // Call Perplexity API using fetch (standard in Cloudflare Workers)
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.PERPLEXITY_API_KEY}`
      },
      body: JSON.stringify({
        model: 'sonar-pro', // Use sonar-pro for web search + reasoning
        messages: [
          { 
            role: 'system', 
            content: '企業リサーチの専門家として、Web検索で得た最新の実際の情報を使って、詳細で実用的なレポートを作成してください。必ずJSONフォーマットで出力してください。' 
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.2, // Lower temperature for more factual responses
        max_tokens: isDeep ? 4000 : 2000,
        search_domain_filter: ['perplexity.ai'], // Use Perplexity's web search
        return_citations: true, // Get source citations
        return_related_questions: false
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Perplexity API error: ${response.status} ${errorText}`);
    }

    const data: any = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error('No response from Perplexity API');
    }

    // Log citations if available (for debugging)
    if (data.citations && data.citations.length > 0) {
      console.log('Perplexity citations:', data.citations);
    }
    
    // Parse JSON response
    let research;
    try {
      // Try to extract JSON from markdown code blocks if present
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || 
                       content.match(/```\s*([\s\S]*?)\s*```/);
      const jsonContent = jsonMatch ? jsonMatch[1] : content;
      research = JSON.parse(jsonContent);
    } catch (parseError) {
      console.error('Failed to parse Perplexity response as JSON:', content);
      throw new Error('Invalid JSON response from Perplexity API');
    }
    
    return research;
  } catch (error) {
    console.error('Perplexity API error, falling back to mock data:', error);
    return generateMockResearch(context);
  }
}

// Fallback mock function
function generateMockResearch(context: any): any {
  
  const isDeep = context.research_type === 'deep';
  
  const basicResearch = {
    company_overview: `${context.company_name}は、${context.industry}業界で事業を展開する${context.company_size || '中堅'}企業です。`,
    business_model: "主要な事業内容と収益モデルについての分析",
    key_insights: [
      "デジタル化への関心が高い",
      "業務効率化が課題",
      "成長意欲がある"
    ],
    decision_makers: [
      {
        name: context.contact_name || "未確認",
        position: context.contact_position || "担当者",
        influence_level: "medium"
      }
    ],
    approach_strategy: "信頼関係構築を重視し、段階的にアプローチ"
  };
  
  if (isDeep) {
    return {
      ...basicResearch,
      financial_analysis: "財務状況の詳細分析",
      competitor_analysis: "主要競合との比較分析",
      market_trends: "業界トレンドと影響分析",
      swot_analysis: "SWOT分析の結果",
      strategic_proposal: "戦略的アプローチの提案"
    };
  }
  
  return basicResearch;
}

export default app;
