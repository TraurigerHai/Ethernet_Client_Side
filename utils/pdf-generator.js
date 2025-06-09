const PDFDocument = require("pdfkit");

/**
 * Generates a PDF document from the given content
 * @param {Object} options Document options
 * @param {string} options.content The document content
 * @param {string} options.type Document type ('invoice', 'contract', or 'act')
 * @param {string} options.documentNumber Document number
 * @param {Date} options.date Document date
 * @returns {Buffer} Generated PDF as a buffer
 */
async function generatePDF(options) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "A4",
        margin: 50,
        lang: "ru",
        info: {
          Title: `${
            options.type === "invoice"
              ? "Счет"
              : options.type === "contract"
              ? "Договор"
              : "Акт"
          } ${options.documentNumber}`,
          CreationDate: options.date,
          Producer: "ИнтерВектор",
          Language: "ru-RU",
        },
      });

      doc.registerFont("CustomFont", "C:\\Windows\\Fonts\\arial.ttf");
      doc.font("CustomFont");

      const chunks = [];
      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));

      doc
        .fontSize(16)
        .text('ООО "ИнтерВектор"', { align: "center" })
        .moveDown();

      doc
        .fontSize(14)
        .text(
          `${
            options.type === "invoice"
              ? "Счет"
              : options.type === "contract"
              ? "Договор"
              : "Акт"
          } №${options.documentNumber}`,
          { align: "center" }
        )
        .moveDown();

      doc
        .fontSize(12)
        .text(`Дата: ${options.date.toLocaleDateString("ru-RU")}`, {
          align: "right",
        })
        .moveDown();

      doc.fontSize(12).text(options.content, {
        align: "left",
        lineGap: 5,
      });

      doc
        .fontSize(10)
        .text('ООО "ИнтерВектор"', { align: "center" })
        .text("ИНН: 1234567890 КПП: 123456789", { align: "center" })
        .text("Адрес: г. Москва, ул. Тестовая, д. 1", { align: "center" });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

module.exports = { generatePDF };
