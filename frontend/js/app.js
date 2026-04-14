
const API_BASE = "/api";
const TOKEN_KEY = "warehouse_api_token";
const USER_KEY = "warehouse_api_user";
const WAREHOUSE_KEY = "warehouse_warehouse_id";
const BILLS_SPLIT_KEY = "warehouse_bills_split_percent";
const WORKUNITS_SPLIT_KEY = "warehouse_workunits_split_percent";
const SIDEBAR_COLLAPSED_KEY = "warehouse_sidebar_collapsed";

function safeGetItem(key) {
  try {
    return localStorage.getItem(key);
  } catch (_error) {
    return null;
  }
}

function safeSetItem(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch (_error) {
    // Ignore storage failures to avoid breaking login flow.
  }
}

function safeRemoveItem(key) {
  try {
    localStorage.removeItem(key);
  } catch (_error) {
    // Ignore storage failures to avoid breaking logout flow.
  }
}

const numberFormatter = new Intl.NumberFormat("th-TH", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2
});
const dateFormatter = new Intl.DateTimeFormat("th-TH", {
  dateStyle: "medium",
  timeStyle: "short"
});
const dateOnlyFormatter = new Intl.DateTimeFormat("th-TH", {
  dateStyle: "medium"
});

const billTypeLabel = {
  ISSUE_TO_TEAM: "เบิกสินค้าให้กองงาน",
  RETURN_FROM_TEAM: "คืนสินค้าจากกองงาน",
  RETURN_FROM_WLMA: "คืนสินค้าจาก WLMA"
};

const elements = {
  authScreen: document.getElementById("authScreen"),
  appShell: document.getElementById("appShell"),
  loginForm: document.getElementById("loginForm"),
  loginUsername: document.getElementById("loginUsername"),
  loginPassword: document.getElementById("loginPassword"),
  loginNotice: document.getElementById("loginNotice"),
  sidebarRole: document.getElementById("sidebarRole"),
  topUser: document.getElementById("topUser"),
  topTime: document.getElementById("topTime"),
  viewTitle: document.getElementById("viewTitle"),
  navButtons: Array.from(document.querySelectorAll(".app-nav .nav-link")),
  pageSections: Array.from(document.querySelectorAll(".page-section")),
  appNotice: document.getElementById("appNotice"),
  logoutBtn: document.getElementById("logoutBtn"),
  sidebarToggleBtn: document.getElementById("sidebarToggleBtn"),
  warehouseSelect: document.getElementById("warehouseSelect"),
  refreshAllBtn: document.getElementById("refreshAllBtn"),

  kpiConfirmed1d: document.getElementById("kpiConfirmed1d"),
  kpiConfirmed7d: document.getElementById("kpiConfirmed7d"),
  kpiConfirmed30d: document.getElementById("kpiConfirmed30d"),
  dashboardLowStock: document.getElementById("dashboardLowStock"),
  dashboardRecentBillsBody: document.getElementById("dashboardRecentBillsBody"),
  goProductsBtn: document.getElementById("goProductsBtn"),

  productSearchInput: document.getElementById("productSearchInput"),
  productStatusFilter: document.getElementById("productStatusFilter"),
  productSortSelect: document.getElementById("productSortSelect"),
  productPageSizeSelect: document.getElementById("productPageSizeSelect"),
  productAsOfDateInput: document.getElementById("productAsOfDateInput"),
  productAsOfClearBtn: document.getElementById("productAsOfClearBtn"),
  productClearFiltersBtn: document.getElementById("productClearFiltersBtn"),
  productListMeta: document.getElementById("productListMeta"),
  productListPager: document.getElementById("productListPager"),
  productAsOfHint: document.getElementById("productAsOfHint"),
  productTableBody: document.getElementById("productTableBody"),
  openProductModalBtn: document.getElementById("openProductModalBtn"),
  productModalTitle: document.getElementById("productModalTitle"),
  productForm: document.getElementById("productForm"),
  productFormId: document.getElementById("productFormId"),
  productCodeInput: document.getElementById("productCodeInput"),
  productNameInput: document.getElementById("productNameInput"),
  productUnitInput: document.getElementById("productUnitInput"),
  productMinInput: document.getElementById("productMinInput"),
  adjustStockForm: document.getElementById("adjustStockForm"),
  adjustStockProductIdInput: document.getElementById("adjustStockProductIdInput"),
  adjustStockProductLabelInput: document.getElementById("adjustStockProductLabelInput"),
  adjustStockDirectionSelect: document.getElementById("adjustStockDirectionSelect"),
  adjustStockQtyInput: document.getElementById("adjustStockQtyInput"),
  adjustStockRecorderInput: document.getElementById("adjustStockRecorderInput"),
  adjustStockRemarkInput: document.getElementById("adjustStockRemarkInput"),

  workUnitTableBody: document.getElementById("workUnitTableBody"),
  openWorkUnitModalBtn: document.getElementById("openWorkUnitModalBtn"),
  workUnitModalTitle: document.getElementById("workUnitModalTitle"),
  workUnitForm: document.getElementById("workUnitForm"),
  workUnitFormId: document.getElementById("workUnitFormId"),
  workUnitCodeInput: document.getElementById("workUnitCodeInput"),
  workUnitNameInput: document.getElementById("workUnitNameInput"),
  workUnitLeaderInput: document.getElementById("workUnitLeaderInput"),
  teamIssueTitle: document.getElementById("teamIssueTitle"),
  teamIssueMode: document.getElementById("teamIssueMode"),
  teamIssueFrom: document.getElementById("teamIssueFrom"),
  teamIssueTo: document.getElementById("teamIssueTo"),
  teamIssueFilterBtn: document.getElementById("teamIssueFilterBtn"),
  teamIssueSummaryQtyHead: document.getElementById("teamIssueSummaryQtyHead"),
  teamIssueSummaryBody: document.getElementById("teamIssueSummaryBody"),
  teamIssueDetailBody: document.getElementById("teamIssueDetailBody"),
  workunitsLayout: document.querySelector(".workunits-layout"),
  workunitsSplitter: document.getElementById("workunitsSplitter"),

  billForm: document.getElementById("billForm"),
  billTypeSelect: document.getElementById("billTypeSelect"),
  billTeamSearchInput: document.getElementById("billTeamSearchInput"),
  billTeamList: document.getElementById("billTeamList"),
  billTeamIdInput: document.getElementById("billTeamIdInput"),
  billSenderInput: document.getElementById("billSenderInput"),
  billReceiverInput: document.getElementById("billReceiverInput"),
  billCreatedByInput: document.getElementById("billCreatedByInput"),
  billRemarkInput: document.getElementById("billRemarkInput"),
  billItemsWrap: document.getElementById("billItemsWrap"),
  addBillItemBtn: document.getElementById("addBillItemBtn"),
  billStatusFilter: document.getElementById("billStatusFilter"),
  billTypeFilter: document.getElementById("billTypeFilter"),
  billFromInput: document.getElementById("billFromInput"),
  billToInput: document.getElementById("billToInput"),
  billPageSizeSelect: document.getElementById("billPageSizeSelect"),
  billClearFiltersBtn: document.getElementById("billClearFiltersBtn"),
  billListMeta: document.getElementById("billListMeta"),
  billListPager: document.getElementById("billListPager"),
  billTableBody: document.getElementById("billTableBody"),
  billDetailContent: document.getElementById("billDetailContent"),
  billsLayout: document.querySelector(".bills-layout"),
  billsSplitter: document.getElementById("billsSplitter"),

  excelFileInput: document.getElementById("excelFileInput"),
  reconcileModeSelect: document.getElementById("reconcileModeSelect"),
  reconcileDescription: document.getElementById("reconcileDescription"),
  reconcileFromInput: document.getElementById("reconcileFromInput"),
  reconcileToInput: document.getElementById("reconcileToInput"),
  runReconcileBtn: document.getElementById("runReconcileBtn"),
  exportSourceExcelBtn: document.getElementById("exportSourceExcelBtn"),
  exportDatasetExcelBtn: document.getElementById("exportDatasetExcelBtn"),
  exportReconExcelBtn: document.getElementById("exportReconExcelBtn"),
  reconcileTableHead: document.getElementById("reconcileTableHead"),
  reconcileProgressWrap: document.getElementById("reconcileProgressWrap"),
  reconcileProgressText: document.getElementById("reconcileProgressText"),
  reconcileProgressPercent: document.getElementById("reconcileProgressPercent"),
  reconcileProgressBar: document.getElementById("reconcileProgressBar"),
  reconcileMeta: document.getElementById("reconcileMeta"),
  reconcileTableBody: document.getElementById("reconcileTableBody"),

  userForm: document.getElementById("userForm"),
  newUsernameInput: document.getElementById("newUsernameInput"),
  newDisplayNameInput: document.getElementById("newDisplayNameInput"),
  newPasswordInput: document.getElementById("newPasswordInput"),
  newRoleInput: document.getElementById("newRoleInput"),
  userTableBody: document.getElementById("userTableBody"),

  auditTableBody: document.getElementById("auditTableBody")
};

function createSafeModal(elementId) {
  const element = document.getElementById(elementId);
  if (!element) {
    return {
      show() {},
      hide() {}
    };
  }
  if (typeof window.bootstrap === "undefined" || !window.bootstrap.Modal) {
    const backdropSelector = `.modal-backdrop[data-fallback-modal="${elementId}"]`;
    let isOpen = false;

    const hide = () => {
      if (!isOpen) {
        return;
      }
      isOpen = false;
      element.classList.remove("show");
      element.style.display = "none";
      element.setAttribute("aria-hidden", "true");
      element.removeAttribute("aria-modal");
      document.body.classList.remove("modal-open");
      document.querySelectorAll(backdropSelector).forEach((node) => node.remove());
    };

    const show = () => {
      if (isOpen) {
        return;
      }
      isOpen = true;
      element.style.display = "block";
      element.classList.add("show");
      element.removeAttribute("aria-hidden");
      element.setAttribute("aria-modal", "true");
      document.body.classList.add("modal-open");

      const backdrop = document.createElement("div");
      backdrop.className = "modal-backdrop fade show";
      backdrop.setAttribute("data-fallback-modal", elementId);
      document.body.appendChild(backdrop);
    };

    element.querySelectorAll("[data-bs-dismiss='modal'], .btn-close").forEach((btn) => {
      btn.addEventListener("click", hide);
    });
    element.addEventListener("click", (event) => {
      if (event.target === element) {
        hide();
      }
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        hide();
      }
    });

    return {
      show,
      hide
    };
  }
  const instance = new window.bootstrap.Modal(element);
  return {
    show() {
      instance.show();
    },
    hide() {
      instance.hide();
    }
  };
}

const productModal = createSafeModal("productModal");
const workUnitModal = createSafeModal("workUnitModal");
const adjustStockModal = createSafeModal("adjustStockModal");

const state = {
  token: safeGetItem(TOKEN_KEY) || "",
  user: null,
  currentView: "dashboard",
  warehouses: [],
  currentWarehouseId: Number(safeGetItem(WAREHOUSE_KEY) || 0),
  products: [],
  productsRaw: [],
  productListPage: 1,
  productListPageSize: 25,
  productListTotal: 0,
  productListTotalPages: 1,
  billProducts: [],
  billProductsWarehouseId: 0,
  billProductsLoadedAt: 0,
  teams: [],
  teamsLoadedAt: 0,
  selectedTeamId: null,
  bills: [],
  billListPage: 1,
  billListPageSize: 25,
  billListTotal: 0,
  billListTotalPages: 1,
  selectedBillId: null,
  selectedBillDetail: null,
  billDetailRequestSeq: 0,
  billDetailPage: 1,
  billDetailPageSize: 10,
  reconcileMode: "legacy",
  reconcileRows: [],
  reconcileMeta: null,
  users: [],
  audits: [],
  dashboard: null
};

function formatDate(value) {
  if (!value) {
    return "-";
  }
  return dateFormatter.format(new Date(value));
}

