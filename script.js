let websites = JSON.parse(localStorage.getItem("websites")) || [];
let folders = JSON.parse(localStorage.getItem("folders")) || [];

let currentWebsiteIdToAdd = null;
let currentRenameId = null;
let currentRenameType = null; // 'website' or 'folder'
let addToFolderModal, viewFolderModal, renameModal;

// Utility: escape HTML to prevent XSS
function escapeHTML(str) {
  return str.replace(/[&<>"']/g, (m) => {
    switch (m) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      case "'":
        return "&#39;";
      default:
        return m;
    }
  });
}

// Save data to localStorage
function saveData() {
  localStorage.setItem("websites", JSON.stringify(websites));
  localStorage.setItem("folders", JSON.stringify(folders));
}

// Generate a unique ID based on timestamp + random number
function generateId() {
  return Date.now().toString() + Math.floor(Math.random() * 1000);
}

// Render folders and websites cards with optional search filter
function renderCards(filter = "") {
  const container = document.getElementById("cardsContainer");
  container.innerHTML = "";
  const search = filter.trim().toLowerCase();

  // Filter folders by name
  const filteredFolders = folders.filter((folder) =>
    folder.name.toLowerCase().includes(search)
  );

  // Filter websites by name or tags
  const filteredWebsites = websites.filter((site) => {
    const nameMatch = site.name.toLowerCase().includes(search);
    const tagMatch = site.tags.some((tag) =>
      tag.toLowerCase().includes(search)
    );
    return nameMatch || tagMatch;
  });

  // Render folders first
  filteredFolders.forEach((folder) => {
    const col = document.createElement("div");
    col.className = "col";

    col.innerHTML = `
      <div class="card folder-card h-100 shadow-sm" data-folder-id="${folder.id}" tabindex="0" role="button" aria-pressed="false">
        <div class="card-body d-flex flex-column">
          <h5 class="card-title">${escapeHTML(folder.name)}</h5>
          <p class="card-text mb-3">Contains ${folder.websites.length} website(s)</p>
          <div class="mt-auto d-flex justify-content-between align-items-center">
            <!--<button class="btn btn-outline-primary btn-sm" onclick="loadFolderSites('${folder.id}'); event.stopPropagation();"></button>-->
            <button class="btn btn-outline-primary btn-sm"; event.stopPropagation();">See Inside</button>
            <button class="btn btn-outline-warning btn-sm" onclick="openRenameModal('${folder.id}', 'folder'); event.stopPropagation();">Rename</button>
            <button class="btn btn-outline-danger btn-sm" onclick="removeFolder('${folder.id}'); event.stopPropagation();">Delete</button>
          </div>
        </div>
      </div>
    `;

    // Clicking folder card opens modal with folder contents
    col.querySelector(".folder-card").addEventListener("click", () => {
      openViewFolderModal(folder.id);
    });

    container.appendChild(col);
  });

  // Then render websites
  filteredWebsites.forEach((site) => {
    if (!site.url || !site.name) return;

    const col = document.createElement("div");
    col.className = "col";

    // Shift tags higher by adjusting margin-bottom from 30px to 40px to avoid overlapping rename button
    const tagsHTML = site.tags
      .map(tag => `<span class="badge bg-secondary tag-badge" style="margin-bottom: 40px;">${escapeHTML(tag)}</span>`)
      .join(" ");

    col.innerHTML = `
      <div class="card h-100 shadow-sm">
        <div class="card-body d-flex flex-column">
          <h5 class="card-title">${escapeHTML(site.name)}</h5>
          <p class="card-text">
            <a href="${escapeHTML(site.url)}" target="_blank" rel="noopener noreferrer">${escapeHTML(site.url)}</a>
          </p>
          <div>${tagsHTML}</div>
          <div class="mt-auto d-flex justify-content-start align-items-center">
            <button class="btn btn-sm btn-outline-primary btn-add-folder" onclick="openAddToFolderModal('${site.id}'); event.stopPropagation();">Add to Folder</button>
            <button class="btn btn-sm btn-outline-warning ms-2" onclick="openRenameModal('${site.id}', 'website'); event.stopPropagation();">Rename</button>
            <button class="btn btn-sm btn-outline-danger ms-2" onclick="deleteWebsite('${site.id}'); event.stopPropagation();">Delete</button>
          </div>
        </div>
      </div>
    `;

    container.appendChild(col);
  });

  // Show placeholder if nothing found
  if (filteredFolders.length === 0 && filteredWebsites.length === 0) {
    container.innerHTML = `<p class="text-muted text-center mt-5 fs-5">Waiting to add some files...</p>`;
  }
}

