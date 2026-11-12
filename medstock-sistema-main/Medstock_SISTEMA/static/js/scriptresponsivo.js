// =========================================================
// MENU RESPONSIVO
// =========================================================

const menuToggle = document.getElementById("menu-toggle");
const menu = document.querySelector(".menu");


// Verifica se os elementos existem
if (menuToggle && menu) {

    // =====================================================
    // ABRIR / FECHAR MENU
    // =====================================================

    menuToggle.addEventListener("click", function (event) {

        // Impede que o clique seja considerado como clique fora
        event.stopPropagation();

        // Adiciona ou remove a classe active
        menu.classList.toggle("active");


        // Troca o símbolo do botão
        if (menu.classList.contains("active")) {

            menuToggle.innerHTML = "✕";
            menuToggle.setAttribute("aria-label", "Fechar menu");

        } else {

            menuToggle.innerHTML = "☰";
            menuToggle.setAttribute("aria-label", "Abrir menu");

        }

    });


    // =====================================================
    // FECHAR MENU AO CLICAR EM UM LINK
    // =====================================================

    const menuLinks = document.querySelectorAll(".menu a");

    menuLinks.forEach(function (link) {

        link.addEventListener("click", function () {

            menu.classList.remove("active");

            menuToggle.innerHTML = "☰";

            menuToggle.setAttribute("aria-label", "Abrir menu");

        });

    });


    // =====================================================
    // FECHAR MENU AO CLICAR FORA
    // =====================================================

    document.addEventListener("click", function (event) {

        const clicouNoMenu = menu.contains(event.target);

        const clicouNoBotao = menuToggle.contains(event.target);


        if (!clicouNoMenu && !clicouNoBotao) {

            menu.classList.remove("active");

            menuToggle.innerHTML = "☰";

            menuToggle.setAttribute("aria-label", "Abrir menu");

        }

    });


    // =====================================================
    // AO VOLTAR PARA DESKTOP
    // =====================================================

    window.addEventListener("resize", function () {

        if (window.innerWidth > 900) {

            menu.classList.remove("active");

            menuToggle.innerHTML = "☰";

            menuToggle.setAttribute("aria-label", "Abrir menu");

        }

    });

}


// =========================================================
// ANIMAÇÃO REVEAL
// =========================================================

const elementosReveal = document.querySelectorAll(".reveal");

const observer = new IntersectionObserver(
    function (entries) {

        entries.forEach(function (entry) {

            if (entry.isIntersecting) {

                entry.target.classList.add("ativo");

            }

        });

    },
    {
        threshold: 0.1
    }
);


elementosReveal.forEach(function (elemento) {

    observer.observe(elemento);

});