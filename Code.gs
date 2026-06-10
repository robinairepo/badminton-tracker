// ============================================================
// BADMINTON TRACKER - Google Apps Script Backend v2
// ============================================================

const SHEET_PLAYERS   = "Players";
const SHEET_SESSIONS  = "Sessions";
const SHEET_EXPENSES  = "Expenses";
const SHEET_PLAY_LOG  = "PlayLog";

function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ensureSheet(ss, SHEET_PLAYERS,  ["id","name","status","added_date","deactivated_date"]);
  ensureSheet(ss, SHEET_SESSIONS, ["session_id","date","num_players","cost_type","cost_desc","amount","per_head","paid_by"]);
  ensureSheet(ss, SHEET_EXPENSES, ["expense_id","date","amount","description","player_ids","expense_scope"]);
  ensureSheet(ss, SHEET_PLAY_LOG, ["log_id","session_id","player_id","amount_owed"]);
  return ok("Setup complete");
}

function ensureSheet(ss, name, headers) {
  let sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.appendRow(headers);
    sh.setFrozenRows(1);
  }
  return sh;
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const { action, payload } = body;
    let result;
    switch (action) {
      case "setup":            result = setup(); break;
      case "addPlayer":        result = addPlayer(payload); break;
      case "getPlayers":       result = getPlayers(); break;
      case "setPlayerStatus":  result = setPlayerStatus(payload); break;
      case "saveSession":      result = saveSession(payload); break;
      case "getSession":       result = getSession(payload); break;
      case "saveExpense":      result = saveExpense(payload); break;
      case "getExpenses":      result = getExpenses(payload); break;
      case "getReport":        result = getReport(payload); break;
      default:                 result = err("Unknown action: " + action);
    }
    return json(result);
  } catch(ex) {
    return json(err(ex.message));
  }
}

function doGet(e) {
  return json(ok("Badminton Tracker API v2 is live"));
}

// ── Players ──────────────────────────────────────────────────
function addPlayer({ name }) {
  const ss  = SpreadsheetApp.getActiveSpreadsheet();
  const sh  = ss.getSheetByName(SHEET_PLAYERS);
  const id  = "P" + Date.now();
  const now = getISTDate();
  sh.appendRow([id, name.trim(), "active", now, ""]);
  return ok({ id, name: name.trim(), status:"active", added_date: now, deactivated_date: "" });
}

function getPlayers() {
  const rows = sheetRows(SHEET_PLAYERS);
  return ok(rows.map(r => ({
    id: r.id, name: r.name, status: r.status,
    added_date: r.added_date, deactivated_date: r.deactivated_date || ""
  })));
}

function setPlayerStatus({ id, status }) {
  const ss  = SpreadsheetApp.getActiveSpreadsheet();
  const sh  = ss.getSheetByName(SHEET_PLAYERS);
  const data = sh.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === id) {
      sh.getRange(i+1, 3).setValue(status);
      const deactivated = status === "inactive" ? getISTDate() : "";
      sh.getRange(i+1, 5).setValue(deactivated);
      return ok({ id, status });
    }
  }
  return err("Player not found");
}

// ── Sessions ──────────────────────────────────────────────────
function saveSession({ date, num_players, cost_type, cost_desc, amount, paid_by, players }) {
  // Use script lock to prevent duplicate writes from rapid calls
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const ss   = SpreadsheetApp.getActiveSpreadsheet();
    const shS  = ss.getSheetByName(SHEET_SESSIONS);
    const shL  = ss.getSheetByName(SHEET_PLAY_LOG);
    const per  = players.length > 0 ? (parseFloat(amount) / players.length).toFixed(2) : 0;

    // Delete ALL existing rows for this date before writing
    deleteSessionByDate(ss, date);

    const sid = "S" + Date.now();
    shS.appendRow([sid, date, num_players, cost_type, cost_desc, parseFloat(amount), parseFloat(per), paid_by || ""]);

    players.forEach(pid => {
      shL.appendRow(["L" + Date.now() + Math.random().toString(36).slice(2), sid, pid, parseFloat(per)]);
    });

    SpreadsheetApp.flush();
    return ok({ session_id: sid, date, per_head: per, paid_by: paid_by || "" });
  } finally {
    lock.releaseLock();
  }
}

function deleteSessionByDate(ss, date) {
  const shS = ss.getSheetByName(SHEET_SESSIONS);
  const shL = ss.getSheetByName(SHEET_PLAY_LOG);
  const sData = shS.getDataRange().getValues();
  const sidsToDelete = [];
  for (let i = sData.length - 1; i >= 1; i--) {
    if (sData[i][1] === date) {
      sidsToDelete.push(sData[i][0]);
      shS.deleteRow(i + 1);
    }
  }
  if (sidsToDelete.length > 0) {
    const lData = shL.getDataRange().getValues();
    for (let i = lData.length - 1; i >= 1; i--) {
      if (sidsToDelete.includes(lData[i][1])) shL.deleteRow(i + 1);
    }
  }
}

