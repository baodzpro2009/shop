(() => {
  const api = window.appSupabase;
  const sourceGrid = document.getElementById("sourceGrid");
  const sourceState = document.getElementById("sourceState");
  const sourceCount = document.getElementById("sourceCount");

  if (!api || !sourceGrid || !sourceState || !sourceCount) {
    return;
  }

  const supabase = api.getSupabaseClient();

  function escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function truncate(value, maxLength) {
    if (!value) {
      return "";
    }

    return value.length > maxLength
      ? `${value.slice(0, maxLength).trim()}...`
      : value;
  }

  function formatDate(value) {
    if (!value) {
      return "Chưa có ngày";
    }

    const date = new Date(value);
    return new Intl.DateTimeFormat("vi-VN", {
      dateStyle: "medium",
      timeStyle: "short"
    }).format(date);
  }

  function setSourceStateVisible(isVisible) {
    sourceState.hidden = !isVisible;
    sourceState.classList.toggle("is-hidden", !isVisible);
    sourceState.style.display = isVisible ? "flex" : "none";
  }

  function renderState(iconClass, message) {
    sourceState.innerHTML = `<i class="${iconClass}"></i><span>${escapeHtml(message)}</span>`;
    setSourceStateVisible(true);
    sourceGrid.innerHTML = "";
  }

  function renderSources(items) {
    if (!items.length) {
      renderState("fa-regular fa-folder-open", "Chưa có source nào được publish.");
      sourceCount.textContent = "0 source đang hiển thị.";
      return;
    }

    sourceCount.textContent = `${items.length} source đang hiển thị từ Supabase.`;

    sourceGrid.innerHTML = items.map((item) => {
      const thumb = item.thumbnail_url
        ? `<img class="source-thumb" src="${escapeHtml(item.thumbnail_url)}" alt="${escapeHtml(item.title)}">`
        : '<img class="source-thumb" src="assets/images/source-placeholder.svg" alt="Ảnh minh họa source code">';

      const downloadButton = item.zip_url
        ? `<a class="btn" href="${escapeHtml(item.zip_url)}" target="_blank" rel="noreferrer"><i class="fa-solid fa-download"></i>Tải Source</a>`
        : `<span class="btn ghost" aria-disabled="true"><i class="fa-solid fa-ban"></i>Chưa có file</span>`;

      return `
        <article class="source-card">
          ${thumb}
          <div class="source-content">
            <div class="source-top">
              <div>
                <h3 class="source-title">${escapeHtml(item.title)}</h3>
              </div>
              <span class="source-badge">Source</span>
            </div>

            <p class="source-description">${escapeHtml(item.description)}</p>

            <div class="source-meta">
              <span><i class="fa-regular fa-clock"></i> ${escapeHtml(formatDate(item.created_at))}</span>
              <span><i class="fa-solid fa-database"></i> ${escapeHtml(api.config.SOURCES_TABLE)}</span>
            </div>

            <pre class="source-code">${escapeHtml(truncate(item.code, 260))}</pre>

            <div class="source-actions">
              ${downloadButton}
            </div>
          </div>
        </article>
      `;
    }).join("");
    setSourceStateVisible(false);
  }

  async function loadSources() {
    renderState("fa-solid fa-spinner fa-spin", "Đang tải source...");

    try {
      const { data, error } = await supabase
        .from(api.config.SOURCES_TABLE)
        .select("title, description, code, zip_url, thumbnail_url, created_at")
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      renderSources(data || []);
    } catch (error) {
      console.error(error);
      renderState(
        "fa-solid fa-triangle-exclamation",
        "Không thể tải dữ liệu từ Supabase. Kiểm tra table, RLS policy hoặc network."
      );
      sourceCount.textContent = "Không thể đồng bộ dữ liệu.";
    }
  }

  loadSources();
})();
