import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// --- 1. INITIALISATION DE LA SCÈNE ---
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({
    canvas: document.getElementById('threejs-canvas'),
    antialias: true,
    alpha: true
});
let dernierSpriteSurvole = null;
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputEncoding = THREE.sRGBEncoding;

// --- 2. CONTRÔLES & LUMIÈRE ---
const controls = new OrbitControls(camera, renderer.domElement);
controls.rotateSpeed = -0.2;
controls.enableZoom = false;

// Lumières globales (définies une seule fois)
let ambientLight, directionalLight;

function initialiserLumieres() {
    // Supprimer les lumières existantes si elles existent
    if (ambientLight) scene.remove(ambientLight);
    if (directionalLight) scene.remove(directionalLight);

    // Créer de nouvelles lumières
    ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(10, 20, 10);
    directionalLight.castShadow = true;
    scene.add(directionalLight);
}

// Initialiser les lumières au démarrage
initialiserLumieres();

// --- 3. VARIABLES GLOBALES ---
let model = null;
let is3DVisible = false;
let aDejaVuTuto = false;

// Gestion Audio
const btnAudio = document.getElementById('toggleAmbiance');
const audioPlayer = document.getElementById('ambiance');
const iconAudio = document.getElementById('ambianceIcon');
let isAudioPlaying = false;

// Fonction pour arrêter tous les lecteurs audio sauf celui spécifié
function stopAllAudioPlayers(exceptElement = null) {
    // Arrêter l'audio d'ambiance s'il est différent de l'élément actuel
    if (audioPlayer !== exceptElement) {
        audioPlayer.pause();
        audioPlayer.currentTime = 0;
        isAudioPlaying = false;
        if (iconAudio) iconAudio.src = 'public/Icons/mute.png';
    }
    
    // Arrêter tous les autres lecteurs audio
    document.querySelectorAll('audio:not(#ambiance)').forEach(audio => {
        if (audio !== exceptElement) {
            audio.pause();
            audio.currentTime = 0;
        }
    });
}

// Gestionnaire d'événement pour les lecteurs audio
document.addEventListener('play', function(e) {
    // Si l'événement est déclenché par un élément audio
    if (e.target.tagName.toLowerCase() === 'audio') {
        // Si c'est un nouvel audio qui démarre, arrêter les autres
        if (e.target !== audioPlayer) {
            stopAllAudioPlayers(e.target);
        } else {
            // Si c'est l'audio d'ambiance qui démarre, arrêter les autres
            stopAllAudioPlayers(audioPlayer);
        }
    }
}, true);

// Éléments DOM
const canvas = document.getElementById('threejs-canvas');
const btnRetour = document.getElementById('btn-retour');
const popupTuto = document.createElement('div'); // On le crée en JS pour être sûr
const tooltipDiv = document.createElement('div');

// --- 4. CRÉATION DE LA SPHÈRE DE FOND ---
const geometry = new THREE.SphereGeometry(500, 60, 40);
geometry.scale(-1, 1, 1);
const textureLoader = new THREE.TextureLoader();
const sphereMaterial = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
const sphere = new THREE.Mesh(geometry, sphereMaterial);
scene.add(sphere);

// Groupe des objets interactifs (Sprites, Modèles 3D)
const objetsInteractifs = new THREE.Group();
scene.add(objetsInteractifs);

// --- 5. FONCTIONS UTILITAIRES ---

function nettoyerScene() {
    console.log("Nettoyage de la scène...");

    // 1. Vider le groupe d'objets interactifs (Sprites)
    while (objetsInteractifs.children.length > 0) {
        const objet = objetsInteractifs.children[0];

        // Nettoyage mémoire
        if (objet.material) {
            if (objet.material.map) {
                objet.material.map.dispose();
            }
            objet.material.dispose();
        }

        // Suppression de la scène
        objetsInteractifs.remove(objet);
    }

    // 2. Supprimer le modèle 3D importé s'il existe
    if (model) {
        scene.remove(model);
        model.traverse(child => {
            if (child.isMesh) {
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(m => {
                            if (m.map) m.map.dispose();
                            m.dispose();
                        });
                    } else {
                        if (child.material.map) child.material.map.dispose();
                        child.material.dispose();
                    }
                }
            }
        });
        model = null;
    }

    // 3. Forcer le garbage collector (indirectement)
    if (window.gc) {
        window.gc();
    } else if (window.GCController) {
        window.GCController.collect();
    } else if (window.performance && window.performance.memory) {
        // Force garbage collection in some browsers
        const used = window.performance.memory.usedJSHeapSize;
        console.log("Mémoire utilisée avant nettoyage:", used);
    }

    console.log("Nettoyage de la scène terminé");
}

