(function () {
  "use strict";

  var form = document.getElementById("disc-form");
  if (!form) return;

  var PRI_ITEMS = [
    ["payment_estimator", "A payment estimator (monthly, not just sticker price)"],
    ["vehicle_matcher", "A guided quiz that narrows vehicles by need, not just make/model"],
    ["specials", "Current specials / promotions"],
    ["financing", "Financing or credit application"],
    ["trade_in", "Trade-in valuation"],
    ["reviews", "Customer reviews or testimonials"],
    ["live_chat", "Live chat"],
    ["scheduling", "Online appointment scheduling"],
  ];

  var CATEGORY_ITEMS = [
    "Compact Sedan", "Midsize Sedan", "Full-size Sedan",
    "Compact SUV", "Midsize SUV", "Full-size SUV",
    "Pickup Truck", "Minivan", "Coupe", "Sports Car", "Electric Vehicle",
  ];

  function buildPriorityTable() {
    var wrap = document.getElementById("pri-table");
    PRI_ITEMS.forEach(function (item) {
      var key = item[0], label = item[1];
      var row = document.createElement("div");
      row.className = "pri-row";
      row.innerHTML =
        '<div class="pri-label">' + label + "</div>" +
        '<div><input type="radio" name="pri_' + key + '" value="Must have" required></div>' +
        '<div><input type="radio" name="pri_' + key + '" value="Nice to have"></div>' +
        '<div><input type="radio" name="pri_' + key + '" value="Skip it"></div>';
      wrap.appendChild(row);
    });
  }

  function buildCategoryChecks() {
    var wrap = document.getElementById("cat-checks");
    CATEGORY_ITEMS.forEach(function (label, i) {
      var id = "cat-" + i;
      var el = document.createElement("label");
      el.className = "chk-item";
      el.innerHTML =
        '<input type="checkbox" id="' + id + '" name="categories" value="' + label + '"> ' + label;
      wrap.appendChild(el);
    });
  }

  buildPriorityTable();
  buildCategoryChecks();

  // Prefill (and soft-lock) the business name when sent a client-specific link.
  var params = new URLSearchParams(window.location.search);
  var client = params.get("client");
  if (client) {
    var businessInput = document.getElementById("disc-business");
    businessInput.value = client;
  }

  var statusEl = document.getElementById("disc-status");
  function setStatus(msg, isError) {
    statusEl.textContent = msg || "";
    statusEl.style.color = isError ? "#B3462C" : "var(--graph)";
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var submitBtn = form.querySelector('button[type="submit"]');

    var fd = new FormData(form);
    // Every radio group in PRI_ITEMS is required; the browser's native
    // validation handles that via `required` on one input per group.
    if (!form.reportValidity()) return;

    submitBtn.disabled = true;
    setStatus("Sending…");

    var priorities = {};
    PRI_ITEMS.forEach(function (item) {
      var key = item[0], label = item[1];
      var checked = form.querySelector('input[name="pri_' + key + '"]:checked');
      priorities[label] = checked ? checked.value : null;
    });

    var categories = Array.prototype.slice
      .call(form.querySelectorAll('input[name="categories"]:checked'))
      .map(function (el) {
        return el.value;
      });

    var payload = {
      hp_x9: fd.get("hp_x9"), // spam trap, expected empty; the server decides
      business: fd.get("business"),
      respondentName: fd.get("respondentName"),
      role: fd.get("role"),
      email: fd.get("email"),
      q_matters: fd.get("q_matters"),
      q_keep: fd.get("q_keep"),
      q_frustrate: fd.get("q_frustrate"),
      priorities: priorities,
      q_dealbreaker: fd.get("q_dealbreaker"),
      q_onesentence: fd.get("q_onesentence"),
      q_voice: fd.get("q_voice"),
      q_refs: fd.get("q_refs"),
      q_offlimits: fd.get("q_offlimits"),
      q_makes: fd.get("q_makes"),
      categories: categories,
      q_gap: fd.get("q_gap"),
    };

    fetch("/api/discovery", {
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
        document.getElementById("discovery").querySelector(".disc-wrap").innerHTML =
          '<div class="booking-confirmed"><h3>Sent.</h3><p class="sub">Thanks — that\'s exactly what we needed. We\'ll follow up once everyone on your team has had a chance to answer.</p></div>';
      })
      .catch(function (err) {
        setStatus(err.message, true);
        submitBtn.disabled = false;
      });
  });
})();
