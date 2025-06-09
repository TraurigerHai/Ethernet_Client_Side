document.addEventListener("DOMContentLoaded", function () {
  const forms = document.querySelectorAll("form");
  forms.forEach((form) => {
    form.addEventListener("submit", function (e) {
      const phoneInput = form.querySelector('input[type="tel"]');
      if (phoneInput) {
        const phoneValue = phoneInput.value;
        const phonePattern = /^\+7 \(\d{3}\)-\d{3}-\d{2}-\d{2}$/;
        if (!phonePattern.test(phoneValue)) {
          e.preventDefault();
          alert(
            "Пожалуйста, введите номер телефона в формате: +7 (XXX)-XXX-XX-XX"
          );
          phoneInput.focus();
          return false;
        }
      }
    });
  });
});
