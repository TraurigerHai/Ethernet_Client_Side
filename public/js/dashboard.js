document.addEventListener("DOMContentLoaded", function () {
  loadChatMessages();

  const navItems = document.querySelectorAll(".nav-item");
  const sections = document.querySelectorAll(".dashboard-section");

  navItems.forEach((item) => {
    item.addEventListener("click", (e) => {
      e.preventDefault();
      const sectionId = item.getAttribute("data-section");

      navItems.forEach((nav) => nav.classList.remove("active"));
      sections.forEach((section) => section.classList.remove("active"));

      item.classList.add("active");
      document.getElementById(sectionId).classList.add("active");

      window.location.hash = sectionId;
    });
  });

  const hash = window.location.hash.slice(1);
  if (hash) {
    const activeNav = document.querySelector(`[data-section="${hash}"]`);
    if (activeNav) activeNav.click();
  }
});

function showModal(modalId) {
  document.getElementById(modalId).classList.add("active");
  document.body.style.overflow = "hidden";
}

function closeModal(modalId) {
  document.getElementById(modalId).classList.remove("active");
  document.body.style.overflow = "";
}

function showTariffModal() {
  showModal("tariffModal");
}

function closeTariffModal() {
  closeModal("tariffModal");
}

async function changeTariff(tariffId) {
  try {
    const response = await fetch("/api/change-tariff", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ tariffId }),
    });

    const result = await response.json();
    if (result.success) {
      location.reload();
    } else {
      alert("Ошибка при смене тарифа: " + result.error);
    }
  } catch (error) {
    console.error("Error:", error);
    alert("Произошла ошибка при смене тарифа");
  }
}

function showPaymentModal() {
  showModal("paymentModal");
}

function closePaymentModal() {
  closeModal("paymentModal");
}

async function processPayment(event) {
  event.preventDefault();
  const form = event.target;
  const amount = form.amount.value;
  const method = form.method.value;

  try {
    const response = await fetch("/api/process-payment", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ amount, method }),
    });

    const result = await response.json();
    if (result.success) {
      window.location.href = result.paymentUrl;
    } else {
      alert("Ошибка при создании платежа: " + result.error);
    }
  } catch (error) {
    console.error("Error:", error);
    alert("Произошла ошибка при создании платежа");
  }
}

async function loadChatMessages() {
  try {
    const response = await fetch("/api/support/messages");
    const messages = await response.json();

    const chat = document.getElementById("chatMessages");
    if (!chat) return;

    chat.innerHTML = "";
    messages.forEach((msg) => {
      const time = new Date(msg.time).toLocaleTimeString("ru-RU", {
        hour: "2-digit",
        minute: "2-digit",
      });
      chat.insertAdjacentHTML(
        "beforeend",
        `
                <div class="message ${msg.is_support ? "support" : "user"}">
                    <span class="message-time">${time}</span>
                    <p>${msg.text}</p>
                </div>
            `
      );
    });

    chat.scrollTop = chat.scrollHeight;
  } catch (error) {
    console.error("Error loading chat messages:", error);
  }
}

function sendMessage() {
  const input = document.getElementById("messageInput");
  const message = input.value.trim();
  if (!message) return;

  const chat = document.getElementById("chatMessages");
  const time = new Date().toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  });

  chat.insertAdjacentHTML(
    "beforeend",
    `
        <div class="message user">
            <span class="message-time">${time}</span>
            <p>${message}</p>
        </div>
    `
  );

  input.value = "";

  chat.scrollTop = chat.scrollHeight;
  fetch("/api/support/message", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ message }),
  })
    .then(() => {
      loadChatMessages();
    })
    .catch((error) => {
      console.error("Error sending message:", error);
    });
}

async function updateProfile(event) {
  event.preventDefault();
  const form = event.target;
  const formData = new FormData(form);
  const data = Object.fromEntries(formData.entries());

  try {
    const response = await fetch("/api/update-profile", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();
    if (result.success) {
      alert("Профиль успешно обновлен");
    } else {
      alert("Ошибка при обновлении профиля: " + result.error);
    }
  } catch (error) {
    console.error("Error:", error);
    alert("Произошла ошибка при обновлении профиля");
  }
}

async function updatePassword(event) {
  event.preventDefault();
  const form = event.target;
  const currentPassword = form.currentPassword.value;
  const newPassword = form.newPassword.value;
  const confirmPassword = form.confirmPassword.value;

  if (newPassword !== confirmPassword) {
    alert("Пароли не совпадают");
    return;
  }

  try {
    const response = await fetch("/api/update-password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ currentPassword, newPassword }),
    });

    const result = await response.json();
    if (result.success) {
      alert("Пароль успешно изменен");
      form.reset();
    } else {
      alert("Ошибка при изменении пароля: " + result.error);
    }
  } catch (error) {
    console.error("Error:", error);
    alert("Произошла ошибка при изменении пароля");
  }
}

