// Globální proměnné
let startTime = null;
let timerInterval = null;
let activeEmployee = null;
let logs = JSON.parse(localStorage.getItem('vykazy')) || [];
let hoursChart = null;

// Po načtení stránky
window.onload = function() {
  renderTable();
  updateSummary();
  initCharts();
  
  // Nastavení dnešního data pro ruční zadání
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('manual-date').value = today;
  
  // Přidání událostí pro modální okno
  document.getElementById('modal-confirm').addEventListener('click', confirmModalAction);
  document.getElementById('modal-cancel').addEventListener('click', hideModal);
};

// Funkce pro časovač
function startTimer(person) {
  // Ukončit existující časovač, pokud je aktivní
  if (startTime !== null) {
    const confirmChange = confirm(`Časovač je již spuštěn pro ${activeEmployee}. Chcete ho zastavit a začít nový pro ${person}?`);
    if (confirmChange) {
      stopTimer(activeEmployee);
    } else {
      return;
    }
  }
  
  startTime = new Date();
  activeEmployee = person;
  document.getElementById("status").textContent = `Probíhá směna: ${person}`;
  document.getElementById("status").style.color = "#27ae60";
  
  // Spustit interval pro aktualizaci zobrazení časovače
  clearInterval(timerInterval);
  updateTimerDisplay();
  timerInterval = setInterval(updateTimerDisplay, 1000);
}

function stopTimer(person) {
  if (!startTime || activeEmployee !== person) return;
  
  clearInterval(timerInterval);
  const endTime = new Date();
  const diffMs = endTime - startTime;
  const diffHours = (diffMs / (1000 * 60 * 60));
  addEntry(person, diffHours);
  
  document.getElementById("status").textContent = `Směna ukončena: ${formatHoursMinutes(diffHours)}`;
  document.getElementById("status").style.color = "#e74c3c";
  document.getElementById("timer-display").textContent = "00:00:00";
  
  startTime = null;
  activeEmployee = null;
}

