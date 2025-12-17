document.addEventListener("DOMContentLoaded", () => {

  /* ============================
     SESSION TYPE (HIDDEN FIELD)
  ============================ */
  const sessionTypeInput = document.querySelector('input[name="session_type"]');
  if (sessionTypeInput && document.body.dataset.session) {
    sessionTypeInput.value = document.body.dataset.session;
  }

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

  // Hide add-ons on load
  addons.forEach(addon => addon.style.display = "none");

  packageButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const packageId = btn.dataset.packageId;
      const packageLabel = btn.dataset.packageLabel;

      if (selectedPackageInput) selectedPackageInput.value = packageLabel;
      if (formTitle) formTitle.textContent = `Book Your ${packageLabel}`;

      const allowed = PACKAGE_ADDONS[packageId] || [];

      addons.forEach(addon => {
        const key = addon.dataset.addon;
        if (allowed.includes(key)) {
          addon.style.display = "block";
        } else {
          addon.style.display = "none";
          addon.querySelectorAll("input, select, textarea").forEach(el => el.value = "");
        }
      });
    });
  });

  /* ============================
     MULTI-STEP FORM LOGIC
  ============================ */
  document.querySelectorAll("[data-multistep]").forEach(form => {
    const steps = Array.from(form.querySelectorAll(".form-step"));
    const progress = form.querySelector(".form-progress");
    let currentStep = 0;

    const showStep = index => {
      steps.forEach((step, i) => {
        step.classList.toggle("active-step", i === index);
      });
      if (progress) {
        progress.textContent = `Step ${index + 1} of ${steps.length}`;
      }
    };

    const isStepValid = step => {
      const fields = step.querySelectorAll("input, textarea, select");

      for (const field of fields) {
        // Ignore hidden fields
        if (field.offsetParent === null) continue;

        if (field.hasAttribute("required") && !field.value.trim()) {
          field.focus();
          field.scrollIntoView({ behavior: "smooth", block: "center" });
          return false;
        }
      }
      return true;
    };

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

    showStep(0);
  });

  /* ============================
     VALIDATION CHECKMARK FIX
  ============================ */
  document.querySelectorAll("input, textarea, select").forEach(field => {
    field.addEventListener("blur", () => {
      field.classList.toggle("is-valid", field.checkValidity());
    });
  });

});