function formatNumber(value) {
  return numberFormatter.format(Number(value || 0));
}

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function debounce(callback, wait = 250) {
  let timerId = null;
  return (...args) => {
    if (timerId) {
      clearTimeout(timerId);
    }
    timerId = setTimeout(() => {
      callback(...args);
    }, wait);
  };
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function isDesktopViewport() {
  return window.matchMedia("(min-width: 992px)").matches;
}

function applySidebarCollapsed(collapsed, options = {}) {
  const persist = options.persist !== false;
  const normalized = !!collapsed;
  if (elements.appShell) {
    elements.appShell.classList.toggle("sidebar-collapsed", normalized);
  }
  if (elements.sidebarToggleBtn) {
    const icon = elements.sidebarToggleBtn.querySelector("i");
    if (icon) {
      icon.className = normalized
        ? "bi bi-layout-sidebar-inset-reverse"
        : "bi bi-layout-sidebar-inset";
    }
    elements.sidebarToggleBtn.setAttribute(
      "aria-label",
      normalized ? "ขยายเมนูด้านซ้าย" : "ย่อเมนูด้านซ้าย"
    );
    elements.sidebarToggleBtn.title = normalized ? "ขยายเมนู" : "ย่อเมนู";
  }
  if (persist) {
    safeSetItem(SIDEBAR_COLLAPSED_KEY, normalized ? "1" : "0");
  }
}

function translateSystemMessage(message) {
  const text = String(message || "").trim();
  if (!text) {
    return "เกิดข้อผิดพลาดจากระบบ กรุณาลองใหม่อีกครั้ง";
  }
  if (/[ก-๙]/.test(text)) {
    return text;
  }

  const normalized = text.toLowerCase();
  const exactMap = {
    "invalid payload": "ข้อมูลที่ส่งไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง",
    "api request failed": "เชื่อมต่อระบบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง",
    "network error": "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาลองใหม่อีกครั้ง",
    "login failed": "เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่",
    "invalid username or password": "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง",
    "session expired": "เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่",
    "user inactive": "บัญชีนี้ถูกปิดใช้งาน",
    "unauthorized": "กรุณาเข้าสู่ระบบใหม่อีกครั้ง",
    "invalid token": "โทเคนหมดอายุหรือไม่ถูกต้อง กรุณาเข้าสู่ระบบใหม่",
    "forbidden": "คุณไม่มีสิทธิ์ใช้งานส่วนนี้",
    "warehouse not found or inactive": "ไม่พบคลังสินค้าหรือคลังถูกปิดใช้งาน",
    "team not found or inactive": "ไม่พบกองงานหรือกองงานถูกปิดใช้งาน",
    "some products were not found": "พบรหัสสินค้าบางรายการไม่ถูกต้องหรือไม่มีในระบบ",
    "only draft bill can be confirmed": "ยืนยันได้เฉพาะเอกสารสถานะ Draft เท่านั้น",
    "cannot confirm bill without items": "ไม่สามารถยืนยันเอกสารที่ไม่มีรายการสินค้าได้",
    "bill already cancelled": "เอกสารถูกยกเลิก/ลบไปแล้ว",
    "only cancelled bill can be restored": "กู้คืนได้เฉพาะเอกสารที่ถูกยกเลิก/ลบแล้วเท่านั้น",
    "permanent delete is allowed only for cancelled bill": "ลบถาวรได้เฉพาะเอกสารที่ถูกยกเลิก/ลบแล้วเท่านั้น",
    "bill not found": "ไม่พบเอกสารที่ต้องการ",
    "team not found": "ไม่พบกองงานที่ต้องการ",
    "product not found": "ไม่พบสินค้าในระบบ",
    "username already exists": "ชื่อผู้ใช้นี้ถูกใช้งานแล้ว",
    "product code already exists": "รหัสสินค้านี้มีอยู่แล้วในระบบ",
    "team code already exists": "รหัสกองงานนี้มีอยู่แล้วในระบบ",
    "no fields to update": "ไม่มีข้อมูลสำหรับอัปเดต",
    "no valid fields to update": "ไม่มีข้อมูลที่อัปเดตได้",
    "recorder_name and remark are required": "กรุณาระบุผู้บันทึกและหมายเหตุให้ครบ",
    "cannot deactivate current user": "ไม่สามารถปิดการใช้งานบัญชีที่กำลังใช้งานอยู่ได้",
    "at least one active admin is required": "ระบบต้องมีผู้ดูแล (ADMIN) ที่ใช้งานได้อย่างน้อย 1 บัญชี",
    "excel file is required": "กรุณาเลือกไฟล์ Excel ก่อน",
    "cannot detect required columns (i/j/qty)": "ไม่พบคอลัมน์ที่จำเป็นในไฟล์ (ทีม/รหัสอุปกรณ์/จำนวน)",
    "cannot detect required columns (j/qty/status)": "ไม่พบคอลัมน์ที่จำเป็นในไฟล์ (รหัสอุปกรณ์/จำนวน/สถานะใบเบิก)",
    "invalid reconcile mode": "โหมดกระทบยอดไม่ถูกต้อง",
    "excel file has no rows": "ไฟล์ Excel ไม่มีข้อมูลที่ใช้งานได้",
    "invalid export mode": "รูปแบบการส่งออกไม่ถูกต้อง",
    "invalid warehouse_id": "รหัสคลังสินค้าไม่ถูกต้อง",
    "invalid as_of datetime": "รูปแบบวันที่ย้อนหลังไม่ถูกต้อง",
    "recorder_name and remark are required": "กรุณากรอกชื่อผู้บันทึกและหมายเหตุให้ครบ",
    "no rows to export": "ไม่พบข้อมูลสำหรับส่งออก",
    "no source rows to export": "ไม่พบข้อมูลฝั่งระบบจากไฟล์ที่พร้อมส่งออก",
    "no dataset rows to export": "ไม่พบข้อมูลฝั่งฐานข้อมูลที่พร้อมส่งออก",
    "no wlma rows to export": "ไม่พบข้อมูลยอดรับคืนจาก WLMA ที่พร้อมส่งออก",
    "no wlma reconcile rows to export": "ไม่พบข้อมูลกระทบยอด WLMA ที่พร้อมส่งออก",
    "no diff rows to export": "ไม่พบข้อมูลผลต่างที่พร้อมส่งออก",
    "too many rows": "จำนวนข้อมูลมากเกินกำหนดสำหรับการประมวลผล",
    "reconcile run not found": "ไม่พบประวัติกระทบยอดที่เลือก",
    "reconcile failed": "กระทบยอดไม่สำเร็จ กรุณาตรวจสอบไฟล์แล้วลองใหม่",
    "export failed": "ส่งออกไฟล์ไม่สำเร็จ กรุณาลองใหม่",
    "upload error": "อัปโหลดไฟล์ไม่สำเร็จ กรุณาลองใหม่",
    "file too large (max 80mb)": "ไฟล์มีขนาดใหญ่เกินกำหนด (สูงสุด 80MB)",
    "not allowed by cors": "โดเมนนี้ไม่ได้รับอนุญาตให้เรียกใช้งาน API",
    "internal server error": "ระบบขัดข้องชั่วคราว กรุณาลองใหม่อีกครั้ง",
    "bill number sequence exceeded for today": "เลขบิลของวันนี้เต็มแล้ว (ถึง 999) กรุณาตรวจสอบก่อนทำรายการต่อ",
    "cannot generate bill number": "ไม่สามารถสร้างเลขบิลได้ กรุณาลองใหม่อีกครั้ง"
  };
  if (exactMap[normalized]) {
    return exactMap[normalized];
  }

  const invalidIdMatch = text.match(/^Invalid (user|team|bill|warehouse|product|reconcile run) id$/i);
  if (invalidIdMatch) {
    return "รหัสที่ส่งมาไม่ถูกต้อง";
  }

  const insufficientStockMatch = text.match(
    /^Insufficient stock for product_id\s+(\d+)\.\s*On hand\s*([0-9.]+),\s*requested\s*([0-9.]+)$/i
  );
  if (insufficientStockMatch) {
    const [, productId, onHand, requested] = insufficientStockMatch;
    return `สต็อกไม่เพียงพอ (สินค้า #${productId} คงเหลือ ${formatNumber(onHand)} ต้องการ ${formatNumber(requested)})`;
  }

  const teamRequiredMatch = text.match(/^team_id is required for ISSUE_TO_TEAM and RETURN_FROM_TEAM$/i);
  if (teamRequiredMatch) {
    return "เอกสารประเภทนี้ต้องระบุกองงานก่อนบันทึก";
  }

  const deleteTeamUsedMatch = text.match(/^Cannot delete team because it has related bills$/i);
  if (deleteTeamUsedMatch) {
    return "ไม่สามารถลบกองงานนี้ได้ เพราะมียอดเอกสารถูกใช้งานแล้ว";
  }

  return "เกิดข้อผิดพลาดจากระบบ กรุณาลองใหม่อีกครั้ง";
}

function statusBadge(status) {
  const normalized = String(status || "").toLowerCase();
  const map = {
    healthy: ["status-healthy", "Healthy"],
    low: ["status-low", "Low"],
    out: ["status-out", "Out"],
    draft: ["status-draft", "Draft"],
    confirmed: ["status-confirmed", "Confirmed"],
    cancelled: ["status-cancelled", "Cancelled"],
    active: ["status-active", "Active"],
    inactive: ["status-inactive", "Inactive"]
  };
  const pair = map[normalized] || ["status-inactive", status];
  return `<span class="status-pill ${pair[0]}">${pair[1]}</span>`;
}

function showNotice(message, type = "success") {
  const classMap = {
    success: "alert-success",
    warning: "alert-warning",
    danger: "alert-danger",
    info: "alert-info",
    secondary: "alert-secondary"
  };
  elements.appNotice.className = `alert py-2 px-3 mb-3 ${classMap[type] || classMap.success}`;
  elements.appNotice.textContent = translateSystemMessage(message);
  elements.appNotice.classList.remove("d-none");
  window.clearTimeout(showNotice.timeoutId);
  showNotice.timeoutId = window.setTimeout(() => {
    elements.appNotice.classList.add("d-none");
  }, 3000);
}

function showLoginNotice(message) {
  elements.loginNotice.textContent = translateSystemMessage(message);
  elements.loginNotice.classList.remove("d-none");
}

function hideLoginNotice() {
  elements.loginNotice.classList.add("d-none");
}

function setReconcileProgress(percent, text) {
  const normalized = Math.max(0, Math.min(100, Math.round(Number(percent) || 0)));
  if (elements.reconcileProgressWrap) {
    elements.reconcileProgressWrap.classList.remove("d-none");
  }
  if (elements.reconcileProgressText && text) {
    elements.reconcileProgressText.textContent = text;
  }
  if (elements.reconcileProgressPercent) {
    elements.reconcileProgressPercent.textContent = `${normalized}%`;
  }
  if (elements.reconcileProgressBar) {
    elements.reconcileProgressBar.style.width = `${normalized}%`;
    elements.reconcileProgressBar.setAttribute("aria-valuenow", String(normalized));
  }
}

function hideReconcileProgress() {
  if (elements.reconcileProgressWrap) {
    elements.reconcileProgressWrap.classList.add("d-none");
  }
  if (elements.reconcileProgressBar) {
    elements.reconcileProgressBar.style.width = "0%";
    elements.reconcileProgressBar.setAttribute("aria-valuenow", "0");
  }
  if (elements.reconcileProgressPercent) {
    elements.reconcileProgressPercent.textContent = "0%";
  }
  if (elements.reconcileProgressText) {
    elements.reconcileProgressText.textContent = "กำลังประมวลผล...";
  }
}

function clearSession() {
  state.token = "";
  state.user = null;
  safeRemoveItem(TOKEN_KEY);
  safeRemoveItem(USER_KEY);
}

function getTeamIssueMode() {
  return elements.teamIssueMode?.value === "return" ? "return" : "issue";
}

function getTeamIssueLabel(mode = getTeamIssueMode()) {
  return mode === "return" ? "คืน" : "เบิก";
}

async function apiFetch(path, options = {}) {
  const init = { ...options };
  init.headers = {
    ...(init.headers || {})
  };

  if (!(init.body instanceof FormData)) {
    init.headers["Content-Type"] = "application/json";
  }
  if (state.token) {
    init.headers.Authorization = `Bearer ${state.token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, init);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401) {
      clearSession();
      showAuth();
    }
    throw new Error(translateSystemMessage(data.message || "API request failed"));
  }
  return data;
}

function canEdit() {
  return state.user && ["ADMIN", "STOREKEEPER"].includes(state.user.role);
}

function isAdmin() {
  return state.user && state.user.role === "ADMIN";
}

function isViewer() {
  return state.user && state.user.role === "VIEWER";
}

function canAccessView(view) {
  if (view === "users") {
    return isAdmin();
  }
  if (isViewer() && ["reconcile", "audit"].includes(view)) {
    return false;
  }
  return true;
}

function getCreatorDisplayName() {
  if (!state.user) {
    return "";
  }
  return state.user.display_name || state.user.username || "";
}

function applyBillCreatorIdentity() {
  const name = getCreatorDisplayName();
  if (elements.billCreatedByInput) {
    elements.billCreatedByInput.value = name;
  }
}

function renderHeader() {
  if (!state.user) {
    return;
  }
  elements.topUser.textContent = `${state.user.display_name} (${state.user.username})`;
  elements.sidebarRole.textContent = state.user.role;
  elements.sidebarRole.classList.add("text-white");
  elements.sidebarRole.classList.remove("text-light-emphasis");
  elements.topTime.textContent = formatDate(new Date());
}

function applyRoleVisibility() {
  document.querySelectorAll(".admin-only").forEach((el) => {
    el.classList.toggle("d-none", !isAdmin());
  });
  document.querySelectorAll(".auth-only-edit").forEach((el) => {
    el.classList.toggle("d-none", !canEdit());
  });
  elements.navButtons.forEach((button) => {
    button.classList.toggle("d-none", !canAccessView(button.dataset.view));
  });
}

function showAuth() {
  elements.appShell.classList.add("d-none");
  elements.authScreen.classList.remove("d-none");
  hideLoginNotice();
}

function showApp() {
  elements.authScreen.classList.add("d-none");
  elements.appShell.classList.remove("d-none");
  renderHeader();
  applyRoleVisibility();
  applyBillCreatorIdentity();
  showView(state.currentView);
}

function showView(view) {
  if (!canAccessView(view)) {
    view = "dashboard";
  }
  state.currentView = view;
  elements.navButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.view === view);
  });
  elements.pageSections.forEach((section) => {
    section.classList.toggle("d-none", section.dataset.page !== view);
  });
  elements.viewTitle.textContent = view.charAt(0).toUpperCase() + view.slice(1);
  loadViewData(view).catch((error) => showNotice(error.message, "danger"));
}

async function loadSession() {
  const savedUser = safeGetItem(USER_KEY);
  if (savedUser) {
    try {
      state.user = JSON.parse(savedUser);
    } catch (_error) {
      state.user = null;
    }
  }

  if (!state.token) {
    showAuth();
    return;
  }

  try {
    const me = await apiFetch("/auth/me");
    state.user = me.user;
    safeSetItem(USER_KEY, JSON.stringify(me.user));
    await bootstrapData();
    showApp();
  } catch (_error) {
    clearSession();
    showAuth();
  }
}

async function bootstrapData() {
  const values = await Promise.all([
    apiFetch("/warehouses"),
    apiFetch("/teams")
  ]);
  state.warehouses = values[0].rows || [];
  state.teams = values[1].rows || [];
  state.teamsLoadedAt = Date.now();

  if (!state.currentWarehouseId || !state.warehouses.some((w) => w.warehouse_id === state.currentWarehouseId)) {
    state.currentWarehouseId = Number(state.warehouses[0]?.warehouse_id || 1);
  }
  safeSetItem(WAREHOUSE_KEY, String(state.currentWarehouseId));
  renderWarehouseSelect();
  renderTeamSelectOptions();
}

function renderWarehouseSelect() {
  elements.warehouseSelect.innerHTML = state.warehouses
    .map((row) => `<option value="${row.warehouse_id}">${row.warehouse_code} - ${row.warehouse_name}</option>`)
    .join("");
  elements.warehouseSelect.value = String(state.currentWarehouseId);
}

function getActiveTeams() {
  return state.teams.filter((row) => row.is_active);
}

function getTeamDisplay(team) {
  return `${team.team_code} - ${team.team_name}`;
}

function setBillTeamSelection(team) {
  if (!team) {
    elements.billTeamSearchInput.value = "";
    elements.billTeamIdInput.value = "";
    return;
  }
  elements.billTeamSearchInput.value = getTeamDisplay(team);
  elements.billTeamIdInput.value = String(team.team_id);
}

function renderTeamSelectOptions(keyword = "") {
  const normalized = normalizeText(keyword);
  const rows = getActiveTeams()
    .filter((row) => {
      if (!normalized) {
        return true;
      }
      return [row.team_code, row.team_name, row.team_leader]
        .map((value) => normalizeText(value))
        .some((value) => value.includes(normalized));
    })
    .sort((a, b) => String(a.team_code).localeCompare(String(b.team_code)));

  elements.billTeamList.innerHTML = rows
    .slice(0, 200)
    .map((row) => `<option value="${escapeHtml(getTeamDisplay(row))}" label="${escapeHtml(row.team_leader || "-")}"></option>`)
    .join("");
}

function resolveTeamFromInput({ coerce = false } = {}) {
  const inputValue = elements.billTeamSearchInput.value.trim();
  if (!inputValue) {
    elements.billTeamIdInput.value = "";
    return null;
  }

  const activeTeams = getActiveTeams();
  const normalizedInput = normalizeText(inputValue);
  const exact = activeTeams.find((row) => {
    const display = normalizeText(getTeamDisplay(row));
    const code = normalizeText(row.team_code);
    const name = normalizeText(row.team_name);
    return normalizedInput === display || normalizedInput === code || normalizedInput === name;
  });
  if (exact) {
    setBillTeamSelection(exact);
    return exact;
  }

  const matches = activeTeams.filter((row) => {
    return [row.team_code, row.team_name, row.team_leader]
      .map((value) => normalizeText(value))
      .some((value) => value.includes(normalizedInput));
  });

  if (coerce && matches.length === 1) {
    setBillTeamSelection(matches[0]);
    return matches[0];
  }

  elements.billTeamIdInput.value = "";
  return null;
}
async function loadDashboard() {
  const data = await apiFetch(`/dashboard/summary?warehouse_id=${state.currentWarehouseId}`);
  state.dashboard = data;
  elements.kpiConfirmed1d.textContent = formatNumber(data.counts?.confirmed_1d || 0);
  elements.kpiConfirmed7d.textContent = formatNumber(data.counts?.confirmed_7d || 0);
  elements.kpiConfirmed30d.textContent = formatNumber(data.counts?.confirmed_30d || 0);

  const lowRows = data.low_stock || [];
  elements.dashboardLowStock.innerHTML = lowRows.length
    ? lowRows
        .slice(0, 12)
        .map((row) => `
          <div class="low-item">
            <div class="d-flex justify-content-between align-items-center">
              <strong>${row.product_code_wlma}</strong>
              ${statusBadge(Number(row.qty_on_hand) <= 0 ? "out" : "low")}
            </div>
            <small class="d-block">${row.product_name}</small>
            <small class="text-muted">คงเหลือ ${formatNumber(row.qty_on_hand)} ${row.unit} | Min ${formatNumber(row.reorder_level)}</small>
          </div>
        `)
        .join("")
    : '<div class="low-item">ไม่มี low stock ตอนนี้</div>';

  const recentRows = data.recent_bills || [];
  elements.dashboardRecentBillsBody.innerHTML = recentRows.length
    ? recentRows
        .map((row) => `
          <tr>
            <td>${row.bill_no}</td>
            <td><span class="bill-type-tag">${billTypeLabel[row.bill_type] || row.bill_type}</span></td>
            <td>${row.team_code || "-"}</td>
            <td>${formatDate(row.bill_datetime)}</td>
            <td>${statusBadge(row.status)}</td>
          </tr>
        `)
        .join("")
    : '<tr><td colspan="5" class="text-center text-muted py-3">ไม่มีข้อมูล</td></tr>';
}

function renderProductAsOfHint(asOfValue = null) {
  if (!elements.productAsOfHint) {
    return;
  }
  if (!asOfValue) {
    elements.productAsOfHint.textContent = "กำลังแสดงยอดคงเหลือปัจจุบัน";
    return;
  }

  const datePart = String(asOfValue).slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/u.test(datePart)) {
    const [year, month, day] = datePart.split("-").map((part) => Number(part));
    const dateObj = new Date(year, month - 1, day);
    elements.productAsOfHint.textContent = `กำลังแสดงยอดคงเหลือย้อนหลัง ณ วันที่ ${dateOnlyFormatter.format(dateObj)} (สิ้นวัน)`;
    return;
  }

  elements.productAsOfHint.textContent = `กำลังแสดงยอดคงเหลือย้อนหลัง ณ ${asOfValue}`;
}

function getProductSortMode() {
  return String(elements.productSortSelect?.value || "code_asc");
}

function sortProducts(rows, mode) {
  const sorted = [...rows];
  const byCodeAsc = (left, right) => String(left.product_code_wlma || "").localeCompare(String(right.product_code_wlma || ""));
  sorted.sort((left, right) => {
    if (mode === "qty_asc") {
      const diff = Number(left.qty_on_hand || 0) - Number(right.qty_on_hand || 0);
      return diff || byCodeAsc(left, right);
    }
    if (mode === "qty_desc") {
      const diff = Number(right.qty_on_hand || 0) - Number(left.qty_on_hand || 0);
      return diff || byCodeAsc(left, right);
    }
    if (mode === "move_asc") {
      const diff = Number(left.movement_today_qty || 0) - Number(right.movement_today_qty || 0);
      return diff || byCodeAsc(left, right);
    }
    if (mode === "move_desc") {
      const diff = Number(right.movement_today_qty || 0) - Number(left.movement_today_qty || 0);
      return diff || byCodeAsc(left, right);
    }
    if (mode === "code_desc") {
      return String(right.product_code_wlma || "").localeCompare(String(left.product_code_wlma || ""));
    }
    return byCodeAsc(left, right);
  });
  return sorted;
}

function applyProductListState({ resetPage = false } = {}) {
  const pageSizeRaw = Number(elements.productPageSizeSelect?.value || state.productListPageSize || 25);
  const pageSize = [25, 50, 100].includes(pageSizeRaw) ? pageSizeRaw : 25;
  state.productListPageSize = pageSize;
  if (elements.productPageSizeSelect) {
    elements.productPageSizeSelect.value = String(pageSize);
  }

  if (resetPage) {
    state.productListPage = 1;
  }

  const sortMode = getProductSortMode();
  const sortedRows = sortProducts(state.productsRaw || [], sortMode);
  state.productListTotal = sortedRows.length;
  state.productListTotalPages = Math.max(1, Math.ceil(state.productListTotal / pageSize));
  state.productListPage = clamp(state.productListPage || 1, 1, state.productListTotalPages);

  const start = (state.productListPage - 1) * pageSize;
  state.products = sortedRows.slice(start, start + pageSize);
  renderProductTable();
}

async function loadProducts({ resetPage = false } = {}) {
  const search = elements.productSearchInput.value.trim();
  const stockFilter = elements.productStatusFilter.value;
  const asOfDate = elements.productAsOfDateInput?.value?.trim() || "";
  const query = new URLSearchParams({
    warehouse_id: String(state.currentWarehouseId),
    search,
    status: "all"
  });
  if (asOfDate) {
    query.set("as_of", asOfDate);
  }

  const data = await apiFetch(`/products?${query.toString()}`);
  let rows = data.rows || [];
  if (stockFilter === "in_stock") {
    rows = rows.filter((row) => Number(row.qty_on_hand) > 0);
  } else if (stockFilter === "healthy") {
    rows = rows.filter((row) => getProductHealth(row) === "healthy");
  } else if (stockFilter === "low") {
    rows = rows.filter((row) => {
      const health = getProductHealth(row);
      return health === "low" || health === "out";
    });
  }
  state.productsRaw = rows;
  renderProductAsOfHint(data.as_of || null);
  applyProductListState({ resetPage });
}

async function loadProductsForBills({ force = false } = {}) {
  const now = Date.now();
  if (!force &&
    state.billProductsWarehouseId === state.currentWarehouseId &&
    state.billProducts.length &&
    now - state.billProductsLoadedAt < 60 * 1000) {
    refreshBillProductOptions();
    return;
  }

  const query = new URLSearchParams({
    warehouse_id: String(state.currentWarehouseId),
    search: "",
    status: "all"
  });
  const data = await apiFetch(`/products?${query.toString()}`);
  state.billProducts = data.rows || [];
  state.billProductsWarehouseId = state.currentWarehouseId;
  state.billProductsLoadedAt = now;
  refreshBillProductOptions();
}

function getProductHealth(row) {
  if (Number(row.qty_on_hand) <= 0) {
    return "out";
  }
  if (Number(row.qty_on_hand) <= Number(row.reorder_level)) {
    return "low";
  }
  return "healthy";
}

function renderProductTable() {
  if (elements.productListMeta) {
    elements.productListMeta.textContent = `รวม ${formatNumber(state.productListTotal)} รายการ (หน้า ${formatNumber(state.productListPage)}/${formatNumber(state.productListTotalPages)})`;
  }
  if (elements.productListPager) {
    const prevDisabled = state.productListPage <= 1 ? "disabled" : "";
    const nextDisabled = state.productListPage >= state.productListTotalPages ? "disabled" : "";
    elements.productListPager.innerHTML = `
      <button type="button" class="btn btn-outline-secondary btn-sm product-list-prev" ${prevDisabled}>ก่อนหน้า</button>
      <button type="button" class="btn btn-outline-secondary btn-sm product-list-next" ${nextDisabled}>ถัดไป</button>
    `;
  }

  elements.productTableBody.innerHTML = state.products.length
    ? state.products
        .map((row) => `
          <tr>
            <td>${row.product_id}</td>
            <td class="fw-semibold">${row.product_code_wlma}</td>
            <td>${row.product_name}</td>
            <td>${row.unit}</td>
            <td>${formatNumber(row.qty_on_hand)}</td>
            <td>${formatNumber(row.movement_today_qty)}</td>
            <td>${formatNumber(row.reorder_level)}</td>
            <td>${statusBadge(getProductHealth(row))}</td>
            <td class="text-end">
              ${canEdit()
                ? `<div class="btn-group btn-group-sm" role="group" aria-label="จัดการสินค้า">
                    <button type="button" class="btn btn-outline-primary" data-action="edit-product" data-id="${row.product_id}" title="แก้ไขสินค้า">
                      <i class="bi bi-pencil-square"></i>
                    </button>
                    <button type="button" class="btn btn-outline-warning" data-action="adjust-stock" data-id="${row.product_id}" title="ปรับสต๊อก">
                      <i class="bi bi-sliders"></i>
                    </button>
                  </div>`
                : '<span class="text-muted">view only</span>'}
            </td>
          </tr>
        `)
        .join("")
    : '<tr><td colspan="9" class="text-center text-muted py-4">ไม่พบข้อมูลสินค้า</td></tr>';
}

async function handleProductListPagerInteraction(event) {
  const prevButton = event.target.closest(".product-list-prev");
  if (prevButton && !prevButton.disabled) {
    state.productListPage = Math.max(1, Number(state.productListPage || 1) - 1);
    applyProductListState();
    return;
  }

  const nextButton = event.target.closest(".product-list-next");
  if (nextButton && !nextButton.disabled) {
    state.productListPage = Math.min(
      Number(state.productListTotalPages || 1),
      Number(state.productListPage || 1) + 1
    );
    applyProductListState();
  }
}

function openAdjustStockModal(product) {
  if (!canEdit() || !product || !elements.adjustStockForm) {
    return;
  }
  elements.adjustStockForm.reset();
  elements.adjustStockProductIdInput.value = String(product.product_id);
  elements.adjustStockProductLabelInput.value = `${product.product_code_wlma} - ${product.product_name} (คงเหลือ ${formatNumber(product.qty_on_hand)})`;
  elements.adjustStockDirectionSelect.value = "IN";
  elements.adjustStockQtyInput.value = "";
  elements.adjustStockRecorderInput.value = getCreatorDisplayName();
  elements.adjustStockRemarkInput.value = "";
  adjustStockModal.show();
}

async function submitAdjustStock(event) {
  event.preventDefault();
  if (!canEdit()) {
    return;
  }
  const productId = Number(elements.adjustStockProductIdInput.value || 0);
  const qty = Number(elements.adjustStockQtyInput.value || 0);
  const direction = String(elements.adjustStockDirectionSelect.value || "IN").toUpperCase();
  const remark = elements.adjustStockRemarkInput.value.trim();

  if (!Number.isFinite(productId) || productId <= 0) {
    showNotice("สินค้าไม่ถูกต้อง", "warning");
    return;
  }
  if (!Number.isFinite(qty) || qty <= 0) {
    showNotice("กรุณาระบุจำนวนให้ถูกต้อง", "warning");
    return;
  }
  if (!remark) {
    showNotice("กรุณาระบุหมายเหตุ", "warning");
    return;
  }

  await apiFetch(`/products/${productId}/adjust-stock`, {
    method: "POST",
    body: JSON.stringify({
      warehouse_id: state.currentWarehouseId,
      direction,
      qty,
      remark
    })
  });

  adjustStockModal.hide();
  await Promise.all([loadProducts(), loadDashboard()]);
  showNotice("ปรับสต๊อกเรียบร้อย", "success");
}

function openProductModal(product = null) {
  if (!canEdit()) {
    return;
  }
  if (product) {
    elements.productModalTitle.textContent = "แก้ไขสินค้า";
    elements.productFormId.value = String(product.product_id);
    elements.productCodeInput.value = product.product_code_wlma;
    elements.productNameInput.value = product.product_name;
    elements.productUnitInput.value = product.unit;
    elements.productMinInput.value = product.reorder_level;
  } else {
    elements.productModalTitle.textContent = "เพิ่มสินค้า";
    elements.productForm.reset();
    elements.productFormId.value = "";
  }
  productModal.show();
}

async function saveProduct(event) {
  event.preventDefault();
  if (!canEdit()) {
    return;
  }
  const id = Number(elements.productFormId.value || 0);
  const payload = {
    product_code_wlma: elements.productCodeInput.value.trim(),
    product_name: elements.productNameInput.value.trim(),
    unit: elements.productUnitInput.value.trim(),
    reorder_level: Number(elements.productMinInput.value || 0),
    is_active: true
  };

  if (!payload.product_code_wlma || !payload.product_name || !payload.unit) {
    showNotice("กรอกข้อมูลสินค้าให้ครบ", "warning");
    return;
  }

  if (id > 0) {
    await apiFetch(`/products/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload)
    });
  } else {
    await apiFetch("/products", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  }

  productModal.hide();
  state.billProductsWarehouseId = 0;
  state.billProductsLoadedAt = 0;
  await loadProducts();
  await loadDashboard();
  showNotice("บันทึกสินค้าเรียบร้อย", "success");
}