function updateTimerDisplay() {
  if (!startTime) return;
  
  const currentTime = new Date();
  const elapsedMs = currentTime - startTime;
  const hours = Math.floor(elapsedMs / (1000 * 60 * 60));
  const minutes = Math.floor((elapsedMs % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((elapsedMs % (1000 * 60)) / 1000);
  
  const formattedTime = 
    String(hours).padStart(2, '0') + ':' + 
    String(minutes).padStart(2, '0') + ':' + 
    String(seconds).padStart(2, '0');
  
  document.getElementById("timer-display").textContent = formattedTime;
}

// Funkce pro ruční zadávání a správu výkazů
function addManual() {
  const person = document.getElementById("manual-person").value;
  const hoursInput = document.getElementById("manual-hours").value;
  const selectedDate = document.getElementById("manual-date").value;
  
  if (!person || !hoursInput || isNaN(parseFloat(hoursInput))) {
    alert("Vyplňte prosím všechny údaje správně.");
    return;
  }
  
  const hours = parseFloat(hoursInput);
  addEntry(person, hours, selectedDate);
  
  // Vynulování vstupního pole
  document.getElementById("manual-hours").value = "";
}

function addEntry(person, hours, customDate = null) {
  if (isNaN(hours) || hours <= 0) {
    alert("Neplatná hodnota hodin.");
    return;
  }
  
  const rate = person === "Maru" ? 275 : 400;
  const debtPart = person === "Maru" ? 1/3 : 0.5;
  const wage = (hours * rate).toFixed(2);
  const debt = (wage * debtPart).toFixed(2);
  const payout = (wage - debt).toFixed(2);
  
  const entry = {
    id: Date.now(), // Unikátní ID pro každý záznam
    date: customDate ? new Date(customDate).toLocaleDateString() : new Date().toLocaleDateString(),
    person,
    hours: parseFloat(hours).toFixed(2),
    wage,
    debt,
    payout
  };
  
  logs.push(entry);
  saveLogs();
  renderTable();
  updateSummary();
  updateCharts();
}

function deleteEntry(id) {
  showModal(
    "Opravdu chcete smazat tento záznam?",
    function() {
      logs = logs.filter(log => log.id !== id);
      saveLogs();
      renderTable();
      updateSummary();
      updateCharts();
    }
  );
}

function editEntry(id) {
  const entry = logs.find(log => log.id === id);
  if (!entry) return;
  
  const newHours = prompt(`Upravit hodiny pro ${entry.person} ze dne ${entry.date}:`, entry.hours);
  if (newHours === null) return;
  
  const parsedHours = parseFloat(newHours);
  if (isNaN(parsedHours) || parsedHours <= 0) {
    alert("Neplatná hodnota hodin.");
    return;
  }
  
  const rate = entry.person === "Maru" ? 275 : 400;
  const debtPart = entry.person === "Maru" ? 1/3 : 0.5;
  const wage = (parsedHours * rate).toFixed(2);
  const debt = (wage * debtPart).toFixed(2);
  const payout = (wage - debt).toFixed(2);
  
  entry.hours = parsedHours.toFixed(2);
  entry.wage = wage;
  entry.debt = debt;
  entry.payout = payout;
  
  saveLogs();
  renderTable();
  updateSummary();
  updateCharts();
}

function clearLogs() {
  showModal(
    "Opravdu chcete smazat všechny záznamy? Tato akce nelze vrátit zpět.",
    function() {
      logs = [];
      saveLogs();
      renderTable();
      updateSummary();
      updateCharts();
    }
  );
}

// Funkce pro zobrazení a aktualizaci dat
function renderTable() {
  const tbody = document.querySelector("#log tbody");
  tbody.innerHTML = "";
  
  // Seřadit záznamy podle data od nejnovějšího
  const sortedLogs = [...logs].sort((a, b) => {
    const dateA = new Date(a.date.split('.').reverse().join('-'));
    const dateB = new Date(b.date.split('.').reverse().join('-'));
    return dateB - dateA;
  });
  
  sortedLogs.forEach(log => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${log.date}</td>
      <td>${log.person}</td>
      <td>${log.hours}</td>
      <td>${log.wage} Kč</td>
      <td>${log.debt} Kč</td>
      <td>${log.payout} Kč</td>
      <td class="action-cell">
        <button class="action-btn edit" onclick="editEntry(${log.id})" title="Upravit">
          <i class="fas fa-edit"></i>
        </button>
        <button class="action-btn delete" onclick="deleteEntry(${log.id})" title="Smazat">
          <i class="fas fa-trash"></i>
        </button>
      </td>
    `;
    tbody.appendChild(row);
  });
}

function updateSummary() {
  const maruLogs = logs.filter(log => log.person === "Maru");
  const martyLogs = logs.filter(log => log.person === "Marty");
  
  // Maru souhrn
  const maruTotalHours = maruLogs.reduce((sum, log) => sum + parseFloat(log.hours), 0).toFixed(2);
  const maruTotalWage = maruLogs.reduce((sum, log) => sum + parseFloat(log.wage), 0).toFixed(2);
  const maruTotalDebt = maruLogs.reduce((sum, log) => sum + parseFloat(log.debt), 0).toFixed(2);
  const maruTotalPayout = maruLogs.reduce((sum, log) => sum + parseFloat(log.payout), 0).toFixed(2);
  
  // Marty souhrn
  const martyTotalHours = martyLogs.reduce((sum, log) => sum + parseFloat(log.hours), 0).toFixed(2);
  const martyTotalWage = martyLogs.reduce((sum, log) => sum + parseFloat(log.wage), 0).toFixed(2);
  const martyTotalDebt = martyLogs.reduce((sum, log) => sum + parseFloat(log.debt), 0).toFixed(2);
  const martyTotalPayout = martyLogs.reduce((sum, log) => sum + parseFloat(log.payout), 0).toFixed(2);
  
  // Aktualizace DOM
  document.getElementById("maru-total-hours").textContent = maruTotalHours;
  document.getElementById("maru-total-wage").textContent = formatCurrency(maruTotalWage);
  document.getElementById("maru-total-debt").textContent = formatCurrency(maruTotalDebt);
  document.getElementById("maru-total-payout").textContent = formatCurrency(maruTotalPayout);
  
  document.getElementById("marty-total-hours").textContent = martyTotalHours;
  document.getElementById("marty-total-wage").textContent = formatCurrency(martyTotalWage);
  document.getElementById("marty-total-debt").textContent = formatCurrency(martyTotalDebt);
  document.getElementById("marty-total-payout").textContent = formatCurrency(martyTotalPayout);
}

// Grafické funkce
function initCharts() {
  const ctx = document.getElementById('hours-chart').getContext('2d');
  
  hoursChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: [],
      datasets: [
        {
          label: 'Maru - Hodiny',
          backgroundColor: 'rgba(52, 152, 219, 0.7)',
          borderColor: 'rgba(52, 152, 219, 1)',
          borderWidth: 1,
          data: []
        },
        {
          label: 'Marty - Hodiny',
          backgroundColor: 'rgba(46, 204, 113, 0.7)',
          borderColor: 'rgba(46, 204, 113, 1)',
          borderWidth: 1,
          data: []
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Odpracované hodiny'
          }
        },
        x: {
          title: {
            display: true,
            text: 'Datum'
          }
        }
      }
    }
  });
  
  updateCharts();
}

function updateCharts() {
  if (!hoursChart) return;
  
  // Zpracování dat pro graf
  const last7Dates = getLastNDates(7);
  const chartData = processLogsForChart(last7Dates);
  
  hoursChart.data.labels = chartData.labels;
  hoursChart.data.datasets[0].data = chartData.maruData;
  hoursChart.data.datasets[1].data = chartData.martyData;
  hoursChart.update();
}

function processLogsForChart(dateLabels) {
  const maruData = Array(dateLabels.length).fill(0);
  const martyData = Array(dateLabels.length).fill(0);
  
  logs.forEach(log => {
    const index = dateLabels.indexOf(log.date);
    if (index !== -1) {
      if (log.person === "Maru") {
        maruData[index] += parseFloat(log.hours);
      } else {
        martyData[index] += parseFloat(log.hours);
      }
    }
  });
  
  return {
    labels: dateLabels,
    maruData,
    martyData
  };
}

function getLastNDates(n) {
  const dates = [];
  const today = new Date();
  
  for (let i = n - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(today.getDate() - i);
    dates.push(date.toLocaleDateString());
  }
  
  return dates;
}

// Pomocné funkce
function saveLogs() {
  localStorage.setItem("vykazy", JSON.stringify(logs));
}

function exportCSV() {
  let csv = "Datum,Zaměstnanec,Odprac. hodiny,Výdělek,Na dluh,Vyplaceno\n";
  logs.forEach(log => {
    csv += `${log.date},${log.person},${log.hours},${log.wage},${log.debt},${log.payout}\n`;
  });
  
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.setAttribute("href", URL.createObjectURL(blob));
  link.setAttribute("download", `vykazy_${new Date().toLocaleDateString().replace(/\./g, '-')}.csv`);
  link.click();
}

function formatHoursMinutes(hours) {
  const totalMinutes = Math.round(hours * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  
  return `${h} hod ${m} min`;
}

function formatCurrency(amount) {
  return parseFloat(amount).toLocaleString('cs-CZ');
}

// Správa modálního okna
let currentModalCallback = null;

function showModal(message, callback) {
  document.getElementById('modal-message').textContent = message;
