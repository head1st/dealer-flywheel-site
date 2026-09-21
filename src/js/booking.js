(function () {
  "use strict";

  var root = document.getElementById("booking");
  if (!root) return;

  var dateInput = root.querySelector("#booking-date");
  var slotsWrap = root.querySelector("#booking-slots");
  var formWrap = root.querySelector("#booking-form-wrap");
  var form = root.querySelector("#booking-form");
  var selectedTimeInput = root.querySelector("#booking-time");
  var selectedDateInput = root.querySelector("#booking-date-hidden");
  var summaryEl = root.querySelector("#booking-summary");
  var statusEl = root.querySelector("#booking-status");
  var backBtn = root.querySelector("#booking-back");

  function todayISO() {
    var d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 10);
  }

  function maxDateISO(daysAhead) {
    var d = new Date();
    d.setDate(d.getDate() + daysAhead);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 10);
  }

  function setStatus(msg, isError) {
    statusEl.textContent = msg || "";
    statusEl.style.color = isError ? "#B3462C" : "var(--graph)";
  }

  function formatDateLabel(iso) {
    var parts = iso.split("-").map(Number);
    var d = new Date(parts[0], parts[1] - 1, parts[2]);
    return d.toLocaleDateString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
  }

  function formatTimeLabel(hhmm) {
    var parts = hhmm.split(":").map(Number);
    var d = new Date();
    d.setHours(parts[0], parts[1], 0, 0);
    return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  }

  function renderSlots(slots, date) {
    slotsWrap.innerHTML = "";
    if (!slots.length) {
      var empty = document.createElement("p");
      empty.className = "disclaim";
      empty.textContent =
        "No open times that day — try another date, or email hello@dealerflywheel.com.";
      slotsWrap.appendChild(empty);
      return;
    }
    slots.forEach(function (time) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "btn ink booking-slot";
      btn.textContent = formatTimeLabel(time);
      btn.addEventListener("click", function () {
        selectedTimeInput.value = time;
        selectedDateInput.value = date;
        summaryEl.textContent =
          formatDateLabel(date) + " at " + formatTimeLabel(time) + " (Eastern time)";
        slotsWrap.hidden = true;
        dateInput.closest(".booking-date-row").hidden = true;
        formWrap.hidden = false;
        setStatus("");
      });
      slotsWrap.appendChild(btn);
    });
  }

  function loadSlots(date) {
    slotsWrap.innerHTML = '<p class="disclaim">Loading times…</p>';
    fetch("/api/availability?date=" + encodeURIComponent(date))
      .then(function (r) {
        return r.json().then(function (data) {
          if (!r.ok) throw new Error(data.error || "Couldn't load times.");
          return data;
        });
      })
      .then(function (data) {
        renderSlots(data.slots || [], date);
      })
      .catch(function (err) {
        slotsWrap.innerHTML = "";
        var p = document.createElement("p");
        p.className = "disclaim";
        p.textContent = err.message;
        slotsWrap.appendChild(p);
      });
  }

  dateInput.min = todayISO();
  dateInput.max = maxDateISO(14);
  dateInput.addEventListener("change", function () {
    if (!dateInput.value) return;
    var day = new Date(dateInput.value + "T00:00:00").getDay();
    if (day === 0 || day === 6) {
      slotsWrap.innerHTML =
        '<p class="disclaim">We\'re closed weekends — pick a weekday instead.</p>';
      return;
    }
    loadSlots(dateInput.value);
  });

  backBtn.addEventListener("click", function () {
    formWrap.hidden = true;
    slotsWrap.hidden = false;
    dateInput.closest(".booking-date-row").hidden = false;
    setStatus("");
  });

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    setStatus("Booking…");

    var payload = {
      date: selectedDateInput.value,
      time: selectedTimeInput.value,
      name: form.elements.name.value,
      email: form.elements.email.value,
      phone: form.elements.phone.value,
      notes: form.elements.notes.value,
      company: form.elements.company.value, // honeypot
    };

    fetch("/api/book", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then(function (r) {
        return r.json().then(function (data) {
          if (!r.ok) throw new Error(data.error || "Something went wrong.");
          return data;
        });
      })
      .then(function () {
        root.innerHTML =
          '<div class="booking-confirmed"><h3>You\'re booked.</h3><p class="sub">A calendar invite is on its way to your email. Talk soon.</p></div>';
      })
      .catch(function (err) {
        setStatus(err.message, true);
        submitBtn.disabled = false;
      });
  });
})();
