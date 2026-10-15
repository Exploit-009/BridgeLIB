(() => {
  "use strict";
  const cfg = window.BRIDGELIB_CONFIG || {};
  const hasConfig = Boolean(cfg.supabaseUrl && cfg.supabasePublishableKey && window.supabase);
  const client = hasConfig ? window.supabase.createClient(cfg.supabaseUrl, cfg.supabasePublishableKey) : null;
  const $ = (id) => document.getElementById(id);
  let authMode = "signup";
  let selectedPath = "school_learner";
  let currentUser = null;

  const show = (el, yes = true) => el && el.classList.toggle("hidden", !yes);
  const setMessage = (id, message, kind = "") => {
    const el = $(id); if (!el) return;
    el.textContent = message; el.className = "status-message" + (kind ? " " + kind : "");
  };
  const toast = (message, kind = "") => {
    const el = $("toast"); el.textContent = message; el.className = "toast" + (kind ? " " + kind : "");
    setTimeout(() => el.classList.add("hidden"), 4200);
  };
  const nice = (value) => (value || "").replaceAll("_", " ").replace(/\b\w/g, c => c.toUpperCase());

  function openAuth(mode = "signup", path = "school_learner") {
    authMode = mode; selectedPath = path;
    $("learnerPath").value = path;
    $("authSection").scrollIntoView({behavior:"smooth", block:"start"});
    show($("authSection"), true);
    show($("appSection"), false);
    updateAuthMode();
  }
  function updateAuthMode() {
    const signup = authMode === "signup";
    $("authTitle").textContent = signup ? "Create your account" : "Welcome back";
    $("authSubtitle").textContent = signup ? "Start your learning journey." : "Sign in to continue learning.";
    $("authSubmit").textContent = signup ? "Create account" : "Sign in";
    $("tabSignup").classList.toggle("active", signup);
    $("tabLogin").classList.toggle("active", !signup);
    ["nameField","pathField","levelField","gradeField"].forEach(id => show($(id), signup));
    show($("examYearField"), signup && $("learnerPath").value === "wassce_candidate");
    $("fullName").required = signup;
    $("learnerPath").required = signup;
    $("educationLevel").required = signup;
    $("gradeLevel").required = false;
    $("password").autocomplete = signup ? "new-password" : "current-password";
    setMessage("authMessage", "");
  }
  $("learnerPath").addEventListener("change", () => {
    selectedPath = $("learnerPath").value;
    show($("examYearField"), authMode === "signup" && selectedPath === "wassce_candidate");
  });
  $("navLogin").addEventListener("click", () => openAuth("login"));
  $("heroLogin").addEventListener("click", () => openAuth("login"));
  $("heroSignup").addEventListener("click", () => openAuth("signup"));
  $("tabSignup").addEventListener("click", () => {authMode = "signup"; updateAuthMode();});
  $("tabLogin").addEventListener("click", () => {authMode = "login"; updateAuthMode();});
  $("closeAuth").addEventListener("click", () => show($("authSection"), false));
  document.querySelectorAll(".pathSignup").forEach(btn => btn.addEventListener("click", () => openAuth("signup", btn.dataset.path)));

  $("authForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!client) { setMessage("authMessage", "Supabase configuration is missing. Check js/config.js.", "error"); return; }
    const email = $("email").value.trim();
    const password = $("password").value;
    const submit = $("authSubmit");
    submit.disabled = true; submit.textContent = authMode === "signup" ? "Creating account…" : "Signing in…";
    try {
      if (authMode === "signup") {
        const fullName = $("fullName").value.trim();
        const learnerPath = $("learnerPath").value;
        const educationLevel = $("educationLevel").value;
        const gradeLevel = $("gradeLevel").value.trim() || null;
        const yearRaw = $("examYear").value.trim();
        const targetExamYear = yearRaw ? Number(yearRaw) : null;
        const { data, error } = await client.auth.signUp({
          email, password,
          options: { data: {
            full_name: fullName,
            learner_path: learnerPath,
            education_level: educationLevel,
            grade_level: gradeLevel,
            target_exam_year: targetExamYear
          } }
        });
        if (error) throw error;
        if (data.session && data.user) {
          const { error: profileError } = await client.from("profiles").update({
            full_name: fullName, learner_path: learnerPath, education_level: educationLevel,
            grade_level: gradeLevel, target_exam_year: targetExamYear,
            onboarding_completed: true, updated_at: new Date().toISOString()
          }).eq("id", data.user.id);
          if (profileError) throw profileError;
          setMessage("authMessage", "Account created. Loading your BridgeLIB space…", "success");
          await loadApp(data.user);
        } else {
          setMessage("authMessage", "Account created. Check your email for a confirmation link, then sign in to finish your profile.", "success");
        }
      } else {
        const { data, error } = await client.auth.signInWithPassword({ email, password });
        if (error) throw error;
        await loadApp(data.user);
      }
    } catch (error) {
      setMessage("authMessage", error.message || "Something went wrong. Please try again.", "error");
    } finally {
      submit.disabled = false; updateAuthMode();
    }
  });

  async function loadApp(user) {
    currentUser = user;
    show($("authSection"), false); show($("hero"), false); show($("features"), false); show($("pathways"), false); show($("appSection"), true);
    $("welcomeTitle").textContent = "Welcome, " + (user.user_metadata?.full_name || user.email?.split("@")[0] || "learner");
    const { data: profile, error: profileError } = await client.from("profiles").select("*").eq("id", user.id).maybeSingle();
    if (profileError) throw profileError;
    $("profileSummary").textContent = profile ? [
      profile.learner_path ? nice(profile.learner_path) : "Learning path not completed",
      profile.education_level ? nice(profile.education_level) : "",
      profile.grade_level || ""
    ].filter(Boolean).join(" · ") : "Your profile is being prepared.";
    const role = profile?.role || "student";
    $("welcomeText").textContent = role === "teacher" ? "Your teacher workspace is ready to grow." : "Your learning journey continues here.";
    show($("teacherNotice"), ["teacher","school_admin","admin"].includes(role));
    if (role === "teacher" || role === "school_admin" || role === "admin") {
      $("teacherNotice").querySelector("p").textContent = "Your account has an approved teaching role. Class creation and the exam builder are being connected next.";
    }
    const { data: subjects, error: subjectError } = await client.from("subjects").select("id,name,description").order("name");
    if (subjectError) {
      $("subjectList").innerHTML = '<p class="muted">Subjects could not be loaded yet. ' + escapeHtml(subjectError.message) + '</p>';
    } else if (!subjects?.length) {
      $("subjectList").innerHTML = '<p class="muted">Subject resources will appear here soon.</p>';
    } else {
      $("subjectList").innerHTML = subjects.map(s => `<div class="subject-item" role="button" tabindex="0">${escapeHtml(s.name)}<small>${escapeHtml(s.description || "Lessons and practice")}</small></div>`).join("");
    }
    const { data: classes, error: classError } = await client.from("classes").select("id,name,education_level,grade_level,academic_year,status").order("created_at", {ascending:false}).limit(20);
    if (classError) {
      $("classInfo").textContent = "Class information will appear when your account is enrolled.";
    } else if (classes?.length) {
      $("classInfo").textContent = "Your available classes:";
      $("classList").innerHTML = classes.map(c => `<div class="subject-item">${escapeHtml(c.name)}<small>${escapeHtml(c.grade_level)} · ${escapeHtml(String(c.academic_year))}</small></div>`).join("");
    } else {
      $("classInfo").textContent = role === "teacher" ? "You have no classes yet. Class creation is the next build phase." : "Your classes will appear here when you join one.";
    }
    $("schoolForm").onsubmit = submitSchool;
    window.scrollTo({top:0,behavior:"smooth"});
  }
  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
  }
  async function submitSchool(event) {
    event.preventDefault();
    if (!currentUser) return;
    const name = $("schoolName").value.trim();
    const county = $("schoolCounty").value.trim() || null;
    const school_type = $("schoolType").value;
    const button = event.submitter;
    button.disabled = true; button.textContent = "Submitting…";
    try {
      const { error } = await client.from("schools").insert({name,county,school_type,created_by:currentUser.id,status:"pending"});
      if (error) throw error;
      setMessage("schoolMessage", "School application submitted for review. It is not verified yet.", "success");
      $("schoolForm").reset();
    } catch (error) {
      setMessage("schoolMessage", error.message || "Could not submit the school application.", "error");
    } finally {
      button.disabled = false; button.textContent = "Submit school";
    }
  }
  $("signOut").addEventListener("click", async () => {
    if (!client) return;
    await client.auth.signOut(); currentUser = null;
    show($("appSection"), false); show($("hero"), true); show($("features"), true); show($("pathways"), true);
    toast("You have signed out.", "success"); window.scrollTo({top:0,behavior:"smooth"});
  });

  async function init() {
    if (!client) {
      const note = document.createElement("div");
      note.className = "config-warning";
      note.textContent = "Supabase configuration is missing. Add your project URL and publishable key in js/config.js.";
      document.body.prepend(note);
      return;
    }
    const { data: { session } } = await client.auth.getSession();
    if (session?.user) {
      try { await loadApp(session.user); } catch (error) { toast(error.message || "Could not load your dashboard.", "error"); }
    }
    client.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user && !currentUser) {
        try { await loadApp(session.user); } catch (error) { toast(error.message || "Could not load your dashboard.", "error"); }
      }
    });
  }
  init();

})();