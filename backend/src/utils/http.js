export class ApiError extends Error {
  constructor(status, message, extra = null) {
    super(message);
    this.status = status;
    this.extra = extra;
  }
}

export function asyncHandler(handler) {
  return async (req, res, next) => {
    try {
      await handler(req, res, next);
    } catch (error) {
      next(error);
    }
  };
}

export function parseDateRange(from, to) {
  const where = [];
  const params = [];

  if (from) {
    where.push("b.bill_datetime >= ?");
    params.push(`${from} 00:00:00`);
  }
  if (to) {
    where.push("b.bill_datetime <= ?");
    params.push(`${to} 23:59:59`);
  }
  return {
    clause: where.length ? ` AND ${where.join(" AND ")}` : "",
    params
  };
}
