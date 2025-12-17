/* =========================================================
   GLOBAL FORMS ENGINE
   Used by: Portraits, Headshots, Branding, Events
   ========================================================= */

/* -----------------------------
   SESSION CONFIG
-------------------------------- */
const SESSION_DATA = {
  portraits: { sessionType: "Portrait Session" },
  headshots: { sessionType: "Professional Headshots" },
  branding: { sessionType: "Branding Session" },
  events: { sessionType: "Event Photography" }
};

/* -----------------------------
   PACKAGE → ADD-ON RULES
-------------------------------- */
const PACKAGE_ADDONS = {
  mini: ["extra-images", "prints", "rush"],
  standard: ["extra-images", "extra-outfit", "extra-time", "prints", "rush"],
  extended: ["extra-images", "extra-outfit", "extra-time", "extra-location", "prints", "rush", "studio"],
  senior: ["extra-images", "extra-time", "extra-location", "prints", "rush"],
  family: ["extra-images", "extra-time", "extra-location", "prints", "rush"],
  "extended-family": ["extra-images", "extra-time", "extra-location", "prints", "rush"]
};

window.addEventListener("DOMContentLoaded", () => {
  const bodySession = document.body.dataset.session;
  const form = document.querySelector("[data-multistep]");
  if (!form) return;

  /* -----------------------------
     Hidden field setup
  -------------------------------- */
  const sessionTypeField = form.querySelector("input[name='session_type']");
  const selectedPackageField = form.querySelector("input[name='selected_package']");
  const formTitle = document.getElementById("formTitle");

  if (sessionTypeField && bodySession && SESSION_DATA[bodySession]) {
    sessionTypeField.value = SESSION_DATA[bodySession].sessionType;
  }

  /* -----------------------------
     Package selection
  -------------------------------- */
  const packageButtons = document.querySelectorAll(".package-button");
  const addons = document.querySelectorAll(".addon");

  // Hide add-ons initially
  addons.forEach(addon => {
    addon.style.display = "none";
    addon.classList.remove("visible");
  });

  packageButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const label = btn.dataset.packageLabel || "";
      const packageId = btn.dataset.packageId || "";

      if (selectedPackageField) selectedPackageField.value = label;
      if (formTitle && label) formTitle.textContent = `Book Your ${label}`;

      const allowed = PACKAGE_ADDONS[packageId] || [];

      addons.forEach(addon => {
        const key = addon.dataset.addon;
        const show = allowed.includes(key);

        if (show) {
          addon.style.display = "block";
          requestAnimationFrame(() => addon.classList.add("visible"));
        } else {
          addon.classList.remove("visible");
          addon.style.display = "none";
          addon.querySelectorAll("input, select, textarea").forEach(f => f.value = "");
        }
      });
    });
  });

  /* -----------------------------
     Dynamic fields per session
  -------------------------------- */
  document.querySelectorAll(".dynamic-field").forEach(field => {
    const showFor = field.dataset.show;
    if (!showFor || showFor === bodySession) {
      field.style.display = "block";
    } else {
      field.style.display = "none";
    }
  });

  /* -----------------------------
     Multi-step logic
  -------------------------------- */
  const steps = form.querySelectorAll(".form-step");
  const nextBtns = form.querySelectorAll(".next-step");
  const prevBtns = form.querySelectorAll(".prev-step");
  const progress = form.querySelector(".form-progress");
  let currentStep = 0;

  const updateProgress = () => {
    if (progress) {
      progress.textContent = `Step ${currentStep + 1} of ${steps.length}`;
    }
  };

  const showStep = index => {
    steps.forEach((step, i) => {
      step.classList.toggle("active-step", i === index);
    });
    updateProgress();
  };

  nextBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      if (currentStep < steps.length - 1) {
        currentStep++;
        showStep(currentStep);
      }
    });
  });

  prevBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      if (currentStep > 0) {
        currentStep--;
        showStep(currentStep);
      }
    });
  });

  showStep(0);
});
