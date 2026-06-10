const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbzOy3GzEra_cO88DLC9bbqwwgUKXjJFZuIPI9rMXwWl1Q63zNaZmt4v3fR2vEppHX7BYg/exec";

let composants = [];
let categories = [];
let emplacementsMagasin = [];
let fournisseurs = [];
let currentMagasinView = "cards";

const loadMagasinButton = document.getElementById("loadMagasinButton");
const magasinStatus = document.getElementById("magasinStatus");
const magasinRawJson = document.getElementById("magasinRawJson");
const magasinBody = document.getElementById("magasinBody");
const magasinCardsView = document.getElementById("magasinCardsView");
const magasinTableView = document.getElementById("magasinTableView");
const magasinSearchInput = document.getElementById("magasinSearchInput");
const magasinStatutFilter = document.getElementById("magasinStatutFilter");
const magasinCategorieFilter = document.getElementById("magasinCategorieFilter");
const magasinEmplacementFilter = document.getElementById("magasinEmplacementFilter");
const viewMagasinCardsButton = document.getElementById("viewMagasinCardsButton");
const viewMagasinTableButton = document.getElementById("viewMagasinTableButton");

loadMagasinButton.addEventListener("click", loadMagasin);
magasinSearchInput.addEventListener("input", refreshMagasinViews);
magasinStatutFilter.addEventListener("change", refreshMagasinViews);
magasinCategorieFilter.addEventListener("change", refreshMagasinViews);
magasinEmplacementFilter.addEventListener("change", refreshMagasinViews);
viewMagasinCardsButton.addEventListener("click", () => setMagasinView("cards"));
viewMagasinTableButton.addEventListener("click", () => setMagasinView("table"));

loadMagasin();

function buildApiUrl(action, params = {}) {
  const searchParams = new URLSearchParams();
  searchParams.set("action", action);
  Object.keys(params).forEach(key => {
    if (params[key] !== undefined && params[key] !== null) {
      searchParams.set(key, params[key]);
    }
  });
  searchParams.set("t", Date.now());
  return WEB_APP_URL + "?" + searchParams.toString();
}

async function fetchJson(action, params = {}) {
  const response = await fetch(buildApiUrl(action, params), {
    method: "GET",
    cache: "no-store",
    redirect: "follow"
  });

  if (!response.ok) {
    throw new Error("Erreur HTTP " + response.status + " pour " + action);
  }

  const data = await response.json();

  if (!data.ok) {
    throw new Error(data.error || "Réponse API invalide pour " + action);
  }

  return data;
}

async function loadMagasin() {
  setMagasinStatus("Chargement du magasin depuis Grist...", "");

  try {
    const [composantsData, categoriesData, emplacementsData, fournisseursData] = await Promise.all([
      fetchJson("listComposantsGrist"),
      fetchJson("listCategoriesComposantsGrist"),
      fetchJson("listEmplacementsMagasinGrist"),
      fetchJson("listFournisseursGrist")
    ]);

    composants = composantsData.composants || [];
    categories = categoriesData.categories || [];
    emplacementsMagasin = emplacementsData.emplacements || [];
    fournisseurs = fournisseursData.fournisseurs || [];

    magasinRawJson.textContent = JSON.stringify({
      composants: composantsData,
      categories: categoriesData,
      emplacements: emplacementsData,
      fournisseurs: fournisseursData
    }, null, 2);

    renderReferenceLists();
    renderFilters();
    refreshMagasinViews();
    updateMetrics();

    setMagasinStatus("Succès : module magasin chargé depuis Grist.", "ok");
  } catch (error) {
    console.error(error);
    setMagasinStatus("Échec : " + error.message, "ko");
    magasinRawJson.textContent = error.message;
  }
}

function renderFilters() {
  fillSelect(magasinCategorieFilter, "Toutes les catégories", categories, "nomCategorie");
  fillSelect(magasinEmplacementFilter, "Tous les emplacements", emplacementsMagasin, "nomEmplacementMagasin");
}

function fillSelect(select, firstLabel, items, fieldName) {
  const currentValue = select.value;
  select.innerHTML = "";
  const first = document.createElement("option");
  first.value = "";
  first.textContent = firstLabel;
  select.appendChild(first);

  (items || []).forEach(item => {
    const value = item[fieldName] || "";
    if (!value) return;
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    select.appendChild(option);
  });

  select.value = currentValue;
}

function getFilteredComposants() {
  const query = normalizeText(magasinSearchInput.value);
  const statut = magasinStatutFilter.value;
  const categorie = magasinCategorieFilter.value;
  const emplacement = magasinEmplacementFilter.value;

  return composants.filter(item => {
    const haystack = normalizeText([
      item.code,
      item.nom,
      item.categorie,
      item.emplacement,
      item.fournisseur,
      item.referenceFournisseur,
      item.commentaire
    ].join(" "));

    const matchesQuery = !query || haystack.includes(query);
    const matchesStatut = !statut || item.statutStock === statut;
    const matchesCategorie = !categorie || item.categorie === categorie;
    const matchesEmplacement = !emplacement || item.emplacement === emplacement;

    return matchesQuery && matchesStatut && matchesCategorie && matchesEmplacement;
  });
}

function refreshMagasinViews() {
  const filtered = getFilteredComposants();
  renderMagasinCards(filtered);
  renderMagasinTable(filtered);
}

