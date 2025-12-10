// /assets/global-forms.js

// Session-specific data (budget options + label)
const SESSION_DATA = {
  portraits: {
    sessionType: "Portrait Session",
    budgetOptions: [
      "$150–$250",
      "$250–$400",
      "$400–$800",
      "$800–$1500"
    ]
  },
  headshots: {
    sessionType: "Professional Headshots",
    budgetOptions: [
      "$175–$250",
      "$250–$350",
      "$350–$600"
    ]
  },
  branding: {
    sessionType: "Branding Session",
    budgetOptions: [
      "$300–$600",
      "$600–$1200",
      "$1200–$2500"
    ]
  },
  events: {
    sessionType: "Event Photography",
    budgetOptions: [
      "$300–$500",
      "$500–$800",
      "$800–$1500",
      "$1500–$2000"
    ]
  }
};

window.addEventListener("DOMContentLoaded", () => {
  const body = document.body;
  const sessionKey = body.dataset.session || null;
  const forms = document.querySelectorAll("[data-multistep]");

  forms.forEach(form => {
    const steps = form.querySelectorAll(".form-step");
    const nextBtns = form.querySelectorAll(".next-step");
    const prevBtns = form.querySelectorAll(".prev-step");
    const progress = form.querySelector(".form-progress");

    if (!steps.length) return;

    // -----------------------------------
    // SESSION-SPECIFIC HIDDEN + BUDGET
    // -----------------------------------
    if (sessionKey && SESSION_DATA[sessionKey]) {
      const data = SESSION_DATA[sessionKey];

      // Hidden session_type field
      const typeField = form.querySelector("input[name='session_type']");
      if (typeField) {
        typeField.value = data.sessionType;
      }

      // Budget dropdown
      const budgetSelect = form.querySelector("select[name='budget']");
      if (budgetSelect) {
        budgetSelect.innerHTML = `<option value="" disabled selected></option>`;
        data.budgetOptions.forEach(option => {
          const opt = document.createElement("option");
          opt.value = option;
          opt.textContent = option;
          budgetSelect.appendChild(opt);
        });
      }
    }

    // -----------------------------------
    // SHOW/HIDE DYNAMIC FIELDS PER SESSION
    // -----------------------------------
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

    // -----------------------------------
    // FIELD HELPERS
    // -----------------------------------
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

      // Optional and empty → always OK, but no success state
      if (!isRequired && value === "") {
        wrapper.classList.remove("field-error", "field-success");
        const msg = wrapper.querySelector(".error-message");
        if (msg) msg.classList.remove("visible");
        return true;
      }

      let valid = field.checkValidity();

      // Extra soft email rule
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

    // Attach live validation
    allFields.forEach(field => {
      // For floating-label "has-value" state
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
        // Only validate if there was an error or some content
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

      // Initialize has-value state on load
      updateHasValue();
    });

    // -----------------------------------
    // STEP-LEVEL VALIDATION
    // -----------------------------------
    const validateStep = stepIndex => {
      const step = steps[stepIndex];
      if (!step) return true;

      const fields = step.querySelectorAll(
        ".float-label input, .float-label textarea, .float-label select"
      );

      let firstInvalidField = null;
      let allValid = true;

      fields.forEach(field => {
        // Skip fields inside hidden dynamic blocks
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

    // -----------------------------------
    // STEP NAVIGATION
    // -----------------------------------
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
        // validate current step before advancing
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

    // Initialize first step
    showStep(0);
  });
});