// Ajouter une info-bulle (Texte)
function ajouterSpriteInfo(x, y, z, texteInfo) {
    const map = textureLoader.load('public/Icons/svg/voir.svg');
    const material = new THREE.SpriteMaterial({ 
        map: map, 
        color: 0x000000, // Couleur noire
        transparent: true, 
        depthTest: false 
    });
    const sprite = new THREE.Sprite(material);

    sprite.position.set(x, y, z);
    sprite.scale.set(10, 10, 1);

    sprite.userData = {
    type: 'info_bulle',
        message: texteInfo
    };
    objetsInteractifs.add(sprite);
}

function ajouterSpriteInfo1(x, y, z, texteInfo) {
    const map = textureLoader.load('public/Icons/svg/play.svg');
    const material = new THREE.SpriteMaterial({ map: map, transparent: true, depthTest: false });
    const sprite = new THREE.Sprite(material);

    sprite.position.set(x, y, z);
    sprite.scale.set(10, 10, 1);

    sprite.userData = {
        type: 'info_bulle',
        message: texteInfo
    };
    objetsInteractifs.add(sprite);
}


function ajouterSpriteFond(x, y, z, imagePath, idElementHTML) {
    console.log(`Ajout d'un sprite pour ${idElementHTML} à la position (${x}, ${y}, ${z})`);

    const map = textureLoader.load(imagePath, () => {
        console.log(`Texture chargée pour ${idElementHTML}`);
        renderer.render(scene, camera);
    });

    const material = new THREE.SpriteMaterial({
        map: map,
        transparent: true,
        depthTest: false
    });

    const sprite = new THREE.Sprite(material);
    sprite.position.set(x, y, z);
    sprite.scale.set(30, 30, 1);
    sprite.name = `sprite_${idElementHTML}`; // Pour un meilleur débogage

    sprite.userData = {
        type: 'video_trigger',
        targetId: idElementHTML
    };

    objetsInteractifs.add(sprite);
    console.log(`Sprite ${idElementHTML} ajouté à la scène. Nombre d'enfants: ${objetsInteractifs.children.length}`);
}

// --- 6. CHARGEMENT DES LIEUX ---

function chargerManoir() {
    console.log('=== DÉBUT CHARGEMENT MANOIR ===');

    // 1. On nettoie tout avant de commencer
    console.log('Nettoyage de la scène avant chargement...');
    nettoyerScene();

    // 2. On change juste l'image de fond
    console.log('Chargement de la texture du fond...');
    textureLoader.load('public/manoir.jpg', (tex) => {
        console.log('Texture du fond chargée');
        sphere.material.map = tex;
        sphere.material.needsUpdate = true;
        sphere.material.side = THREE.DoubleSide;
        renderer.render(scene, camera);
    });

    sphere.rotation.y = 0;
    console.log('Chargement de l\'ambiance sonore...');
    changerAmbiance('audio_manoir.mp3');

    // Ajout des sprites interactifs
    console.log('Ajout des sprites interactifs...');
    ajouterSpriteFond(-50, 0, -50, "public/Icons/doc_icon.png", "info1");
    ajouterSpriteFond(50, 0, -50, "public/Icons/doc_icon.png", "info2");
    ajouterSpriteFond(-25, 0, 70, "public/Icons/doc_icon.png", "info3");
    ajouterSpriteFond(-80, 0, 25, "public/Icons/podcast_icon.png", "son1");


    // Ajout des infobulles
    ajouterSpriteInfo(-50, 0, -50, "Voir les détails du manoir");
    ajouterSpriteInfo(50, 0, -50, "Voir les détails du manoir");
    ajouterSpriteInfo(-25, 0, 70, "Voir les détails du manoir");
    ajouterSpriteInfo1(-80, 0, 25, "Voir les détails du manoir");

    console.log(`Nombre total d'objets interactifs: ${objetsInteractifs.children.length}`);

    // Réinitialisation de la caméra
    camera.position.set(0.1, 0, 0);
    controls.target.set(0, 0, 0);
    controls.update();

    console.log('=== FIN CHARGEMENT MANOIR ===');

    // Forcer un rendu final
    renderer.render(scene, camera);
}

