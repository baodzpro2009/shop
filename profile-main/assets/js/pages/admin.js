(() => {
  const LOGIN_PAGE = "./login.html";
  const api = window.appSupabase;

  const form = document.getElementById("uploadForm");
  const uploadBtn = document.querySelector(".upload-btn");
  const statusBox = document.getElementById("statusBox");
  const statusTitle = document.getElementById("statusTitle");
  const statusText = document.getElementById("statusText");
  const sessionLabel = document.getElementById("sessionLabel");
  const zipInput = document.getElementById("zipFile");
  const thumbnailInput = document.getElementById("thumbnail");
  const demoVideoInput = document.getElementById("demoVideo");
  const zipMeta = document.getElementById("zipMeta");
  const thumbnailMeta = document.getElementById("thumbnailMeta");
  const videoMeta = document.getElementById("videoMeta");
  const sourceLibrary = document.getElementById("sourceLibrary");
  const libraryState = document.getElementById("libraryState");
  const librarySearch = document.getElementById("librarySearch");
  const libraryCount = document.getElementById("libraryCount");
  const refreshSourcesBtn = document.getElementById("refreshSourcesBtn");
  const totalSourcesValue = document.getElementById("totalSourcesValue");
  const totalDownloadsValue = document.getElementById("totalDownloadsValue");
  const totalTrafficValue = document.getElementById("totalTrafficValue");

  if (!api || !form || !uploadBtn) {
    console.error("Admin page is missing required scripts or DOM nodes.");
    return;
  }

  const supabase = api.getSupabaseClient();
  const bucketName = api.config.SOURCES_BUCKET;
  const tableName = api.config.SOURCES_TABLE;
  const DEFAULT_UPLOAD_BUTTON =
    '<i class="fa-solid fa-cloud-arrow-up"></i> Publish Source';

  let sourceItems = [];
  let libraryLoading = false;

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

  function formatMetricCount(value, suffix) {
    return `${new Intl.NumberFormat("vi-VN").format(Number(value || 0))} ${suffix}`;
  }

  function formatDate(value) {
    if (!value) {
      return "Chua co ngay";
    }

    return new Intl.DateTimeFormat("vi-VN", {
      dateStyle: "medium",
      timeStyle: "short"
    }).format(new Date(value));
  }

  function setStatus(title, message, state = "idle") {
    if (statusBox) {
      statusBox.dataset.state = state;
    }

    if (statusTitle) {
      statusTitle.textContent = title;
    }

    if (statusText) {
      statusText.textContent = message;
    }
  }

  function updateFileMeta(input, target, emptyLabel) {
    if (!target) {
      return;
    }

    const file = input?.files?.[0];
    target.textContent = file
      ? `${file.name} • ${(file.size / 1024 / 1024).toFixed(2)} MB`
      : emptyLabel;
  }

  function setLibraryStateVisible(isVisible) {
    if (!libraryState) {
      return;
    }

    libraryState.hidden = !isVisible;
    libraryState.classList.toggle("is-hidden", !isVisible);
    libraryState.style.display = isVisible ? "flex" : "none";
  }

  function setLibraryLoadingState(message, iconClass = "fa-solid fa-spinner fa-spin") {
    if (!libraryState || !sourceLibrary) {
      return;
    }

    setLibraryStateVisible(true);
    libraryState.innerHTML = `<i class="${iconClass}"></i><span>${escapeHtml(message)}</span>`;
    sourceLibrary.innerHTML = "";
  }

  function updateLibraryCount(items) {
    if (!libraryCount) {
      return;
    }

    libraryCount.textContent = `${items.length} source`;
  }

  function updateDashboardStats(items, pageViews = 0) {
    const totalSources = items.length;
    const totalDownloads = items.reduce(
      (sum, item) => sum + Number(item.download_count || 0),
      0
    );

    if (totalSourcesValue) {
      totalSourcesValue.textContent = formatMetricCount(totalSources, "source");
    }

    if (totalDownloadsValue) {
      totalDownloadsValue.textContent = formatMetricCount(totalDownloads, "lượt tải");
    }

    if (totalTrafficValue) {
      totalTrafficValue.textContent = formatMetricCount(pageViews, "lượt truy cập");
    }
  }

  function getFilteredItems() {
    const keyword = (librarySearch?.value || "").trim().toLowerCase();

    if (!keyword) {
      return sourceItems;
    }

    return sourceItems.filter((item) => {
      const haystack = [
        item.title,
        item.description,
        item.code
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(keyword);
    });
  }

  function renderLibrary(items) {
    if (!sourceLibrary || !libraryState) {
      return;
    }

    if (!items.length) {
      setLibraryStateVisible(true);
      libraryState.innerHTML =
        '<i class="fa-regular fa-folder-open"></i><span>Chưa có source nào khớp với bộ lọc hiện tại.</span>';
      sourceLibrary.innerHTML = "";
      updateLibraryCount(items);
      return;
    }

    setLibraryStateVisible(false);
    updateLibraryCount(items);

    sourceLibrary.innerHTML = items.map((item) => {
      const zipAction = item.zip_url
        ? `<a class="action-btn primary" href="${escapeHtml(item.zip_url)}" target="_blank" rel="noreferrer"><i class="fa-solid fa-download"></i>Tải ZIP</a>`
        : "";
      const thumbAction = item.thumbnail_url
        ? `<a class="action-btn" href="${escapeHtml(item.thumbnail_url)}" target="_blank" rel="noreferrer"><i class="fa-regular fa-image"></i>Xem ảnh</a>`
        : "";
      const videoAction = item.demo_video_url
        ? `<a class="action-btn" href="${escapeHtml(item.demo_video_url)}" target="_blank" rel="noreferrer"><i class="fa-solid fa-circle-play"></i>Xem demo</a>`
        : "";

      return `
        <article class="library-card" data-source-id="${item.id}">
          <div class="library-card-head">
            <div>
              <span class="library-item-id">#${item.id}</span>
              <h3>${escapeHtml(item.title)}</h3>
              <p>${escapeHtml(item.description)}</p>
            </div>

            <button class="delete-btn" type="button" data-delete-id="${item.id}">
              <i class="fa-solid fa-trash-can"></i>
              Xóa
            </button>
          </div>

          <div class="asset-chip-row">
            <span class="asset-chip ${item.zip_url ? "active" : ""}">
              <i class="fa-solid fa-file-zipper"></i>
              ${item.zip_url ? "Có ZIP" : "Chưa có ZIP"}
            </span>
            <span class="asset-chip ${item.thumbnail_url ? "active" : ""}">
              <i class="fa-regular fa-image"></i>
              ${item.thumbnail_url ? "Có thumbnail" : "Chưa có thumbnail"}
            </span>
            <span class="asset-chip ${item.demo_video_url ? "active" : ""}">
              <i class="fa-solid fa-video"></i>
              ${item.demo_video_url ? "Có video demo" : "Chưa có video demo"}
            </span>
            <span class="asset-chip active">
              <i class="fa-solid fa-arrow-down"></i>
              ${Number(item.download_count || 0)} lượt tải
            </span>
          </div>

          <div class="library-meta">
            <span><i class="fa-regular fa-clock"></i> ${escapeHtml(formatDate(item.created_at))}</span>
            <span><i class="fa-solid fa-database"></i> ${escapeHtml(tableName)}</span>
          </div>

          <pre class="library-code">${escapeHtml(truncate(item.code, 360))}</pre>

          <div class="library-actions">
            ${zipAction}
            ${thumbAction}
            ${videoAction}
          </div>
        </article>
      `;
    }).join("");
  }

  function extractStoragePathFromPublicUrl(url) {
    if (!url) {
      return null;
    }

    try {
      const parsedUrl = new URL(url);
      const marker = `/storage/v1/object/public/${bucketName}/`;
      const markerIndex = parsedUrl.pathname.indexOf(marker);

      if (markerIndex === -1) {
        return null;
      }

      return decodeURIComponent(parsedUrl.pathname.slice(markerIndex + marker.length));
    } catch (error) {
      console.error("Could not parse storage path:", error);
      return null;
    }
  }

  async function ensureAdminSession() {
    try {
      const session = await api.getActiveSession();
      const user = session?.user || null;

      if (!user || !api.isAdminUser(user)) {
        await supabase.auth.signOut();
        alert("Bạn cần đăng nhập bằng tài khoản admin hợp lệ.");
        window.location.href = LOGIN_PAGE;
        return null;
      }

      if (sessionLabel) {
        sessionLabel.textContent = `${user.email} • Admin`;
      }

      if ((api.config.ADMIN_EMAILS || []).includes("admin@example.com")) {
        setStatus(
          "Cần cập nhật cấu hình admin",
          "Hãy thay email mẫu trong assets/js/shared/app-config.js bằng email admin thật của bạn.",
          "idle"
        );
      } else {
        setStatus(
          "Sẵn sàng publish",
          "Phiên admin đã hợp lệ. Bạn có thể upload, xem danh sách và xóa source.",
          "idle"
        );
      }

      return user;
    } catch (error) {
      console.error(error);
      alert("Không thể xác thực phiên admin hiện tại.");
      window.location.href = LOGIN_PAGE;
      return null;
    }
  }

  async function loadSourceLibrary() {
    if (!sourceLibrary || !libraryState || libraryLoading) {
      return;
    }

    libraryLoading = true;
    refreshSourcesBtn && (refreshSourcesBtn.disabled = true);
    setLibraryLoadingState("Đang tải danh sách source...");

    try {
      let result = await supabase
        .from(tableName)
        .select("id, title, description, code, zip_url, thumbnail_url, demo_video_url, download_count, created_at")
        .order("created_at", { ascending: false });

      const message = String(result.error?.message || "");

      if (result.error && (message.includes("demo_video_url") || message.includes("download_count"))) {
        result = await supabase
          .from(tableName)
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

      const { data, error } = result;

      if (error) {
        throw error;
      }

      sourceItems = data || [];
      let pageViews = 0;

      const { data: metricsData, error: metricsError } = await supabase
        .from("site_metrics")
        .select("metric_value")
        .eq("metric_key", "page_views")
        .maybeSingle();

      if (!metricsError) {
        pageViews = Number(metricsData?.metric_value || 0);
      }

      renderLibrary(getFilteredItems());
      updateDashboardStats(sourceItems, pageViews);
    } catch (error) {
      console.error(error);
      setLibraryStateVisible(true);
      libraryState.innerHTML =
        '<i class="fa-solid fa-triangle-exclamation"></i><span>Không thể tải danh sách source. Kiểm tra table hoặc policy của Supabase.</span>';
      sourceLibrary.innerHTML = "";
      updateLibraryCount([]);
      updateDashboardStats([], 0);
    } finally {
      libraryLoading = false;
      refreshSourcesBtn && (refreshSourcesBtn.disabled = false);
    }
  }

  async function removeStoredAssets(item) {
    const paths = [
      extractStoragePathFromPublicUrl(item.zip_url),
      extractStoragePathFromPublicUrl(item.thumbnail_url),
      extractStoragePathFromPublicUrl(item.demo_video_url)
    ].filter(Boolean);

    if (!paths.length) {
      return;
    }

    const { error } = await supabase.storage.from(bucketName).remove(paths);

    if (error) {
      throw error;
    }
  }

  async function handleDeleteSource(sourceId, triggerButton) {
    const user = await ensureAdminSession();
    if (!user) {
      return;
    }

    const item = sourceItems.find((entry) => String(entry.id) === String(sourceId));

    if (!item) {
      alert("Không tìm thấy source cần xóa.");
      return;
    }

    const confirmed = window.confirm(
      `Xóa source "${item.title}"?\n\nHành động này sẽ xóa bản ghi khỏi database và cố gắng xóa cả file trong storage.`
    );

    if (!confirmed) {
      return;
    }

    if (triggerButton) {
      triggerButton.disabled = true;
      triggerButton.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang xóa';
    }

    setStatus(
      "Đang xóa source",
      `Hệ thống đang gỡ source "${item.title}" khỏi storage và database.`,
      "loading"
    );

    try {
      await removeStoredAssets(item);

      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq("id", item.id);

      if (error) {
        throw error;
      }

      sourceItems = sourceItems.filter((entry) => entry.id !== item.id);
      renderLibrary(getFilteredItems());
      await loadSourceLibrary();
      setStatus(
        "Xóa thành công",
        `Source "${item.title}" đã được gỡ khỏi hệ thống.`,
        "success"
      );
    } catch (error) {
      console.error(error);
      setStatus(
        "Xóa thất bại",
        "Không thể xóa source. Hãy kiểm tra delete policy cho table và storage trong Supabase.",
        "error"
      );
      alert("Xóa source thất bại. Mở console để xem chi tiết.");
    } finally {
      if (triggerButton) {
        triggerButton.disabled = false;
        triggerButton.innerHTML = '<i class="fa-solid fa-trash-can"></i> Xóa';
      }
    }
  }

  zipInput?.addEventListener("change", () => {
    updateFileMeta(zipInput, zipMeta, "Chưa chọn file");
  });

  thumbnailInput?.addEventListener("change", () => {
    updateFileMeta(thumbnailInput, thumbnailMeta, "Chưa chọn ảnh");
  });

  demoVideoInput?.addEventListener("change", () => {
    updateFileMeta(demoVideoInput, videoMeta, "Chưa chọn video");
  });

  librarySearch?.addEventListener("input", () => {
    renderLibrary(getFilteredItems());
  });

  refreshSourcesBtn?.addEventListener("click", () => {
    loadSourceLibrary();
  });

  sourceLibrary?.addEventListener("click", (event) => {
    const deleteButton = event.target.closest("[data-delete-id]");

    if (!deleteButton) {
      return;
    }

    handleDeleteSource(deleteButton.dataset.deleteId, deleteButton);
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const user = await ensureAdminSession();
    if (!user) {
      return;
    }

    const title = document.getElementById("title").value.trim();
    const description = document.getElementById("description").value.trim();
    const code = document.getElementById("code").value.trim();
    const zip = zipInput?.files?.[0] || null;
    const thumbnail = thumbnailInput?.files?.[0] || null;
    const demoVideo = demoVideoInput?.files?.[0] || null;

    if (!title || !description || !code) {
      setStatus(
        "Thiếu dữ liệu bắt buộc",
        "Tiêu đề, mô tả và phần code preview phải được điền đầy đủ.",
        "error"
      );
      alert("Vui lòng nhập đầy đủ tiêu đề, mô tả và code preview.");
      return;
    }

    uploadBtn.disabled = true;
    uploadBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang publish...';
    setStatus(
      "Đang tải dữ liệu lên",
      "Hệ thống đang upload asset và ghi metadata lên Supabase.",
      "loading"
    );

    try {
      const prefix = new Date().toISOString().replace(/[:.]/g, "-");
      const safeTitle = (title || "source")
        .toLowerCase()
        .replace(/[^a-z0-9-]+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");

      const zipExt = zip?.name?.split(".").pop() || "zip";
      const thumbExt = thumbnail?.name?.split(".").pop() || "jpg";
      const videoExt = demoVideo?.name?.split(".").pop() || "mp4";

      const zipPath = zip ? `${prefix}/${safeTitle || "source"}.${zipExt}` : null;
      const thumbnailPath = thumbnail
        ? `${prefix}/${safeTitle || "source"}-thumb.${thumbExt}`
        : null;
      const demoVideoPath = demoVideo
        ? `${prefix}/${safeTitle || "source"}-demo.${videoExt}`
        : null;

      if (zipPath && zip) {
        const { error } = await supabase.storage.from(bucketName).upload(zipPath, zip, {
          contentType: zip.type || "application/zip",
          upsert: false
        });

        if (error) {
          throw error;
        }
      }

      if (thumbnailPath && thumbnail) {
        const { error } = await supabase.storage.from(bucketName).upload(thumbnailPath, thumbnail, {
          contentType: thumbnail.type || "image/jpeg",
          upsert: false
        });

        if (error) {
          throw error;
        }
      }

      if (demoVideoPath && demoVideo) {
        const { error } = await supabase.storage.from(bucketName).upload(demoVideoPath, demoVideo, {
          contentType: demoVideo.type || "video/mp4",
          upsert: false
        });

        if (error) {
          throw error;
        }
      }

      const zipUrl = zipPath
        ? supabase.storage.from(bucketName).getPublicUrl(zipPath).data.publicUrl
        : null;
      const thumbnailUrl = thumbnailPath
        ? supabase.storage.from(bucketName).getPublicUrl(thumbnailPath).data.publicUrl
        : null;
      const demoVideoUrl = demoVideoPath
        ? supabase.storage.from(bucketName).getPublicUrl(demoVideoPath).data.publicUrl
        : null;

      const { error: insertError } = await supabase.from(tableName).insert({
        title,
        description,
        code,
        zip_url: zipUrl,
        thumbnail_url: thumbnailUrl,
        demo_video_url: demoVideoUrl
      });

      if (insertError) {
        throw insertError;
      }

      form.reset();
      updateFileMeta(zipInput, zipMeta, "Chưa chọn file");
      updateFileMeta(thumbnailInput, thumbnailMeta, "Chưa chọn ảnh");
      updateFileMeta(demoVideoInput, videoMeta, "Chưa chọn video");
      setStatus(
        "Publish thành công",
        "Source, thumbnail và video demo đã được lưu thành công.",
        "success"
      );
      await loadSourceLibrary();
      alert("Upload source thành công.");
    } catch (error) {
      console.error(error);
      setStatus(
        "Publish thất bại",
        "Không thể upload source. Kiểm tra bucket, bảng hoặc SQL policy mới trong Supabase.",
        "error"
      );
      if (String(error?.message || "").includes("demo_video_url")) {
        setStatus(
          "Thiếu cột demo_video_url",
          "Hãy chạy lại docs/supabase-secure-setup.sql để thêm cột video demo và policy xóa mới.",
          "error"
        );
      }
      alert("Upload thất bại. Mở console để xem chi tiết.");
    } finally {
      uploadBtn.disabled = false;
      uploadBtn.innerHTML = DEFAULT_UPLOAD_BUTTON;
    }
  });

  async function logout() {
    try {
      await supabase.auth.signOut();
    } finally {
      window.location.href = LOGIN_PAGE;
    }
  }

  window.logout = logout;

  document.addEventListener("keydown", (event) => {
    if (event.ctrlKey && event.key.toLowerCase() === "l") {
      event.preventDefault();
      logout();
    }
  });

  (async () => {
    const user = await ensureAdminSession();

    if (!user) {
      return;
    }

    await loadSourceLibrary();
  })();
})();
