const express = require("express");
const path = require("path");
const database = require("./config/database");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const { generatePDF } = require("./utils/pdf-generator");

const app = express();

app.set("view engine", "hbs");
app.set("views", path.join(__dirname, "views"));

const hbs = require("hbs");
hbs.registerHelper("eq", function (a, b) {
  return a === b;
});

hbs.registerHelper("formatDate", function (date) {
  if (!date) return "";
  const d = new Date(date);
  return d.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
});

hbs.registerHelper("formatMonth", function (date) {
  if (!date) return "";
  const d = new Date(date);
  return d.toLocaleDateString("ru-RU", {
    month: "long",
    year: "numeric",
  });
});

hbs.registerHelper("formatTime", function (date) {
  if (!date) return "";
  const d = new Date(date);
  return d.toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  });
});

app.use(express.static(path.join(__dirname, "public")));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: "your-secret-key",
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 24 * 60 * 60 * 1000 },
  })
);

const requireAuth = (req, res, next) => {
  if (req.session && req.session.userId) {
    next();
  } else {
    res.redirect("/login?error=not_authorized");
  }
};

app.get("/", (req, res) => {
  database.query(
    'SELECT * FROM tariffplans WHERE name NOT LIKE "%Служебный%" ORDER BY price',
    (error, tariffs) => {
      if (error) {
        console.error("Error fetching tariffs:", error);
        return res.render("index", {
          tariffs: [],
          isAuthenticated: !!req.session.userId,
        });
      }
      res.render("index", {
        tariffs,
        isAuthenticated: !!req.session.userId,
      });
    }
  );
});

app.get("/login", (req, res) => {
  res.render("login", { error: req.query.error });
});

app.post("/auth/login", (req, res) => {
  const { phone, password } = req.body;

  database.query(
    "SELECT * FROM users WHERE phone = ?",
    phone,
    async (error, results) => {
      if (error) {
        console.error("Database error:", error);
        return res.redirect("/login?error=db_error");
      }

      if (results.length === 0) {
        return res.redirect("/login?error=invalid_credentials");
      }
      const user = results[0];
      const isMatch = await bcrypt.compare(password, user.password);

      if (!isMatch) {
        return res.redirect("/login?error=invalid_credentials");
      }

      req.session.userId = user.id;
      req.session.phone = user.phone;
      res.redirect("/dashboard");
    }
  );
});

app.post("/submit-request", (req, res) => {
  const { name, phone, address, tariff, comment } = req.body;

  database.query(
    "INSERT INTO connection_requests (name, phone, address, tariff, comment) VALUES (?, ?, ?, ?, ?)",
    [name, phone, address, tariff, comment],
    (error, results) => {
      if (error) {
        console.error("Error saving request:", error);
        return res.redirect("/#contacts?error=db_error");
      }
      res.redirect("/#contacts?success=true");
    }
  );
});

app.get("/api/support/messages", requireAuth, (req, res) => {
  const userId = req.session.userId;

  database.query(
    "SELECT * FROM support_messages WHERE user_id = ? ORDER BY time ASC",
    [userId],
    (error, results) => {
      if (error) {
        console.error("Error fetching messages:", error);
        return res.status(500).json({ error: "Internal server error" });
      }
      res.json(results);
    }
  );
});

app.post("/api/support/message", requireAuth, (req, res) => {
  const userId = req.session.userId;
  const { message } = req.body;

  if (!message || !message.trim()) {
    return res.status(400).json({ error: "Message is required" });
  }

  database.query(
    "INSERT INTO support_messages (user_id, text, time, is_support) VALUES (?, ?, NOW(), 0)",
    [userId, message.trim()],
    (error, results) => {
      if (error) {
        console.error("Error saving message:", error);
        return res.status(500).json({ error: "Internal server error" });
      }
      res.json({ success: true, messageId: results.insertId });
    }
  );
});