async function loadTeams({ force = false } = {}) {
  const now = Date.now();
  if (!force && state.teams.length && now - state.teamsLoadedAt < 60 * 1000) {
    renderTeamSelectOptions();
    renderTeamTable();
    return;
  }

  const data = await apiFetch("/teams");
  state.teams = data.rows || [];
  state.teamsLoadedAt = now;
  renderTeamSelectOptions();
  renderTeamTable();
}

function renderTeamTable() {
  const showAdminAction = isAdmin();
  elements.workUnitTableBody.innerHTML = state.teams.length
    ? state.teams
        .map((row) => `
          <tr class="workunit-row ${state.selectedTeamId === row.team_id ? "selected" : ""}" data-team-id="${row.team_id}">
            <td class="fw-semibold">${row.team_code}</td>
            <td>${row.team_name}</td>
            <td>${row.team_leader || "-"}</td>
            ${showAdminAction ? `
              <td class="text-end">
                <button type="button" class="btn btn-sm btn-outline-primary" data-action="edit-team" data-id="${row.team_id}" title="แก้ไขกองงาน">
                  <i class="bi bi-pencil-square"></i>
                </button>
                <button type="button" class="btn btn-sm btn-outline-danger" data-action="delete-team" data-id="${row.team_id}" title="ลบกองงาน">
                  <i class="bi bi-trash"></i>
                </button>
              </td>
            ` : ""}
          </tr>
        `)
        .join("")
    : `<tr><td colspan="${showAdminAction ? 4 : 3}" class="text-center text-muted py-4">ไม่พบข้อมูลกองงาน</td></tr>`;
}

