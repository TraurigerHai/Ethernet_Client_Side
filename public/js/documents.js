const documentPreview = {
  modal: null,
  currentId: null,
  currentType: null,

  initialize() {
    if (this.modal) return;

    this.modal = document.createElement("div");
    this.modal.className = "modal preview-modal";
    this.modal.innerHTML = `
            <div class="modal-content">
                <h2>Просмотр документа</h2>
                <div class="document-preview">
                    <div id="documentLoadingIndicator" class="loading-indicator" style="display: none;">
                        <div class="spinner"></div>
                        <p>Загрузка документа...</p>
                    </div>
                    <div id="documentError" class="error-message" style="display: none;">
                        <p>Не удалось загрузить документ. Пожалуйста, попробуйте позже.</p>
                        <button class="btn btn-retry">Повторить</button>
                    </div>
                    <iframe id="documentPreviewFrame" style="width:100%; height:70vh; border:none;"></iframe>
                </div>
                <div class="modal-actions">
                    <button class="btn-submit" onclick="documentPreview.download()">Скачать</button>
                    <button class="btn-submit" onclick="documentPreview.close()">Закрыть</button>
                </div>
                <button class="modal-close" onclick="documentPreview.close()">×</button>
            </div>
        `;

    document.body.appendChild(this.modal);

    const frame = document.getElementById("documentPreviewFrame");
    const retryButton = this.modal.querySelector(".btn-retry");

    frame.addEventListener("load", () => this.handleFrameLoad());
    frame.addEventListener("error", () => this.handleError());
    retryButton.addEventListener("click", () => this.retryLoad());
  },

  show(id, type) {
    this.initialize();
    this.currentId = id;
    this.currentType = type;

    const frame = document.getElementById("documentPreviewFrame");
    const loadingIndicator = document.getElementById(
      "documentLoadingIndicator"
    );
    const errorMessage = document.getElementById("documentError");

    if (frame) {
      loadingIndicator.style.display = "flex";
      errorMessage.style.display = "none";
      frame.style.display = "none";

      frame.src = `/documents/${type}/${id}/preview`;
      this.modal.style.display = "block";
    }
  },

  handleFrameLoad() {
    const frame = document.getElementById("documentPreviewFrame");
    const loadingIndicator = document.getElementById(
      "documentLoadingIndicator"
    );
    const errorMessage = document.getElementById("documentError");

    loadingIndicator.style.display = "none";
    frame.style.display = "block";
  },

  handleError() {
    const frame = document.getElementById("documentPreviewFrame");
    const loadingIndicator = document.getElementById(
      "documentLoadingIndicator"
    );
    const errorMessage = document.getElementById("documentError");

    loadingIndicator.style.display = "none";
    frame.style.display = "none";
    errorMessage.style.display = "flex";
  },

  retryLoad() {
    if (this.currentId && this.currentType) {
      this.show(this.currentId, this.currentType);
    }
  },

  close() {
    if (this.modal) {
      this.modal.style.display = "none";
      const frame = document.getElementById("documentPreviewFrame");
      if (frame) {
        frame.src = "";
      }
      this.currentId = null;
      this.currentType = null;
    }
  },
  download(id, type) {
    if (!id || !type) {
      id = this.currentId;
      type = this.currentType;
    }

    if (id && type) {
      console.log(`Downloading document: ${type}/${id}`);
      try {
        const url = `/documents/${type}/${id}`;
        console.log(`Request URL: ${url}`);
        window.location.href = url;
      } catch (error) {
        console.error("Error downloading document:", error);
      }
    } else {
      console.error("Missing document parameters:", { id, type });
    }
  },
};