app.get("/dashboard", requireAuth, (req, res) => {
  const userId = req.session.userId;
  Promise.all([
    new Promise((resolve, reject) => {
      database.query(
        "SELECT * FROM users WHERE id = ?",
        [userId],
        (error, results) => {
          if (error) reject(error);
          else resolve(results[0]);
        }
      );
    }),
    new Promise((resolve, reject) => {
      database.query(
        "SELECT t.* FROM tariffplans t JOIN users u ON t.id = u.tariff_id WHERE u.id = ?",
        [userId],
        (error, results) => {
          if (error) reject(error);
          else resolve(results[0]);
        }
      );
    }),
    new Promise((resolve, reject) => {
      database.query(
        "SELECT * FROM payments WHERE user_id = ? ORDER BY date DESC LIMIT 10",
        [userId],
        (error, results) => {
          if (error) reject(error);
          else resolve(results);
        }
      );
    }),
    new Promise((resolve, reject) => {
      database.query(
        "SELECT s.*, us.enabled FROM services s LEFT JOIN user_services us ON s.id = us.service_id AND us.user_id = ?",
        [userId],
        (error, results) => {
          if (error) reject(error);
          else {
            const servicesTotal = results.reduce((sum, service) => {
              return sum + (service.enabled ? service.price : 0);
            }, 0);
            resolve({
              services: results,
              servicesTotal: servicesTotal,
            });
          }
        }
      );
    }),
    new Promise((resolve, reject) => {
      database.query(
        "SELECT * FROM support_tickets WHERE user_id = ? ORDER BY date DESC",
        [userId],
        (error, results) => {
          if (error) reject(error);
          else {
            const subjectMap = {
              no_internet: "Нет интернета",
              slow_speed: "Низкая скорость",
              tech_support: "Техническая поддержка",
              other: "Другое",
            };
            results = results.map((ticket) => ({
              ...ticket,
              subject: subjectMap[ticket.subject] || ticket.subject,
            }));
            resolve(results);
          }
        }
      );
    }),
    new Promise((resolve, reject) => {
      database.query(
        "SELECT * FROM support_messages WHERE user_id = ? ORDER BY time DESC LIMIT 50",
        [userId],
        (error, results) => {
          if (error) reject(error);
          else resolve(results.reverse());
        }
      );
    }),
    new Promise((resolve, reject) => {
      Promise.all([
        new Promise((resolve, reject) => {
          database.query(
            'SELECT id, contract_number as name, date_signed as date, "contract" as type FROM contracts WHERE user_id = ?',
            [userId],
            (error, results) => {
              if (error) reject(error);
              else resolve(results);
            }
          );
        }),
        new Promise((resolve, reject) => {
          database.query(
            'SELECT id, invoice_number as name, date_issued as date, "invoice" as type, status FROM invoices WHERE user_id = ?',
            [userId],
            (error, results) => {
              if (error) reject(error);
              else resolve(results);
            }
          );
        }),
        new Promise((resolve, reject) => {
          database.query(
            'SELECT id, act_number as name, date_issued as date, "act" as type FROM acts WHERE user_id = ?',
            [userId],
            (error, results) => {
              if (error) reject(error);
              else resolve(results);
            }
          );
        }),
      ])
        .then(([contracts, invoices, acts]) => {
          resolve(
            [...contracts, ...invoices, ...acts].sort((a, b) => b.date - a.date)
          );
        })
        .catch(reject);
    }),
    new Promise((resolve, reject) => {
      database.query(
        'SELECT * FROM tariffplans WHERE name NOT LIKE "%Служебный%" ORDER BY price',
        (error, results) => {
          if (error) reject(error);
          else resolve(results);
        }
      );
    }),
  ])
    .then(
      ([
        user,
        userTariff,
        payments,
        servicesData,
        tickets,
        chatMessages,
        documents,
        tariffs,
      ]) => {
        res.render("dashboard", {
          phone: req.session.phone,
          user: {
            ...user,
            tariff: userTariff,
            nextPayment: new Date(user.next_payment_date),
            autopayEnabled: user.autopay_enabled,
            autopayThreshold: user.autopay_threshold,
            services_total: servicesData.servicesTotal,
            total_expenses: userTariff.price + servicesData.servicesTotal,
          },
          payments,
          services: servicesData.services,
          tickets: tickets.map((ticket) => ({
            ...ticket,
            statusText: ticket.status === "open" ? "Открыто" : "Закрыто",
          })),
          chatMessages: chatMessages.map((msg) => ({
            ...msg,
            isSupport: msg.sender_type === "support",
          })),
          documents,
          invoices: documents.filter((doc) => doc.type === "invoice"),
          tariffs,
        });
      }
    )
    .catch((error) => {
      console.error("Error fetching dashboard data:", error);
      res.status(500).render("error", { message: "Ошибка загрузки данных" });
    });
});

app.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/");
  });
});

app.post("/api/change-tariff", requireAuth, (req, res) => {
  const userId = req.session.userId;
  const { tariffId } = req.body;

  database.query(
    "UPDATE users SET tariff_id = ? WHERE id = ?",
    [tariffId, userId],
    (error) => {
      if (error) {
        console.error("Error changing tariff:", error);
        return res.json({ success: false, error: "Ошибка базы данных" });
      }
      res.json({ success: true });
    }
  );
});