function chargerMoulin() {
    console.log('=== DÉBUT CHARGEMENT MOULIN ===');

    // 1. Nettoyage complet de la scène
    console.log('Nettoyage de la scène...');
    nettoyerScene();

    // 2. Configuration de la rotation de la sphère
    sphere.rotation.y = -Math.PI; // Rotation de 180 degrés

    // 3. Chargement de la texture de fond
    console.log('Chargement de la texture du fond...');
    textureLoader.load('public/moulin.jpg', (tex) => {
        console.log('Texture du fond chargée');
        sphere.material.map = tex;
        sphere.material.needsUpdate = true;
        sphere.material.side = THREE.DoubleSide;

        // 4. Fonction pour créer une texture de bois procédurale
        function createWoodTexture() {
            const canvas = document.createElement('canvas');
            canvas.width = 512;
            canvas.height = 512;
            const context = canvas.getContext('2d');

            // Créer un dégradé de base pour le bois
            const gradient = context.createLinearGradient(0, 0, 512, 0);
            gradient.addColorStop(0, '#8B4513'); // Marron foncé
            gradient.addColorStop(0.2, '#A0522D'); // Marron moyen
            gradient.addColorStop(0.4, '#8B4513'); // Marron foncé
            gradient.addColorStop(0.6, '#A0522D'); // Marron moyen
            gradient.addColorStop(0.8, '#8B4513'); // Marron foncé
            gradient.addColorStop(1, '#A0522D'); // Marron moyen
            context.fillStyle = gradient;
            context.fillRect(0, 0, 512, 512);

            // Ajouter des veines de bois
            context.strokeStyle = '#5D2906';
            context.lineWidth = 1;
            for (let i = 0; i < 200; i++) {
                const x = Math.random() * 512;
                const y = Math.random() * 512;
                const length = 50 + Math.random() * 50;
                const angle = Math.PI / 2 + (Math.random() - 0.5) * 0.4;
                context.beginPath();
                context.moveTo(x, y);
                context.lineTo(
                    x + Math.cos(angle) * length,
                    y + Math.sin(angle) * length
                );
                context.stroke();
            }

            const texture = new THREE.CanvasTexture(canvas);
            texture.wrapS = THREE.RepeatWrapping;
            texture.wrapT = THREE.RepeatWrapping;
            texture.repeat.set(2, 2);
            texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
            return texture;
        }

        // 5. Ajout des sprites interactifs
        console.log('Ajout des sprites interactifs...');
        ajouterSpriteFond(-50, 0, -50, "public/Icons/doc_icon.png", "info4");
        ajouterSpriteFond(50, 0, -50, "public/Icons/doc_icon.png", "info5");
        ajouterSpriteFond(-25, 0, 70, "public/Icons/doc_icon.png", "info6");
        ajouterSpriteFond(-80, 25,  -15,"public/Icons/video_icon.png", "videos2");
        ajouterSpriteFond(25, 15, 75, "public/Icons/podcast_icon.png", "son2");


        // 6. Ajout des infobulles
        ajouterSpriteInfo(-50, 0, -50, "Voir les détails du moulin");
        ajouterSpriteInfo(50, 0, -50, "Voir les détails du moulin");
        ajouterSpriteInfo(-25, 0, 70, "Voir les détails du moulin");
        ajouterSpriteInfo1(-80, 25, -15, "Voir les détails du moulin");
        ajouterSpriteInfo1(25, 15, 75, "Voir les détails du moulin");

        console.log(`Nombre total d'objets interactifs: ${objetsInteractifs.children.length}`);

        // 7. Configuration de la caméra
        camera.position.set(0.1, 0, 0);
        controls.target.set(0, 0, 0);
        controls.update();

        // 8. Chargement du modèle 3D
        console.log('Chargement du modèle 3D...');
        const loader = new GLTFLoader();

        loader.load(
            'models/moulin.glb',
            // onLoad
            function (gltf) {
                console.log('Modèle 3D chargé avec succès');
                model = gltf.scene;

                // Créer le matériau de bois
                const woodTexture = createWoodTexture();

                // Appliquer le matériau à tous les maillages du modèle
                model.traverse((child) => {
                    if (child.isMesh) {
                        child.material = new THREE.MeshStandardMaterial({
                            map: woodTexture,
                            roughness: 0.8,
                            metalness: 0.2
                        });
                        child.castShadow = true;
                        child.receiveShadow = true;
                    }
                });

                // Positionnement du modèle
                model.position.set(-6, 0, 2.5);
                model.rotation.set(0, Math.PI / 3, 0);
                model.scale.set(1.4, 1.4, 1.4);

                // Ajout du modèle à la scène
                objetsInteractifs.add(model);

                // Mise à jour des contrôles
                controls.target.set(0, 0, 0);
                controls.update();

                console.log('=== FIN CHARGEMENT MOULIN ===');
                renderer.render(scene, camera);
            },
            // onProgress
            function (xhr) {
                console.log((xhr.loaded / xhr.total * 100) + '% chargé');
            },
            // onError
            function (error) {
                console.error('Erreur de chargement du modèle:', error);
            }
        );
    });

    // 9. Chargement de l'audio
    console.log("Chargement de l'ambiance sonore...");
    changerAmbiance('audio_moulin.mp3');
}

