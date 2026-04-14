CREATE DATABASE IF NOT EXISTS warehouse_app CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE warehouse_app;

CREATE TABLE IF NOT EXISTS warehouses (
  warehouse_id INT AUTO_INCREMENT PRIMARY KEY,
  warehouse_code VARCHAR(30) NOT NULL UNIQUE,
  warehouse_name VARCHAR(120) NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS teams (
  team_id INT AUTO_INCREMENT PRIMARY KEY,
  team_code VARCHAR(30) NOT NULL UNIQUE,
  team_name VARCHAR(150) NOT NULL,
  team_leader VARCHAR(120) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS users (
  user_id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(60) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  display_name VARCHAR(120) NOT NULL,
  role ENUM('ADMIN', 'STOREKEEPER', 'VIEWER') NOT NULL DEFAULT 'VIEWER',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS products (
  product_id INT AUTO_INCREMENT PRIMARY KEY,
  product_code_wlma VARCHAR(60) NOT NULL UNIQUE,
  product_name VARCHAR(255) NOT NULL,
  unit VARCHAR(30) NOT NULL,
  reorder_level DECIMAL(14,2) NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_products_name (product_name),
  INDEX idx_products_code (product_code_wlma)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS product_stocks (
  warehouse_id INT NOT NULL,
  product_id INT NOT NULL,
  qty_on_hand DECIMAL(14,2) NOT NULL DEFAULT 0,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (warehouse_id, product_id),
  CONSTRAINT fk_product_stocks_warehouse
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(warehouse_id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_product_stocks_product
    FOREIGN KEY (product_id) REFERENCES products(product_id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS bills (
  bill_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  bill_no VARCHAR(40) NOT NULL UNIQUE,
  bill_datetime DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  warehouse_id INT NOT NULL,
  team_id INT NULL,
  bill_type ENUM('ISSUE_TO_TEAM', 'RETURN_FROM_TEAM', 'RETURN_FROM_WLMA') NOT NULL,
  sender_name VARCHAR(150) NOT NULL,
  receiver_name VARCHAR(150) NOT NULL,
  status ENUM('DRAFT', 'CONFIRMED', 'CANCELLED') NOT NULL DEFAULT 'DRAFT',
  remarks TEXT NULL,
  created_by INT NOT NULL,
  confirmed_by INT NULL,
  cancelled_by INT NULL,
  cancelled_reason TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_bills_warehouse
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(warehouse_id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_bills_team
    FOREIGN KEY (team_id) REFERENCES teams(team_id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_bills_created_by
    FOREIGN KEY (created_by) REFERENCES users(user_id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_bills_confirmed_by
    FOREIGN KEY (confirmed_by) REFERENCES users(user_id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_bills_cancelled_by
    FOREIGN KEY (cancelled_by) REFERENCES users(user_id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  INDEX idx_bills_datetime (bill_datetime),
  INDEX idx_bills_status (status),
  INDEX idx_bills_warehouse_datetime (warehouse_id, bill_datetime),
  INDEX idx_bills_warehouse_status_datetime (warehouse_id, status, bill_datetime),
  INDEX idx_bills_team_datetime (team_id, bill_datetime),
  INDEX idx_bills_team_status_type_datetime (team_id, status, bill_type, bill_datetime),
  INDEX idx_bills_type_datetime (bill_type, bill_datetime)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS bill_items (
  bill_item_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  bill_id BIGINT NOT NULL,
  product_id INT NOT NULL,
  qty DECIMAL(14,2) NOT NULL,
  CONSTRAINT fk_bill_items_bill
    FOREIGN KEY (bill_id) REFERENCES bills(bill_id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_bill_items_product
    FOREIGN KEY (product_id) REFERENCES products(product_id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT uq_bill_items_bill_product UNIQUE (bill_id, product_id),
  INDEX idx_bill_items_product (product_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS stock_movements (
  movement_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  movement_datetime DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  bill_id BIGINT NOT NULL,
  bill_item_id BIGINT NULL,
  warehouse_id INT NOT NULL,
  team_id INT NULL,
  product_id INT NOT NULL,
  movement_type ENUM('IN', 'OUT') NOT NULL,
  qty DECIMAL(14,2) NOT NULL,
  balance_after DECIMAL(14,2) NOT NULL,
  created_by INT NOT NULL,
  CONSTRAINT fk_stock_movements_bill
    FOREIGN KEY (bill_id) REFERENCES bills(bill_id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_stock_movements_bill_item
    FOREIGN KEY (bill_item_id) REFERENCES bill_items(bill_item_id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_stock_movements_warehouse
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(warehouse_id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_stock_movements_team
    FOREIGN KEY (team_id) REFERENCES teams(team_id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_stock_movements_product
    FOREIGN KEY (product_id) REFERENCES products(product_id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_stock_movements_created_by
    FOREIGN KEY (created_by) REFERENCES users(user_id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  INDEX idx_movements_datetime (movement_datetime),
  INDEX idx_movements_team_datetime (team_id, movement_datetime),
  INDEX idx_movements_product_datetime (product_id, movement_datetime),
  INDEX idx_movements_wh_product_datetime (warehouse_id, product_id, movement_datetime, movement_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS audit_logs (
  audit_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  action VARCHAR(80) NOT NULL,
  entity VARCHAR(80) NOT NULL,
  entity_id VARCHAR(80) NOT NULL,
  detail_json JSON NULL,
  user_id INT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_audit_logs_user
    FOREIGN KEY (user_id) REFERENCES users(user_id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  INDEX idx_audit_created_at (created_at),
  INDEX idx_audit_entity (entity, entity_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS reconcile_runs (
  reconcile_run_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  file_name VARCHAR(255) NOT NULL,
  started_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  finished_at DATETIME NULL,
  created_by INT NOT NULL,
  total_rows INT NOT NULL DEFAULT 0,
  CONSTRAINT fk_reconcile_runs_created_by
    FOREIGN KEY (created_by) REFERENCES users(user_id)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS reconcile_rows (
  reconcile_row_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  reconcile_run_id BIGINT NOT NULL,
  team_code VARCHAR(40) NOT NULL,
  product_code_wlma VARCHAR(60) NOT NULL,
  product_name VARCHAR(255) NOT NULL,
  excel_qty DECIMAL(14,2) NOT NULL DEFAULT 0,
  app_qty DECIMAL(14,2) NOT NULL DEFAULT 0,
  diff_qty DECIMAL(14,2) NOT NULL DEFAULT 0,
  note VARCHAR(120) NOT NULL,
  CONSTRAINT fk_reconcile_rows_run
    FOREIGN KEY (reconcile_run_id) REFERENCES reconcile_runs(reconcile_run_id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  INDEX idx_reconcile_rows_team_product (team_code, product_code_wlma)
) ENGINE=InnoDB;