app.post("/api/process-payment", requireAuth, (req, res) => {
  const userId = req.session.userId;
  const { amount, method } = req.body;

  database.query(
    "INSERT INTO payments (user_id, amount, method, status, date) VALUES (?, ?, ?, ?, NOW())",
    [userId, amount, method, "pending"],
    (error, results) => {
      if (error) {
        console.error("Error creating payment:", error);
        return res.json({ success: false, error: "Ошибка базы данных" });
      }

      const paymentId = results.insertId;
      res.json({
        success: true,
        paymentUrl: `/payment-processing?id=${paymentId}&amount=${amount}&method=${method}`,
      });
    }
  );
});

app.get("/payment-processing", requireAuth, (req, res) => {
  const { id, amount, method } = req.query;
  const userId = req.session.userId;

  database.query(
    "SELECT * FROM payments WHERE id = ? AND user_id = ?",
    [id, userId],
    (error, results) => {
      if (error || results.length === 0) {
        return res.redirect("/dashboard?error=payment_not_found");
      }

      const methodText =
        method === "card" ? "Банковская карта" : "Система быстрых платежей";
      res.render("payment-processing", {
        paymentId: id,
        amount,
        methodText,
      });
    }
  );
});

app.get("/payment-success", requireAuth, (req, res) => {
  const { id } = req.query;
  const userId = req.session.userId;

  database.query(
    "SELECT * FROM payments WHERE id = ? AND user_id = ?",
    [id, userId],
    (error, results) => {
      if (error || results.length === 0) {
        return res.redirect("/dashboard?error=payment_not_found");
      }

      const payment = results[0];
      database.query(
        "UPDATE payments SET status = ? WHERE id = ?",
        ["completed", id],
        (error) => {
          if (error) {
            console.error("Error updating payment status:", error);
            return res.redirect("/dashboard?error=payment_update_failed");
          }

          database.query(
            "UPDATE users SET balance = balance + ? WHERE id = ?",
            [payment.amount, userId],
            (error) => {
              if (error) {
                console.error("Error updating user balance:", error);
                return res.redirect("/dashboard?error=balance_update_failed");
              }

              const methodText =
                payment.method === "card"
                  ? "Банковская карта"
                  : "Система быстрых платежей";
              res.render("payment-success", {
                paymentId: id,
                amount: payment.amount,
                methodText,
              });
            }
          );
        }
      );
    }
  );
});

app.post("/api/update-profile", requireAuth, (req, res) => {
  const userId = req.session.userId;
  const { fullName, phone, email, address } = req.body;

  database.query(
    "UPDATE users SET full_name = ?, phone = ?, email = ?, address = ? WHERE id = ?",
    [fullName, phone, email, address, userId],
    (error) => {
      if (error) {
        console.error("Error updating profile:", error);
        return res.json({ success: false, error: "Ошибка базы данных" });
      }
      req.session.phone = phone;
      res.json({ success: true });
    }
  );
});

