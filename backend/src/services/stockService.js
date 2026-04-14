import { ApiError } from "../utils/http.js";

const BILL_TYPE_TO_DIRECTION = {
  ISSUE_TO_TEAM: "OUT",
  RETURN_FROM_TEAM: "IN",
  RETURN_FROM_WLMA: "IN"
};

function invertDirection(direction) {
  return direction === "IN" ? "OUT" : "IN";
}

async function ensureStockRow(connection, warehouseId, productId) {
  await connection.execute(
    `INSERT INTO product_stocks (warehouse_id, product_id, qty_on_hand)
     VALUES (?, ?, 0)
     ON DUPLICATE KEY UPDATE qty_on_hand = qty_on_hand`,
    [warehouseId, productId]
  );
}

export function getDirectionByBillType(billType, reverse = false) {
  const baseDirection = BILL_TYPE_TO_DIRECTION[billType];
  if (!baseDirection) {
    throw new ApiError(400, `Unsupported bill type: ${billType}`);
  }
  return reverse ? invertDirection(baseDirection) : baseDirection;
}

export async function applyBillStockEffect(connection, options) {
  const {
    bill,
    items,
    actorUserId,
    reverse = false
  } = options;

  const direction = getDirectionByBillType(bill.bill_type, reverse);

  for (const item of items) {
    const qty = Number(item.qty);
    if (!(qty > 0)) {
      throw new ApiError(400, `Invalid qty for product ${item.product_id}`);
    }

    await ensureStockRow(connection, bill.warehouse_id, item.product_id);

    const [stockRows] = await connection.execute(
      `SELECT qty_on_hand
       FROM product_stocks
       WHERE warehouse_id = ? AND product_id = ?
       FOR UPDATE`,
      [bill.warehouse_id, item.product_id]
    );
    const current = Number(stockRows[0]?.qty_on_hand || 0);

    let nextQty = current;
    if (direction === "OUT") {
      if (current < qty) {
        throw new ApiError(
          400,
          `Insufficient stock for product_id ${item.product_id}. On hand ${current}, requested ${qty}`
        );
      }
      nextQty = current - qty;
    } else {
      nextQty = current + qty;
    }

    await connection.execute(
      `UPDATE product_stocks
       SET qty_on_hand = ?
       WHERE warehouse_id = ? AND product_id = ?`,
      [nextQty, bill.warehouse_id, item.product_id]
    );

    await connection.execute(
      `INSERT INTO stock_movements
       (movement_datetime, bill_id, bill_item_id, warehouse_id, team_id, product_id, movement_type, qty, balance_after, created_by)
       VALUES (NOW(), ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        bill.bill_id,
        item.bill_item_id || null,
        bill.warehouse_id,
        bill.team_id || null,
        item.product_id,
        direction,
        qty,
        nextQty,
        actorUserId
      ]
    );
  }
}
