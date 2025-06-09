document.addEventListener("DOMContentLoaded", function () {
  const swiper = new Swiper(".tariff-slider", {
    slidesPerView: 1,
    spaceBetween: 30,
    loop: true,
    centeredSlides: true,
    autoplay: {
      delay: 3000,
      disableOnInteraction: false,
    },
    pagination: {
      el: ".swiper-pagination",
      clickable: true,
    },
    navigation: {
      nextEl: ".swiper-button-next",
      prevEl: ".swiper-button-prev",
    },
    breakpoints: {
      768: {
        slidesPerView: 2,
      },
      1024: {
        slidesPerView: 3,
      },
    },
  });

  const tariffButtons = document.querySelectorAll(".tariff-card .btn-submit");
  const tariffSelect = document.getElementById("tariff");

  tariffButtons.forEach((button) => {
    button.addEventListener("click", function (e) {
      const tariffId = this.getAttribute("data-tariff");
      if (tariffSelect) {
        tariffSelect.value = tariffId;
      }
    });
  });
});
