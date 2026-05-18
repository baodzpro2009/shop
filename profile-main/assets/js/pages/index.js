(() => {
  const api = window.appSupabase;
  const sourceGrid = document.getElementById("sourceGrid");
  const sourceState = document.getElementById("sourceState");
  const sourceCount = document.getElementById("sourceCount");
  const VISIT_SESSION_KEY = "source-code-share-visit-tracked";

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

    return new Intl.DateTimeFormat("vi-VN", {
      dateStyle: "medium",
      timeStyle: "short"
    }).format(new Date(value));
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
        ? `<a class="btn source-download-btn" href="${escapeHtml(item.zip_url)}" target="_blank" rel="noreferrer" data-download-id="${item.id}"><i class="fa-solid fa-download"></i>Tải Source</a>`
        : '<span class="btn ghost" aria-disabled="true"><i class="fa-solid fa-ban"></i>Chưa có file</span>';

      const demoButton = item.demo_video_url
        ? `<a class="btn ghost" href="${escapeHtml(item.demo_video_url)}" target="_blank" rel="noreferrer"><i class="fa-solid fa-circle-play"></i>Xem Demo</a>`
        : "";

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
              <span><i class="fa-solid fa-arrow-down"></i> ${Number(item.download_count || 0)} lượt tải</span>
            </div>

            <pre class="source-code">${escapeHtml(truncate(item.code, 260))}</pre>

            <div class="source-actions">
              ${downloadButton}
              ${demoButton}
            </div>
          </div>
        </article>
      `;
    }).join("");

    setSourceStateVisible(false);
  }

  async function fetchSources() {
    let result = await supabase
      .from(api.config.SOURCES_TABLE)
      .select("id, title, description, code, zip_url, thumbnail_url, demo_video_url, download_count, created_at")
      .order("created_at", { ascending: false });

    const message = String(result.error?.message || "");

    if (result.error && (message.includes("demo_video_url") || message.includes("download_count"))) {
      result = await supabase
        .from(api.config.SOURCES_TABLE)
        .select("id, title, description, code, zip_url, thumbnail_url, created_at")
        .order("created_at", { ascending: false });

      if (!result.error) {
        result.data = (result.data || []).map((item) => ({
          ...item,
          demo_video_url: null,
          download_count: 0
        }));
      }
    }

    return result;
  }

  async function trackSiteVisit() {
    if (sessionStorage.getItem(VISIT_SESSION_KEY)) {
      return;
    }

    try {
      const { error } = await supabase.rpc("increment_site_page_view");

      if (!error) {
        sessionStorage.setItem(VISIT_SESSION_KEY, "1");
      }
    } catch (error) {
      console.error("Could not track site visit:", error);
    }
  }

  async function trackDownload(sourceId) {
    if (!sourceId) {
      return;
    }

    try {
      await supabase.rpc("increment_source_download", {
        p_source_id: Number(sourceId)
      });
    } catch (error) {
      console.error("Could not track source download:", error);
    }
  }

  async function loadSources() {
    renderState("fa-solid fa-spinner fa-spin", "Đang tải source...");

    try {
      const { data, error } = await fetchSources();

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

  sourceGrid.addEventListener("click", async (event) => {
    const downloadLink = event.target.closest("[data-download-id]");

    if (!downloadLink) {
      return;
    }

    event.preventDefault();

    const href = downloadLink.getAttribute("href");
    const sourceId = downloadLink.dataset.downloadId;

    downloadLink.classList.add("is-pending");

    try {
      await trackDownload(sourceId);
    } finally {
      downloadLink.classList.remove("is-pending");

      if (href) {
        window.open(href, "_blank", "noopener,noreferrer");
      }
    }
  });

  trackSiteVisit();
  loadSources();
})();
