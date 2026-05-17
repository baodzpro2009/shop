(() => {
  const config = window.APP_CONFIG;

  if (!config) {
    throw new Error("APP_CONFIG is missing.");
  }

  if (!window.supabase?.createClient) {
    throw new Error("Supabase browser library is missing.");
  }

  let client = null;

  function getSupabaseClient() {
    if (!client) {
      client = window.supabase.createClient(
        config.SUPABASE_URL,
        config.SUPABASE_ANON_KEY
      );
    }

    return client;
  }

  function normalizeAdminEmails() {
    return (config.ADMIN_EMAILS || []).map((email) => email.toLowerCase());
  }

  function isAdminUser(user) {
    if (!user) {
      return false;
    }

    const email = (user.email || "").toLowerCase();
    const role =
      user.app_metadata?.role ||
      user.user_metadata?.role ||
      "";

    return normalizeAdminEmails().includes(email) || role === "admin";
  }

  async function getActiveSession() {
    const { data, error } = await getSupabaseClient().auth.getSession();

    if (error) {
      throw error;
    }

    return data.session;
  }

  window.appSupabase = {
    config,
    getSupabaseClient,
    getActiveSession,
    isAdminUser
  };
})();