app.post("/api/update-password", requireAuth, async (req, res) => {
  const userId = req.session.userId;
  const { currentPassword, newPassword } = req.body;

  database.query(
    "SELECT password FROM users WHERE id = ?",
    [userId],
    async (error, results) => {
      if (error) {
        console.error("Error checking password:", error);
        return res.json({ success: false, error: "Ошибка базы данных" });
      }

      const user = results[0];
      const isMatch = await bcrypt.compare(currentPassword, user.password);

      if (!isMatch) {
        return res.json({ success: false, error: "Неверный текущий пароль" });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      database.query(
        "UPDATE users SET password = ? WHERE id = ?",
        [hashedPassword, userId],
        (error) => {
          if (error) {
            console.error("Error updating password:", error);
            return res.json({ success: false, error: "Ошибка базы данных" });
          }
          res.json({ success: true });
        }
      );
    }
  );
});

app.post("/api/toggle-service", requireAuth, (req, res) => {
  const userId = req.session.userId;
  const { serviceId, enabled } = req.body;

  database.query(
    "INSERT INTO user_services (user_id, service_id, enabled) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE enabled = ?",
    [userId, serviceId, enabled, enabled],
    (error) => {
      if (error) {
        console.error("Error toggling service:", error);
        return res.json({ success: false, error: "Ошибка базы данных" });
      }
      res.json({ success: true });
    }
  );
});

app.post("/api/toggle-autopay", requireAuth, (req, res) => {
  const userId = req.session.userId;
  const { enabled, threshold } = req.body;

  database.query(
    "UPDATE users SET autopay_enabled = ?, autopay_threshold = ? WHERE id = ?",
    [enabled, threshold, userId],
    (error) => {
      if (error) {
        console.error("Error updating autopay settings:", error);
        return res.json({ success: false, error: "Ошибка базы данных" });
      }
      res.json({ success: true });
    }
  );
});

app.post("/api/update-autopay-threshold", requireAuth, (req, res) => {
  const userId = req.session.userId;
  const { threshold } = req.body;

  if (threshold < 100 || threshold > 10000) {
    return res.json({
      success: false,
      error: "Пороговое значение должно быть от 100 до 10000 рублей",
    });
  }

  database.query(
    "UPDATE users SET autopay_threshold = ? WHERE id = ?",
    [threshold, userId],
    (error) => {
      if (error) {
        console.error("Error updating autopay threshold:", error);
        return res.json({ success: false, error: "Ошибка базы данных" });
      }
      res.json({ success: true });
    }
  );
});

app.post("/api/support/create-ticket", requireAuth, (req, res) => {
  const userId = req.session.userId;
  const { subject, description } = req.body;

  database.query(
    "INSERT INTO support_tickets (user_id, subject, description, status) VALUES (?, ?, ?, ?)",
    [userId, subject, description, "open"],
    (error, results) => {
      if (error) {
        console.error("Error creating ticket:", error);
        return res.json({ success: false, error: "Ошибка базы данных" });
      }
      res.json({ success: true, ticketId: results.insertId });
    }
  );
});

app.post("/api/support/message", requireAuth, (req, res) => {
  const userId = req.session.userId;
  const { message } = req.body;

  database.query(
    "INSERT INTO support_messages (user_id, message, sender_type) VALUES (?, ?, ?)",
    [userId, message, "user"],
    (error) => {
      if (error) {
        console.error("Error sending message:", error);
        return res.json({ success: false, error: "Ошибка базы данных" });
      }
      res.json({ success: true });
    }
  );
});

app.get("/documents/invoice/:id", requireAuth, async (req, res) => {
  const userId = req.session.userId;
  const invoiceId = req.params.id;

  database.query(
    "SELECT * FROM invoices WHERE id = ? AND user_id = ?",
    [invoiceId, userId],
    async (error, results) => {
      if (error || results.length === 0) {
        return res.status(404).send("Документ не найден");
      }
      const invoice = results[0];

      try {
        const pdfBuffer = await generatePDF({
          type: "invoice",
          content: invoice.content,
          documentNumber: invoice.invoice_number,
          date: new Date(invoice.date_issued),
        });

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="invoice-${invoice.invoice_number}.pdf"`
        );
        res.send(pdfBuffer);
      } catch (error) {
        console.error("Error generating PDF:", error);
        res.status(500).send("Ошибка при генерации PDF");
      }
    }
  );
});

app.get("/documents/invoice/:id/preview", requireAuth, async (req, res) => {
  const userId = req.session.userId;
  const invoiceId = req.params.id;

  database.query(
    "SELECT * FROM invoices WHERE id = ? AND user_id = ?",
    [invoiceId, userId],
    async (error, results) => {
      if (error || results.length === 0) {
        return res.status(404).send("Документ не найден");
      }
      const invoice = results[0];

      try {
        const pdfBuffer = await generatePDF({
          type: "invoice",
          content: invoice.content,
          documentNumber: invoice.invoice_number,
          date: new Date(invoice.date_issued),
        });

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", "inline");
        res.send(pdfBuffer);
      } catch (error) {
        console.error("Error generating PDF:", error);
        res.status(500).send("Ошибка при генерации PDF");
      }
    }
  );
});

app.get("/documents/contract/:id", requireAuth, async (req, res) => {
  const userId = req.session.userId;
  const contractId = req.params.id;

  database.query(
    "SELECT * FROM contracts WHERE id = ? AND user_id = ?",
    [contractId, userId],
    async (error, results) => {
      if (error || results.length === 0) {
        return res.status(404).send("Документ не найден");
      }
      const contract = results[0];

      try {
        const pdfBuffer = await generatePDF({
          type: "contract",
          content: contract.content,
          documentNumber: contract.contract_number,
          date: new Date(contract.date_signed),
        });

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="contract-${contract.contract_number}.pdf"`
        );
        res.send(pdfBuffer);
      } catch (error) {
        console.error("Error generating PDF:", error);
        res.status(500).send("Ошибка при генерации PDF");
      }
    }
  );
});

