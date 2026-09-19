import { db, auditLogsTable } from '@workspace/db';

export async function logAuditEvent(params: {
  decisionId: number;
  eventType: string;
  actor?: string;
  metadata?: Record<string, any>;
}): Promise<void> {
  try {
    await db.insert(auditLogsTable).values({
      decisionId: params.decisionId,
      eventType: params.eventType,
      actor: params.actor || 'system',
      metadata: params.metadata || {},
    });
  } catch (err) {
    console.error('Failed to write audit log:', err);
  }
}