function openWorkUnitModal(team = null) {
  if (!isAdmin()) {
    return;
  }
  if (team) {
    elements.workUnitModalTitle.textContent = "แก้ไขกองงาน";
    elements.workUnitFormId.value = String(team.team_id);
    elements.workUnitCodeInput.value = team.team_code;
    elements.workUnitNameInput.value = team.team_name;
    elements.workUnitLeaderInput.value = team.team_leader || "";
  } else {
    elements.workUnitModalTitle.textContent = "เพิ่มกองงาน";
    elements.workUnitForm.reset();
    elements.workUnitFormId.value = "";
  }
  workUnitModal.show();
}

async function saveWorkUnit(event) {
  event.preventDefault();
  if (!isAdmin()) {
    return;
  }
  const id = Number(elements.workUnitFormId.value || 0);
  const payload = {
    team_code: elements.workUnitCodeInput.value.trim().toUpperCase(),
    team_name: elements.workUnitNameInput.value.trim(),
    team_leader: elements.workUnitLeaderInput.value.trim() || null
  };
  if (!payload.team_code || !payload.team_name) {
    showNotice("กรอกข้อมูลกองงานให้ครบ", "warning");
    return;
  }

  if (id > 0) {
    await apiFetch(`/teams/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload)
    });
  } else {
    await apiFetch("/teams", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  }
  workUnitModal.hide();
  await loadTeams({ force: true });
  showNotice("บันทึกกองงานเรียบร้อย", "success");
}

async function deleteWorkUnit(teamId) {
  if (!isAdmin()) {
    return;
  }
  const row = state.teams.find((item) => item.team_id === Number(teamId));
  if (!row) {
    showNotice("ไม่พบกองงานที่ต้องการลบ", "warning");
    return;
  }
  const confirmed = window.confirm(`ยืนยันลบกองงาน ${row.team_code} - ${row.team_name} ?`);
  if (!confirmed) {
    return;
  }

  await apiFetch(`/teams/${row.team_id}`, {
    method: "DELETE"
  });

  if (state.selectedTeamId === row.team_id) {
    state.selectedTeamId = null;
  }
  await Promise.all([loadTeams({ force: true }), loadBills()]);
  await loadTeamIssues();
  showNotice("ลบกองงานเรียบร้อย", "warning");
}

async function loadTeamIssues() {
  const mode = getTeamIssueMode();
  const actionLabel = getTeamIssueLabel(mode);
  if (elements.teamIssueSummaryQtyHead) {
    elements.teamIssueSummaryQtyHead.textContent = `รวม${actionLabel}`;
  }

  if (!state.selectedTeamId) {
    elements.teamIssueTitle.textContent = `รายการ${actionLabel}กองงาน: -`;
    elements.teamIssueSummaryBody.innerHTML = '<tr><td colspan="4" class="text-center text-muted py-3">เลือกกองงานเพื่อดูข้อมูล</td></tr>';
    elements.teamIssueDetailBody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-3">-</td></tr>';
    return;
  }
  const selectedTeamExists = state.teams.some((row) => row.team_id === Number(state.selectedTeamId));
  if (!selectedTeamExists) {
    state.selectedTeamId = null;
    elements.teamIssueTitle.textContent = `รายการ${actionLabel}กองงาน: -`;
    elements.teamIssueSummaryBody.innerHTML = '<tr><td colspan="4" class="text-center text-muted py-3">เลือกกองงานเพื่อดูข้อมูล</td></tr>';
    elements.teamIssueDetailBody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-3">-</td></tr>';
    return;
  }
  const from = elements.teamIssueFrom.value;
  const to = elements.teamIssueTo.value;
  const query = new URLSearchParams();
  if (from) {
    query.set("from", from);
  }
  if (to) {
    query.set("to", to);
  }
  query.set("movement", mode);
  const data = await apiFetch(`/teams/${state.selectedTeamId}/issues?${query.toString()}`);
  const resultMode = data.movement === "return" ? "return" : "issue";
  const resultLabel = getTeamIssueLabel(resultMode);
  if (elements.teamIssueSummaryQtyHead) {
    elements.teamIssueSummaryQtyHead.textContent = `รวม${resultLabel}`;
  }

  elements.teamIssueTitle.textContent = `รายการ${resultLabel}กองงาน: ${data.team.team_code} - ${data.team.team_name} (หัวหน้า: ${data.team.team_leader || "-"})`;
  elements.teamIssueSummaryBody.innerHTML = data.summary.length
    ? data.summary
        .map((row) => `
          <tr>
            <td>${row.product_code_wlma}</td>
            <td>${row.product_name}</td>
            <td>${row.unit}</td>
            <td class="text-end">${formatNumber(row.total_qty)}</td>
          </tr>
        `)
        .join("")
    : '<tr><td colspan="4" class="text-center text-muted py-3">ไม่พบรายการ</td></tr>';

  elements.teamIssueDetailBody.innerHTML = data.details.length
    ? data.details
        .map((row) => `
          <tr>
            <td>${formatDate(row.bill_datetime)}</td>
            <td>${row.bill_no}</td>
            <td>${row.product_code_wlma}</td>
            <td>${row.product_name}</td>
            <td class="text-end">${formatNumber(row.qty)}</td>
          </tr>
        `)
        .join("")
    : '<tr><td colspan="5" class="text-center text-muted py-3">ไม่พบรายการ</td></tr>';
}
function renderBillTypeState() {
  const type = elements.billTypeSelect.value;
  const requiresTeam = type !== "RETURN_FROM_WLMA";
  elements.billTeamSearchInput.disabled = !requiresTeam;
  if (!requiresTeam) {
    setBillTeamSelection(null);
  }

  const isReturnFromWlma = type === "RETURN_FROM_WLMA";
  if (isReturnFromWlma) {
    const currentSender = elements.billSenderInput.value.trim();
    if (currentSender && currentSender.toUpperCase() !== "WLMA") {
      elements.billSenderInput.dataset.prevSender = currentSender;
    }
    elements.billSenderInput.value = "WLMA";
    elements.billSenderInput.readOnly = true;
    elements.billSenderInput.classList.add("bg-light");
    return;
  }

  elements.billSenderInput.readOnly = false;
  elements.billSenderInput.classList.remove("bg-light");
  const prevSender = elements.billSenderInput.dataset.prevSender || "";
  if (elements.billSenderInput.value.trim().toUpperCase() === "WLMA" && prevSender) {
    elements.billSenderInput.value = prevSender;
  }
}

let billItemRowSeq = 0;

function getBillProducts() {
  return state.billProducts || [];
}

function nextBillRowKey() {
  billItemRowSeq += 1;
  return `bill-item-${billItemRowSeq}`;
}

function findProductById(productId) {
  const id = Number(productId || 0);
  if (id <= 0) {
    return null;
  }
  return getBillProducts().find((row) => row.product_id === id) || null;
}

function findBillProductsByKeyword(keyword) {
  const rows = getBillProducts();
  const normalized = normalizeText(keyword);
  if (!normalized) {
    return rows.slice(0, 120);
  }
  return rows
    .filter((row) => {
      return [row.product_code_wlma, row.product_name, row.unit]
        .map((value) => normalizeText(value))
        .some((value) => value.includes(normalized));
    })
    .slice(0, 120);
}

function findProductByWlmaExact(value) {
  const normalized = normalizeText(value);
  if (!normalized) {
    return null;
  }
  return getBillProducts().find((row) => normalizeText(row.product_code_wlma) === normalized) || null;
}

function findProductByNameExact(value) {
  const normalized = normalizeText(value);
  if (!normalized) {
    return null;
  }
  const rows = getBillProducts().filter((row) => normalizeText(row.product_name) === normalized);
  return rows.length === 1 ? rows[0] : null;
}

function findSingleProductByKeyword(keyword) {
  const normalized = normalizeText(keyword);
  if (!normalized) {
    return null;
  }
  const rows = findBillProductsByKeyword(normalized);
  return rows.length === 1 ? rows[0] : null;
}

function setBillRowProduct(row, product) {
  const wlmaInput = row.querySelector(".bill-item-wlma");
  const productInput = row.querySelector(".bill-item-product-name");
  const productIdInput = row.querySelector(".bill-item-product-id");
  if (!wlmaInput || !productInput || !productIdInput || !product) {
    return;
  }
  wlmaInput.value = product.product_code_wlma;
  productInput.value = product.product_name;
  productIdInput.value = String(product.product_id);
  refreshBillRowAutocomplete(row);
}

function refreshBillRowAutocomplete(row) {
  const wlmaInput = row.querySelector(".bill-item-wlma");
  const productInput = row.querySelector(".bill-item-product-name");
  const wlmaList = row.querySelector(".bill-item-wlma-list");
  const productList = row.querySelector(".bill-item-product-list");
  if (!wlmaInput || !productInput || !wlmaList || !productList) {
    return;
  }

  const wlmaRows = findBillProductsByKeyword(wlmaInput.value);
  wlmaList.innerHTML = wlmaRows
    .map((rowData) => `<option value="${escapeHtml(rowData.product_code_wlma)}" label="${escapeHtml(rowData.product_name)}"></option>`)
    .join("");

  const productRows = findBillProductsByKeyword(productInput.value);
  productList.innerHTML = productRows
    .map((rowData) => `<option value="${escapeHtml(rowData.product_name)}" label="${escapeHtml(rowData.product_code_wlma)}"></option>`)
    .join("");
}

function resolveBillRowProduct(row, { coerce = false } = {}) {
  const productIdInput = row.querySelector(".bill-item-product-id");
  const wlmaInput = row.querySelector(".bill-item-wlma");
  const productInput = row.querySelector(".bill-item-product-name");
  const currentById = findProductById(productIdInput?.value);
  if (currentById) {
    return currentById;
  }

  const wlmaValue = wlmaInput?.value || "";
  const productNameValue = productInput?.value || "";

  const byWlma = findProductByWlmaExact(wlmaValue);
  if (byWlma) {
    return byWlma;
  }

  const byName = findProductByNameExact(productNameValue);
  if (byName) {
    return byName;
  }

  if (coerce) {
    return findSingleProductByKeyword(wlmaValue || productNameValue);
  }

  return null;
}

function syncBillRowFromField(row, field, { coerce = false } = {}) {
  const productIdInput = row.querySelector(".bill-item-product-id");
  if (productIdInput) {
    productIdInput.value = "";
  }
  const product = resolveBillRowProduct(row, { coerce });
  if (product) {
    setBillRowProduct(row, product);
    return product;
  }

  if (field === "wlma") {
    const productInput = row.querySelector(".bill-item-product-name");
    if (productInput) {
      productInput.value = "";
    }
  }
  if (field === "product") {
    const wlmaInput = row.querySelector(".bill-item-wlma");
    if (wlmaInput) {
      wlmaInput.value = "";
    }
  }

  refreshBillRowAutocomplete(row);
  return null;
}

function billItemRowTemplate(item = {}) {
  const rowKey = nextBillRowKey();
  const wlmaListId = `${rowKey}-wlma-list`;
  const productListId = `${rowKey}-product-list`;
  return `
    <div class="bill-items-row">
      <div class="row g-2 align-items-end">
        <div class="col-12 col-md-1">
          <label class="form-label mb-1">ลำดับ</label>
          <div class="bill-item-order-badge">#1</div>
        </div>
        <div class="col-12 col-md-3">
          <label class="form-label mb-1">WLMA (9 หลัก)</label>
          <input class="form-control form-control-sm bill-item-wlma" list="${wlmaListId}" value="${escapeHtml(item.product_code_wlma || "")}" placeholder="พิมพ์เลข WLMA">
          <datalist id="${wlmaListId}" class="bill-item-wlma-list"></datalist>
        </div>
        <div class="col-12 col-md-5">
          <label class="form-label mb-1">Product</label>
          <input class="form-control form-control-sm bill-item-product-name" list="${productListId}" value="${escapeHtml(item.product_name || "")}" placeholder="พิมพ์ชื่อสินค้า">
          <datalist id="${productListId}" class="bill-item-product-list"></datalist>
          <input type="hidden" class="bill-item-product-id" value="${Number(item.product_id || 0) > 0 ? Number(item.product_id) : ""}">
        </div>
        <div class="col-8 col-md-2">
          <label class="form-label mb-1">Qty</label>
          <input type="number" min="0.01" step="0.01" class="form-control form-control-sm bill-item-qty" value="${item.qty || 1}">
        </div>
        <div class="col-4 col-md-1 d-grid">
          <button type="button" class="btn btn-outline-danger btn-sm remove-item-btn"><i class="bi bi-trash"></i></button>
        </div>
      </div>
    </div>
  `;
}

function renumberBillItemRows() {
  const rows = Array.from(elements.billItemsWrap.querySelectorAll(".bill-items-row"));
  rows.forEach((row, index) => {
    row.dataset.itemNo = String(index + 1);
    const badge = row.querySelector(".bill-item-order-badge");
    if (badge) {
      badge.textContent = `#${index + 1}`;
    }
  });
}

