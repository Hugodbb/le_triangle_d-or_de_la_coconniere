
/**
 * GESTION DE L'IMMERSION VISUELLE
 * - Particules d'Or (Canvas)
 * - Parallaxe Souris
 */

document.addEventListener('DOMContentLoaded', () => {
    initParticles();
    initParallax();
});

/* ==========================================================================
   1. SYSTÈME DE PARTICULES D'OR
   ========================================================================== */
function initParticles() {
    const canvas = document.getElementById('particles-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let width, height;
    let particles = [];

    // Configuration
    const particleCount = 60; // Nombre de particules
    const connectionDistance = 0; // Pas de lignes entre particules pour cet effet "poussière"

    // Redimensionnement
    function resize() {
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = width;
        canvas.height = height;
    }
    window.addEventListener('resize', resize);
    resize();

    // Classe Particule
    class Particle {
        constructor() {
            this.x = Math.random() * width;
            this.y = Math.random() * height;
            this.vx = (Math.random() - 0.5) * 0.5; // Vitesse X lente
            this.vy = (Math.random() - 0.5) * 0.5; // Vitesse Y lente
            this.size = Math.random() * 2 + 0.5; // Taille variable
            this.alpha = Math.random() * 0.5 + 0.1; // Transparence initiale
            this.alphaSpeed = (Math.random() - 0.5) * 0.01; // Scintillement
        }

        update() {
            this.x += this.vx;
            this.y += this.vy;

            // Rebondir sur les bords (ou réapparaître de l'autre côté)
            if (this.x < 0) this.x = width;
            if (this.x > width) this.x = 0;
            if (this.y < 0) this.y = height;
            if (this.y > height) this.y = 0;

            // Scintillement
            this.alpha += this.alphaSpeed;
            if (this.alpha > 0.6 || this.alpha < 0.1) {
                this.alphaSpeed = -this.alphaSpeed;
            }
        }

        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 215, 0, ${this.alpha})`; // Or
            ctx.fill();

            // Lueur optionnelle
            if (this.size > 1.5) {
                ctx.shadowBlur = 5;
                ctx.shadowColor = "rgba(255, 215, 0, 0.5)";
            } else {
                ctx.shadowBlur = 0;
            }
        }
    }

    // Initialisation
    for (let i = 0; i < particleCount; i++) {
        particles.push(new Particle());
    }

    // Boucle d'animation
    function animate() {
        ctx.clearRect(0, 0, width, height);

        particles.forEach(p => {
            p.update();
            p.draw();
        });

        requestAnimationFrame(animate);
    }
    animate();
}

/* ==========================================================================
   2. EFFET PARALLAXE (SOURIS)
   ========================================================================== */
function initParallax() {
    // Désactiver sur mobile pour économiser batterie/perf
    if (window.matchMedia("(max-width: 768px)").matches) return;

    const container = document.querySelector('.main-content-wrapper');
    const logo = document.querySelector('.main-logo');
    const cards = document.querySelectorAll('.station');

    if (!container) return;

    document.addEventListener('mousemove', (e) => {
        const x = (window.innerWidth / 2 - e.clientX) / 50; // Diviseu plus grand = mouvement plus doux
        const y = (window.innerHeight / 2 - e.clientY) / 50;

        // Logo : bouge à l'opposé de la souris
        if (logo) {
            logo.style.transform = `translateX(${x}px) translateY(${y}px)`;
        }

        // Cartes : mouvement étagé pour profondeur
        cards.forEach((card, index) => {
            // Facteur légèrement différent pour chaque carte pour casser l'uniformité
            const factor = 1 + (index * 0.1);
            const moveX = x * 0.5 * factor;
            const moveY = y * 0.5 * factor;

            // On conserve le transform existant (hover) si possible via CSS, 
            // mais ici on applique sur le style inline qui surcharge. 
            // Astuce : appliquer le parallaxe sur le conteneur de la carte ou gérer le hover autrement ?
            // Pour simplifier et ne pas casser le hover CSS (translateY(-5px)), 
            // on va appliquer la parallaxe sur l'image à l'intérieur ou wrapper le contenu.
            // OU : Utiliser des variables CSS.

            card.style.setProperty('--parallax-x', `${moveX}px`);
            card.style.setProperty('--parallax-y', `${moveY}px`);
        });
    });
}