function renderMagasinCards(items) {
  magasinCardsView.innerHTML = "";

  if (!items || items.length === 0) {
    magasinCardsView.innerHTML = `<article class="empty-state"><h3>Aucun composant trouvé</h3><p>Ajoute des lignes dans la table Grist Composants ou modifie les filtres.</p></article>`;
    return;
  }

  items.forEach(item => {
    const card = document.createElement("article");
    card.className = "stock-card component-card";
    const initials = getInitials(item.code || item.nom || "CO");
    const stockClass = getStockClass(item.statutStock);
    const quantity = formatQuantity(item.quantite, item.unite);

    card.innerHTML = `
      <div class="component-visual">${renderComponentImage(item.imageUrl, initials)}</div>
      <div class="component-card-body">
        <div class="equipment-card-head">
          <div>
            <h3>${escapeHtml(item.code || "Sans code")}</h3>
            <p>${escapeHtml(item.nom || "")}</p>
          </div>
          <span class="stock-badge ${stockClass}">${escapeHtml(item.statutStock || "")}</span>
        </div>
        <div class="stock-quantity">${escapeHtml(quantity)}</div>
        <div class="card-meta">
          <span>Catégorie : ${escapeHtml(item.categorie || "-")}</span>
          <span>Emplacement : ${escapeHtml(item.emplacement || "-")}</span>
          <span>Fournisseur : ${escapeHtml(item.fournisseur || "-")}</span>
          <span>Réf. fournisseur : ${escapeHtml(item.referenceFournisseur || "-")}</span>
        </div>
        <p class="card-comment">${escapeHtml(item.commentaire || "")}</p>
        ${item.lienFournisseur ? `<a class="button-like btn-secondary" href="${escapeAttribute(item.lienFournisseur)}" target="_blank" rel="noopener">Fournisseur</a>` : ""}
      </div>
    `;

    magasinCardsView.appendChild(card);
  });
}

function renderComponentImage(imageUrl, initials) {
  if (imageUrl) {
    return `<img src="${escapeAttribute(imageUrl)}" alt="" loading="lazy">`;
  }
  return `<div class="stock-image component-placeholder">${escapeHtml(initials)}</div>`;
}

function renderMagasinTable(items) {
  magasinBody.innerHTML = "";

  if (!items || items.length === 0) {
    magasinBody.innerHTML = "<tr><td colspan='9'>Aucun composant trouvé.</td></tr>";
    return;
  }

  items.forEach(item => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${escapeHtml(item.code)}</td>
      <td>${escapeHtml(item.nom)}</td>
      <td>${escapeHtml(item.categorie)}</td>
      <td>${escapeHtml(item.emplacement)}</td>
      <td>${escapeHtml(formatQuantity(item.quantite, item.unite))}</td>
      <td><span class="stock-badge ${getStockClass(item.statutStock)}">${escapeHtml(item.statutStock)}</span></td>
      <td>${escapeHtml(item.fournisseur)}</td>
      <td>${escapeHtml(item.referenceFournisseur)}</td>
      <td>${escapeHtml(item.commentaire)}</td>
    `;
    magasinBody.appendChild(row);
  });
}

function renderReferenceLists() {
  renderReferenceList("categoriesList", categories, "nomCategorie", "description");
  renderReferenceList("emplacementsMagasinList", emplacementsMagasin, "nomEmplacementMagasin", "description");
  renderReferenceList("fournisseursList", fournisseurs, "nomFournisseur", "siteWeb");
}

function renderReferenceList(elementId, items, titleField, secondaryField) {
  const element = document.getElementById(elementId);

  if (!items || items.length === 0) {
    element.innerHTML = "<p class='small'>Aucune donnée.</p>";
    return;
  }

  element.innerHTML = items.map(item => {
    return `<div class="reference-chip"><strong>${escapeHtml(item[titleField] || "")}</strong><span>${escapeHtml(item[secondaryField] || "")}</span></div>`;
  }).join("");
}

function updateMetrics() {
  const total = composants.length;
  const enStock = composants.filter(item => item.statutStock === "En stock").length;
  const faible = composants.filter(item => item.statutStock === "Stock faible").length;
  const rupture = composants.filter(item => item.statutStock === "Rupture" || item.statutStock === "À commander").length;

  setText("metricComposants", total);
  setText("metricEnStock", enStock);
  setText("metricStockFaible", faible);
  setText("metricRupture", rupture);
  setText("metricFournisseurs", fournisseurs.length);
}

function setMagasinView(view) {
  currentMagasinView = view;
  magasinCardsView.hidden = view !== "cards";
  magasinTableView.hidden = view !== "table";
  viewMagasinCardsButton.classList.toggle("active", view === "cards");
  viewMagasinTableButton.classList.toggle("active", view === "table");
}

function getStockClass(statut) {
  if (statut === "En stock") return "stock-en-stock";
  if (statut === "Stock faible") return "stock-faible";
  if (statut === "Rupture") return "stock-rupture";
  if (statut === "À commander") return "stock-commande";
  if (statut === "Archivé") return "stock-archive";
  return "stock-neutre";
}

function formatQuantity(value, unit) {
  const number = Number(value || 0);
  const formatted = Number.isInteger(number) ? String(number) : number.toLocaleString("fr-FR");
  return (formatted + " " + (unit || "")).trim();
}

function getInitials(value) {
  const text = String(value || "CO").replace(/[^A-Za-z0-9]/g, "").slice(0, 2).toUpperCase();
  return text || "CO";
}

function normalizeText(value) {
  return String(value || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function setText(id, value) {
  const element = document.getElementById(id);
  if (element) element.textContent = value;
}

function setMagasinStatus(message, className) {
  magasinStatus.textContent = "Statut : " + message;
  magasinStatus.className = className;
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replaceAll("`", "&#096;");
}
