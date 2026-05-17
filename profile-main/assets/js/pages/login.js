(() => {
  const ADMIN_PAGE = "admin.html";
  const api = window.appSupabase;
  const form = document.getElementById("loginForm");
  const btn = document.querySelector(".login-btn");
  const authHint = document.getElementById("authHint");

  if (!api || !form || !btn) {
    console.error("Login page is missing required scripts or DOM nodes.");
    return;
  }

  const supabase = api.getSupabaseClient();
  const DEFAULT_BUTTON_HTML =
    '<i class="fa-solid fa-right-to-bracket"></i> Đăng nhập';

  function setButtonLoading(isLoading) {
    btn.disabled = isLoading;
    btn.innerHTML = isLoading
      ? '<i class="fa-solid fa-spinner fa-spin"></i> Đang đăng nhập...'
      : DEFAULT_BUTTON_HTML;
  }

  function normalizeIdentifier(identifier) {
    if (identifier.includes("@")) {
      return identifier.toLowerCase();
    }

    if (identifier === "admin" && (api.config.ADMIN_EMAILS || []).length > 0) {
      return api.config.ADMIN_EMAILS[0].toLowerCase();
    }

    return identifier.toLowerCase();
  }

  async function redirectIfLoggedIn() {
    try {
      const session = await api.getActiveSession();

      if (session?.user && api.isAdminUser(session.user)) {
        window.location.href = ADMIN_PAGE;
      }
    } catch (error) {
      console.error(error);
    }
  }

  if (authHint) {
    authHint.textContent = "Khu vực này chỉ dành cho quản trị viên đã được cấp quyền.";
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const identifier = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();

    if (!identifier || !password) {
      alert("Vui lòng nhập đầy đủ email và mật khẩu.");
      return;
    }

    setButtonLoading(true);

    try {
      const email = normalizeIdentifier(identifier);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        throw error;
      }

      if (!api.isAdminUser(data.user)) {
        await supabase.auth.signOut();
        throw new Error("Tài khoản này không có quyền admin.");
      }

      window.location.href = ADMIN_PAGE;
    } catch (error) {
      console.error(error);
      alert("Đăng nhập thất bại. Kiểm tra Supabase Auth, email admin cấu hình và mật khẩu.");
    } finally {
      setButtonLoading(false);
    }
  });

  redirectIfLoggedIn();
})();