function chargerTisserands() {
    console.log('=== DÉBUT CHARGEMENT TISSERANDS ===');

    // 1. Nettoyage complet de la scène
    console.log('Nettoyage de la scène...');
    nettoyerScene();

    // 2. Configuration de la rotation de la sphère
    sphere.rotation.y = 0;

    // 3. Chargement de la texture de fond
    console.log('Chargement de la texture du fond...');
    textureLoader.load('./public/tisserands.jpg', (tex) => {
        console.log('Texture du fond chargée');
        sphere.material.map = tex;
        sphere.material.needsUpdate = true;
        sphere.material.side = THREE.DoubleSide;

        // 4. Ajout des sprites interactifs
        console.log('Ajout des sprites interactifs...');
        ajouterSpriteFond(-50, 0, -50, "public/Icons/doc_icon.png", "info7");
        ajouterSpriteFond(50, 0, -50, "public/Icons/doc_icon.png", "info8");
        ajouterSpriteFond(-25, 0, 70, "public/Icons/doc_icon.png", "info9");
        ajouterSpriteFond(-80, 25,  -15,"public/Icons/video_icon.png", "videos3");
        ajouterSpriteFond(55, 15, 0,"public/Icons/podcast_icon.png", "son3");

        // 5. Ajout des infobulles
        ajouterSpriteInfo(-50, 0, -50, "Voir les détails des tisserands");
        ajouterSpriteInfo(50, 0, -50, "Voir les détails des tisserands");
        ajouterSpriteInfo(-25, 0, 70, "Voir les détails des tisserands");
        ajouterSpriteInfo1(-80, 25, -15, "Voir les détails des tisserands");
        ajouterSpriteInfo1(55, 15, 0, "Voir les détails des tisserands");

        console.log(`Nombre total d'objets interactifs: ${objetsInteractifs.children.length}`);

        // 6. Configuration de la caméra
        camera.position.set(0.1, 0, 0);
        controls.target.set(0, 0, 0);
        controls.update();

        console.log('=== FIN CHARGEMENT TISSERANDS ===');

        // 7. Forcer un rendu final
        renderer.render(scene, camera);
    });

    // 8. Chargement de l'audio
    console.log("Chargement de l'ambiance sonore...");
    changerAmbiance('audio_maison_tisserand.mp3');
}

