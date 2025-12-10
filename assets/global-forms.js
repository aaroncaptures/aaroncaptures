// /assets/global-forms.js

// Session-specific data
const SESSION_DATA = {
  portraits: {
    sessionType: "Portrait Session"
  },
  headshots: {
    sessionType: "Professional Headshots"
  },
  branding: {
    sessionType: "Branding Session"
  },
  events: {
    sessionType: "Event Photography"
  }
};

window.addEventListener("DOMContentLoaded", () => {
  const body = document.body;
  const sessionKey = body.dataset.session || null;
  const forms = document.querySelectorAll("[data-multistep]");

  // -----------------------------------
  // PACKAGE SELECTION → FORM
  // -----------------------------------
  const packageButtons = document.querySelectorAll(".package-button");
  const selectedPackageField = document.querySelector("input[name='selected_package']");
  const formTitle = document.getElementById("formTitle");

  packageButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const label = btn.dataset.packageLabel || "";
      if (selectedPackageField) {
        selectedPackageField.value = label;
      }
      if (formTitle && label) {
        formTitle.textContent = `Book Your ${label}`;
      }
      // smooth scroll is already handled by your anchor script
    });
  });

  // -----------------------------------
  // MULTI-STEP FORMS
  // -----------------------------------
  forms.forEach(form => {
    const steps = form.querySelectorAll(".form-step");
    const nextBtns = form.querySelectorAll(".next-step");
    const prevBtns = form.querySelectorAll(".prev-step");
    const progress = form.querySelector(".form-progress");

    if (!steps.length) return;

    // SESSION TYPE HIDDEN FIELD
    if (sessionKey && SESSION_DATA[sessionKey]) {
      const data = SESSION_DATA[sessionKey];
      const typeField = form.querySelector("input[name='session_type']");
      if (typeField) {
        typeField.value = data.sessionType;
      }
    }

    // SHOW/HIDE DYNAMIC FIELDS PER SESSION
    const dynamicFields = form.querySelectorAll(".dynamic-field");
    dynamicFields.forEach(wrapper => {
      const showFor = wrapper.dataset.show;
      const isVisible = !sessionKey || showFor === sessionKey;

      if (isVisible) {
        wrapper.style.display = "block";
        requestAnimationFrame(() => {
          wrapper.classList.add("visible");
        });
      } else {
        wrapper.classList.remove("visible");
        wrapper.style.display = "none";
      }

      // Toggle required attributes based on data-required
      const inputs = wrapper.querySelectorAll("[data-required='true']");
      inputs.forEach(input => {
        if (isVisible) {
          input.setAttribute("required", "required");
        } else {
          input.removeAttribute("required");
        }
      });
    });

    // FIELD HELPERS
    const allFields = form.querySelectorAll(
      ".float-label input, .float-label textarea, .float-label select"
    );

    const getWrapper = field => field.closest(".float-label");

    const getOrCreateErrorMessage = wrapper => {
      let msg = wrapper.querySelector(".error-message");
      if (!msg) {
        msg = document.createElement("p");
        msg.classList.add("error-message");
        wrapper.appendChild(msg);
      }
      return msg;
    };

    const clearVisualState = wrapper => {
      if (!wrapper) return;
      wrapper.classList.remove("field-error", "field-success", "shake");
      const msg = wrapper.querySelector(".error-message");
      if (msg) msg.classList.remove("visible");
    };

    const showError = (field, message) => {
      const wrapper = getWrapper(field);
      if (!wrapper) return;

      wrapper.classList.remove("field-success");
      wrapper.classList.add("field-error");

      const msg = getOrCreateErrorMessage(wrapper);
      msg.textContent = message || "Please complete this field.";
      msg.classList.add("visible");
    };

    const markSuccess = field => {
      const wrapper = getWrapper(field);
      if (!wrapper) return;

      wrapper.classList.remove("field-error", "shake");
      const msg = wrapper.querySelector(".error-message");
      if (msg) msg.classList.remove("visible");
      wrapper.classList.add("field-success");
    };

    const validateField = field => {
      const wrapper = getWrapper(field);
      if (!wrapper) return true;

      let value = field.value || "";

      // Normalization
      if (field.type === "email") {
        value = value.trim();
        field.value = value.toLowerCase();
      } else if (field.tagName === "INPUT") {
        value = value.trim();
        field.value = value;
      }

      const isRequired = field.hasAttribute("required");

      // Optional and empty → OK
      if (!isRequired && value === "") {
        wrapper.classList.remove("field-error", "field-success");
        const msg = wrapper.querySelector(".error-message");
        if (msg) msg.classList.remove("visible");
        return true;
      }

      let valid = field.checkValidity();

      // Soft email rule
      if (valid && field.type === "email") {
        if (!value.includes("@") || !value.includes(".")) {
          valid = false;
        }
      }

      if (!valid) {
        showError(field);
        wrapper.classList.remove("field-success");
        return false;
      }

      // Field is valid
      markSuccess(field);
      return true;
    };

    // LIVE VALIDATION
    allFields.forEach(field => {
      const updateHasValue = () => {
        const wrapper = getWrapper(field);
        if (!wrapper) return;
        if (field.value && field.value.trim() !== "") {
          field.classList.add("has-value");
        } else {
          field.classList.remove("has-value");
        }
      };

      field.addEventListener("input", () => {
        updateHasValue();
        const wrapper = getWrapper(field);
        if (wrapper && (wrapper.classList.contains("field-error") || field.value !== "")) {
          validateField(field);
        }
      });

      field.addEventListener("blur", () => {
        updateHasValue();
        validateField(field);
      });

      field.addEventListener("change", () => {
        updateHasValue();
        validateField(field);
      });

      updateHasValue();
    });

    // STEP-LEVEL VALIDATION
    const validateStep = stepIndex => {
      const step = steps[stepIndex];
      if (!step) return true;

      const fields = step.querySelectorAll(
        ".float-label input, .float-label textarea, .float-label select"
      );

      let firstInvalidField = null;
      let allValid = true;

      fields.forEach(field => {
        const dyn = field.closest(".dynamic-field");
        if (dyn && dyn.style.display === "none") return;

        const valid = validateField(field);
        if (!valid) {
          allValid = false;
          if (!firstInvalidField) firstInvalidField = field;
        }
      });

      if (!allValid && firstInvalidField) {
        const wrapper = getWrapper(firstInvalidField);
        if (wrapper) {
          wrapper.classList.add("shake");
          setTimeout(() => wrapper.classList.remove("shake"), 250);
          firstInvalidField.focus();
          wrapper.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }

      return allValid;
    };

    // STEP NAVIGATION
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
        if (!validateStep(currentStep)) return;
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

    // Initialize
    showStep(0);
  });
});
