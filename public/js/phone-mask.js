document.addEventListener("DOMContentLoaded", function () {
  function initPhoneMask(selector) {
    const phoneInputs = document.querySelectorAll(selector);
    const im = new Inputmask({
      mask: "+7 (999)-999-99-99",
      placeholder: "_",
      clearMaskOnLostFocus: true,
      removeMaskOnSubmit: false,
      onUnMask: function (maskedValue, unmaskedValue) {
        const digits = unmaskedValue.replace(/\D/g, "");
        return (
          "+7 (" +
          digits.slice(0, 3) +
          ")-" +
          digits.slice(3, 6) +
          "-" +
          digits.slice(6, 8) +
          "-" +
          digits.slice(8)
        );
      },
      oncomplete: function () {
        this.input.dispatchEvent(new Event("input"));
      },
    });

    phoneInputs.forEach((input) => {
      im.mask(input);

      if (input.value) {
        if (/^\+7\d{10}$/.test(input.value)) {
          const digits = input.value.slice(2);
          input.value =
            "+7-(" +
            digits.slice(0, 3) +
            ")-" +
            digits.slice(3, 6) +
            "-" +
            digits.slice(6, 8) +
            "-" +
            digits.slice(8);
        }
      }
    });
  }

  initPhoneMask('input[type="tel"]');
});