function fermerVue3D() {
    is3DVisible = false;
    canvas.style.display = 'none';
    document.body.style.overflow = 'auto';

    // Masquer tous les éléments qui pourraient être affichés
    const elementsAMasquer = [
        ...document.querySelectorAll('.affichage'),
        ...document.querySelectorAll('#videos1, #videos2, #videos3, #info1, #info2, #info3')
    ];

    elementsAMasquer.forEach(el => {
        if (el) {
            el.style.display = 'none';
            el.classList.add('cache');
        }
    });

    // Réafficher les éléments de navigation principaux
    const elementsAMontrer = [
        document.querySelector('h1.sympa'),
        document.querySelector('h2.mini_titre'),
        document.querySelector('.parcours')
    ];

    elementsAMontrer.forEach(el => {
        if (el) el.style.display = '';
    });

    // Cacher les boutons de la vue 3D
    if (btnRetour) btnRetour.style.display = 'none';
    if (btnAudio) btnAudio.style.display = 'none';

    // S'assurer que le bouton de fermeture de vidéo est caché
    if (back) {
        back.classList.add('cache');
        back.style.display = 'none';
    }

    // Couper le son
    if (audioPlayer) {
        audioPlayer.pause();
        audioPlayer.currentTime = 0;
        isAudioPlaying = false;
        if(iconAudio) iconAudio.src = 'public/Icons/mute.png';
    }

    // Réinitialiser l'élément actif
    if (typeof elementOuvert !== 'undefined' && elementOuvert !== null) {
        elementOuvert.style.display = 'none';
        elementOuvert.classList.add('cache');
        elementOuvert = null;
    }

    // Réafficher le menu principal
    const menuAccueil = document.querySelector('.boutons');
    if (menuAccueil) menuAccueil.style.display = 'flex';
}

// --- 8. ÉCOUTEURS D'ÉVÉNEMENTS (CLICS) ---

// Boutons du menu principal
document.getElementById('btn-manoir').addEventListener('click', () => {
    chargerManoir();
    ouvrirVue3D();
});
document.getElementById('btn-moulin').addEventListener('click', () => {
    chargerMoulin();
    ouvrirVue3D();
});

document.getElementById('btn-tisserands').addEventListener('click', () => {
    chargerTisserands();
    ouvrirVue3D();
});


// Bouton Retour
if (btnRetour) btnRetour.addEventListener('click', fermerVue3D);

// Bouton Audio
if (btnAudio) {
    btnAudio.addEventListener('click', () => {
        if (isAudioPlaying) {
            audioPlayer.pause();
            if(iconAudio) iconAudio.src = 'public/Icons/mute.png';
            isAudioPlaying = false;
        } else {
            audioPlayer.play().catch(e => console.log("Erreur lecture:", e));
            if(iconAudio) iconAudio.src = 'public/Icons/sonblanc.png';
            isAudioPlaying = true;
        }
    });
}
let elementOuvert = null; // Variable pour mémoriser quelle fenêtre est ouverte
const back = document.getElementById('btn-back'); // On récupère votre bouton
// Gestion du Clic dans la scène 3D (Raycaster)