// Add a new website
function addWebsite() {
  const nameInput = document.getElementById("siteName");
  const urlInput = document.getElementById("siteURL");
  const tagsInput = document.getElementById("siteTags");

  const name = nameInput.value.trim();
  const url = urlInput.value.trim();
  const tagsRaw = tagsInput.value.trim();

  if (!name || !url) {
    alert("Please fill in the required fields: Website Name and URL.");
    return;
  }

  // Validate URL format
  try {
    new URL(url);
  } catch {
    alert("Please enter a valid URL including https:// or http://");
    return;
  }

  const tags = tagsRaw
    ? tagsRaw
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t.length > 0)
    : [];

  websites.push({ id: generateId(), name, url, tags });
  saveData();

  // Clear inputs
  nameInput.value = "";
  urlInput.value = "";
  tagsInput.value = "";

  renderCards();
}

// Delete website and remove from all folders
function deleteWebsite(siteId) {
  if (!confirm("Are you sure you want to delete this website?")) return;

  websites = websites.filter((site) => site.id !== siteId);

  folders.forEach((folder) => {
    folder.websites = folder.websites.filter((id) => id !== siteId);
  });

  saveData();
  renderCards();
}

// Add a new folder
function addFolder() {
  const folderInput = document.getElementById("folderName");
  const folderName = folderInput.value.trim();

  if (!folderName) {
    alert("Please enter a folder name.");
    return;
  }

  folders.push({ id: generateId(), name: folderName, websites: [] });
  saveData();

  folderInput.value = "";
  renderCards();
}

// Remove a folder by ID
function removeFolder(folderId) {
  if (!confirm("Are you sure you want to delete this folder?")) return;

  folders = folders.filter((f) => f.id !== folderId);
  saveData();
  renderCards();
}

// Open all websites in folder in new tabs
function loadFolderSites(folderId) {
  const folder = folders.find((f) => f.id === folderId);
  if (!folder) return;

  // Collect all URLs first
  const urlsToOpen = folder.websites
    .map((siteId) => {
      const site = websites.find((w) => w.id === siteId);
      return site?.url;
    })
    .filter(Boolean); // remove any undefined values

  // Open each URL in a new tab (synchronously within click event)
  urlsToOpen.forEach((url) => {
    window.open(url, "_blank");
  });
}






  


// Open modal to add a website to a folder
function openAddToFolderModal(siteId) {
  currentWebsiteIdToAdd = siteId;
  const folderSelect = document.getElementById("folderSelect");
  folderSelect.innerHTML = "";

  if (folders.length === 0) {
    folderSelect.innerHTML = `<option disabled>No folders available</option>`;
  } else {
    folders.forEach((folder) => {
      const opt = document.createElement("option");
      opt.value = folder.id;
      opt.textContent = folder.name;
      folderSelect.appendChild(opt);
    });
  }

  addToFolderModal.show();
}

// Add to folder modal form submit handler
document.getElementById("addToFolderForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const folderId = document.getElementById("folderSelect").value;
  if (!folderId) return;

  const folder = folders.find((f) => f.id === folderId);
  if (!folder) return;

  if (!folder.websites.includes(currentWebsiteIdToAdd)) {
    folder.websites.push(currentWebsiteIdToAdd);
    saveData();
    renderCards();
  }
  addToFolderModal.hide();
});

// View folder modal - show websites inside
function openViewFolderModal(folderId) {
  const folder = folders.find((f) => f.id === folderId);
  if (!folder) return;

  const container = document.getElementById("folderWebsitesContainer");
  container.innerHTML = "";

  if (folder.websites.length === 0) {
    container.innerHTML = `<p class="text-muted">Folder is empty.</p>`;
  } else {
    folder.websites.forEach((siteId) => {
      const site = websites.find((w) => w.id === siteId);
      if (site) {
        const div = document.createElement("div");
        div.className =
          "d-flex justify-content-between align-items-center mb-2 border rounded p-2 shadow-sm bg-white";

        const tagsHTML = site.tags
          .map(
            (tag) =>
              `<span class="badge bg-secondary tag-badge">${escapeHTML(tag)}</span>`
          )
          .join(" ");

        div.innerHTML = `
          <div>
            <a href="${escapeHTML(site.url)}" target="_blank" rel="noopener noreferrer">${escapeHTML(site.name)}</a>
            <div>${tagsHTML}</div>
          </div>
          <button class="btn btn-sm btn-outline-danger btn-glow">Remove</button>
        `;

        div.querySelector("button").addEventListener("click", () => {
          // Remove from folder
          folder.websites = folder.websites.filter((id) => id !== siteId);
          saveData();
          // Refresh modal content & main cards
          openViewFolderModal(folderId);
          renderCards();
        });

        container.appendChild(div);
      }
    });
  }

  const modalEl = document.getElementById("viewFolderModal");
  const modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
  document.getElementById("viewFolderModalLabel").textContent = `Folder: ${folder.name}`;

  // Show modal only if not shown
  if (!modal._isShown) modal.show();
}

