document.addEventListener("DOMContentLoaded", () => {

  const form = document.querySelector("[data-multistep]");
  if (!form) return;

  const steps = Array.from(form.querySelectorAll(".form-step"));
  const progress = form.querySelector(".form-progress");

  let currentStep = 0;

  /* -----------------------------
     SHOW STEP
  ----------------------------- */
  function showStep(index) {
    steps.forEach((step, i) => {
      step.classList.toggle("active-step", i === index);
    });

    if (progress) {
      progress.textContent = `Step ${index + 1} of ${steps.length}`;
    }
  }

  /* -----------------------------
     BASIC VALIDATION
  ----------------------------- */
  function isStepValid(step) {
    const requiredFields = step.querySelectorAll("[required], [data-required='true']");

    let valid = true;

    requiredFields.forEach(field => {
      if (!field.value.trim()) {
        valid = false;
        field.closest(".float-label")?.classList.add("shake");
        setTimeout(() => {
          field.closest(".float-label")?.classList.remove("shake");
        }, 300);
      }
    });

    return valid;
  }

  /* -----------------------------
     BUTTON HANDLING
  ----------------------------- */
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

  /* -----------------------------
     INIT
  ----------------------------- */
  showStep(0);

});