function onMouseMove(e) {
    // Sécurité : si la 3D n'est pas affichée, on arrête
    if (typeof is3DVisible !== 'undefined' && !is3DVisible) return;

    const mouse = new THREE.Vector2(
        (e.clientX / window.innerWidth) * 2 - 1,
        -(e.clientY / window.innerHeight) * 2 + 1
    );

    const rayCaster = new THREE.Raycaster();
    rayCaster.setFromCamera(mouse, camera);

    const intersects = rayCaster.intersectObjects(objetsInteractifs.children);

    if (intersects.length > 0) {
        document.body.style.cursor = 'pointer';
        // --- LA CORRECTION EST ICI ---
        // Il faut ajouter  pour prendre le premier objet touché
        const objetTouche = intersects[0].object;

        if (objetTouche !== dernierSpriteSurvole) {

            // 1. On remet l'ancien à la normale (blanc)
            if (dernierSpriteSurvole) {
                dernierSpriteSurvole.material.color.set(0xffffff);
            }

            // 2. On stocke le nouveau et on le grise
            dernierSpriteSurvole = objetTouche;
            // Gris clair pour assombrir un peu (0xaaaaaa)
            dernierSpriteSurvole.material.color.set(0xaaaaaa);

            document.body.style.cursor = 'pointer';
        }


    } else {
        document.body.style.cursor = 'default';
        // Si on ne survole plus rien, on nettoie
        if (dernierSpriteSurvole) {
            dernierSpriteSurvole.material.color.set(0xffffff);
            dernierSpriteSurvole = null;
            document.body.style.cursor = 'default';
        }
    }
}
function onClick(e) {
    if (e.target.closest('button') || e.target.closest('.merguez')) return;
    if (!controls.enabled) return;
    
    // Ne pas interagir avec les sprites si aucune vue 3D n'est ouverte
    if (!is3DVisible) return;

    const mouse = new THREE.Vector2(
        (e.clientX / window.innerWidth) * 2 - 1,
        -(e.clientY / window.innerHeight) * 2 + 1
    );

    const rayCaster = new THREE.Raycaster();
    rayCaster.setFromCamera(mouse, camera);

    const intersects = rayCaster.intersectObjects(objetsInteractifs.children);

    if (intersects.length > 0) {
        // Récupérer le premier objet intersecté
        const sprite = intersects[0].object;

        // Sécurité : on vérifie que userData existe
        if (!sprite.userData) return;

        if (sprite.userData.type === 'info_bulle') {
            tooltipDiv.innerText = sprite.userData.message;
            tooltipDiv.style.display = 'block';
            tooltipDiv.style.left = (e.clientX + 15) + 'px';
            tooltipDiv.style.top = (e.clientY + 15) + 'px';
        }
        else if (sprite.userData.type === 'video_trigger') {
            const idVideo = sprite.userData.targetId;
            const elementVideo = document.getElementById(idVideo);

            if (elementVideo) {
                // 1. Afficher la vidéo

                elementVideo.style.display = 'flex';
                elementVideo.classList.remove("cache");

                // 2. Bloquer la 3D
                controls.enabled = false;

                // 3. Cacher le bouton "Retour Accueil"
                if (btnRetour) btnRetour.style.display = 'none';

                // 4. AFFICHER LE BOUTON FERMER VIDÉO (back)
                if (back) {

                    back.style.display = 'block';
                } else {
                    console.error("Erreur: Le bouton 'btn-back' n'est pas trouvé dans le HTML");
                }

                elementOuvert = elementVideo;
            }
        }
    } else {
        if(tooltipDiv) tooltipDiv.style.display = 'none';
    }
}

