document.addEventListener("DOMContentLoaded", () => {
  const bodySession = document.body.dataset.session || "";
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function safeId(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "field";
  }

  function isElementAvailable(element) {
    if (!element) return false;
    if (element.disabled) return false;
    if (element.hidden) return false;
    if (element.closest("[hidden]")) return false;
    if (element.closest('[aria-hidden="true"]')) return false;
    if (window.getComputedStyle(element).display === "none") return false;
    return true;
  }

  function getFieldLabel(field) {
    const explicitLabel = field.id ? document.querySelector(`label[for="${field.id}"]`) : null;
    const wrapper = explicitLabel || field.closest(".float-label, .addon-option, label");

    if (wrapper) {
      const clone = wrapper.cloneNode(true);
      clone.querySelectorAll("input, textarea, select, button, .error-message, .form-required-hint").forEach(el => el.remove());
      const text = clone.textContent.replace(/\s+/g, " ").trim();
      if (text) return text.replace(/\s*required\s*$/i, "").trim();
    }

    return field.name ? field.name.replace(/[_-]+/g, " ") : "This field";
  }

  function scrollToField(field) {
    field.scrollIntoView({
      behavior: prefersReducedMotion ? "auto" : "smooth",
      block: "center"
    });
  }

  function getFocusableElements(container) {
    return Array.from(
      container.querySelectorAll(
        'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
    ).filter(isElementAvailable);
  }

  function ensureFieldIds(form) {
    const counts = {};

    form.querySelectorAll("input, textarea, select").forEach(field => {
      if (!field.id) {
        const base = safeId(field.name || field.type || "field");
        counts[base] = (counts[base] || 0) + 1;
        field.id = `${base}-${counts[base]}`;
      }
    });
  }

  function ensureRequiredHints(form) {
    form.querySelectorAll("input, textarea, select").forEach(field => {
      const isRequired = field.hasAttribute("required") || field.dataset.required === "true";
      if (!isRequired) return;

      field.setAttribute("aria-required", "true");

      const wrapper = field.closest(".float-label");
      const labelSpan = wrapper ? wrapper.querySelector("span") : null;

      if (labelSpan && !labelSpan.querySelector(".form-required-hint")) {
        const hint = document.createElement("span");
        hint.className = "form-required-hint";
        hint.textContent = " required";
        labelSpan.appendChild(hint);
      }
    });
  }

  function ensureStepAlert(step) {
    let alert = step.querySelector(".form-step-alert");
    if (!alert) {
      alert = document.createElement("div");
      alert.className = "form-step-alert";
      alert.setAttribute("role", "alert");
      alert.setAttribute("aria-live", "assertive");
      alert.hidden = true;
      step.insertBefore(alert, step.firstChild);
    }
    return alert;
  }

  function clearStepAlert(step) {
    const alert = step.querySelector(".form-step-alert");
    if (!alert) return;
    alert.textContent = "";
    alert.hidden = true;
  }

  function ensureErrorMessage(field) {
    const wrapper = field.closest(".float-label") || field.parentElement;
    if (!wrapper) return null;

    let error = wrapper.querySelector(".error-message");
    if (!error) {
      error = document.createElement("p");
      error.className = "error-message";
      error.id = `${field.id}-error`;
      error.setAttribute("aria-live", "polite");
      wrapper.appendChild(error);
    } else if (!error.id) {
      error.id = `${field.id}-error`;
    }

    const describedBy = new Set((field.getAttribute("aria-describedby") || "").split(/\s+/).filter(Boolean));
    describedBy.add(error.id);
    field.setAttribute("aria-describedby", Array.from(describedBy).join(" "));

    return error;
  }

  function clearFieldError(field) {
    const wrapper = field.closest(".float-label");
    const error = wrapper ? wrapper.querySelector(".error-message") : null;

    if (wrapper) {
      wrapper.classList.remove("field-error", "shake");
      if (field.value && field.checkValidity()) {
        wrapper.classList.add("field-success");
      } else {
        wrapper.classList.remove("field-success");
      }
    }

    field.removeAttribute("aria-invalid");

    if (error) {
      error.textContent = "";
      error.classList.remove("visible");
    }
  }

  function setFieldError(field, message) {
    const wrapper = field.closest(".float-label");
    const error = ensureErrorMessage(field);

    if (wrapper) {
      wrapper.classList.remove("field-success");
      wrapper.classList.add("field-error", "shake");
      window.setTimeout(() => wrapper.classList.remove("shake"), 300);
    }

    field.setAttribute("aria-invalid", "true");

    if (error) {
      error.textContent = message;
      error.classList.add("visible");
    }
  }

  function getValidationMessage(field) {
    const label = getFieldLabel(field);

    if (field.validity.valueMissing) return `${label} is required.`;
    if (field.validity.typeMismatch && field.type === "email") return "Please enter a valid email address.";
    if (field.validity.typeMismatch && field.type === "url") return "Please enter a valid website address.";
    if (field.validity.rangeUnderflow) return `${label} must be ${field.min} or higher.`;
    if (field.validity.rangeOverflow) return `${label} must be ${field.max} or lower.`;
    if (field.validity.tooShort) return `${label} is too short.`;
    if (field.validity.tooLong) return `${label} is too long.`;
    if (field.validity.patternMismatch) return `Please check ${label}.`;

    return field.validationMessage || `${label} needs attention.`;
  }

  function setControlsEnabled(container, enabled) {
    container.querySelectorAll("input, textarea, select").forEach(control => {
      control.disabled = !enabled;
    });
  }

  const sessionTypeInput = document.querySelector('input[name="session_type"]');
  if (sessionTypeInput && bodySession) sessionTypeInput.value = bodySession;

  function applyDynamicFieldsVisibility() {
    document.querySelectorAll(".dynamic-field[data-show]").forEach(group => {
      const shouldShow = group.dataset.show === bodySession;

      if (shouldShow) {
        group.hidden = false;
        group.style.display = "block";
        group.setAttribute("aria-hidden", "false");
        setControlsEnabled(group, true);
        requestAnimationFrame(() => group.classList.add("visible"));

        group.querySelectorAll("[data-required='true']").forEach(field => {
          field.setAttribute("required", "required");
          field.setAttribute("aria-required", "true");
        });
      } else {
        group.classList.remove("visible");
        group.hidden = true;
        group.style.display = "none";
        group.setAttribute("aria-hidden", "true");
        setControlsEnabled(group, false);

        group.querySelectorAll("[data-required='true']").forEach(field => {
          field.removeAttribute("required");
          field.removeAttribute("aria-required");
          clearFieldError(field);
        });
      }
    });
  }

  const PACKAGE_ADDONS = {
    mini: ["extra-images", "prints", "rush"],
    standard: ["extra-images", "extra-outfit", "extra-time", "prints", "rush"],
    extended: ["extra-images", "extra-outfit", "extra-time", "extra-location", "prints", "rush", "studio"],
    senior: ["extra-images", "extra-time", "extra-location", "prints", "rush"],
    family: ["extra-images", "extra-time", "extra-location", "prints", "rush"],
    "extended-family": ["extra-images", "extra-time", "extra-location", "prints", "rush"],
    "headshot-essential": ["extra-images", "rush", "prints"],
    "headshot-professional": ["extra-images", "rush", "prints"],
    "headshot-team": ["extra-images", "rush", "prints"]
  };

  const packageButtons = document.querySelectorAll(".package-button");
  const selectedPackageInput = document.querySelector('input[name="selected_package"]');
  const formTitle = document.getElementById("formTitle");
  const addons = document.querySelectorAll(".addon");

  function resetAddon(addon) {
    addon.querySelectorAll("input, select, textarea").forEach(field => {
      if (field.type === "checkbox" || field.type === "radio") field.checked = false;
      else field.value = "";
      clearFieldError(field);
    });
  }

  function hideAddon(addon) {
    addon.classList.remove("visible");
    addon.hidden = true;
    addon.style.display = "none";
    addon.setAttribute("aria-hidden", "true");
    setControlsEnabled(addon, false);
    resetAddon(addon);
  }

  function showAddon(addon) {
    addon.hidden = false;
    addon.style.display = "block";
    addon.setAttribute("aria-hidden", "false");
    setControlsEnabled(addon, true);
    requestAnimationFrame(() => addon.classList.add("visible"));
  }

  function showAllowedAddons(packageId) {
    const allowed = PACKAGE_ADDONS[packageId] || [];

    addons.forEach(addon => {
      if (allowed.includes(addon.dataset.addon)) showAddon(addon);
      else hideAddon(addon);
    });
  }

  addons.forEach(hideAddon);

  packageButtons.forEach(button => {
    button.setAttribute("aria-pressed", "false");

    button.addEventListener("click", () => {
      const packageId = button.dataset.packageId || "";
      const packageLabel = button.dataset.packageLabel || "";

      packageButtons.forEach(item => item.setAttribute("aria-pressed", "false"));
      button.setAttribute("aria-pressed", "true");

      if (selectedPackageInput) selectedPackageInput.value = packageLabel;
      if (formTitle && packageLabel) formTitle.textContent = `Book Your ${packageLabel}`;

      showAllowedAddons(packageId);
    });
  });

  applyDynamicFieldsVisibility();

  document.querySelectorAll("form[data-multistep]").forEach(form => {
    form.noValidate = true;
    ensureFieldIds(form);
    ensureRequiredHints(form);

    const steps = Array.from(form.querySelectorAll(".form-step"));
    const progress = form.querySelector(".form-progress");
    let currentStep = 0;

    if (progress) {
      if (!progress.id) progress.id = "form-progress";
      progress.setAttribute("aria-live", "polite");
      progress.setAttribute("aria-atomic", "true");
    }

    steps.forEach((step, index) => {
      if (!step.id) step.id = `form-step-${index + 1}`;
      step.setAttribute("role", "group");
      step.setAttribute("aria-label", `Step ${index + 1} of ${steps.length}`);
      if (progress) step.setAttribute("aria-describedby", progress.id);
      ensureStepAlert(step);
    });

    function showStep(index, shouldFocus = true) {
      steps.forEach((step, i) => {
        const isActive = i === index;
        step.classList.toggle("active-step", isActive);
        step.hidden = !isActive;
        step.setAttribute("aria-hidden", String(!isActive));
      });

      applyDynamicFieldsVisibility();

      if (progress) progress.textContent = `Step ${index + 1} of ${steps.length}`;

      if (shouldFocus) {
        const firstFocusable = getFocusableElements(steps[index])[0];
        if (firstFocusable) window.setTimeout(() => firstFocusable.focus(), 50);
      }
    }

    function isStepValid(step) {
      clearStepAlert(step);
      const fields = Array.from(step.querySelectorAll("input, textarea, select"));
      const invalidFields = [];

      fields.forEach(field => {
        if (!isElementAvailable(field)) return;

        const requiredByData = field.dataset.required === "true";
        if (requiredByData) {
          field.setAttribute("required", "required");
          field.setAttribute("aria-required", "true");
        }

        if (!field.checkValidity()) {
          const message = getValidationMessage(field);
          setFieldError(field, message);
          invalidFields.push({ field, message });
        } else {
          clearFieldError(field);
        }
      });

      if (invalidFields.length) {
        const alert = ensureStepAlert(step);
        alert.textContent = invalidFields.length === 1
          ? invalidFields[0].message
          : `Please complete ${invalidFields.length} required fields before continuing.`;
        alert.hidden = false;

        scrollToField(invalidFields[0].field);
        invalidFields[0].field.focus();
        return false;
      }

      return true;
    }

    form.addEventListener("click", event => {
      const nextButton = event.target.closest(".next-step");
      const prevButton = event.target.closest(".prev-step");

      if (nextButton) {
        if (!isStepValid(steps[currentStep])) return;
        if (currentStep < steps.length - 1) {
          currentStep += 1;
          showStep(currentStep);
        }
      }

      if (prevButton) {
        if (currentStep > 0) {
          currentStep -= 1;
          showStep(currentStep);
        }
      }
    });

    form.addEventListener("input", event => {
      const field = event.target;
      if (field.matches("input, textarea, select")) clearFieldError(field);
    });

    form.addEventListener("change", event => {
      const field = event.target;
      if (field.matches("input, textarea, select")) clearFieldError(field);
    });

    form.addEventListener("submit", event => {
      const allValid = steps.every(step => isStepValid(step));
      if (!allValid) {
        event.preventDefault();
        const firstInvalidStep = steps.findIndex(step => step.querySelector('[aria-invalid="true"]'));
        if (firstInvalidStep >= 0) {
          currentStep = firstInvalidStep;
          showStep(currentStep);
          const firstInvalidField = steps[currentStep].querySelector('[aria-invalid="true"]');
          if (firstInvalidField) {
            scrollToField(firstInvalidField);
            firstInvalidField.focus();
          }
        }
      }
    });

    showStep(0, false);
  });
});
