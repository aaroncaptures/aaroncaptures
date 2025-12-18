document.addEventListener("DOMContentLoaded", () => {
  /* ============================
     SESSION TYPE (HIDDEN FIELD)
  ============================ */
  const bodySession = document.body.dataset.session || "";
  const sessionTypeInput = document.querySelector('input[name="session_type"]');
  if (sessionTypeInput && bodySession) sessionTypeInput.value = bodySession;

  /* ============================
     DYNAMIC FIELDS (Step 2/3 etc)
     These start invisible in CSS (opacity:0)
     We must add .visible to the correct group.
  ============================ */
  function applyDynamicFieldsVisibility() {
    const groups = document.querySelectorAll(".dynamic-field[data-show]");
    groups.forEach(group => {
      const shouldShow = group.dataset.show === bodySession;

      if (shouldShow) {
        group.style.display = "block";
        requestAnimationFrame(() => group.classList.add("visible"));

        // Promote data-required to real required (so validation works)
        group.querySelectorAll("[data-required='true']").forEach(el => {
          el.setAttribute("required", "required");
        });
      } else {
        group.classList.remove("visible");
        group.style.display = "none";

        // Remove required so hidden fields don't block
        group.querySelectorAll("[required]").forEach(el => {
          if (el.dataset.required === "true") el.removeAttribute("required");
        });
      }
    });
  }

  applyDynamicFieldsVisibility();

  /* ============================
     PACKAGE → ADD-ONS LOGIC
  ============================ */
  const PACKAGE_ADDONS = {
    mini: ["extra-images", "prints", "rush"],
    standard: ["extra-images", "extra-outfit", "extra-time", "prints", "rush"],
    extended: ["extra-images", "extra-outfit", "extra-time", "extra-location", "prints", "rush", "studio"],
    senior: ["extra-images", "extra-time", "extra-location", "prints", "rush"],
    family: ["extra-images", "extra-time", "extra-location", "prints", "rush"],
    "extended-family": ["extra-images", "extra-time", "extra-location", "prints", "rush"]
  };

  const packageButtons = document.querySelectorAll(".package-button");
  const selectedPackageInput = document.querySelector('input[name="selected_package"]');
  const formTitle = document.getElementById("formTitle");
  const addons = document.querySelectorAll(".addon");

  // Hide all add-ons on load (and remove .visible so they don't stay transparent)
  addons.forEach(addon => {
    addon.style.display = "none";
    addon.classList.remove("visible");
  });

  function showAllowedAddons(packageId) {
    const allowed = PACKAGE_ADDONS[packageId] || [];

    addons.forEach(addon => {
      const key = addon.dataset.addon;
      const shouldShow = allowed.includes(key);

      if (shouldShow) {
        addon.style.display = "block";
        requestAnimationFrame(() => addon.classList.add("visible"));
      } else {
        addon.classList.remove("visible");
        addon.style.display = "none";
        addon.querySelectorAll("input, select, textarea").forEach(el => (el.value = ""));
      }
    });
  }

  packageButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const packageId = btn.dataset.packageId || "";
      const packageLabel = btn.dataset.packageLabel || "";

      if (selectedPackageInput) selectedPackageInput.value = packageLabel;
      if (formTitle && packageLabel) formTitle.textContent = `Book Your ${packageLabel}`;

      showAllowedAddons(packageId);
    });
  });

  /* ============================
     MULTI-STEP FORM LOGIC
  ============================ */
  document.querySelectorAll("form[data-multistep]").forEach(form => {
    const steps = Array.from(form.querySelectorAll(".form-step"));
    const progress = form.querySelector(".form-progress");
    let currentStep = 0;

    function showStep(index) {
      steps.forEach((step, i) => {
        step.classList.toggle("active-step", i === index);
      });

      if (progress) {
        progress.textContent = `Step ${index + 1} of ${steps.length}`;
      }

      // When a step becomes active, re-apply visibility (important!)
      applyDynamicFieldsVisibility();
    }

    function isStepValid(step) {
      const fields = step.querySelectorAll("input, textarea, select");

      for (const field of fields) {
        // Ignore anything not visible
        if (field.offsetParent === null) continue;

        const isRequired =
          field.hasAttribute("required") ||
          field.dataset.required === "true";

        if (isRequired && !String(field.value || "").trim()) {
          field.focus();
          field.scrollIntoView({ behavior: "smooth", block: "center" });
          return false;
        }
      }

      return true;
    }

    form.addEventListener("click", e => {
      if (e.target.classList.contains("next-step")) {
        if (!isStepValid(steps[currentStep])) return;

        if (currentStep < steps.length - 1) {
          currentStep++;
          showStep(currentStep);
        }
      }

      if (e.target.classList.contains("prev-step")) {
        if (currentStep > 0) {
          currentStep--;
          showStep(currentStep);
        }
      }
    });

    // Always initialize Step 1
    showStep(0);
  });

  /* ============================
     CHECKMARK / VALIDATION CLASS
  ============================ */
  document.querySelectorAll("input, textarea, select").forEach(field => {
    field.addEventListener("blur", () => {
      field.classList.toggle("is-valid", field.checkValidity());
    });
  });
});
