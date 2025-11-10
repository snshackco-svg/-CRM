import { Hono } from 'hono'
import type { Bindings, Variables } from '../types'
import { authMiddleware } from '../middleware/auth'

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>()

// Apply authentication middleware to all routes
app.use('/*', authMiddleware)

// Get all Notta analyses for current user
app.get('/', async (c) => {
  try {
    const userId = c.get('user')?.id
    const { DB } = c.env

    // Get meetings with notta_url and their AI summaries
    const { results } = await DB.prepare(`
      SELECT 
        m.id as meeting_id,
        m.prospect_id,
        m.notta_url,
        m.ai_summary,
        m.meeting_date,
        m.created_at,
        m.updated_at,
        p.company_name,
        p.contact_name
      FROM meetings m
      JOIN prospects p ON m.prospect_id = p.id
      WHERE p.sales_id = ? AND m.notta_url IS NOT NULL
      ORDER BY m.meeting_date DESC
    `).bind(userId).all()

    // Format results
    const analyses = results.map((row: any) => ({
      meeting_id: row.meeting_id,
      prospect_id: row.prospect_id,
      notta_link: row.notta_url,
      analysis_result: row.ai_summary,
      analyzed_at: row.updated_at,
      meeting_date: row.meeting_date,
      company_name: row.company_name,
      contact_name: row.contact_name
    }))

    return c.json({ 
      success: true, 
      analyses 
    })
  } catch (error: any) {
    console.error('Error loading Notta analyses:', error)
    return c.json({ 
      success: false, 
      error: error.message 
    }, 500)
  }
})

export default app