function appendBillItemRow(item = {}) {
  elements.billItemsWrap.insertAdjacentHTML("beforeend", billItemRowTemplate(item));
  const row = elements.billItemsWrap.lastElementChild;
  if (!row) {
    return null;
  }

  refreshBillRowAutocomplete(row);
  const product = findProductById(item.product_id);
  if (product) {
    setBillRowProduct(row, product);
  }
  renumberBillItemRows();
  return row;
}

function ensureBillItems() {
  if (!elements.billItemsWrap.querySelector(".bill-items-row")) {
    elements.billItemsWrap.innerHTML = "";
    appendBillItemRow();
    return;
  }
  renumberBillItemRows();
}

function refreshBillProductOptions() {
  const rows = Array.from(elements.billItemsWrap.querySelectorAll(".bill-items-row"));
  rows.forEach((row) => {
    const product = resolveBillRowProduct(row, { coerce: false });
    refreshBillRowAutocomplete(row);
    if (product) {
      setBillRowProduct(row, product);
    }
  });
}

function collectBillItems() {
  const rows = Array.from(elements.billItemsWrap.querySelectorAll(".bill-items-row"));
  const map = new Map();
  const invalidRows = [];
  rows.forEach((row, index) => {
    const wlmaValue = row.querySelector(".bill-item-wlma")?.value.trim() || "";
    const productNameValue = row.querySelector(".bill-item-product-name")?.value.trim() || "";
    const hasProductInput = Boolean(wlmaValue || productNameValue || row.querySelector(".bill-item-product-id")?.value);
    const qty = Number(row.querySelector(".bill-item-qty")?.value || 0);
    if (!hasProductInput) {
      return;
    }
    const product = resolveBillRowProduct(row, { coerce: true });
    if (!product || qty <= 0) {
      invalidRows.push(index + 1);
      return;
    }
    map.set(product.product_id, (map.get(product.product_id) || 0) + qty);
  });
  return {
    items: [...map.entries()].map(([product_id, qty]) => ({ product_id, qty })),
    invalidRows
  };
}

async function submitBillForm(event) {
  event.preventDefault();
  if (!canEdit()) {
    return;
  }
  const action = event.submitter?.dataset.action || "draft";
  const billType = elements.billTypeSelect.value;
  const team = resolveTeamFromInput({ coerce: true });
  const { items, invalidRows } = collectBillItems();
  const payload = {
    bill_type: billType,
    warehouse_id: state.currentWarehouseId,
    team_id: billType === "RETURN_FROM_WLMA" ? null : team?.team_id || null,
    sender_name: billType === "RETURN_FROM_WLMA" ? "WLMA" : elements.billSenderInput.value.trim(),
    receiver_name: elements.billReceiverInput.value.trim(),
    remarks: elements.billRemarkInput.value.trim() || null,
    auto_confirm: action === "confirm",
    items
  };

  if (!payload.sender_name || !payload.receiver_name) {
    showNotice("กรอกผู้ส่ง/ผู้รับให้ครบ", "warning");
    return;
  }
  if (billType !== "RETURN_FROM_WLMA" && !payload.team_id) {
    showNotice("ประเภทนี้ต้องเลือกกองงาน", "warning");
    return;
  }
  if (invalidRows.length) {
    showNotice(`ตรวจสอบรายการสินค้าแถว: ${invalidRows.join(", ")}`, "warning");
    return;
  }
  if (!payload.items.length) {
    showNotice("เพิ่มรายการสินค้าอย่างน้อย 1 รายการ", "warning");
    return;
  }

  await apiFetch("/bills", {
    method: "POST",
    body: JSON.stringify(payload)
  });

  elements.billForm.reset();
  elements.billItemsWrap.innerHTML = "";
  setBillTeamSelection(null);
  applyBillCreatorIdentity();
  ensureBillItems();
  renderBillTypeState();
  await Promise.all([loadBills(), loadProductsForBills(), loadDashboard()]);
  if (state.selectedTeamId) {
    await loadTeamIssues();
  }
  showNotice("บันทึกเอกสารเรียบร้อย", "success");
}

async function loadBills({ resetPage = false } = {}) {
  const query = new URLSearchParams();
  query.set("warehouse_id", String(state.currentWarehouseId));
  if (resetPage) {
    state.billListPage = 1;
  }
  const status = elements.billStatusFilter.value;
  const type = elements.billTypeFilter.value;
  const from = elements.billFromInput?.value?.trim() || "";
  const to = elements.billToInput?.value?.trim() || "";
  const pageSizeRaw = Number(elements.billPageSizeSelect?.value || state.billListPageSize || 25);
  const pageSize = [25, 50, 100].includes(pageSizeRaw) ? pageSizeRaw : 25;
  state.billListPageSize = pageSize;

  if (status !== "all") {
    query.set("status", status);
  }
  if (type !== "all") {
    query.set("type", type);
  }
  if (from) {
    query.set("from", from);
  }
  if (to) {
    query.set("to", to);
  }
  query.set("page", String(state.billListPage || 1));
  query.set("page_size", String(pageSize));
  query.set("sort_by", "bill_no");
  query.set("sort_dir", "desc");

  const data = await apiFetch(`/bills?${query.toString()}`);
  state.bills = data.rows || [];
  state.billListTotal = Number(data.total || 0);
  state.billListPage = Number(data.page || 1);
  state.billListPageSize = Number(data.page_size || pageSize);
  state.billListTotalPages = Math.max(1, Number(data.total_pages || 1));

  if (elements.billPageSizeSelect) {
    elements.billPageSizeSelect.value = String(state.billListPageSize);
  }

  const selectedStillExists = state.selectedBillId
    ? state.bills.some((row) => row.bill_id === Number(state.selectedBillId))
    : false;
  if (!selectedStillExists) {
    state.selectedBillId = null;
    state.selectedBillDetail = null;
    state.billDetailPage = 1;
    renderBillDetailPanel();
  }

  renderBillTable();
}

function renderBillTable() {
  if (elements.billListMeta) {
    elements.billListMeta.textContent = `รวม ${formatNumber(state.billListTotal)} บิล (หน้า ${formatNumber(state.billListPage)}/${formatNumber(state.billListTotalPages)})`;
  }
  if (elements.billListPager) {
    const prevDisabled = state.billListPage <= 1 ? "disabled" : "";
    const nextDisabled = state.billListPage >= state.billListTotalPages ? "disabled" : "";
    elements.billListPager.innerHTML = `
      <button type="button" class="btn btn-outline-secondary btn-sm bill-list-prev" ${prevDisabled}>ก่อนหน้า</button>
      <button type="button" class="btn btn-outline-secondary btn-sm bill-list-next" ${nextDisabled}>ถัดไป</button>
    `;
  }

  elements.billTableBody.innerHTML = state.bills.length
    ? state.bills
        .map((row) => `
          <tr class="bill-row ${Number(state.selectedBillId) === Number(row.bill_id) ? "selected" : ""}" data-bill-id="${row.bill_id}">
            <td class="fw-semibold">${row.bill_no}</td>
            <td><span class="bill-type-tag">${billTypeLabel[row.bill_type] || row.bill_type}</span></td>
            <td>${row.team_code || "-"}</td>
            <td>${row.created_by_name || row.created_by_username || "-"}</td>
            <td>${formatDate(row.bill_datetime)}</td>
            <td>${statusBadge(row.status)}</td>
            <td class="text-end">
              ${getBillActionButtons(row)}
            </td>
          </tr>
        `)
        .join("")
    : '<tr><td colspan="7" class="text-center text-muted py-4">ไม่พบเอกสาร</td></tr>';
}

function getBillActionButtons(row) {
  const buttons = [
    `<button type="button" class="btn btn-sm btn-outline-info" data-action="view-bill" data-id="${row.bill_id}"><i class="bi bi-eye"></i></button>`
  ];
  if (!canEdit()) {
    return buttons.join(" ");
  }
  if (row.status === "DRAFT") {
    buttons.push(`<button type="button" class="btn btn-sm btn-outline-success" data-action="confirm-bill" data-id="${row.bill_id}">Confirm</button>`);
  }
  if (row.status !== "CANCELLED") {
    buttons.push(`<button type="button" class="btn btn-sm btn-outline-warning" data-action="cancel-bill" data-id="${row.bill_id}">ลบ</button>`);
  } else {
    buttons.push(`<button type="button" class="btn btn-sm btn-outline-primary" data-action="restore-bill" data-id="${row.bill_id}">กู้คืน</button>`);
    if (isAdmin()) {
      buttons.push(`<button type="button" class="btn btn-sm btn-outline-danger" data-action="hard-delete-bill" data-id="${row.bill_id}">ลบถาวร</button>`);
    }
  }
  return buttons.join(" ");
}

async function handleBillListPagerInteraction(event) {
  const prevButton = event.target.closest(".bill-list-prev");
  if (prevButton && !prevButton.disabled) {
    state.billListPage = Math.max(1, Number(state.billListPage || 1) - 1);
    await loadBills();
    return;
  }

  const nextButton = event.target.closest(".bill-list-next");
  if (nextButton && !nextButton.disabled) {
    state.billListPage = Math.min(
      Number(state.billListTotalPages || 1),
      Number(state.billListPage || 1) + 1
    );
    await loadBills();
  }
}

function cleanCancelledReason(reason) {
  return String(reason || "").replace(/^\[PREV_STATUS=(DRAFT|CONFIRMED)\]\s*/i, "").trim();
}

function renderBillDetailPanel({ loading = false, row = null, message = "" } = {}) {
  if (!elements.billDetailContent) {
    return;
  }
  if (loading) {
    elements.billDetailContent.innerHTML = '<div class="text-muted">กำลังโหลดรายละเอียดบิล...</div>';
    return;
  }
  if (!row) {
    elements.billDetailContent.innerHTML = `<div class="text-muted">${escapeHtml(message || "เลือกบิลจากตารางเพื่อดูรายละเอียดและรายการสินค้า")}</div>`;
    return;
  }

  const teamLabel = row.team_code
    ? `${row.team_code}${row.team_name ? ` - ${row.team_name}` : ""}`
    : "-";
  const creator = row.created_by_name || row.created_by_username || "-";
  const itemRows = Array.isArray(row.items) ? row.items : [];
  const totalQty = itemRows.reduce((sum, item) => sum + Number(item.qty || 0), 0);
  const pageSize = [10, 25].includes(Number(state.billDetailPageSize)) ? Number(state.billDetailPageSize) : 10;
  state.billDetailPageSize = pageSize;
  const totalPages = Math.max(1, Math.ceil(itemRows.length / pageSize));
  const page = Math.min(Math.max(Number(state.billDetailPage || 1), 1), totalPages);
  state.billDetailPage = page;
  const startIndex = (page - 1) * pageSize;
  const pagedRows = itemRows.slice(startIndex, startIndex + pageSize);
  const itemsHtml = pagedRows.length
    ? pagedRows
        .map((item, index) => `
          <tr>
            <td>${startIndex + index + 1}</td>
            <td>${escapeHtml(item.product_code_wlma || "-")}</td>
            <td>${escapeHtml(item.product_name || "-")}</td>
            <td>${escapeHtml(item.unit || "-")}</td>
            <td class="text-end">${formatNumber(item.qty)}</td>
          </tr>
        `)
        .join("")
    : '<tr><td colspan="5" class="text-center text-muted py-2">ไม่พบรายการสินค้า</td></tr>';

  const cancelReason = cleanCancelledReason(row.cancelled_reason);
  const pagerHtml = itemRows.length
    ? `
      <div class="d-flex flex-wrap align-items-center gap-2">
        <label class="small text-muted mb-0" for="billDetailPageSize">แสดง</label>
        <select id="billDetailPageSize" class="form-select form-select-sm bill-detail-page-size">
          <option value="10" ${pageSize === 10 ? "selected" : ""}>10</option>
          <option value="25" ${pageSize === 25 ? "selected" : ""}>25</option>
        </select>
        <span class="small text-muted">ต่อหน้า</span>
        <button type="button" class="btn btn-outline-secondary btn-sm bill-detail-prev" ${page <= 1 ? "disabled" : ""}>ก่อนหน้า</button>
        <button type="button" class="btn btn-outline-secondary btn-sm bill-detail-next" ${page >= totalPages ? "disabled" : ""}>ถัดไป</button>
      </div>
    `
    : "";

  elements.billDetailContent.innerHTML = `
    <div class="mb-2">
      <div class="small text-muted">Bill No</div>
      <div class="fw-semibold">${escapeHtml(row.bill_no || "-")}</div>
    </div>
    <dl class="bill-detail-meta">
      <dt>ประเภท</dt><dd>${escapeHtml(billTypeLabel[row.bill_type] || row.bill_type || "-")}</dd>
      <dt>ทีม</dt><dd>${escapeHtml(teamLabel)}</dd>
      <dt>สถานะ</dt><dd>${statusBadge(row.status || "-")}</dd>
      <dt>ผู้ส่ง</dt><dd>${escapeHtml(row.sender_name || "-")}</dd>
      <dt>ผู้รับ</dt><dd>${escapeHtml(row.receiver_name || "-")}</dd>
      <dt>ผู้บันทึก</dt><dd>${escapeHtml(creator)}</dd>
      <dt>เวลา</dt><dd>${escapeHtml(formatDate(row.bill_datetime))}</dd>
      <dt>หมายเหตุ</dt><dd>${escapeHtml(row.remarks || "-")}</dd>
      ${cancelReason ? `<dt>เหตุผลยกเลิก</dt><dd>${escapeHtml(cancelReason)}</dd>` : ""}
    </dl>
    <div class="d-flex justify-content-between align-items-center mb-1">
      <span class="fw-semibold">รายการสินค้า</span>
      <span class="text-muted">รวม ${formatNumber(itemRows.length)} รายการ / ${formatNumber(totalQty)} ชิ้น</span>
    </div>
    <div class="d-flex justify-content-between align-items-center mb-2">
      <span class="small text-muted">หน้า ${page}/${totalPages}</span>
      ${pagerHtml}
    </div>
    <div class="table-responsive">
      <table class="table table-sm align-middle mb-0 bill-detail-items-table">
        <thead>
          <tr>
            <th style="width:64px">ลำดับ</th>
            <th>WLMA</th>
            <th>สินค้า</th>
            <th>หน่วย</th>
            <th class="text-end">Qty</th>
          </tr>
        </thead>
        <tbody>${itemsHtml}</tbody>
      </table>
    </div>
  `;
}