document.addEventListener("DOMContentLoaded", function () {
  const documentsSection = document.getElementById("documents");
  if (!documentsSection) return;

  const documentsList = documentsSection.querySelector(".documents-list");
  if (!documentsList) return;

  const filterContainer = document.createElement("div");
  filterContainer.className = "document-filters";
  filterContainer.innerHTML = `
        <div class="filter-tabs">
            <button class="filter-tab active" data-type="all">Все</button>
            <button class="filter-tab" data-type="invoice">Счета</button>
            <button class="filter-tab" data-type="contract">Договоры</button>
            <button class="filter-tab" data-type="act">Акты</button>
        </div>
        <div class="sort-container">
            <select id="documentSort">
                <option value="date-desc">Сначала новые</option>
                <option value="date-asc">Сначала старые</option>
                <option value="name-asc">По названию А-Я</option>
                <option value="name-desc">По названию Я-А</option>
            </select>
        </div>
    `;

  documentsSection.insertBefore(filterContainer, documentsList);

  const filterTabs = filterContainer.querySelectorAll(".filter-tab");
  filterTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      filterTabs.forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");

      const type = tab.dataset.type;
      const sections = documentsSection.querySelectorAll("h3, .document-item");

      sections.forEach((section) => {
        if (section.tagName === "H3") {
          const nextItems = getNextSiblingsByClass(section, "document-item");
          const hasVisibleItems = nextItems.some((item) => {
            const itemType = item.classList.contains("invoice")
              ? "invoice"
              : item.classList.contains("contract")
              ? "contract"
              : "act";
            return type === "all" || itemType === type;
          });
          section.style.display = hasVisibleItems ? "" : "none";
        } else {
          const itemType = section.classList.contains("invoice")
            ? "invoice"
            : section.classList.contains("contract")
            ? "contract"
            : "act";
          section.style.display =
            type === "all" || itemType === type ? "" : "none";
        }
      });
    });
  });

  const sortSelect = document.getElementById("documentSort");
  sortSelect.addEventListener("change", () => {
    const items = Array.from(
      documentsSection.querySelectorAll(".document-item")
    );
    const sortValue = sortSelect.value;

    items.sort((a, b) => {
      if (sortValue === "date-desc" || sortValue === "date-asc") {
        const dateA = new Date(a.dataset.date);
        const dateB = new Date(b.dataset.date);
        return sortValue === "date-desc" ? dateB - dateA : dateA - dateB;
      } else {
        const nameA = a.querySelector(".doc-name").textContent;
        const nameB = b.querySelector(".doc-name").textContent;
        return sortValue === "name-asc"
          ? nameA.localeCompare(nameB, "ru")
          : nameB.localeCompare(nameA, "ru");
      }
    });

    const sections = documentsSection.querySelectorAll("h3");
    sections.forEach((section) => {
      const sectionType = section.textContent.toLowerCase().includes("счета")
        ? "invoice"
        : section.textContent.toLowerCase().includes("договоры")
        ? "contract"
        : "act";
      const sectionItems = items.filter((item) =>
        item.classList.contains(sectionType)
      );

      let nextElement = section.nextElementSibling;
      while (nextElement && !nextElement.tagName.match(/H3/i)) {
        const itemToRemove = nextElement;
        nextElement = nextElement.nextElementSibling;
        if (itemToRemove.classList.contains("document-item")) {
          itemToRemove.remove();
        }
      }

      sectionItems.forEach((item) => {
        section.insertAdjacentElement("afterend", item);
      });
    });
  });
});

function getNextSiblingsByClass(element, className) {
  const siblings = [];
  let nextElement = element.nextElementSibling;

  while (nextElement && !nextElement.tagName.match(/H3/i)) {
    if (nextElement.classList.contains(className)) {
      siblings.push(nextElement);
    }
    nextElement = nextElement.nextElementSibling;
  }

  return siblings;
}
const [criteria, direction] = sortSelect.value.split("-");
const items = Array.from(documentsSection.querySelectorAll(".document-item"));
const documentsList = documentsSection.querySelector(".documents-list");

function initializeDocumentSorting() {
  const items = Array.from(documentsList.querySelectorAll(".document-item"));
  const sortButton = document.querySelector(".sort-button");

  sortButton.addEventListener("click", () => {
    items.sort((a, b) => {
      if (criteria === "date") {
        const dateA = new Date(a.dataset.date);
        const dateB = new Date(b.dataset.date);
        return direction === "asc" ? dateA - dateB : dateB - dateA;
      } else {
        const nameA = a.querySelector(".doc-name").textContent;
        const nameB = b.querySelector(".doc-name").textContent;
        return direction === "asc"
          ? nameA.localeCompare(nameB, "ru")
          : nameB.localeCompare(nameA, "ru");
      }
    });

    items.forEach((item) => documentsList.appendChild(item));
  });
}