function calculateTotalServices() {
  const enabledServices = document.querySelectorAll(".service-item.enabled");
  let total = 0;
  enabledServices.forEach((service) => {
    const priceText = service.querySelector(".service-price").textContent;
    const price = parseInt(priceText.match(/\d+/)[0]);
    total += price;
  });
  return total;
}

function updateAllPrices() {
  const servicesTotal = document.querySelector(".services-total .total-value");
  const totalServices = calculateTotalServices();
  if (servicesTotal) {
    servicesTotal.textContent = totalServices + " ₽/мес";
  }

  const balanceServicesTotal = Array.from(
    document.querySelectorAll(".expense-item")
  )
    .find((item) => item.textContent.includes("Доп. услуги"))
    ?.querySelector(".expense-value");
  if (balanceServicesTotal) {
    balanceServicesTotal.textContent = totalServices + " ₽/мес";
  }

  const tariffElement = Array.from(
    document.querySelectorAll(".expense-item")
  ).find((item) => item.textContent.includes("Тарифный план"));
  const tariffPriceText =
    tariffElement?.querySelector(".expense-value")?.textContent || "0 ₽/мес";
  const tariffPrice = parseInt(tariffPriceText.match(/\d+/)[0]);

  const expenseTotal = document.querySelector(".expense-total .total-value");
  if (expenseTotal) {
    expenseTotal.textContent = tariffPrice + totalServices + " ₽/мес";
  }
}

async function toggleService(checkbox) {
  const serviceId = checkbox.dataset.serviceId;
  const enabled = checkbox.checked;
  const serviceItem = checkbox.closest(".service-item");

  try {
    const response = await fetch("/api/toggle-service", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ serviceId, enabled }),
    });

    const result = await response.json();
    if (!result.success) {
      checkbox.checked = !enabled;
      alert("Ошибка при изменении статуса услуги: " + result.error);
      return;
    }

    serviceItem.classList.toggle("enabled", enabled);
    updateAllPrices();
  } catch (error) {
    console.error("Error:", error);
    checkbox.checked = !enabled;
    alert("Произошла ошибка при изменении статуса услуги");
  }
}

async function toggleAutopay(checkbox) {
  const thresholdInput = document.getElementById("autopayThreshold");
  thresholdInput.disabled = !checkbox.checked;

  try {
    const response = await fetch("/api/toggle-autopay", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        enabled: checkbox.checked,
        threshold: parseInt(thresholdInput.value),
      }),
    });

    const result = await response.json();
    if (!result.success) {
      checkbox.checked = !checkbox.checked;
      thresholdInput.disabled = !checkbox.checked;
      alert("Ошибка при изменении настроек автоплатежа: " + result.error);
    }
  } catch (error) {
    console.error("Error:", error);
    checkbox.checked = !checkbox.checked;
    thresholdInput.disabled = !checkbox.checked;
    alert("Произошла ошибка при изменении настроек автоплатежа");
  }
}

function updateAutopayThreshold(input) {
  if (!input.value) return;

  fetch("/api/update-autopay-threshold", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ threshold: parseInt(input.value) }),
  })
    .then((response) => response.json())
    .then((result) => {
      if (!result.success) {
        alert("Ошибка при изменении порога автоплатежа: " + result.error);
        input.value = input.dataset.lastValue || 100;
      } else {
        input.dataset.lastValue = input.value;
      }
    })
    .catch((error) => {
      console.error("Error:", error);
      alert("Произошла ошибка при изменении порога автоплатежа");
      input.value = input.dataset.lastValue || 100;
    });
}

function showTicketModal() {
  showModal("ticketModal");
}

function closeTicketModal() {
  closeModal("ticketModal");
}

async function submitTicket(event) {
  event.preventDefault();
  const form = event.target;
  const subject = form.subject.value;
  const description = form.description.value;

  try {
    const response = await fetch("/api/support/create-ticket", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ subject, description }),
    });

    const result = await response.json();
    if (result.success) {
      closeTicketModal();
      location.reload();
    } else {
      alert("Ошибка при создании заявки: " + result.error);
    }
  } catch (error) {
    console.error("Error:", error);
    alert("Произошла ошибка при создании заявки");
  }
}