function rerenderSelectedBillDetail() {
  if (!state.selectedBillDetail) {
    renderBillDetailPanel();
    return;
  }
  renderBillDetailPanel({ row: state.selectedBillDetail });
}

function handleBillDetailContentInteraction(event) {
  const pageSizeSelect = event.target.closest(".bill-detail-page-size");
  if (pageSizeSelect) {
    const nextSize = Number(pageSizeSelect.value || 10);
    if (nextSize !== state.billDetailPageSize) {
      state.billDetailPageSize = [10, 25].includes(nextSize) ? nextSize : 10;
      state.billDetailPage = 1;
      rerenderSelectedBillDetail();
    }
    return;
  }

  const prevButton = event.target.closest(".bill-detail-prev");
  if (prevButton && !prevButton.disabled) {
    state.billDetailPage = Math.max(1, Number(state.billDetailPage || 1) - 1);
    rerenderSelectedBillDetail();
    return;
  }

  const nextButton = event.target.closest(".bill-detail-next");
  if (nextButton && !nextButton.disabled) {
    state.billDetailPage = Number(state.billDetailPage || 1) + 1;
    rerenderSelectedBillDetail();
  }
}

function applyBillsSplitPercent(percent, { persist = true } = {}) {
  if (!elements.billsLayout || !elements.billsSplitter) {
    return;
  }
  const safePercent = clamp(Number(percent) || 65, 25, 75);
  elements.billsLayout.style.setProperty("--bills-left-width", `${safePercent}%`);
  elements.billsSplitter.setAttribute("aria-valuenow", String(Math.round(safePercent)));
  if (persist) {
    safeSetItem(BILLS_SPLIT_KEY, String(safePercent));
  }
}

function initBillsSplitter() {
  if (!elements.billsLayout || !elements.billsSplitter) {
    return;
  }

  const saved = Number(safeGetItem(BILLS_SPLIT_KEY));
  applyBillsSplitPercent(Number.isFinite(saved) ? saved : 65, { persist: false });

  let isDragging = false;
  let layoutRect = null;
  let currentPercent = Number.isFinite(saved) ? saved : 65;

  const stopDragging = () => {
    if (!isDragging) {
      return;
    }
    isDragging = false;
    layoutRect = null;
    document.body.classList.remove("bills-resizing");
    safeSetItem(BILLS_SPLIT_KEY, String(currentPercent));
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", stopDragging);
    window.removeEventListener("pointercancel", stopDragging);
  };

  const setByClientX = (clientX) => {
    if (!layoutRect) {
      layoutRect = elements.billsLayout.getBoundingClientRect();
    }
    if (!(layoutRect?.width > 0)) {
      return;
    }
    const rawPercent = ((clientX - layoutRect.left) / layoutRect.width) * 100;
    currentPercent = clamp(rawPercent, 25, 75);
    applyBillsSplitPercent(currentPercent, { persist: false });
  };

  const onPointerMove = (event) => {
    if (!isDragging) {
      return;
    }
    setByClientX(event.clientX);
  };

  elements.billsSplitter.addEventListener("pointerdown", (event) => {
    if (window.matchMedia("(max-width: 991.98px)").matches) {
      return;
    }
    event.preventDefault();
    isDragging = true;
    layoutRect = elements.billsLayout.getBoundingClientRect();
    setByClientX(event.clientX);
    document.body.classList.add("bills-resizing");
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", stopDragging);
    window.addEventListener("pointercancel", stopDragging);
  });

  elements.billsSplitter.addEventListener("keydown", (event) => {
    if (window.matchMedia("(max-width: 991.98px)").matches) {
      return;
    }
    const current = Number(elements.billsSplitter.getAttribute("aria-valuenow") || 65);
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      applyBillsSplitPercent(current - 2);
      return;
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      applyBillsSplitPercent(current + 2);
      return;
    }
    if (event.key === "Home") {
      event.preventDefault();
      applyBillsSplitPercent(25);
      return;
    }
    if (event.key === "End") {
      event.preventDefault();
      applyBillsSplitPercent(75);
    }
  });
}

function applyWorkUnitsSplitPercent(percent, { persist = true } = {}) {
  if (!elements.workunitsLayout || !elements.workunitsSplitter) {
    return;
  }
  const safePercent = clamp(Number(percent) || 34, 25, 75);
  elements.workunitsLayout.style.setProperty("--workunits-left-width", `${safePercent}%`);
  elements.workunitsSplitter.setAttribute("aria-valuenow", String(Math.round(safePercent)));
  if (persist) {
    safeSetItem(WORKUNITS_SPLIT_KEY, String(safePercent));
  }
}

function initWorkUnitsSplitter() {
  if (!elements.workunitsLayout || !elements.workunitsSplitter) {
    return;
  }

  const saved = Number(safeGetItem(WORKUNITS_SPLIT_KEY));
  applyWorkUnitsSplitPercent(Number.isFinite(saved) ? saved : 34, { persist: false });

  let isDragging = false;
  let layoutRect = null;
  let currentPercent = Number.isFinite(saved) ? saved : 34;

  const stopDragging = () => {
    if (!isDragging) {
      return;
    }
    isDragging = false;
    layoutRect = null;
    document.body.classList.remove("workunits-resizing");
    safeSetItem(WORKUNITS_SPLIT_KEY, String(currentPercent));
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", stopDragging);
    window.removeEventListener("pointercancel", stopDragging);
  };

  const setByClientX = (clientX) => {
    if (!layoutRect) {
      layoutRect = elements.workunitsLayout.getBoundingClientRect();
    }
    if (!(layoutRect?.width > 0)) {
      return;
    }
    const rawPercent = ((clientX - layoutRect.left) / layoutRect.width) * 100;
    currentPercent = clamp(rawPercent, 25, 75);
    applyWorkUnitsSplitPercent(currentPercent, { persist: false });
  };

  const onPointerMove = (event) => {
    if (!isDragging) {
      return;
    }
    setByClientX(event.clientX);
  };

  elements.workunitsSplitter.addEventListener("pointerdown", (event) => {
    if (window.matchMedia("(max-width: 991.98px)").matches) {
      return;
    }
    event.preventDefault();
    isDragging = true;
    layoutRect = elements.workunitsLayout.getBoundingClientRect();
    setByClientX(event.clientX);
    document.body.classList.add("workunits-resizing");
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", stopDragging);
    window.addEventListener("pointercancel", stopDragging);
  });

  elements.workunitsSplitter.addEventListener("keydown", (event) => {
    if (window.matchMedia("(max-width: 991.98px)").matches) {
      return;
    }
    const current = Number(elements.workunitsSplitter.getAttribute("aria-valuenow") || 34);
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      applyWorkUnitsSplitPercent(current - 2);
      return;
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      applyWorkUnitsSplitPercent(current + 2);
      return;
    }
    if (event.key === "Home") {
      event.preventDefault();
      applyWorkUnitsSplitPercent(25);
      return;
    }
    if (event.key === "End") {
      event.preventDefault();
      applyWorkUnitsSplitPercent(75);
    }
  });
}

async function loadBillDetail(billId, { force = false } = {}) {
  const id = Number(billId);
  if (!Number.isFinite(id) || id <= 0) {
    return;
  }

  const changedBill = Number(state.selectedBillId) !== id;
  state.selectedBillId = id;
  if (changedBill) {
    state.billDetailPage = 1;
  }
  renderBillTable();

  if (!force && state.selectedBillDetail && Number(state.selectedBillDetail.bill_id) === id) {
    renderBillDetailPanel({ row: state.selectedBillDetail });
    return;
  }

  const requestSeq = state.billDetailRequestSeq + 1;
  state.billDetailRequestSeq = requestSeq;
  renderBillDetailPanel({ loading: true });

  try {
    const data = await apiFetch(`/bills/${id}`);
    if (requestSeq !== state.billDetailRequestSeq) {
      return;
    }
    state.selectedBillDetail = data.row || null;
    state.billDetailPage = 1;
    renderBillDetailPanel({ row: state.selectedBillDetail, message: "ไม่พบรายละเอียดบิล" });
  } catch (error) {
    if (requestSeq !== state.billDetailRequestSeq) {
      return;
    }
    state.selectedBillDetail = null;
    renderBillDetailPanel({ message: "โหลดรายละเอียดบิลไม่สำเร็จ" });
    throw error;
  }
}

async function refreshAfterBillMutation() {
  const selectedBillId = state.selectedBillId;
  await Promise.all([loadBills(), loadProductsForBills(), loadDashboard()]);
  if (selectedBillId && state.bills.some((row) => row.bill_id === Number(selectedBillId))) {
    await loadBillDetail(selectedBillId, { force: true });
  }
  if (state.selectedTeamId) {
    await loadTeamIssues();
  }
}

async function handleBillTableClick(event) {
  const button = event.target.closest("button[data-action]");
  const row = event.target.closest("tr[data-bill-id]");
  const billId = Number(button?.dataset.id || row?.dataset.billId || 0);
  if (billId <= 0) {
    return;
  }

  const action = button?.dataset.action || "";
  if (!action) {
    await loadBillDetail(billId);
    return;
  }

  if (action === "view-bill") {
    await loadBillDetail(billId, { force: true });
    return;
  }

  if (!canEdit()) {
    return;
  }

  if (action === "confirm-bill") {
    await apiFetch(`/bills/${billId}/confirm`, {
      method: "POST",
      body: JSON.stringify({})
    });
    await refreshAfterBillMutation();
    showNotice("Confirm เอกสารเรียบร้อย", "success");
    return;
  }

  if (action === "cancel-bill") {
    const reason = window.prompt("เหตุผลลบ/ยกเลิกเอกสาร");
    if (!reason) {
      return;
    }
    await apiFetch(`/bills/${billId}/cancel`, {
      method: "POST",
      body: JSON.stringify({ reason })
    });
    await refreshAfterBillMutation();
    showNotice("ลบเอกสารแบบกู้คืนได้เรียบร้อย", "warning");
    return;
  }

  if (action === "restore-bill") {
    await apiFetch(`/bills/${billId}/restore`, {
      method: "POST",
      body: JSON.stringify({})
    });
    await refreshAfterBillMutation();
    showNotice("กู้คืนเอกสารเรียบร้อย", "success");
    return;
  }

  if (action === "hard-delete-bill") {
    if (!isAdmin()) {
      showNotice("สิทธิ์ไม่เพียงพอสำหรับลบถาวร", "warning");
      return;
    }
    const confirmText = String(window.prompt("พิมพ์ DELETE เพื่อยืนยันการลบถาวร") || "").trim().toUpperCase();
    if (confirmText !== "DELETE") {
      showNotice("ยกเลิกลบถาวร", "secondary");
      return;
    }
    await apiFetch(`/bills/${billId}/permanent`, {
      method: "DELETE"
    });
    await refreshAfterBillMutation();
    showNotice("ลบถาวรเรียบร้อย", "danger");
  }
}

function getActiveReconcileMode() {
  const raw = String(elements.reconcileModeSelect?.value || state.reconcileMode || "legacy").toLowerCase();
  return raw === "wlma" ? "wlma" : "legacy";
}

function buildReconcileTableHead(mode) {
  if (mode === "wlma") {
    return `
      <tr>
        <th>code_wlma</th>
        <th>ชื่ออุปกรณ์</th>
        <th class="text-end">ระบบ (ไฟล์ตั้งต้น)</th>
        <th class="text-end">ในประปา(คืนจาก wlma)</th>
        <th class="text-end">ระบบ(ตั้งต้น) - ประปา</th>
        <th class="text-end">ยังไม่ส่งไป CIS</th>
        <th class="text-end">(ระบบ - ในประปา) - ยังไม่ส่งไป CIS</th>
        <th>หมายเหตุ</th>
      </tr>
    `;
  }
  return `
    <tr>
      <th>ทีม</th>
      <th>รหัสวัสดุ</th>
      <th>รายการ</th>
      <th class="text-end">ระบบ</th>
      <th class="text-end">เบิก</th>
      <th class="text-end">คืน</th>
      <th class="text-end">สุทธิ</th>
      <th class="text-end">Diff</th>
      <th>Note</th>
    </tr>
  `;
}