// Gestion du clic sur le bouton de fermeture (croix)
if (back) {
    back.addEventListener('click', function(e) {
        // 1. Arrêter tous les éléments audio et vidéo dans le document
        document.querySelectorAll('audio, video').forEach(media => {
            media.pause();
            media.currentTime = 0;
        });
        
        // 2. Si un élément est ouvert, on le cache
        if (elementOuvert) {
            // Si c'est un élément vidéo ou audio, on le met en pause et on le réinitialise
            const mediaElements = elementOuvert.querySelectorAll('video, audio');
            mediaElements.forEach(media => {
                media.pause();
                media.currentTime = 0;
            });
            
            // 3. Cacher l'élément et réinitialiser la référence
            elementOuvert.classList.add('cache');
            elementOuvert.style.display = 'none';
            
            // 4. Réactiver les contrôles 3D
            controls.enabled = true;
            
            // 5. Réafficher le bouton retour accueil
            if (btnRetour) btnRetour.style.display = 'block';
            
            elementOuvert = null;
        }

        // 2. On cache le bouton croix
        back.style.display = 'none';
        back.classList.add('cache');

        // 3. On réaffiche le bouton retour accueil
        if (btnRetour) btnRetour.style.display = 'block';

        // 4. On réactive les contrôles
        if (controls) controls.enabled = true;
    });
}
function ouvrirVue3D() {
    console.log('=== OUVERTURE VUE 3D ===');
    is3DVisible = true;
    canvas.style.display = 'block';
    document.body.style.overflow = 'hidden';

    // Afficher les boutons de contrôle immédiatement
    console.log('Affichage des boutons de contrôle...');
    if(btnRetour) {
        btnRetour.style.display = 'block';
        btnRetour.style.zIndex = '1002';
        console.log('Bouton retour affiché');
    } else {
        console.error('ERREUR: btnRetour non trouvé');
    }
    
    if(btnAudio) {
        btnAudio.style.display = 'block';
        btnAudio.style.zIndex = '1002';
        console.log('Bouton audio affiché');
    } else {
        console.error('ERREUR: btnAudio non trouvé');
    }

    // Fermer toutes les fenêtres (vidéos, infos...)
    console.log('Fermeture des popups...');
    const tousLesPopups = document.querySelectorAll('.affichage');
    tousLesPopups.forEach(popup => {
        popup.style.display = 'none';
        popup.classList.add('cache');
    });

    // Réinitialiser l'élément actif
    elementOuvert = null;

    // Cacher les éléments de navigation principaux
    console.log('Masquage des éléments de navigation...');
    const elementsACacher = [
        document.querySelector('h1.sympa'),
        document.querySelector('h2.mini_titre'),
        document.querySelector('.parcours'),
        document.querySelector('.boutons')
    ];

    elementsACacher.forEach((el, index) => {
        if (el) {
            el.style.display = 'none';
            console.log(`Élément ${index} masqué`);
        } else {
            console.warn(`Élément ${index} non trouvé`);
        }
    });

    // Cacher le bouton de fermeture 'back'
    if (back) {
        back.classList.add('cache');
        back.style.display = 'none';
        console.log('Bouton back masqué');
    }

    // Gestion du tutoriel pour la première visite
    if (aDejaVuTuto === false) {
        console.log('Première visite - Affichage du tutoriel');
        popupTuto.style.display = 'block';
        if (controls) controls.enabled = false;
        // On cache les boutons pendant le tutoriel
        if(btnRetour) btnRetour.style.display = 'none';
        if(btnAudio) btnAudio.style.display = 'none';
    } else {
        console.log('Visite suivante - Affichage normal');
        // S'assurer que les contrôles sont activés
        if (controls) controls.enabled = true;
    }

    // 4. Reset Caméra
    camera.position.set(0.1, 0, 0);
    controls.target.set(0, 0, 0);
    controls.update();
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

window.addEventListener('click', onClick);
window.addEventListener('mousemove', onMouseMove);
// --- 9. CONFIGURATION DU TUTORIEL ET TOOLTIP ---

// Style du Tutoriel
Object.assign(popupTuto.style, {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    backgroundColor: 'rgba(255, 246, 230, 0.95)',
    color: '#5a4a42',
    padding: '40px',
    borderRadius: '15px',
    textAlign: 'center',
    zIndex: '5000',
    display: 'none',
    boxShadow: '0 10px 30px rgba(90, 74, 66, 0.25)',
    maxWidth: '600px',
    width: '85%',
    fontFamily: "'Albert Sans', sans-serif",
    border: '1px solid rgba(90, 74, 66, 0.15)',
    lineHeight: '1.6',
    fontSize: '1.1rem',
    fontWeight: '400',
    backdropFilter: 'blur(5px)'
});

// Style du titre du tutoriel
const titreTuto = document.createElement('h2');
titreTuto.textContent = 'Bienvenue dans la visite virtuelle';
titreTuto.style.fontFamily = "'Superbusy Activity', cursive";
titreTuto.style.color = '#8B6F47';
titreTuto.style.marginBottom = '20px';
titreTuto.style.fontSize = '1.8rem';
titreTuto.style.fontWeight = 'normal';
popupTuto.prepend(titreTuto);

// Style du bouton de fermeture
const btnFermerTuto = document.createElement('button');
btnFermerTuto.textContent = 'Compris';
btnFermerTuto.style.marginTop = '25px';
btnFermerTuto.style.padding = '10px 25px';
btnFermerTuto.style.backgroundColor = '#8B6F47';
btnFermerTuto.style.color = 'white';
btnFermerTuto.style.border = 'none';
btnFermerTuto.style.borderRadius = '25px';
btnFermerTuto.style.cursor = 'pointer';
btnFermerTuto.style.fontFamily = "'Albert Sans', sans-serif";
btnFermerTuto.style.fontSize = '1rem';
btnFermerTuto.style.transition = 'all 0.3s ease';

// Effet de survol
btnFermerTuto.addEventListener('mouseover', () => {
    btnFermerTuto.style.backgroundColor = '#7a5f3d';
    btnFermerTuto.style.transform = 'translateY(-2px)';
    btnFermerTuto.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
});

btnFermerTuto.addEventListener('mouseout', () => {
    btnFermerTuto.style.backgroundColor = '#8B6F47';
    btnFermerTuto.style.transform = 'translateY(0)';
    btnFermerTuto.style.boxShadow = 'none';
});

// Gestion du clic sur le bouton
btnFermerTuto.addEventListener('click', () => {
    popupTuto.style.display = 'none';
    aDejaVuTuto = true;
    if (controls) controls.enabled = true;
    // Réafficher les boutons après fermeture du tutoriel
    if(btnRetour) btnRetour.style.display = 'block';
    if(btnAudio) btnAudio.style.display = 'block';
});

popupTuto.appendChild(btnFermerTuto);
// Ajout du contenu du tutoriel
const contenuTuto = document.createElement('div');
contenuTuto.innerHTML = `
    <p>🖱️ <strong>Navigation :</strong> Maintenez le clic gauche et glissez pour vous déplacer dans la scène.</p>
    <p>ℹ️ <strong>Informations :</strong> Cliquez sur les icônes pour découvrir des informations ou des médias supplémentaires.</p>
    <p>🔊 <strong>Audio :</strong> Activez le son pour une expérience immersive complète.</p>
`;
contenuTuto.style.marginBottom = '20px';
contenuTuto.style.textAlign = 'left';

// Insérer le contenu avant le bouton de fermeture
popupTuto.insertBefore(contenuTuto, btnFermerTuto);

document.body.appendChild(popupTuto);
// ou on attend qu'il soit dans le DOM. Ici, méthode simple :
setTimeout(() => {
    const btnFermer = document.getElementById('btn-fermer-tuto');
    if(btnFermer) {
        btnFermer.addEventListener('click', () => {
            popupTuto.style.display = 'none';
            aDejaVuTuto = true;
            if (controls) controls.enabled = true;
            if (btnRetour) btnRetour.style.display = 'block';
            if (btnAudio) btnAudio.style.display = 'block';
        });
    }
}, 100);

// Style de la Tooltip (Info-bulle survol)


function changerAmbiance(nomFichier) {
    if (audioPlayer) {
        // 1. Définition du chemin
        // ATTENTION : Vérifiez si votre dossier s'appelle "sound" (singulier) ou "sounds" (pluriel) dans Windows/Mac
        // Dans votre HTML c'était "sound", donc je garde "sound" ici.
        const cheminComplet = 'public/sound/' + nomFichier;

        console.log("Chargement audio : " + cheminComplet);

        // 2. Assignation directe à la balise audio (pas au <source>)
        audioPlayer.src = cheminComplet;

        // 3. IMPORTANT : Forcer le rechargement du flux audio
        audioPlayer.load();

        // 4. Si le son était activé, on relance la lecture
        if (isAudioPlaying) {
            var playPromise = audioPlayer.play();

            if (playPromise !== undefined) {
                playPromise.then(_ => {
                    // La lecture a commencé
                })
                    .catch(error => {
                        console.log("Lecture empêchée par le navigateur :", error);
                    });
            }
        }
    }
}




// --- 10. BOUCLE D'ANIMATION ---
function animate() {
    requestAnimationFrame(animate);
    const temps = Date.now() * 0.005; // Le 0.005 gère la vitesse du battement

    // On parcourt tous les objets interactifs
    objetsInteractifs.children.forEach(objet => {
        // On vérifie si c'est bien une "info_bulle" grâce au userData défini dans votre fonction
        if (objet.userData && objet.userData.type === 'info_bulle') {

            const echelle = 8 + Math.sin(temps) * 1.3;

            objet.scale.set(echelle, echelle, 1);
        }
    });
    if (is3DVisible) {
        controls.update();
        if (model) {
            // Animation du moulin s'il est chargé
            model.rotation.z -= 0.005;
        }
        renderer.render(scene, camera);
    }
}
animate();