export async function insertAudit(connection, payload) {
  const {
    userId = null,
    action,
    entity,
    entityId,
    detail = null
  } = payload;

  await connection.execute(
    `INSERT INTO audit_logs (action, entity, entity_id, detail_json, user_id)
     VALUES (?, ?, ?, ?, ?)`,
    [
      action,
      entity,
      String(entityId),
      detail ? JSON.stringify(detail) : null,
      userId
    ]
  );
}