app.get("/documents/contract/:id/preview", requireAuth, async (req, res) => {
  const userId = req.session.userId;
  const contractId = req.params.id;

  database.query(
    "SELECT * FROM contracts WHERE id = ? AND user_id = ?",
    [contractId, userId],
    async (error, results) => {
      if (error || results.length === 0) {
        return res.status(404).send("Документ не найден");
      }
      const contract = results[0];

      try {
        const pdfBuffer = await generatePDF({
          type: "contract",
          content: contract.content,
          documentNumber: contract.contract_number,
          date: new Date(contract.date_signed),
        });

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", "inline");
        res.send(pdfBuffer);
      } catch (error) {
        console.error("Error generating PDF:", error);
        res.status(500).send("Ошибка при генерации PDF");
      }
    }
  );
});

app.get("/documents/act/:id", requireAuth, async (req, res) => {
  const userId = req.session.userId;
  const actId = req.params.id;

  database.query(
    "SELECT * FROM acts WHERE id = ? AND user_id = ?",
    [actId, userId],
    async (error, results) => {
      if (error || results.length === 0) {
        return res.status(404).send("Документ не найден");
      }
      const act = results[0];

      try {
        const pdfBuffer = await generatePDF({
          type: "act",
          content: act.content,
          documentNumber: act.act_number,
          date: new Date(act.date_issued),
        });

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="act-${act.act_number}.pdf"`
        );
        res.send(pdfBuffer);
      } catch (error) {
        console.error("Error generating PDF:", error);
        res.status(500).send("Ошибка при генерации PDF");
      }
    }
  );
});

app.get("/documents/act/:id/preview", requireAuth, async (req, res) => {
  const userId = req.session.userId;
  const actId = req.params.id;

  database.query(
    "SELECT * FROM acts WHERE id = ? AND user_id = ?",
    [actId, userId],
    async (error, results) => {
      if (error || results.length === 0) {
        return res.status(404).send("Документ не найден");
      }
      const act = results[0];

      try {
        const pdfBuffer = await generatePDF({
          type: "act",
          content: act.content,
          documentNumber: act.act_number,
          date: new Date(act.date_issued),
        });

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", "inline");
        res.send(pdfBuffer);
      } catch (error) {
        console.error("Error generating PDF:", error);
        res.status(500).send("Ошибка при генерации PDF");
      }
    }
  );
});

app.get("/documents/invoice/:id/preview", requireAuth, async (req, res) => {
  const userId = req.session.userId;
  const invoiceId = req.params.id;

  database.query(
    "SELECT * FROM invoices WHERE id = ? AND user_id = ?",
    [invoiceId, userId],
    async (error, results) => {
      if (error || results.length === 0) {
        return res.status(404).send("Документ не найден");
      }
      const invoice = results[0];

      try {
        const pdfBuffer = await generatePDF({
          type: "invoice",
          content: invoice.content,
          documentNumber: invoice.invoice_number,
          date: new Date(invoice.date_issued),
        });

        res.setHeader("Content-Type", "application/pdf");
        res.send(pdfBuffer);
      } catch (error) {
        console.error("Error generating PDF:", error);
        res.status(500).send("Ошибка при генерации PDF");
      }
    }
  );
});

app.get("/documents/contract/:id/preview", requireAuth, async (req, res) => {
  const userId = req.session.userId;
  const contractId = req.params.id;

  database.query(
    "SELECT * FROM contracts WHERE id = ? AND user_id = ?",
    [contractId, userId],
    async (error, results) => {
      if (error || results.length === 0) {
        return res.status(404).send("Документ не найден");
      }
      const contract = results[0];

      try {
        const pdfBuffer = await generatePDF({
          type: "contract",
          content: contract.content,
          documentNumber: contract.contract_number,
          date: new Date(contract.date_signed),
        });

        res.setHeader("Content-Type", "application/pdf");
        res.send(pdfBuffer);
      } catch (error) {
        console.error("Error generating PDF:", error);
        res.status(500).send("Ошибка при генерации PDF");
      }
    }
  );
});

app.get("/documents/act/:id/preview", requireAuth, async (req, res) => {
  const userId = req.session.userId;
  const actId = req.params.id;

  database.query(
    "SELECT * FROM acts WHERE id = ? AND user_id = ?",
    [actId, userId],
    async (error, results) => {
      if (error || results.length === 0) {
        return res.status(404).send("Документ не найден");
      }
      const act = results[0];

      try {
        const pdfBuffer = await generatePDF({
          type: "act",
          content: act.content,
          documentNumber: act.act_number,
          date: new Date(act.date_issued),
        });

        res.setHeader("Content-Type", "application/pdf");
        res.send(pdfBuffer);
      } catch (error) {
        console.error("Error generating PDF:", error);
        res.status(500).send("Ошибка при генерации PDF");
      }
    }
  );
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port http://localhost:${PORT}`);
});
