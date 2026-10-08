const expressionEl = document.getElementById("expression");
const resultEl = document.getElementById("result");
const historyPanel = document.getElementById("historyPanel");
const historyList = document.getElementById("historyList");

let current = "0";
let stored = null;
let operator = null;
let waitingForOperand = false;
let expressionText = "";
let history = [];

try {
  history = JSON.parse(localStorage.getItem("calculatorHistory") || "[]");
} catch {
  history = [];
}

function formatNumber(value) {
  if (!Number.isFinite(value)) return "Error";
  const rounded = Math.round((value + Number.EPSILON) * 1e10) / 1e10;
  return String(rounded);
}

function updateDisplay() {
  resultEl.textContent = current;
  expressionEl.textContent = expressionText;
}

function clearAll() {
  current = "0";
  stored = null;
  operator = null;
  waitingForOperand = false;
  expressionText = "";
  updateDisplay();
}

function inputDigit(digit) {
  if (current === "Error" || waitingForOperand) {
    current = digit;
    waitingForOperand = false;
  } else {
    current = current === "0" ? digit : current + digit;
  }
  updateDisplay();
}

function inputDecimal() {
  if (current === "Error" || waitingForOperand) {
    current = "0.";
    waitingForOperand = false;
  } else if (!current.includes(".")) {
    current += ".";
  }
  updateDisplay();
}

function deleteLast() {
  if (waitingForOperand || current === "Error") return;
  current = current.length > 1 ? current.slice(0, -1) : "0";
  if (current === "-0") current = "0";
  updateDisplay();
}

function percent() {
  const value = Number(current);
  if (!Number.isFinite(value)) return;
  current = formatNumber(value / 100);
  updateDisplay();
}

function calculate(a, b, op) {
  if (op === "+") return a + b;
  if (op === "-") return a - b;
  if (op === "*") return a * b;
  if (op === "/") return b === 0 ? Infinity : a / b;
  return b;
}

function chooseOperator(nextOperator) {
  const inputValue = Number(current);
  if (!Number.isFinite(inputValue)) {
    clearAll();
    return;
  }

  if (operator && stored !== null && !waitingForOperand) {
    const computed = calculate(stored, inputValue, operator);
    if (!Number.isFinite(computed)) {
      current = "Error";
      expressionText = "No se puede dividir entre 0";
      stored = null;
      operator = null;
      waitingForOperand = true;
      updateDisplay();
      return;
    }
    stored = computed;
    current = formatNumber(computed);
  } else {
    stored = inputValue;
  }

  operator = nextOperator;
  waitingForOperand = true;
  expressionText = `${formatNumber(stored)} ${displayOperator(operator)}`;
  updateDisplay();
}

function displayOperator(op) {
  return ({"+":"+","-":"−","*":"×","/":"÷"})[op] || op;
}

function equals() {
  if (operator === null || stored === null) return;

  const a = stored;
  const b = Number(current);
  const op = operator;
  const computed = calculate(a, b, op);

  if (!Number.isFinite(computed)) {
    current = "Error";
    expressionText = "No se puede dividir entre 0";
    stored = null;
    operator = null;
    waitingForOperand = true;
    updateDisplay();
    return;
  }

  const fullExpression = `${formatNumber(a)} ${displayOperator(op)} ${formatNumber(b)}`;
  current = formatNumber(computed);
  expressionText = `${fullExpression} =`;
  addHistory(fullExpression, current);

  stored = null;
  operator = null;
  waitingForOperand = true;
  updateDisplay();
}

function addHistory(calc, answer) {
  history.unshift({ calc, answer });
  history = history.slice(0, 30);
  localStorage.setItem("calculatorHistory", JSON.stringify(history));
  renderHistory();
}

function renderHistory() {
  if (!history.length) {
    historyList.innerHTML = '<p class="empty">Todavía no hay operaciones.</p>';
    return;
  }

  historyList.innerHTML = history.map(item => `
    <button class="history-item" type="button" data-answer="${item.answer}">
      <div class="calc">${escapeHtml(item.calc)}</div>
      <div class="answer">${escapeHtml(item.answer)}</div>
    </button>
  `).join("");

  historyList.querySelectorAll(".history-item").forEach(button => {
    button.addEventListener("click", () => {
      current = button.dataset.answer;
      stored = null;
      operator = null;
      waitingForOperand = true;
      expressionText = "";
      updateDisplay();
    });
  });
}

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

document.querySelectorAll(".key").forEach(button => {
  button.addEventListener("click", () => {
    const value = button.dataset.value;
    const action = button.dataset.action;

    if (value !== undefined) {
      if (/^[0-9]$/.test(value)) inputDigit(value);
      else if (value === ".") inputDecimal();
      else chooseOperator(value);
      return;
    }

    if (action === "clear") clearAll();
    if (action === "delete") deleteLast();
    if (action === "percent") percent();
    if (action === "equals") equals();
  });
});

document.getElementById("historyBtn").addEventListener("click", () => {
  historyPanel.hidden = !historyPanel.hidden;
  if (!historyPanel.hidden) renderHistory();
});

document.getElementById("closeHistory").addEventListener("click", () => {
  historyPanel.hidden = true;
});

document.getElementById("clearHistory").addEventListener("click", () => {
  history = [];
  localStorage.removeItem("calculatorHistory");
  renderHistory();
});

document.addEventListener("keydown", event => {
  if (event.target.matches("input, textarea, select")) return;

  const key = event.key;
  if (/^[0-9]$/.test(key)) inputDigit(key);
  else if (key === ".") inputDecimal();
  else if (["+", "-", "*", "/"].includes(key)) chooseOperator(key);
  else if (key === "Enter" || key === "=") equals();
  else if (key === "Backspace") deleteLast();
  else if (key === "Escape") clearAll();
  else if (key === "%") percent();
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}

renderHistory();
updateDisplay();
