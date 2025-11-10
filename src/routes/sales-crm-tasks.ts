import { Hono } from 'hono';
import type { Bindings, Variables } from '../types';
import { authMiddleware } from '../middleware/auth';

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// Apply authentication middleware
app.use('*', authMiddleware);

/**
 * PUT /api/sales-crm/tasks/:id/complete
 * タスク（案件のnext_action）を完了してクリア
 */
app.put('/:id/complete', async (c) => {
  try {
    const { DB } = c.env;
    const dealId = parseInt(c.req.param('id'));
    const user = c.get('user');

    // 案件を取得
    const deal = await DB.prepare(`
      SELECT * FROM deals WHERE id = ?
    `).bind(dealId).first();

    if (!deal) {
      return c.json({ success: false, error: 'Deal not found' }, 404);
    }

    // next_action_dateとnext_action_descriptionをクリア
    await DB.prepare(`
      UPDATE deals
      SET 
        next_action_date = NULL,
        next_action_description = NULL,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(dealId).run();

    return c.json({
      success: true,
      message: 'Task completed and cleared'
    });

  } catch (error: any) {
    console.error('Task completion failed:', error);
    return c.json({
      success: false,
      error: error.message
    }, 500);
  }
});

/**
 * PUT /api/sales-crm/tasks/:id/update
 * タスク（案件のnext_action）を更新
 */
app.put('/:id/update', async (c) => {
  try {
    const { DB } = c.env;
    const dealId = parseInt(c.req.param('id'));
    const { next_action_date, next_action_description } = await c.req.json();

    // 案件を取得
    const deal = await DB.prepare(`
      SELECT * FROM deals WHERE id = ?
    `).bind(dealId).first();

    if (!deal) {
      return c.json({ success: false, error: 'Deal not found' }, 404);
    }

    // next_actionを更新
    await DB.prepare(`
      UPDATE deals
      SET 
        next_action_date = ?,
        next_action_description = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(next_action_date, next_action_description, dealId).run();

    return c.json({
      success: true,
      message: 'Task updated successfully'
    });

  } catch (error: any) {
    console.error('Task update failed:', error);
    return c.json({
      success: false,
      error: error.message
    }, 500);
  }
});

/**
 * PUT /api/sales-crm/tasks/:id/stage
 * 案件のステージを変更
 */
app.put('/:id/stage', async (c) => {
  try {
    const { DB } = c.env;
    const dealId = parseInt(c.req.param('id'));
    const { stage, change_reason } = await c.req.json();
    const user = c.get('user');

    // 現在の案件情報を取得
    const deal = await DB.prepare(`
      SELECT * FROM deals WHERE id = ?
    `).bind(dealId).first();

    if (!deal) {
      return c.json({ success: false, error: 'Deal not found' }, 404);
    }

    const fromStage = (deal as any).stage;

    // ステージを更新
    await DB.prepare(`
      UPDATE deals
      SET 
        stage = ?,
        days_in_current_stage = 0,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(stage, dealId).run();

    // ステージ履歴を記録
    const daysInPreviousStage = (deal as any).days_in_current_stage || 0;
    await DB.prepare(`
      INSERT INTO deal_stage_history (
        deal_id, from_stage, to_stage, changed_by, change_reason, days_in_previous_stage
      ) VALUES (?, ?, ?, ?, ?, ?)
    `).bind(dealId, fromStage, stage, user?.id || 1, change_reason || '', daysInPreviousStage).run();

    return c.json({
      success: true,
      message: 'Stage updated successfully',
      from_stage: fromStage,
      to_stage: stage
    });

  } catch (error: any) {
    console.error('Stage update failed:', error);
    return c.json({
      success: false,
      error: error.message
    }, 500);
  }
});

export default app;