// Open Rename modal for website or folder
function openRenameModal(id, type) {
  currentRenameId = id;
  currentRenameType = type;

  // Use global renameModal instead of re-creating
  const inputName = document.getElementById("renameInputName");
  const inputTags = document.getElementById("renameInputTags");
  const tagsLabel = document.getElementById("renameTagsLabel");

  if (type === "website") {
    const site = websites.find((w) => w.id === id);
    if (!site) return;
    inputName.value = site.name;
    inputTags.value = site.tags.join(", ");
    inputTags.style.display = "block";
    tagsLabel.style.display = "block";
  } else if (type === "folder") {
    const folder = folders.find((f) => f.id === id);
    if (!folder) return;
    inputName.value = folder.name;
    inputTags.style.display = "none";
    tagsLabel.style.display = "none";
  }

  renameModal.show();
}

// Rename form submit handler
document.getElementById("renameForm").addEventListener("submit", (e) => {
  e.preventDefault();

  const inputName = document.getElementById("renameInputName").value.trim();

  if (!inputName) {
    alert("Name cannot be empty.");
    return;
  }

  if (currentRenameType === "website") {
    const site = websites.find((w) => w.id === currentRenameId);
    if (!site) return;

    site.name = inputName;

    const tagsRaw = document.getElementById("renameInputTags").value.trim();
    site.tags = tagsRaw
      ? tagsRaw
          .split(",")
          .map((t) => t.trim())
          .filter((t) => t.length > 0)
      : [];
  } else if (currentRenameType === "folder") {
    const folder = folders.find((f) => f.id === currentRenameId);
    if (!folder) return;

    folder.name = inputName;
  }

  saveData();
  renderCards();

  renameModal.hide();
});

// Search filter event
document.getElementById("searchBar").addEventListener("input", (e) => {
  renderCards(e.target.value);
});

// Initial render
renderCards();

// Initialize Bootstrap modals for reuse
addToFolderModal = new bootstrap.Modal(document.getElementById("addToFolderModal"));
viewFolderModal = new bootstrap.Modal(document.getElementById("viewFolderModal"));
renameModal = new bootstrap.Modal(document.getElementById("renameModal"));

/* AI Chat Widget Logic */

const aiToggleBtn = document.getElementById("aiToggleBtn");
const aiChatBox = document.getElementById("aiChatBox");
const aiMessages = document.getElementById("aiMessages");
const aiForm = document.getElementById("aiForm");
const aiInput = document.getElementById("aiInput");

aiToggleBtn.addEventListener("click", () => {
  const expanded = aiToggleBtn.getAttribute("aria-expanded") === "true";
  if (expanded) {
    aiChatBox.hidden = true;
    aiToggleBtn.setAttribute("aria-expanded", "false");
  } else {
    aiChatBox.hidden = false;
    aiToggleBtn.setAttribute("aria-expanded", "true");
    aiInput.focus();
  }
});

function appendAIMessage(message, isUser = false) {
  const div = document.createElement("div");
  div.className = isUser
    ? "ai-message ai-message-user mb-2 text-end"
    : "ai-message ai-message-bot mb-2 text-start";

  div.textContent = message;
  aiMessages.appendChild(div);
  aiMessages.scrollTop = aiMessages.scrollHeight;
}

// Example dummy AI response (replace with real API call)
async function getAIResponse(message) {
  // Simulate delay
  await new Promise((r) => setTimeout(r, 1000));
  return "Echo: " + message;
}

aiForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const userMessage = aiInput.value.trim();
  if (!userMessage) return;

  appendAIMessage(userMessage, true);
  aiInput.value = "";
  aiInput.disabled = true;

  const botResponse = await getAIResponse(userMessage);
  appendAIMessage(botResponse, false);

  aiInput.disabled = false;
  aiInput.focus();
});