function applyReconcileModeUI({ clearResult = false } = {}) {
  const mode = getActiveReconcileMode();
  state.reconcileMode = mode;

  if (elements.reconcileDescription) {
    elements.reconcileDescription.textContent = mode === "wlma"
      ? 'ไฟล์ค่างาน: ใช้รหัสอุปกรณ์คอลัมน์ J (9 หลัก), ยอดระบบจากคอลัมน์ระบบ/จำนวน และสถานะใบเบิกคอลัมน์ S = "ยังไม่ส่งไป CIS" เพื่อดูเดี่ยวกับ WLMA (ไม่แยกกองงาน)'
      : "ไฟล์ค่างาน: ใช้ทีมจากคอลัมน์ I, รหัสอุปกรณ์จากคอลัมน์ J (เฉพาะเลข 9 หลัก) และยอดจากคอลัมน์ระบบ/จำนวน เพื่อเทียบกับเบิก-คืนในระบบ";
  }

  if (elements.exportSourceExcelBtn) {
    elements.exportSourceExcelBtn.textContent = mode === "wlma"
      ? "Export ไฟล์ที่ 1: รวมยอดจากไฟล์"
      : "Export ระบบ (แยกกองงาน)";
  }
  if (elements.exportDatasetExcelBtn) {
    elements.exportDatasetExcelBtn.textContent = mode === "wlma"
      ? "Export ไฟล์ที่ 2: รับคืนจาก WLMA"
      : "Export Dataset (แยกกองงาน)";
  }
  if (elements.exportReconExcelBtn) {
    elements.exportReconExcelBtn.textContent = mode === "wlma"
      ? "Export ไฟล์ที่ 3: กระทบยอด WLMA"
      : "Export ผลต่าง (ระบบ-Dataset)";
  }

  if (elements.reconcileTableHead) {
    elements.reconcileTableHead.innerHTML = buildReconcileTableHead(mode);
  }

  if (clearResult) {
    state.reconcileRows = [];
    state.reconcileMeta = null;
  }
  renderReconcileTable();
}

async function runReconcile() {
  const file = elements.excelFileInput.files?.[0];
  if (!file) {
    showNotice("กรุณาเลือกไฟล์ Excel ก่อน", "warning");
    return;
  }
  if (elements.runReconcileBtn.disabled) {
    return;
  }

  elements.runReconcileBtn.disabled = true;
  if (elements.exportSourceExcelBtn) {
    elements.exportSourceExcelBtn.disabled = true;
  }
  if (elements.exportDatasetExcelBtn) {
    elements.exportDatasetExcelBtn.disabled = true;
  }
  if (elements.exportReconExcelBtn) {
    elements.exportReconExcelBtn.disabled = true;
  }

  setReconcileProgress(0, "เริ่มอัปโหลดไฟล์...");

  const formData = new FormData();
  formData.append("file", file);
  const reconcileMode = getActiveReconcileMode();
  state.reconcileMode = reconcileMode;

  const query = new URLSearchParams();
  query.set("warehouse_id", String(state.currentWarehouseId));
  query.set("reconcile_mode", reconcileMode);
  if (elements.reconcileFromInput.value) {
    query.set("from", elements.reconcileFromInput.value);
  }
  if (elements.reconcileToInput.value) {
    query.set("to", elements.reconcileToInput.value);
  }

  const url = `${API_BASE}/reconcile/upload?${query.toString()}`;
  let processingTick = null;

  try {
    const data = await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      let processingPercent = 70;

      xhr.open("POST", url, true);
      if (state.token) {
        xhr.setRequestHeader("Authorization", `Bearer ${state.token}`);
      }

      xhr.upload.onprogress = (event) => {
        if (!event.lengthComputable) {
          return;
        }
        const uploadPercent = Math.min(70, Math.round((event.loaded / event.total) * 70));
        setReconcileProgress(uploadPercent, "กำลังอัปโหลดไฟล์...");
      };

      xhr.upload.onloadend = () => {
        setReconcileProgress(70, "อัปโหลดเสร็จ กำลังประมวลผลข้อมูล...");
        if (processingTick) {
          window.clearInterval(processingTick);
        }
        processingTick = window.setInterval(() => {
          processingPercent = Math.min(95, processingPercent + 1);
          setReconcileProgress(processingPercent, "กำลังประมวลผลข้อมูลกระทบยอด...");
          if (processingPercent >= 95 && processingTick) {
            window.clearInterval(processingTick);
            processingTick = null;
          }
        }, 250);
      };

      xhr.onerror = () => {
        reject(new Error("Network error"));
      };

      xhr.onload = () => {
        if (processingTick) {
          window.clearInterval(processingTick);
          processingTick = null;
        }

        let payload = {};
        try {
          payload = JSON.parse(xhr.responseText || "{}");
        } catch (_error) {
          payload = {};
        }

        if (xhr.status >= 200 && xhr.status < 300) {
          setReconcileProgress(100, "ประมวลผลเสร็จสมบูรณ์");
          resolve(payload);
          return;
        }
        reject(new Error(payload.message || "Reconcile failed"));
      };

      xhr.send(formData);
    });

    state.reconcileRows = data.rows || [];
    state.reconcileMeta = data;
    state.reconcileMode = String(data.reconcile_mode || state.reconcileMode || "legacy").toLowerCase() === "wlma"
      ? "wlma"
      : "legacy";
    renderReconcileTable();
    showNotice("กระทบยอดเสร็จแล้ว", "success");
  } finally {
    if (processingTick) {
      window.clearInterval(processingTick);
    }
    window.setTimeout(() => {
      hideReconcileProgress();
    }, 900);
    elements.runReconcileBtn.disabled = false;
    if (elements.exportSourceExcelBtn) {
      elements.exportSourceExcelBtn.disabled = false;
    }
    if (elements.exportDatasetExcelBtn) {
      elements.exportDatasetExcelBtn.disabled = false;
    }
    if (elements.exportReconExcelBtn) {
      elements.exportReconExcelBtn.disabled = false;
    }
  }
}

function renderReconcileTable() {
  const meta = state.reconcileMeta;
  const rows = state.reconcileRows;
  const modeFromMeta = String(meta?.reconcile_mode || "").toLowerCase();
  const mode = modeFromMeta === "wlma" ? "wlma" : state.reconcileMode === "wlma" ? "wlma" : "legacy";

  if (elements.reconcileTableHead) {
    elements.reconcileTableHead.innerHTML = buildReconcileTableHead(mode);
  }

  const filteredPart = meta?.filtered_rows != null
    ? ` | แถวที่ใช้คำนวณ: ${formatNumber(meta.filtered_rows)}`
    : "";
  elements.reconcileMeta.textContent = meta
    ? `ไฟล์: ${meta.file_name} | แถวที่อ่าน: ${formatNumber(meta.source_rows)}${filteredPart} | แถวที่แสดง: ${formatNumber(rows.length)}`
    : "ยังไม่ได้อัปโหลดไฟล์";

  if (mode === "wlma") {
    elements.reconcileTableBody.innerHTML = rows.length
      ? rows
          .map((row) => `
            <tr>
              <td>${row.product_code_wlma}</td>
              <td>${row.product_name}</td>
              <td class="text-end">${formatNumber(row.system_qty ?? row.excel_qty)}</td>
              <td class="text-end">${formatNumber(row.return_wlma_qty)}</td>
              <td class="text-end ${Number(row.gap_qty ?? (Number(row.system_qty || 0) - Number(row.return_wlma_qty || 0))) === 0 ? "recon-zero" : Number(row.gap_qty ?? (Number(row.system_qty || 0) - Number(row.return_wlma_qty || 0))) > 0 ? "recon-positive" : "text-danger fw-semibold"}">${formatNumber(row.gap_qty ?? (Number(row.system_qty || 0) - Number(row.return_wlma_qty || 0)))}</td>
              <td class="text-end">${formatNumber(row.pending_cis_qty)}</td>
              <td class="text-end ${Number(row.final_gap_qty ?? ((Number(row.gap_qty ?? (Number(row.system_qty || 0) - Number(row.return_wlma_qty || 0)))) - Number(row.pending_cis_qty || 0))) === 0 ? "recon-zero" : Number(row.final_gap_qty ?? ((Number(row.gap_qty ?? (Number(row.system_qty || 0) - Number(row.return_wlma_qty || 0)))) - Number(row.pending_cis_qty || 0))) > 0 ? "recon-positive" : "text-danger fw-semibold"}">${formatNumber(row.final_gap_qty ?? ((Number(row.gap_qty ?? (Number(row.system_qty || 0) - Number(row.return_wlma_qty || 0)))) - Number(row.pending_cis_qty || 0)))}</td>
              <td>${row.note}</td>
            </tr>
          `)
          .join("")
      : '<tr><td colspan="8" class="text-center text-muted py-4">ยังไม่มีข้อมูลกระทบยอด</td></tr>';
    return;
  }

  elements.reconcileTableBody.innerHTML = rows.length
    ? rows
        .map((row) => `
          <tr>
            <td>${row.team_code}</td>
            <td>${row.product_code_wlma}</td>
            <td>${row.product_name}</td>
            <td class="text-end">${formatNumber(row.system_qty ?? row.excel_qty)}</td>
            <td class="text-end">${formatNumber(row.issue_qty)}</td>
            <td class="text-end">${formatNumber(row.return_qty)}</td>
            <td class="text-end">${formatNumber(row.net_qty ?? row.app_qty)}</td>
            <td class="text-end ${Number(row.diff_qty) === 0 ? "recon-zero" : Number(row.diff_qty) > 0 ? "recon-positive" : "text-danger fw-semibold"}">${formatNumber(row.diff_qty)}</td>
            <td>${row.note}</td>
          </tr>
        `)
        .join("")
    : '<tr><td colspan="9" class="text-center text-muted py-4">ยังไม่มีข้อมูลกระทบยอด</td></tr>';
}

function parseContentDispositionFilename(value) {
  if (!value) {
    return "";
  }
  const utf8Match = value.match(/filename\\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1]);
    } catch (_error) {
      return utf8Match[1];
    }
  }
  const plainMatch = value.match(/filename=\"?([^\";]+)\"?/i);
  return plainMatch?.[1] || "";
}

