(function () {
  "use strict";

  const BASE_API_URL = "https://gigantic-recruitment.up.railway.app/api";
  let authToken = localStorage.getItem("token");

  // ============================================================
  // HELPERS
  // ============================================================
  function generateId() {
    return (
      "id_" + Date.now() + "_" + Math.random().toString(36).substring(2, 8)
    );
  }

  function getDateStr() {
    return new Date().toISOString().slice(0, 10);
  }

  function formatDate(dateStr) {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  function formatDateTime(dateTimeStr) {
    if (!dateTimeStr) return "—";
    const d = new Date(dateTimeStr);
    return d.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function getStatusBadge(status) {
    const cls = status?.toLowerCase() || "pending";
    return `<span class="status-badge status-${cls}">${status || "Pending"}</span>`;
  }

  // Helper for authenticated fetch requests
  async function authFetch(url, options = {}) {
    // Don't set Content-Type for FormData (browser sets it with boundary)
    const isFormData = options.body instanceof FormData;

    options.headers = {
      "x-auth-token": authToken,
      ...options.headers,
    };

    // Only set Content-Type if NOT FormData
    if (!isFormData) {
      options.headers["Content-Type"] = "application/json";
    }

    const response = await fetch(url, options);
    if (response.status === 401 || response.status === 403) {
      localStorage.removeItem("token");
      authToken = null;
      showPage("admin");
      showToast(
        "Session expired or unauthorized. Please log in again.",
        "error",
      );
      throw new Error("Unauthorized");
    }
    return response;
  }

  // ============================================================
  // NAVIGATION
  // ============================================================
  const pageSections = document.querySelectorAll(".page-section");
  const navLinks = document.querySelectorAll(".nav-link[data-page]");
  const mobileMenu = document.getElementById("mobileMenu");
  const mobileMenuBtn = document.getElementById("mobileMenuBtn");

  function showPage(pageId) {
    pageSections.forEach((s) => s.classList.remove("active"));
    const target = document.getElementById("page-" + pageId);
    if (target) target.classList.add("active");

    navLinks.forEach((link) => {
      link.classList.toggle("active", link.dataset.page === pageId);
    });

    mobileMenu?.classList.add("hidden");
    window.scrollTo({ top: 0, behavior: "smooth" });

    if (pageId === "admin") {
      if (!isAdminLoggedIn()) {
        document.getElementById("adminLogin").classList.remove("hidden");
        document.getElementById("adminDashboard").classList.add("hidden");
      } else {
        document.getElementById("adminLogin").classList.add("hidden");
        document.getElementById("adminDashboard").classList.remove("hidden");
        refreshAdminDashboard();
      }
    }

    if (pageId === "careers") {
      renderJobs("all");
      populateJobFilters();
    }
  }

  navLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      showPage(link.dataset.page);
    });
  });

  mobileMenuBtn?.addEventListener("click", () => {
    mobileMenu?.classList.toggle("hidden");
  });

  document.addEventListener("click", (e) => {
    const link = e.target.closest("[data-page]");
    if (link && !link.closest(".nav-link")) {
      e.preventDefault();
      showPage(link.dataset.page);
    }
  });

  // ============================================================
  // JOBS RENDERING (Careers page)
  // ============================================================
  const jobCardsGrid = document.getElementById("jobCardsGrid");
  const filterButtonsContainer = document.querySelector(
    ".flex.flex-wrap.gap-3.mb-10.justify-center",
  );

  async function renderJobs(filter = "all") {
    try {
      const res = await fetch(`${BASE_API_URL}/jobs`);
      if (!res.ok) throw new Error("Failed to fetch jobs");
      const allJobs = await res.json();

      const filtered =
        filter === "all"
          ? allJobs
          : allJobs.filter((j) => j.department === filter);

      if (filtered.length === 0) {
        jobCardsGrid.innerHTML = `<div class="col-span-full text-center py-16 text-slate-400"><i class="fas fa-search text-4xl mb-4"></i><p>No open positions in this category right now.</p></div>`;
        return;
      }

      jobCardsGrid.innerHTML = filtered
        .map(
          (job) => `
            <div class="job-card bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-xl smooth-trans cursor-pointer" data-job-id="${job._id}">
              <div class="flex items-start justify-between mb-3">
                <span class="text-xs font-semibold text-blue-600 bg-blue-50 px-3 py-1 rounded-full">${job.department}</span>
                <span class="text-xs text-slate-400"><i class="far fa-clock mr-1"></i> ${job.deadline ? formatDate(job.deadline) : "Ongoing"}</span>
              </div>
              <h3 class="text-lg font-bold text-slate-900">${job.title}</h3>
              <p class="text-slate-500 text-sm mt-1 flex items-center gap-1"><i class="fas fa-map-marker-alt text-blue-400 text-xs"></i> ${job.location}</p>
              <p class="text-slate-400 text-sm mt-3 line-clamp-2">${job.description?.slice(0, 100) || ""}...</p>
              <div class="flex items-center justify-end mt-5 pt-4 border-t border-gray-50">
                <button class="apply-btn bg-blue-600 text-white text-sm font-medium px-5 py-2 rounded-xl hover:bg-blue-700 smooth-trans shadow-sm" data-job-id="${job._id}">
                  Apply Now <i class="fas fa-arrow-right ml-1"></i>
                </button>
              </div>
            </div>
          `,
        )
        .join("");

      jobCardsGrid.querySelectorAll(".job-card").forEach((card) => {
        card.addEventListener("click", (e) => {
          if (e.target.closest(".apply-btn")) return;
          const id = card.dataset.jobId;
          showJobDetail(id);
        });
      });

      jobCardsGrid.querySelectorAll(".apply-btn").forEach((btn) => {
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          const id = btn.dataset.jobId;
          openApplicationForJob(id);
        });
      });

      document.querySelectorAll(".filter-btn").forEach((btn) => {
        btn.classList.remove("bg-blue-600", "text-white", "shadow-md");
        btn.classList.add(
          "bg-white",
          "text-slate-700",
          "border",
          "border-gray-200",
          "hover:bg-blue-50",
        );
        if (btn.dataset.filter === filter) {
          btn.classList.add("bg-blue-600", "text-white", "shadow-md");
          btn.classList.remove(
            "bg-white",
            "text-slate-700",
            "border",
            "border-gray-200",
            "hover:bg-blue-50",
          );
        }
      });
    } catch (error) {
      console.error("Error fetching or rendering jobs:", error);
      showToast("Failed to load job listings.", "error");
    }
  }

  async function populateJobFilters() {
    try {
      const res = await fetch(`${BASE_API_URL}/jobs`);
      if (!res.ok) throw new Error("Failed to fetch departments");
      const jobs = await res.json();
      const departments = [...new Set(jobs.map((j) => j.department))].sort();

      filterButtonsContainer.innerHTML =
        '<button data-filter="all" class="filter-btn px-5 py-2 rounded-full text-sm font-medium bg-blue-600 text-white shadow-md">All</button>';

      departments.forEach((dept) => {
        const btn = document.createElement("button");
        btn.dataset.filter = dept;
        btn.classList.add(
          "filter-btn",
          "px-5",
          "py-2",
          "rounded-full",
          "text-sm",
          "font-medium",
          "bg-white",
          "text-slate-700",
          "border",
          "border-gray-200",
          "hover:bg-blue-50",
          "smooth-trans",
        );
        btn.textContent = dept;
        filterButtonsContainer.appendChild(btn);
      });

      filterButtonsContainer.querySelectorAll(".filter-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
          renderJobs(btn.dataset.filter);
        });
      });
    } catch (error) {
      console.error("Error populating job filters:", error);
    }
  }

  // ============================================================
  // JOB DETAIL PAGE
  // ============================================================
  const jobDetailContent = document.getElementById("jobDetailContent");
  const backToCareers = document.getElementById("backToCareers");

  async function showJobDetail(jobId) {
    try {
      const res = await fetch(`${BASE_API_URL}/jobs`);
      if (!res.ok) throw new Error("Failed to fetch job details");
      const jobs = await res.json();
      const job = jobs.find((j) => j._id === jobId);

      if (!job) {
        showToast("Job not found.", "error");
        showPage("careers");
        return;
      }

      showPage("job-detail");
      jobDetailContent.innerHTML = `
        <div class="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 md:p-12">
          <div class="flex flex-wrap items-start justify-between gap-4 mb-6">
            <div>
              <span class="text-xs font-semibold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full">${job.department}</span>
              <h1 class="text-3xl md:text-4xl font-bold text-slate-900 mt-3 serif">${job.title}</h1>
              <p class="text-slate-500 mt-2 flex items-center gap-2"><i class="fas fa-map-marker-alt text-blue-400"></i> ${job.location}</p>
            </div>
          </div>
          <div class="border-t border-gray-100 pt-6 mt-2">
            <h3 class="text-lg font-bold text-slate-800">Job Summary</h3>
            <p class="text-slate-600 mt-2 leading-relaxed">${job.description || "No description provided."}</p>
          </div>
          <div class="border-t border-gray-100 pt-6 mt-6">
            <h3 class="text-lg font-bold text-slate-800">Requirements</h3>
            <ul class="list-disc list-inside text-slate-600 mt-2 space-y-1">
              <li>Relevant experience in ${job.department} role</li>
              <li>Excellent communication and interpersonal skills</li>
              <li>Passion for travel and hospitality</li>
              <li>Ability to work in a fast-paced environment</li>
            </ul>
          </div>
          <div class="border-t border-gray-100 pt-6 mt-6 flex flex-wrap gap-4 items-center justify-between">
            <div>
              <span class="text-slate-400 text-sm">Application Deadline</span>
              <p class="font-bold text-slate-800">${job.deadline ? formatDate(job.deadline) : "Open"}</p>
            </div>
            <button class="apply-btn bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold px-8 py-3.5 rounded-xl shadow-lg hover:shadow-blue-200 smooth-trans hover:scale-105" data-job-id="${job._id}">
              <i class="fas fa-paper-plane mr-2"></i> Apply Now
            </button>
          </div>
        </div>
      `;

      jobDetailContent
        .querySelector(".apply-btn")
        ?.addEventListener("click", () => {
          openApplicationForJob(job._id);
        });
    } catch (error) {
      console.error("Error fetching job details:", error);
      showToast("Failed to load job details.", "error");
    }
  }

  backToCareers.addEventListener("click", () => {
    showPage("careers");
  });

  // ============================================================
  // APPLICATION FORM
  // ============================================================
  const applyJobTitle = document.getElementById("applyJobTitle");
  const applyJobId = document.getElementById("applyJobId");
  const appJobRole = document.getElementById("appJobRole");
  const applicationForm = document.getElementById("applicationForm");

  async function openApplicationForJob(jobId) {
    try {
      const res = await fetch(`${BASE_API_URL}/jobs`);
      if (!res.ok) throw new Error("Failed to fetch jobs for form");
      const jobs = await res.json();
      const job = jobs.find((j) => j._id === jobId);

      if (!job) {
        showToast("Job not found.", "error");
        return;
      }

      applyJobTitle.textContent = job.title;
      applyJobId.value = job._id;

      appJobRole.innerHTML = '<option value="">Select a role...</option>';
      jobs.forEach((j) => {
        const opt = document.createElement("option");
        opt.value = j.title;
        opt.textContent = j.title;
        if (j._id === jobId) opt.selected = true;
        appJobRole.appendChild(opt);
      });

      showPage("application");
    } catch (error) {
      console.error("Error preparing application form:", error);
      showToast("Failed to load application form.", "error");
    }
  }

  // ============================================================
  // UPDATED: APPLICATION FORM SUBMIT WITH FILE UPLOAD
  // ============================================================
  applicationForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = document.getElementById("appName").value.trim();
    const email = document.getElementById("appEmail").value.trim();
    const phone = document.getElementById("appPhone").value.trim();
    const address = document.getElementById("appAddress").value.trim();
    const jobRole = appJobRole.value;
    const experience = document.getElementById("appExperience").value;
    const coverLetter = document.getElementById("appCoverLetter").value.trim();
    const cvFileInput = document.getElementById("appCV");
    const cvFile = cvFileInput.files[0];

    if (!name || !email || !phone || !jobRole || !cvFile) {
      showToast("Please fill in all required fields.", "error");
      return;
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (cvFile.size > maxSize) {
      showToast("File size too large. Maximum 5MB allowed.", "error");
      return;
    }

    // Validate file type
    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (!allowedTypes.includes(cvFile.type)) {
      showToast("Only PDF, DOC, and DOCX files are allowed.", "error");
      return;
    }

    // Use FormData for file upload to Cloudinary via backend
    const formData = new FormData();
    formData.append("name", name);
    formData.append("email", email);
    formData.append("phone", phone);
    formData.append("address", address);
    formData.append("jobRole", jobRole);
    formData.append("yearsExperience", parseInt(experience) || 0);
    formData.append("coverLetter", coverLetter);
    formData.append("cv", cvFile); // The actual file

    try {
      const res = await fetch(`${BASE_API_URL}/applicants`, {
        method: "POST",
        // DO NOT set Content-Type header — browser sets it automatically with boundary for FormData
        body: formData,
      });
      const data = await res.json();

      if (res.ok) {
        showToast(
          "Application submitted successfully! We will contact qualified candidates.",
          "success",
        );
        applicationForm.reset();
        showPage("thankyou");
      } else {
        showToast(data.msg || "Application failed. Please try again.", "error");
      }
    } catch (err) {
      console.error("Application submission error:", err);
      showToast("Application submission failed. Server error.", "error");
    }
  });

  // ============================================================
  // ADMIN AUTH
  // ============================================================
  let adminLoggedIn = false;

  function isAdminLoggedIn() {
    return !!localStorage.getItem("token");
  }

  document
    .getElementById("adminLoginForm")
    .addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = document.getElementById("adminEmail").value.trim();
      const password = document.getElementById("adminPassword").value.trim();

      try {
        const res = await fetch(`${BASE_API_URL}/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        const data = await res.json();

        if (res.ok) {
          localStorage.setItem("token", data.token);
          authToken = data.token;
          adminLoggedIn = true;
          document.getElementById("adminLogin").classList.add("hidden");
          document.getElementById("adminDashboard").classList.remove("hidden");
          refreshAdminDashboard();
          showToast("Welcome back, Admin!", "success");
        } else {
          showToast(data.msg || "Login failed. Invalid credentials.", "error");
        }
      } catch (err) {
        console.error("Login error:", err);
        showToast(
          "Login failed. Server is unreachable or an error occurred.",
          "error",
        );
      }
    });

  document.getElementById("adminLogout").addEventListener("click", () => {
    localStorage.removeItem("token");
    authToken = null;
    adminLoggedIn = false;
    document.getElementById("adminDashboard").classList.add("hidden");
    document.getElementById("adminLogin").classList.remove("hidden");
    showPage("admin");
    showToast("Logged out successfully.", "info");
  });

  // ============================================================
  // ADMIN DASHBOARD NAVIGATION
  // ============================================================
  const sidebarLinks = document.querySelectorAll(".sidebar-link");
  const adminPages = document.querySelectorAll(".admin-page");

  sidebarLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      if (!isAdminLoggedIn()) {
        showToast("Please log in to access the admin panel.", "error");
        showPage("admin");
        return;
      }

      const page = link.dataset.adminPage;
      sidebarLinks.forEach((l) => l.classList.remove("active"));
      link.classList.add("active");
      adminPages.forEach((p) => p.classList.add("hidden"));
      const target = document.getElementById("admin-page-" + page);
      if (target) target.classList.remove("hidden");

      if (page === "dashboard") refreshDashboardStats();
      if (page === "manage-jobs") renderManageJobs();
      if (page === "applicants") renderApplicants();
      if (page === "interviews") renderInterviews();
      if (page === "applicants" || page === "interviews") {
        populateApplicantFilters();
        populateInterviewSelect();
      }
    });
  });

  // ============================================================
  // ADMIN DASHBOARD STATS
  // ============================================================
  async function refreshDashboardStats() {
    if (!isAdminLoggedIn()) return;

    try {
      const jobsRes = await authFetch(`${BASE_API_URL}/jobs/all`);
      const jobs = await jobsRes.json();
      document.getElementById("statTotalJobs").textContent = jobs.length;

      const applicantsRes = await authFetch(`${BASE_API_URL}/applicants`);
      const applicants = await applicantsRes.json();
      document.getElementById("statTotalApplicants").textContent =
        applicants.length;
      document.getElementById("statNewApps").textContent = applicants.filter(
        (a) => a.status === "Pending",
      ).length;

      const interviewsRes = await authFetch(`${BASE_API_URL}/interviews`);
      const interviews = await interviewsRes.json();
      document.getElementById("statInterviews").textContent = interviews.length;

      const recent = applicants.slice(0, 5);
      const tbody = document.getElementById("recentApplicantsTable");
      tbody.innerHTML = recent
        .map(
          (a) => `
            <tr class="table-row-hover">
              <td class="px-4 py-3 font-medium text-slate-800">${a.name}</td>
              <td class="px-4 py-3 text-slate-600">${a.jobRole}</td>
              <td class="px-4 py-3">${getStatusBadge(a.status)}</td>
              <td class="px-4 py-3 text-slate-400 text-xs">${formatDate(a.appliedDate)}</td>
            </tr>
          `,
        )
        .join("");
    } catch (error) {
      console.error("Error refreshing dashboard stats:", error);
      showToast("Failed to load dashboard data.", "error");
    }
  }

  function refreshAdminDashboard() {
    refreshDashboardStats();
    renderManageJobs();
    renderApplicants();
    renderInterviews();
    populateInterviewSelect();
    populateApplicantFilters();
  }

  // ============================================================
  // MANAGE JOBS (Admin CRUD)
  // ============================================================
  let editingJobId = null;

  async function renderManageJobs() {
    if (!isAdminLoggedIn()) return;

    try {
      const res = await authFetch(`${BASE_API_URL}/jobs/all`);
      if (!res.ok) throw new Error("Failed to fetch jobs for management");
      const jobs = await res.json();

      const tbody = document.getElementById("manageJobsTable");
      if (jobs.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center py-10 text-slate-400">No jobs found.</td></tr>`;
        return;
      }

      tbody.innerHTML = jobs
        .map(
          (j) => `
            <tr class="table-row-hover">
              <td class="px-4 py-3 font-medium text-slate-800">${j.title}</td>
              <td class="px-4 py-3 text-slate-600">${j.department}</td>
              <td class="px-4 py-3 text-slate-500">${j.location}</td>
              <td class="px-4 py-3">
                <span class="status-badge ${j.active !== false ? "status-hired" : "status-rejected"}">
                  ${j.active !== false ? "Open" : "Closed"}
                </span>
              </td>
              <td class="px-4 py-3">
                <div class="flex gap-2">
                  <button class="edit-job text-blue-600 hover:text-blue-800 smooth-trans text-sm font-medium" data-job-id="${j._id}">
                    <i class="fas fa-edit"></i> Edit
                  </button>
                  <button class="toggle-job text-amber-600 hover:text-amber-800 smooth-trans text-sm font-medium" data-job-id="${j._id}">
                    <i class="fas ${j.active !== false ? "fa-eye-slash" : "fa-eye"}"></i> ${j.active !== false ? "Close" : "Open"}
                  </button>
                  <button class="delete-job text-red-600 hover:text-red-800 smooth-trans text-sm font-medium" data-job-id="${j._id}">
                    <i class="fas fa-trash-alt"></i>
                  </button>
                </div>
              </td>
            </tr>
          `,
        )
        .join("");

      tbody.querySelectorAll(".edit-job").forEach((btn) => {
        btn.addEventListener("click", () => {
          const jobId = btn.dataset.jobId;
          const job = jobs.find((j) => j._id === jobId);
          if (job) {
            openJobModal(job);
          } else {
            showToast("Job not found. Please refresh the page.", "error");
          }
        });
      });

      tbody.querySelectorAll(".toggle-job").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const jobId = btn.dataset.jobId;
          const job = jobs.find((j) => j._id === jobId);
          if (!job) {
            showToast("Job not found. Please refresh the page.", "error");
            return;
          }
          try {
            const newStatus = job.active === false ? true : false;
            const updateRes = await authFetch(`${BASE_API_URL}/jobs/${jobId}`, {
              method: "PUT",
              body: JSON.stringify({ active: newStatus }),
            });
            if (!updateRes.ok) throw new Error("Failed to toggle job status");
            renderManageJobs();
            refreshDashboardStats();
            showToast(
              `${job.title} is now ${newStatus ? "open" : "closed"}`,
              "info",
            );
          } catch (error) {
            console.error("Error toggling job status:", error);
            showToast("Failed to toggle job status.", "error");
          }
        });
      });

      tbody.querySelectorAll(".delete-job").forEach((btn) => {
        btn.addEventListener("click", async () => {
          if (
            confirm(
              "Are you sure you want to delete this job listing? This action cannot be undone.",
            )
          ) {
            const jobId = btn.dataset.jobId;
            try {
              const res = await authFetch(`${BASE_API_URL}/jobs/${jobId}`, {
                method: "DELETE",
              });
              if (!res.ok) throw new Error("Failed to delete job");
              renderManageJobs();
              refreshDashboardStats();
              showToast("Job deleted successfully.", "info");
            } catch (error) {
              console.error("Error deleting job:", error);
              showToast("Failed to delete job.", "error");
            }
          }
        });
      });
    } catch (error) {
      console.error("Error rendering manage jobs:", error);
      showToast("Failed to load jobs for management.", "error");
    }
  }

  document.getElementById("openAddJobModal").addEventListener("click", () => {
    openJobModal(null);
  });

  function openJobModal(job = null) {
    editingJobId = job ? job._id : null;
    document.getElementById("jobModalTitle").textContent = job
      ? "Edit Job"
      : "Add Job";
    document.getElementById("jobFormId").value = job ? job._id : "";
    document.getElementById("jobTitle").value = job ? job.title : "";
    document.getElementById("jobDept").value = job ? job.department : "";
    document.getElementById("jobLocation").value = job ? job.location : "";
    document.getElementById("jobDesc").value = job ? job.description : "";
    document.getElementById("jobDeadline").value = job?.deadline
      ? new Date(job.deadline).toISOString().slice(0, 10)
      : "";
    document.getElementById("jobActive").checked = job
      ? job.active !== false
      : true;
    document.getElementById("jobModal").classList.remove("hidden");
    document.getElementById("jobModal").classList.add("flex");
  }

  document.getElementById("jobForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = document.getElementById("jobFormId").value;
    const data = {
      title: document.getElementById("jobTitle").value.trim(),
      department: document.getElementById("jobDept").value.trim(),
      location: document.getElementById("jobLocation").value.trim(),
      description: document.getElementById("jobDesc").value.trim(),
      deadline: document.getElementById("jobDeadline").value || null,
      active: document.getElementById("jobActive").checked,
    };

    if (
      !data.title ||
      !data.department ||
      !data.location ||
      !data.description
    ) {
      showToast(
        "Please fill in all required fields (Title, Department, Location, Description).",
        "error",
      );
      return;
    }

    try {
      let res;
      if (id) {
        res = await authFetch(`${BASE_API_URL}/jobs/${id}`, {
          method: "PUT",
          body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error("Failed to update job");
        showToast("Job updated successfully!", "success");
      } else {
        res = await authFetch(`${BASE_API_URL}/jobs`, {
          method: "POST",
          body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error("Failed to create job");
        showToast("Job created successfully!", "success");
      }
    } catch (error) {
      console.error("Error saving job:", error);
      showToast(`Failed to ${id ? "update" : "create"} job.`, "error");
    }

    closeAllModals();
    renderManageJobs();
    refreshDashboardStats();
    populateJobFilters();
  });

  // ============================================================
  // APPLICANTS MANAGEMENT (Admin)
  // ============================================================
  async function renderApplicants(filterRole = "all", filterStatus = "all") {
    if (!isAdminLoggedIn()) return;

    try {
      const res = await authFetch(`${BASE_API_URL}/applicants`);
      if (!res.ok) throw new Error("Failed to fetch applicants");
      let list = await res.json();

      if (filterRole !== "all")
        list = list.filter((a) => a.jobRole === filterRole);
      if (filterStatus !== "all")
        list = list.filter((a) => a.status === filterStatus);

      const tbody = document.getElementById("applicantsTable");
      if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center py-10 text-slate-400">No applicants found matching filters.</td></tr>`;
        return;
      }

      // ============================================================
      // UPDATED: CV LINK USES cvUrl FROM CLOUDINARY
      // ============================================================
      tbody.innerHTML = list
        .map(
          (a) => `
            <tr class="table-row-hover">
              <td class="px-4 py-3 font-medium text-slate-800">${a.name}</td>
              <td class="px-4 py-3 text-slate-500 text-sm">${a.email}</td>
              <td class="px-4 py-3 text-slate-600">${a.jobRole}</td>
              <td class="px-4 py-3">${getStatusBadge(a.status)}</td>
              <td class="px-4 py-3">
                ${
                  a.cvUrl
                    ? `<a href="${a.cvUrl}" target="_blank" download class="text-blue-600 hover:underline text-sm cv-download-link">
                       <i class="fas fa-file-download mr-1"></i> ${a.cvFile || "Download CV"}
                     </a>`
                    : a.cvFile
                      ? `<span class="text-slate-400 text-sm" title="CV uploaded but URL not available"><i class="fas fa-file mr-1"></i> ${a.cvFile}</span>`
                      : "—"
                }
              </td>
              <td class="px-4 py-3">
                <div class="flex gap-1 flex-wrap">
                  <select class="status-change text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white" data-applicant-id="${a._id}">
                    <option value="Pending" ${a.status === "Pending" ? "selected" : ""}>Pending</option>
                    <option value="Shortlisted" ${a.status === "Shortlisted" ? "selected" : ""}>Shortlisted</option>
                    <option value="Rejected" ${a.status === "Rejected" ? "selected" : ""}>Rejected</option>
                    <option value="Hired" ${a.status === "Hired" ? "selected" : ""}>Hired</option>
                  </select>
                </div>
              </td>
            </tr>
          `,
        )
        .join("");

      tbody.querySelectorAll(".status-change").forEach((sel) => {
        sel.addEventListener("change", async () => {
          const applicantId = sel.dataset.applicantId;
          const newStatus = sel.value;
          try {
            const res = await authFetch(
              `${BASE_API_URL}/applicants/${applicantId}/status`,
              {
                method: "PUT",
                body: JSON.stringify({ status: newStatus }),
              },
            );
            if (!res.ok) throw new Error("Failed to update applicant status");
            renderApplicants(
              document.getElementById("applicantFilterRole").value,
              document.getElementById("applicantFilterStatus").value,
            );
            refreshDashboardStats();
            populateInterviewSelect();
            showToast(`Applicant status updated to ${newStatus}.`, "info");
          } catch (error) {
            console.error("Error updating applicant status:", error);
            showToast("Failed to update applicant status.", "error");
          }
        });
      });
    } catch (error) {
      console.error("Error rendering applicants:", error);
      showToast("Failed to load applicants.", "error");
    }
  }

  async function populateApplicantFilters() {
    if (!isAdminLoggedIn()) return;

    try {
      const res = await authFetch(`${BASE_API_URL}/applicants`);
      if (!res.ok) throw new Error("Failed to fetch applicants for filters");
      const applicants = await res.json();

      const roles = [...new Set(applicants.map((a) => a.jobRole))].sort();
      const selRole = document.getElementById("applicantFilterRole");
      selRole.innerHTML =
        '<option value="all">All Roles</option>' +
        roles.map((r) => `<option value="${r}">${r}</option>`).join("");

      selRole.removeEventListener("change", handleApplicantFilterChange);
      selRole.addEventListener("change", handleApplicantFilterChange);
      const selStatus = document.getElementById("applicantFilterStatus");
      selStatus.removeEventListener("change", handleApplicantFilterChange);
      selStatus.addEventListener("change", handleApplicantFilterChange);
    } catch (error) {
      console.error("Error populating applicant filters:", error);
    }
  }

  function handleApplicantFilterChange() {
    const filterRole = document.getElementById("applicantFilterRole").value;
    const filterStatus = document.getElementById("applicantFilterStatus").value;
    renderApplicants(filterRole, filterStatus);
  }

  // ============================================================
  // INTERVIEW SCHEDULING (Admin)
  // ============================================================
  async function renderInterviews() {
    if (!isAdminLoggedIn()) return;

    try {
      const res = await authFetch(`${BASE_API_URL}/interviews`);
      if (!res.ok) throw new Error("Failed to fetch interviews");
      const interviews = await res.json();

      const tbody = document.getElementById("interviewsTable");
      if (interviews.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center py-10 text-slate-400">No interviews scheduled.</td></tr>`;
        return;
      }
      tbody.innerHTML = interviews
        .map((i) => {
          const applicantName = i.applicant
            ? i.applicant.name
            : "Unknown Applicant";
          return `
            <tr class="table-row-hover">
              <td class="px-4 py-3 font-medium text-slate-800">${applicantName}</td>
              <td class="px-4 py-3 text-slate-600">${i.jobRole}</td>
              <td class="px-4 py-3 text-slate-500 text-sm">${formatDateTime(i.dateTime)}</td>
              <td class="px-4 py-3">
                ${
                  i.zoomLink
                    ? `<a href="${i.zoomLink}" target="_blank" class="zoom-badge inline-flex items-center gap-1">
                      <i class="fas fa-video"></i> Join Zoom
                    </a>`
                    : "—"
                }
              </td>
              <td class="px-4 py-3 text-slate-400 text-sm">${i.notes || "—"}</td>
            </tr>
          `;
        })
        .join("");
    } catch (error) {
      console.error("Error rendering interviews:", error);
      showToast("Failed to load interviews.", "error");
    }
  }

  async function populateInterviewSelect() {
    if (!isAdminLoggedIn()) return;

    try {
      const res = await authFetch(`${BASE_API_URL}/applicants`);
      if (!res.ok)
        throw new Error("Failed to fetch applicants for interview select");
      const applicants = await res.json();

      const eligibleApplicants = applicants.filter(
        (a) => a.status === "Shortlisted" || a.status === "Pending",
      );
      const sel = document.getElementById("interviewApplicant");
      sel.innerHTML =
        '<option value="">Choose an applicant...</option>' +
        eligibleApplicants
          .map(
            (a) => `<option value="${a._id}">${a.name} — ${a.jobRole}</option>`,
          )
          .join("");
    } catch (error) {
      console.error("Error populating interview select:", error);
    }
  }

  document
    .getElementById("openScheduleInterviewModal")
    .addEventListener("click", () => {
      if (!isAdminLoggedIn()) {
        showToast("Please log in to schedule interviews.", "error");
        showPage("admin");
        return;
      }
      populateInterviewSelect();
      document.getElementById("interviewForm").reset();
      document.getElementById("interviewModal").classList.remove("hidden");
      document.getElementById("interviewModal").classList.add("flex");
    });

  document
    .getElementById("interviewForm")
    .addEventListener("submit", async (e) => {
      e.preventDefault();
      const applicantId = document.getElementById("interviewApplicant").value;
      const dateTime = document.getElementById("interviewDateTime").value;
      let zoomLink = document.getElementById("interviewZoomLink").value.trim();
      const notes = document.getElementById("interviewNotes").value.trim();

      if (!applicantId || !dateTime) {
        showToast("Please select an applicant and date/time.", "error");
        return;
      }

      if (!zoomLink) {
        zoomLink = `https://zoom.us/j/${Math.floor(1000000000 + Math.random() * 9000000000)}`;
      }

      const interviewData = {
        applicantId,
        dateTime,
        zoomLink,
        notes,
      };

      try {
        const res = await authFetch(`${BASE_API_URL}/interviews`, {
          method: "POST",
          body: JSON.stringify(interviewData),
        });
        if (!res.ok) throw new Error("Failed to schedule interview");
        const data = await res.json();

        closeAllModals();
        renderInterviews();
        renderApplicants();
        refreshDashboardStats();
        showToast(
          `Interview scheduled with applicant. Zoom link: ${data.zoomLink}`,
          "success",
        );
        document.getElementById("interviewForm").reset();
      } catch (error) {
        console.error("Error scheduling interview:", error);
        showToast(
          "Failed to schedule interview. Ensure applicant is valid.",
          "error",
        );
      }
    });

  // ============================================================
  // MODAL CONTROLS
  // ============================================================
  function closeAllModals() {
    document.querySelectorAll(".fixed.inset-0.z-50").forEach((m) => {
      m.classList.add("hidden");
      m.classList.remove("flex");
    });
  }

  document.querySelectorAll(".close-modal").forEach((btn) => {
    btn.addEventListener("click", closeAllModals);
  });

  document.querySelectorAll(".modal-backdrop").forEach((backdrop) => {
    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) closeAllModals();
    });
  });

  // ============================================================
  // TOAST NOTIFICATION
  // ============================================================
  function showToast(message, type = "info") {
    const toast = document.getElementById("toast");
    toast.textContent = message;
    toast.className = `toast ${type}`;
    toast.classList.add("show");
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => {
      toast.classList.remove("show");
    }, 4000);
  }

  // ============================================================
  // INIT
  // ============================================================
  renderJobs("all");
  populateJobFilters();
  refreshDashboardStats();

  window.showToast = showToast;

  const hash = window.location.hash.replace("#", "");
  if (hash && document.getElementById("page-" + hash)) {
    showPage(hash);
  } else {
    showPage("home");
  }

  const mobileAdminToggle = document.getElementById("mobileAdminToggle");
  if (mobileAdminToggle) {
    mobileAdminToggle.addEventListener("click", () => {
      const sidebar = document.querySelector(".lg\\:flex");
      if (sidebar) {
        sidebar.classList.toggle("hidden");
        sidebar.classList.toggle("fixed");
        sidebar.classList.toggle("inset-0");
        sidebar.classList.toggle("z-50");
        sidebar.classList.toggle("flex");
      }
    });
  }

  console.log(
    "🚀 Gigantic Tours & Guide Ltd — Recruitment Platform Frontend Loaded!",
  );
  console.log(`Backend API URL: ${BASE_API_URL}`);
  console.log("👤 Admin Demo: admin@gigantictours.com / admin123");
  console.log(
    "*** Ensure your Node.js backend is running on http://localhost:5000 ***",
  );
})();