function getSession({ date }) {
  const sessions = sheetRows(SHEET_SESSIONS);
  const session  = sessions.find(r => r.date === date);
  if (!session) return ok(null);
  const logs = sheetRows(SHEET_PLAY_LOG).filter(r => r.session_id === session.session_id);
  return ok({ ...session, paid_by: session.paid_by || "", players: logs.map(r => r.player_id) });
}

// ── Expenses ──────────────────────────────────────────────────
// expense_scope: "player" (split among players), "group" (not apportioned)
function saveExpense({ date, amount, description, player_ids, expense_scope }) {
  const ss  = SpreadsheetApp.getActiveSpreadsheet();
  const sh  = ss.getSheetByName(SHEET_EXPENSES);
  const eid = "E" + Date.now();
  const scope = expense_scope || "player";
  sh.appendRow([eid, date, parseFloat(amount), description, (player_ids||[]).join(","), scope]);
  return ok({ expense_id: eid });
}

function getExpenses({ from, to }) {
  const rows = sheetRows(SHEET_EXPENSES);
  const filtered = rows.filter(r => r.date >= from && r.date <= to);
  return ok(filtered.map(r => ({
    ...r,
    player_ids: r.player_ids ? r.player_ids.split(",").filter(Boolean) : [],
    expense_scope: r.expense_scope || "player"
  })));
}

// ── Reports ──────────────────────────────────────────────────
function getReport({ from, to }) {
  const players  = sheetRows(SHEET_PLAYERS);
  const sessions = sheetRows(SHEET_SESSIONS).filter(r => r.date >= from && r.date <= to);
  const logs     = sheetRows(SHEET_PLAY_LOG);
  const expenses = sheetRows(SHEET_EXPENSES).filter(r => r.date >= from && r.date <= to);

  const sidSet = new Set(sessions.map(s => s.session_id));
  const relevantLogs = logs.filter(l => sidSet.has(l.session_id));
  const sessionMap = {};
  sessions.forEach(s => { sessionMap[s.session_id] = s; });

  const report = {};
  players.forEach(p => {
    report[p.id] = {
      id: p.id, name: p.name,
      weekday_sessions: 0, weekend_sessions: 0,
      weekday_cost: 0, weekend_cost: 0
    };
  });

  relevantLogs.forEach(l => {
    const s = sessionMap[l.session_id];
    if (!s || !report[l.player_id]) return;
    const dow = new Date(s.date).getDay();
    const isWeekend = dow === 0 || dow === 6;
    if (isWeekend) {
      report[l.player_id].weekend_sessions++;
      report[l.player_id].weekend_cost += parseFloat(l.amount_owed) || 0;
    } else {
      report[l.player_id].weekday_sessions++;
      report[l.player_id].weekday_cost += parseFloat(l.amount_owed) || 0;
    }
  });

  // Player-scoped incidental expenses
  expenses.filter(e => (e.expense_scope||"player") === "player").forEach(exp => {
    const pids = exp.player_ids ? exp.player_ids.split(",").filter(Boolean) : [];
    if (pids.length === 0) return;
    const share = parseFloat(exp.amount) / pids.length;
    const dow = new Date(exp.date).getDay();
    const isWeekend = dow === 0 || dow === 6;
    pids.forEach(pid => {
      if (!report[pid]) return;
      if (isWeekend) report[pid].weekend_cost += share;
      else report[pid].weekday_cost += share;
    });
  });

  // Group expenses (not apportioned)
  const groupExpenses = expenses
    .filter(e => (e.expense_scope||"player") === "group")
    .map(e => ({ date: e.date, amount: parseFloat(e.amount), description: e.description }));

  return ok({ players: Object.values(report), group_expenses: groupExpenses });
}

// ── Helpers ──────────────────────────────────────────────────
function getISTDate() {
  const now = new Date();
  const ist = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
  return ist.toISOString().slice(0,10);
}

function sheetRows(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName(name);
  if (!sh) return [];
  const vals = sh.getDataRange().getValues();
  if (vals.length < 2) return [];
  const headers = vals[0];
  return vals.slice(1).map(r => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = r[i] !== undefined ? String(r[i]) : ""; });
    return obj;
  });
}

function ok(data)  { return { status: "ok", data }; }
function err(msg)  { return { status: "error", message: msg }; }
function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