async function exportReconcileWorkbook(mode) {
  if (!state.reconcileRows.length) {
    showNotice("ยังไม่มีข้อมูลกระทบยอด", "warning");
    return;
  }

  const response = await fetch(`${API_BASE}/reconcile/export`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(state.token ? { Authorization: `Bearer ${state.token}` } : {})
    },
    body: JSON.stringify({
      mode,
      reconcile_mode: getActiveReconcileMode(),
      file_name: state.reconcileMeta?.file_name || `reconcile_${new Date().toISOString().slice(0, 10)}.xlsx`,
      rows: state.reconcileRows
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Export failed");
  }

  const blob = await response.blob();
  const fileName = parseContentDispositionFilename(response.headers.get("content-disposition"))
    || `reconcile_${mode}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function exportSourceExcel() {
  return exportReconcileWorkbook("source");
}

function exportDatasetExcel() {
  return exportReconcileWorkbook("dataset");
}

function exportReconcileExcel() {
  return exportReconcileWorkbook("diff");
}

async function loadUsers() {
  if (!isAdmin()) {
    elements.userTableBody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-4">admin only</td></tr>';
    return;
  }
  const data = await apiFetch("/users");
  state.users = data.rows || [];
  renderUsers();
}

function renderUsers() {
  elements.userTableBody.innerHTML = state.users.length
    ? state.users
        .map((row) => `
          <tr>
            <td class="fw-semibold">${row.username}</td>
            <td>${row.display_name}</td>
            <td>
              <select class="form-select form-select-sm user-role-select" data-id="${row.user_id}">
                <option value="ADMIN" ${row.role === "ADMIN" ? "selected" : ""}>ADMIN</option>
                <option value="STOREKEEPER" ${row.role === "STOREKEEPER" ? "selected" : ""}>STOREKEEPER</option>
                <option value="VIEWER" ${row.role === "VIEWER" ? "selected" : ""}>VIEWER</option>
              </select>
            </td>
            <td>${statusBadge(row.is_active ? "active" : "inactive")}</td>
            <td class="text-end">
              <button class="btn btn-sm btn-outline-secondary toggle-user-btn" data-id="${row.user_id}" data-active="${row.is_active ? 1 : 0}">
                ${row.is_active ? "Disable" : "Enable"}
              </button>
            </td>
          </tr>
        `)
        .join("")
    : '<tr><td colspan="5" class="text-center text-muted py-4">ไม่พบผู้ใช้งาน</td></tr>';
}
async function createUser(event) {
  event.preventDefault();
  if (!isAdmin()) {
    return;
  }
  const username = elements.newUsernameInput.value.trim();
  const displayName = elements.newDisplayNameInput.value.trim();
  const password = elements.newPasswordInput.value.trim();
  const role = elements.newRoleInput.value;

  const payload = {
    username,
    display_name: displayName,
    password,
    role
  };
  if (!username || !displayName || !password) {
    showNotice("กรอกข้อมูลผู้ใช้ให้ครบ", "warning");
    return;
  }
  if (username.length < 3) {
    showNotice("Username ต้องอย่างน้อย 3 ตัวอักษร", "warning");
    return;
  }
  if (displayName.length < 2) {
    showNotice("ชื่อแสดงผลต้องอย่างน้อย 2 ตัวอักษร", "warning");
    return;
  }
  if (password.length < 6) {
    showNotice("รหัสผ่านต้องอย่างน้อย 6 ตัวอักษร", "warning");
    return;
  }
  if (!["ADMIN", "STOREKEEPER", "VIEWER"].includes(role)) {
    showNotice("สิทธิ์ผู้ใช้ไม่ถูกต้อง", "warning");
    return;
  }

  await apiFetch("/users", {
    method: "POST",
    body: JSON.stringify(payload)
  });
  elements.userForm.reset();
  elements.newRoleInput.value = "STOREKEEPER";
  await loadUsers();
  showNotice("สร้างผู้ใช้งานเรียบร้อย", "success");
}

async function handleUserTableChange(event) {
  const roleSelect = event.target.closest(".user-role-select");
  if (!roleSelect || !isAdmin()) {
    return;
  }
  const userId = Number(roleSelect.dataset.id || 0);
  await apiFetch(`/users/${userId}`, {
    method: "PATCH",
    body: JSON.stringify({
      role: roleSelect.value
    })
  });
  await loadUsers();
  showNotice("อัปเดต role เรียบร้อย", "success");
}

async function handleUserTableClick(event) {
  const button = event.target.closest(".toggle-user-btn");
  if (!button || !isAdmin()) {
    return;
  }
  const userId = Number(button.dataset.id || 0);
  const active = Number(button.dataset.active || 0) === 1;
  await apiFetch(`/users/${userId}`, {
    method: "PATCH",
    body: JSON.stringify({
      is_active: !active
    })
  });
  await loadUsers();
  showNotice("อัปเดตสถานะผู้ใช้เรียบร้อย", "success");
}

async function loadAudits() {
  const data = await apiFetch("/audits?limit=250");
  state.audits = data.rows || [];
  elements.auditTableBody.innerHTML = state.audits.length
    ? state.audits
        .map((row) => `
          <tr>
            <td>${formatDate(row.created_at)}</td>
            <td>${row.display_name || row.username || "system"}</td>
            <td>${row.action}</td>
            <td>${row.entity}:${row.entity_id}</td>
            <td><small>${row.detail_json ? JSON.stringify(row.detail_json) : "-"}</small></td>
          </tr>
        `)
        .join("")
    : '<tr><td colspan="5" class="text-center text-muted py-4">ไม่มี audit log</td></tr>';
}

async function loadViewData(view) {
  if (view === "dashboard") {
    await loadDashboard();
    return;
  }
  if (view === "products") {
    await loadProducts();
    return;
  }
  if (view === "workunits") {
    await loadTeams();
    await loadTeamIssues();
    return;
  }
  if (view === "bills") {
    await Promise.all([loadProductsForBills(), loadTeams(), loadBills()]);
    applyBillCreatorIdentity();
    ensureBillItems();
    return;
  }
  if (view === "reconcile") {
    renderReconcileTable();
    return;
  }
  if (view === "users") {
    await loadUsers();
    return;
  }
  if (view === "audit") {
    await loadAudits();
  }
}

function bindEvents() {
  elements.loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    hideLoginNotice();
    try {
      const payload = {
        username: elements.loginUsername.value.trim(),
        password: elements.loginPassword.value.trim()
      };
      const data = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      }).then((r) => r.json().then((json) => ({ ok: r.ok, data: json })));

      if (!data.ok) {
        throw new Error(data.data.message || "Login failed");
      }
      state.token = data.data.token;
      state.user = data.data.user;
      await bootstrapData();
      safeSetItem(TOKEN_KEY, state.token);
      safeSetItem(USER_KEY, JSON.stringify(state.user));
      showApp();
    } catch (error) {
      showLoginNotice(error.message);
    }
  });

  elements.logoutBtn.addEventListener("click", () => {
    clearSession();
    showAuth();
  });

  elements.sidebarToggleBtn?.addEventListener("click", () => {
    if (!isDesktopViewport()) {
      return;
    }
    const isCollapsed = elements.appShell?.classList.contains("sidebar-collapsed");
    applySidebarCollapsed(!isCollapsed, { persist: true });
  });

  window.addEventListener("resize", () => {
    if (!isDesktopViewport()) {
      applySidebarCollapsed(false, { persist: false });
      return;
    }
    const saved = safeGetItem(SIDEBAR_COLLAPSED_KEY) === "1";
    applySidebarCollapsed(saved, { persist: false });
  });

  elements.navButtons.forEach((button) => {
    button.addEventListener("click", () => showView(button.dataset.view));
  });

  elements.warehouseSelect.addEventListener("change", async () => {
    state.currentWarehouseId = Number(elements.warehouseSelect.value || 1);
    safeSetItem(WAREHOUSE_KEY, String(state.currentWarehouseId));
    await loadViewData(state.currentView);
  });

  elements.refreshAllBtn.addEventListener("click", async () => {
    await bootstrapData();
    await loadViewData(state.currentView);
    showNotice("รีเฟรชข้อมูลเรียบร้อย", "success");
  });

  elements.goProductsBtn.addEventListener("click", () => showView("products"));

  const debouncedLoadProducts = debounce(() => {
    loadProducts({ resetPage: true }).catch((error) => showNotice(error.message, "danger"));
  }, 300);
  elements.productSearchInput.addEventListener("input", debouncedLoadProducts);
  elements.productStatusFilter.addEventListener("change", () => loadProducts({ resetPage: true }).catch((error) => showNotice(error.message, "danger")));
  elements.productSortSelect?.addEventListener("change", () => applyProductListState({ resetPage: true }));
  elements.productPageSizeSelect?.addEventListener("change", () => applyProductListState({ resetPage: true }));
  elements.productAsOfDateInput?.addEventListener("change", () => loadProducts({ resetPage: true }).catch((error) => showNotice(error.message, "danger")));
  elements.productAsOfClearBtn?.addEventListener("click", () => {
    if (elements.productAsOfDateInput) {
      elements.productAsOfDateInput.value = "";
    }
    loadProducts({ resetPage: true }).catch((error) => showNotice(error.message, "danger"));
  });
  elements.productClearFiltersBtn?.addEventListener("click", () => {
    if (elements.productSearchInput) {
      elements.productSearchInput.value = "";
    }
    if (elements.productStatusFilter) {
      elements.productStatusFilter.value = "all";
    }
    if (elements.productSortSelect) {
      elements.productSortSelect.value = "code_asc";
    }
    if (elements.productPageSizeSelect) {
      elements.productPageSizeSelect.value = "25";
    }
    if (elements.productAsOfDateInput) {
      elements.productAsOfDateInput.value = "";
    }
    loadProducts({ resetPage: true }).catch((error) => showNotice(error.message, "danger"));
  });
  elements.openProductModalBtn.addEventListener("click", () => openProductModal(null));
  elements.productForm.addEventListener("submit", (event) => saveProduct(event).catch((error) => showNotice(error.message, "danger")));
  elements.adjustStockForm?.addEventListener("submit", (event) => submitAdjustStock(event).catch((error) => showNotice(error.message, "danger")));
  elements.productListPager?.addEventListener("click", (event) => handleProductListPagerInteraction(event).catch((error) => showNotice(error.message, "danger")));
  elements.productTableBody.addEventListener("click", (event) => {
    const editBtn = event.target.closest("button[data-action='edit-product']");
    if (editBtn) {
      const id = Number(editBtn.dataset.id || 0);
      const row = state.productsRaw.find((item) => item.product_id === id);
      if (row) {
        openProductModal(row);
      }
      return;
    }
    const adjustBtn = event.target.closest("button[data-action='adjust-stock']");
    if (adjustBtn) {
      const id = Number(adjustBtn.dataset.id || 0);
      const row = state.productsRaw.find((item) => item.product_id === id);
      if (row) {
        openAdjustStockModal(row);
      }
    }
  });

  elements.openWorkUnitModalBtn.addEventListener("click", () => openWorkUnitModal(null));
  elements.workUnitForm.addEventListener("submit", (event) => saveWorkUnit(event).catch((error) => showNotice(error.message, "danger")));
  elements.workUnitTableBody.addEventListener("click", (event) => {
    const actionBtn = event.target.closest("button[data-action]");
    if (actionBtn) {
      if (!isAdmin()) {
        return;
      }
      const teamId = Number(actionBtn.dataset.id || 0);
      const team = state.teams.find((item) => item.team_id === teamId);
      if (!team) {
        return;
      }
      if (actionBtn.dataset.action === "edit-team") {
        openWorkUnitModal(team);
      }
      if (actionBtn.dataset.action === "delete-team") {
        deleteWorkUnit(teamId).catch((error) => showNotice(error.message, "danger"));
      }
      return;
    }

    const row = event.target.closest(".workunit-row");
    if (!row) {
      return;
    }
    state.selectedTeamId = Number(row.dataset.teamId || 0);
    renderTeamTable();
    loadTeamIssues().catch((error) => showNotice(error.message, "danger"));
  });
  elements.workUnitTableBody.addEventListener("dblclick", (event) => {
    if (!isAdmin()) {
      return;
    }
    if (event.target.closest("button[data-action]")) {
      return;
    }
    const row = event.target.closest(".workunit-row");
    if (!row) {
      return;
    }
    const teamId = Number(row.dataset.teamId || 0);
    const team = state.teams.find((item) => item.team_id === teamId);
    if (team) {
      openWorkUnitModal(team);
    }
  });
  elements.teamIssueFilterBtn.addEventListener("click", () => loadTeamIssues().catch((error) => showNotice(error.message, "danger")));
  elements.teamIssueMode?.addEventListener("change", () => loadTeamIssues().catch((error) => showNotice(error.message, "danger")));

  elements.billTypeSelect.addEventListener("change", renderBillTypeState);
  elements.billTeamSearchInput.addEventListener("input", () => {
    renderTeamSelectOptions(elements.billTeamSearchInput.value);
    resolveTeamFromInput({ coerce: false });
  });
  elements.billTeamSearchInput.addEventListener("change", () => {
    resolveTeamFromInput({ coerce: true });
    renderTeamSelectOptions(elements.billTeamSearchInput.value);
  });
  elements.billTeamSearchInput.addEventListener("blur", () => {
    resolveTeamFromInput({ coerce: true });
  });
  elements.addBillItemBtn.addEventListener("click", () => {
    appendBillItemRow();
  });
  elements.billItemsWrap.addEventListener("click", (event) => {
    const button = event.target.closest(".remove-item-btn");
    if (!button) {
      return;
    }
    const rows = elements.billItemsWrap.querySelectorAll(".bill-items-row");
    if (rows.length <= 1) {
      showNotice("ต้องมีอย่างน้อย 1 รายการ", "warning");
      return;
    }
    button.closest(".bill-items-row")?.remove();
    renumberBillItemRows();
  });
  elements.billItemsWrap.addEventListener("input", (event) => {
    const row = event.target.closest(".bill-items-row");
    if (!row) {
      return;
    }
    if (event.target.classList.contains("bill-item-wlma")) {
      syncBillRowFromField(row, "wlma", { coerce: false });
      return;
    }
    if (event.target.classList.contains("bill-item-product-name")) {
      syncBillRowFromField(row, "product", { coerce: false });
      return;
    }
    if (event.target.classList.contains("bill-item-qty")) {
      const value = Number(event.target.value || 0);
      if (value < 0) {
        event.target.value = "0";
      }
    }
  });
  elements.billItemsWrap.addEventListener("change", (event) => {
    const row = event.target.closest(".bill-items-row");
    if (!row) {
      return;
    }
    if (event.target.classList.contains("bill-item-wlma")) {
      syncBillRowFromField(row, "wlma", { coerce: true });
      return;
    }
    if (event.target.classList.contains("bill-item-product-name")) {
      syncBillRowFromField(row, "product", { coerce: true });
    }
  });
  elements.billForm.addEventListener("submit", (event) => submitBillForm(event).catch((error) => showNotice(error.message, "danger")));
  elements.billStatusFilter.addEventListener("change", () => loadBills({ resetPage: true }).catch((error) => showNotice(error.message, "danger")));
  elements.billTypeFilter.addEventListener("change", () => loadBills({ resetPage: true }).catch((error) => showNotice(error.message, "danger")));
  elements.billFromInput?.addEventListener("change", () => loadBills({ resetPage: true }).catch((error) => showNotice(error.message, "danger")));
  elements.billToInput?.addEventListener("change", () => loadBills({ resetPage: true }).catch((error) => showNotice(error.message, "danger")));
  elements.billPageSizeSelect?.addEventListener("change", () => loadBills({ resetPage: true }).catch((error) => showNotice(error.message, "danger")));
  elements.billClearFiltersBtn?.addEventListener("click", () => {
    if (elements.billStatusFilter) {
      elements.billStatusFilter.value = "all";
    }
    if (elements.billTypeFilter) {
      elements.billTypeFilter.value = "all";
    }
    if (elements.billFromInput) {
      elements.billFromInput.value = "";
    }
    if (elements.billToInput) {
      elements.billToInput.value = "";
    }
    if (elements.billPageSizeSelect) {
      elements.billPageSizeSelect.value = "25";
    }
    loadBills({ resetPage: true }).catch((error) => showNotice(error.message, "danger"));
  });
  elements.billListPager?.addEventListener("click", (event) => handleBillListPagerInteraction(event).catch((error) => showNotice(error.message, "danger")));
  elements.billTableBody.addEventListener("click", (event) => handleBillTableClick(event).catch((error) => showNotice(error.message, "danger")));
  elements.billDetailContent?.addEventListener("click", handleBillDetailContentInteraction);
  elements.billDetailContent?.addEventListener("change", handleBillDetailContentInteraction);

  elements.reconcileModeSelect?.addEventListener("change", () => {
    applyReconcileModeUI({ clearResult: true });
  });
  elements.runReconcileBtn.addEventListener("click", () => runReconcile().catch((error) => showNotice(error.message, "danger")));
  elements.exportSourceExcelBtn?.addEventListener("click", () => exportSourceExcel().catch((error) => showNotice(error.message, "danger")));
  elements.exportDatasetExcelBtn?.addEventListener("click", () => exportDatasetExcel().catch((error) => showNotice(error.message, "danger")));
  elements.exportReconExcelBtn?.addEventListener("click", () => exportReconcileExcel().catch((error) => showNotice(error.message, "danger")));

  elements.userForm.addEventListener("submit", (event) => createUser(event).catch((error) => showNotice(error.message, "danger")));
  elements.userTableBody.addEventListener("change", (event) => handleUserTableChange(event).catch((error) => showNotice(error.message, "danger")));
  elements.userTableBody.addEventListener("click", (event) => handleUserTableClick(event).catch((error) => showNotice(error.message, "danger")));
}

async function init() {
  const savedSidebarCollapsed = safeGetItem(SIDEBAR_COLLAPSED_KEY) === "1";
  applySidebarCollapsed(isDesktopViewport() ? savedSidebarCollapsed : false, { persist: false });
  bindEvents();
  initWorkUnitsSplitter();
  initBillsSplitter();
  ensureBillItems();
  renderBillTypeState();
  applyReconcileModeUI();
  hideReconcileProgress();
  await loadSession();
  window.setInterval(() => {
    if (state.user) {
      elements.topTime.textContent = formatDate(new Date());
    }
  }, 30000);
}

init();
