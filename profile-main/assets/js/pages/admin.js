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
  const zipMeta = document.getElementById("zipMeta");
  const thumbnailMeta = document.getElementById("thumbnailMeta");

  if (!api || !form || !uploadBtn) {
    console.error("Admin page is missing required scripts or DOM nodes.");
    return;
  }

  const supabase = api.getSupabaseClient();

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
          "Phiên admin đã hợp lệ. Bạn có thể upload source lên Supabase.",
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

  zipInput?.addEventListener("change", () => {
    updateFileMeta(zipInput, zipMeta, "Chưa chọn file");
  });

  thumbnailInput?.addEventListener("change", () => {
    updateFileMeta(thumbnailInput, thumbnailMeta, "Chưa chọn ảnh");
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
      "Hệ thống đang upload file và ghi metadata lên Supabase.",
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

      const zipPath = zip
        ? `${prefix}/${safeTitle || "source"}.${zipExt}`
        : null;
      const thumbnailPath = thumbnail
        ? `${prefix}/${safeTitle || "source"}-thumb.${thumbExt}`
        : null;

      if (zipPath && zip) {
        const { error } = await supabase.storage
          .from(api.config.SOURCES_BUCKET)
          .upload(zipPath, zip, {
            contentType: zip.type || "application/zip",
            upsert: false
          });

        if (error) {
          throw error;
        }
      }

      if (thumbnailPath && thumbnail) {
        const { error } = await supabase.storage
          .from(api.config.SOURCES_BUCKET)
          .upload(thumbnailPath, thumbnail, {
            contentType: thumbnail.type || "image/jpeg",
            upsert: false
          });

        if (error) {
          throw error;
        }
      }

      const zipUrl = zipPath
        ? supabase.storage.from(api.config.SOURCES_BUCKET).getPublicUrl(zipPath).data.publicUrl
        : null;

      const thumbnailUrl = thumbnailPath
        ? supabase.storage.from(api.config.SOURCES_BUCKET).getPublicUrl(thumbnailPath).data.publicUrl
        : null;

      const { error: insertError } = await supabase.from(api.config.SOURCES_TABLE).insert({
        title,
        description,
        code,
        zip_url: zipUrl,
        thumbnail_url: thumbnailUrl
      });

      if (insertError) {
        throw insertError;
      }

      form.reset();
      updateFileMeta(zipInput, zipMeta, "Chưa chọn file");
      updateFileMeta(thumbnailInput, thumbnailMeta, "Chưa chọn ảnh");
      setStatus(
        "Publish thành công",
        "Source đã được lưu vào storage và metadata đã ghi thành công.",
        "success"
      );
      alert("Upload source thành công.");
    } catch (error) {
      console.error(error);
      setStatus(
        "Publish thất bại",
        "Không thể upload source. Kiểm tra bucket, table hoặc RLS policy của Supabase.",
        "error"
      );
      alert("Upload thất bại. Mở console để xem chi tiết.");
    } finally {
      uploadBtn.disabled = false;
      uploadBtn.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> Publish Source';
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

  ensureAdminSession();
})();
