
// SPENDWISE - PERSONAL BUDGET TRACKER

const STORAGE_KEY = "spendwise_transactions";
const BUDGET_KEY = "spendwise_budgets";

let transactions = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
let budgets = JSON.parse(localStorage.getItem(BUDGET_KEY) || "{}");

const $ = (id) => document.getElementById(id);

const monthFilter = $("monthFilter");
const transactionForm = $("transactionForm");
const budgetForm = $("budgetForm");

const today = new Date();
const todayString = [
  today.getFullYear(),
  String(today.getMonth() + 1).padStart(2, "0"),
  String(today.getDate()).padStart(2, "0")
].join("-");

monthFilter.value = todayString.slice(0, 7);
$("transactionDate").value = todayString;
$("today").textContent = today.toLocaleDateString("en-KE", {
  day: "numeric",
  month: "short",
  year: "numeric"
});
$("year").textContent = today.getFullYear();

// Format Kenyan currency
function formatMoney(amount) {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 2
  }).format(amount);
}

// Save data in browser
function saveTransactions() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
}

function saveBudgets() {
  localStorage.setItem(BUDGET_KEY, JSON.stringify(budgets));
}

// Get selected month
function selectedMonth() {
  return monthFilter.value || todayString.slice(0, 7);
}

// Get transactions for selected month
function getMonthlyTransactions() {
  return transactions.filter(transaction =>
    transaction.date.startsWith(selectedMonth())
  );
}

// Calculate totals
function calculateTotals() {
  const monthly = getMonthlyTransactions();

  const income = monthly
    .filter(item => item.type === "income")
    .reduce((total, item) => total + item.amount, 0);

  const expenses = monthly
    .filter(item => item.type === "expense")
    .reduce((total, item) => total + item.amount, 0);

  return {
    income,
    expenses,
    balance: income - expenses,
    count: monthly.length
  };
}

// Update dashboard
function updateDashboard() {
  const totals = calculateTotals();

  $("balance").textContent = formatMoney(totals.balance);
  $("income").textContent = formatMoney(totals.income);
  $("expenses").textContent = formatMoney(totals.expenses);

  $("reportIncome").textContent = formatMoney(totals.income);
  $("reportExpenses").textContent = formatMoney(totals.expenses);
  $("reportSavings").textContent = formatMoney(totals.balance);
  $("reportCount").textContent = totals.count;

  renderBudget();
  renderTransactions();
}

// Monthly budget
function renderBudget() {
  const month = selectedMonth();
  const budget = Number(budgets[month] || 0);
  const totals = calculateTotals();
  const spent = totals.expenses;
  const remaining = budget - spent;

  $("budgetTotal").textContent = formatMoney(budget);
  $("budgetSpent").textContent = formatMoney(spent);
  $("budgetRemaining").textContent = formatMoney(remaining);

  $("budgetAmount").value = budget > 0 ? budget : "";

  const percentage = budget > 0
    ? (spent / budget) * 100
    : 0;

  const displayPercentage = Math.round(percentage);

  $("budgetPercentage").textContent = displayPercentage + "%";

  const progress = $("budgetProgress");
  progress.style.width = Math.min(percentage, 100) + "%";

  if (budget === 0) {
    progress.style.background = "#16a36a";
    $("budgetMessage").textContent = "Set a monthly budget to track your spending.";
  } else if (spent > budget) {
    progress.style.background = "#e05252";
    $("budgetMessage").textContent =
      "Warning! You have exceeded your monthly budget.";
  } else if (percentage >= 80) {
    progress.style.background = "#e99a26";
    $("budgetMessage").textContent =
      "Careful! You are approaching your budget limit.";
  } else {
    progress.style.background = "#16a36a";
    $("budgetMessage").textContent =
      "Great! You are within your monthly budget.";
  }
}

// Save monthly budget
budgetForm.addEventListener("submit", function(event) {
  event.preventDefault();

  const amount = Number($("budgetAmount").value);

  if (!Number.isFinite(amount) || amount <= 0) {
    alert("Please enter a valid budget greater than zero.");
    return;
  }

  budgets[selectedMonth()] = amount;
  saveBudgets();
  renderBudget();

  alert("Your monthly budget has been saved successfully!");
});

// Add transaction
transactionForm.addEventListener("submit", function(event) {
  event.preventDefault();

  const description = $("description").value.trim();
  const amount = Number($("amount").value);
  const type = $("type").value;
  const category = $("category").value;
  const date = $("transactionDate").value;

  if (!description || !Number.isFinite(amount) || amount <= 0 || !date) {
    alert("Please fill in all fields with valid information.");
    return;
  }

  const transaction = {
    id: crypto.randomUUID
      ? crypto.randomUUID()
      : String(Date.now()) + Math.random(),
    description,
    amount,
    type,
    category,
    date
  };

  transactions.push(transaction);
  saveTransactions();

  transactionForm.reset();
  $("transactionDate").value = todayString;
  $("type").value = "expense";

  $("formMessage").textContent =
    "Transaction added successfully!";

  updateDashboard();

  setTimeout(() => {
    $("formMessage").textContent = "";
  }, 3000);
});

// Display transaction history
function renderTransactions() {
  const list = $("transactionList");
  const monthly = getMonthlyTransactions().slice().sort(
    (a, b) => b.date.localeCompare(a.date)
  );

  list.replaceChildren();

  if (monthly.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent =
      "No transactions this month. Add your first transaction!";
    list.appendChild(empty);
    return;
  }

  monthly.forEach(transaction => {
    const item = document.createElement("div");
    item.className = "transaction-item";

    const info = document.createElement("div");
    info.className = "transaction-info";

    const title = document.createElement("strong");
    title.textContent = transaction.description;

    const details = document.createElement("small");
    details.textContent =
      `${transaction.category} • ${transaction.date}`;

    info.append(title, details);

    const right = document.createElement("div");
    right.className = "transaction-right";

    const amount = document.createElement("div");
    amount.className = "transaction-amount " +
      (transaction.type === "income" ? "income-text" : "expense-text");

    amount.textContent =
      (transaction.type === "income" ? "+ " : "- ") +
      formatMoney(transaction.amount);

    const deleteButton = document.createElement("button");
    deleteButton.className = "delete-btn";
    deleteButton.type = "button";
    deleteButton.textContent = "Delete";

    deleteButton.addEventListener("click", function() {
      const confirmed = confirm(
        "Are you sure you want to delete this transaction?"
      );

      if (!confirmed) return;

      transactions = transactions.filter(
        item => item.id !== transaction.id
      );

      saveTransactions();
      updateDashboard();
    });

    right.append(amount, deleteButton);
    item.append(info, right);
    list.appendChild(item);
  });
}

// Update everything when month changes
monthFilter.addEventListener("change", function() {
  updateDashboard();
});

// Initial application load
updateDashboard();
