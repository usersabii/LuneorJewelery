// Récupère le modal, le bouton de fermeture et le formulaire
const modal        = document.getElementById('account-modal');
const closeBtn     = document.getElementById('modal-close');
const accountForm  = document.getElementById('account-form');

// Fonction utilitaire pour fermer le modal
function hideModal() {
  modal.classList.remove('show', 'd-block');
}

// À l’ouverture de la page, on affiche le modal seulement si on n'a pas encore créé de compte
document.addEventListener('DOMContentLoaded', () => {
  if (!localStorage.getItem('accountCreated')) {
    modal.classList.add('show', 'd-block');
  }
});

// 1) Ferme le modal quand on clique sur la croix
closeBtn.addEventListener('click', () => {
  hideModal();
});

function doGet(e) {
  const sh = SpreadsheetApp
               .getActiveSpreadsheet()
               .getSheetByName('Inscriptions');
  sh.appendRow([
    e.parameter.nom||'', 
    e.parameter.prenom||'', 
    e.parameter.email||'', 
    e.parameter.telephone||'', 
    e.parameter.adresse||'', 
    new Date()
  ]);
  return ContentService
    .createTextOutput('OK');
}

accountForm.addEventListener('submit', e => {
  e.preventDefault();
  // transforme le form en query string
  const params = new URLSearchParams(new FormData(e.target)).toString();
  // en GET & no-cors pour ne pas déclencher de preflight
  fetch('https://script.google.com/macros/s/AKfycbwTlL13Lr13Pjz2TaeR5mCvu3v9dkt5qgpm-r_6ZKVIqOLuIIonU_ydd4TZ52I0rS9a1A/exec' + params, {
    method: 'GET',
    mode: 'no-cors'
  })
  .then(() => {
    localStorage.setItem('accountCreated','true');
    hideModal();
    alert('Inscription enregistrée !');
  })
  .catch(err => console.error(err));
});

document.querySelectorAll('.btn-tab').forEach(btn => {
  btn.addEventListener('click', () => {
    // 1) On switch les active classes sur les boutons
    document.querySelectorAll('.btn-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    // 2) On affiche la bonne pane
    const target = btn.getAttribute('data-target');
    document.querySelectorAll('.tab-pane').forEach(pane => {
      pane.classList.toggle('active', `#${pane.id}` === target);
    });
  });
});

// Fonction utilitaire : cache toutes les sections et n'en affiche qu'une
function showSection(sectionId) {
  document.querySelectorAll('.page-section').forEach(sec => {
    sec.classList.add('hidden');
  });
  const target = document.getElementById(sectionId);
  if (target) {
    target.classList.remove('hidden');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  // Bouton Shop existant
  const shopBtn = document.getElementById('nav-shop');
  shopBtn.addEventListener('click', e => {
    e.preventDefault();
    // Masque tout, puis n'affiche que la section Shop
    showSection('shop-section');
  });

  // Nouveau : bouton Accueil
  const homeBtn = document.getElementById('nav-accueil');
  homeBtn.addEventListener('click', e => {
    e.preventDefault();
    // 1) Masque la section Shop
    document.getElementById('shop-section').classList.add('hidden');
    // 2) Affiche toutes les autres sections (assume qu'elles ont la classe .page-section)
    document.querySelectorAll('.page-section').forEach(sec => {
      if (sec.id !== 'shop-section') {
        sec.classList.remove('hidden');
      }
    });
    // (optionnel) scroll en haut
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
});

/**
 * Fait défiler en douceur jusqu'à la section donnée.
 * @param {string} id — l'attribut id de la section cible.
 */
function scrollToSection(id) {
  const section = document.getElementById(id);
  if (!section) return console.warn(`Section introuvable : ${id}`);
  section.scrollIntoView({ behavior: 'smooth' });
}

document.querySelector('.segmented-metal')
  .addEventListener('change', (e) => {
    const value = document.querySelector('input[name="metal"]:checked')?.value;
    // TODO: filtre tes produits avec `value` (gold/silver)
    console.log('métal:', value);
  });

  document.addEventListener('DOMContentLoaded', () => {
    const sliderEl = document.getElementById('price-slider');
    if (!sliderEl || typeof noUiSlider === 'undefined') return;
  
    const minIn = document.getElementById('price-min-input');
    const maxIn = document.getElementById('price-max-input');
    const bMin  = document.getElementById('price-badge-min');
    const bMax  = document.getElementById('price-badge-max');
  
    noUiSlider.create(sliderEl, {
      start: [0, 500],
      connect: true,
      step: 5,
      range: { min: 0, max: 500 },
      tooltips: [{
        to: v => `€${Math.round(v)}`,
        from: v => Number(String(v).replace(/[^\d.]/g,'')) 
      },{
        to: v => `€${Math.round(v)}`,
        from: v => Number(String(v).replace(/[^\d.]/g,'')) 
      }],
      pips: { mode: 'positions', values: [0,20,40,60,80,100], density: 4 }
    });
  
    // slider -> inputs + badge
    sliderEl.noUiSlider.on('update', (values) => {
      const [v1, v2] = values.map(v => Math.round(Number(String(v).replace(/[^\d.]/g,''))));
      minIn.value = v1; maxIn.value = v2;
      bMin.textContent = `€${v1}`; bMax.textContent = `€${v2}`;
    });
  
    // inputs -> slider
    function clamp(n, min, max){ return Math.max(min, Math.min(max, n)); }
    function setFromInputs(){
      let v1 = clamp(parseInt(minIn.value || 0,10), 0, 500);
      let v2 = clamp(parseInt(maxIn.value || 0,10), 0, 500);
      if (v1 > v2) [v1, v2] = [v2, v1];
      sliderEl.noUiSlider.set([v1, v2]);
    }
    minIn.addEventListener('change', setFromInputs);
    maxIn.addEventListener('change', setFromInputs);
  
    // presets
    document.querySelectorAll('.price-presets button').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const [a,b] = btn.dataset.range.split(',').map(Number);
        sliderEl.noUiSlider.set([a,b]);
      });
    });
  });

  // Chips multi-sélection pour Type de bijou
document.addEventListener('DOMContentLoaded', () => {
  const group = document.querySelector('.type-filter .chip-group');
  if (!group) return;

  group.addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    const pressed = chip.getAttribute('aria-pressed') === 'true';
    chip.setAttribute('aria-pressed', String(!pressed));
    chip.classList.toggle('is-active', !pressed);

    // Récupère la liste des types sélectionnés
    const selected = [...group.querySelectorAll('.chip[aria-pressed="true"]')]
      .map(btn => btn.dataset.type);

    // (Option) déclenche un event pour rafraîchir la grille produits
    document.dispatchEvent(new CustomEvent('filters:change', {
      detail: { types: selected }
    }));
  });

  // Reset
  const resetBtn = document.querySelector('.type-filter .chip-reset');
  resetBtn?.addEventListener('click', () => {
    group.querySelectorAll('.chip').forEach(chip => {
      chip.setAttribute('aria-pressed','false');
      chip.classList.remove('is-active');
    });
    document.dispatchEvent(new CustomEvent('filters:change', {
      detail: { types: [] }
    }));
  });
});

document.addEventListener('DOMContentLoaded', () => {
  const grid = document.getElementById('products-grid');
  const bubble = document.getElementById('cart-bubble');
  const countEl = document.getElementById('cart-count');

  // Panier simple en mémoire (tu peux remplacer par localStorage si tu veux)
  const cart = [];

  function updateCartCount(){
    const total = cart.reduce((sum, item) => sum + item.qty, 0);
    if (countEl) countEl.textContent = String(total);
  }

  function addToCart(data){
    // Cherche si déjà présent
    const found = cart.find(p => p.id === data.id);
    if (found) found.qty += 1;
    else cart.push({ ...data, qty: 1 });
    updateCartCount();
    // petit effet sur la bulle
    bubble?.classList.remove('pulse'); // reset
    void bubble?.offsetWidth;          // reflow pour rejouer l’anim
    bubble?.classList.add('pulse');
  }

  function flyToCart(imgEl){
    if (!imgEl || !bubble) return;

    const imgRect = imgEl.getBoundingClientRect();
    const bubRect = bubble.getBoundingClientRect();

    // Clone visuel
    const clone = imgEl.cloneNode(true);
    clone.style.position = 'fixed';
    clone.style.left = imgRect.left + 'px';
    clone.style.top  = imgRect.top + 'px';
    clone.style.width  = imgRect.width + 'px';
    clone.style.height = imgRect.height + 'px';
    clone.style.borderRadius = '12px';
    clone.style.zIndex = 9999;
    clone.style.pointerEvents = 'none';
    clone.style.transition = 'transform .7s cubic-bezier(.2,.7,.2,1), opacity .7s ease';

    document.body.appendChild(clone);

    // Calcul du vecteur → centre de la bulle
    const fromX = imgRect.left + imgRect.width/2;
    const fromY = imgRect.top  + imgRect.height/2;
    const toX   = bubRect.left + bubRect.width/2;
    const toY   = bubRect.top  + bubRect.height/2;
    const dx = toX - fromX;
    const dy = toY - fromY;

    // Lance l’anim au prochain frame
    requestAnimationFrame(() => {
      clone.style.transform = `translate(${dx}px, ${dy}px) scale(.15)`;
      clone.style.opacity = '0.6';
    });

    clone.addEventListener('transitionend', () => {
      clone.remove();
    }, { once: true });
  }

  // Délégation de clic sur la grille
  grid?.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-add');
    if (!btn) return;

    // Données produit
    const card = btn.closest('.product-card');
    const img  = card?.querySelector('.product-img');
    const data = {
      id:    btn.dataset.id,
      name:  btn.dataset.name,
      price: Number(btn.dataset.price || 0),
      img:   btn.dataset.img
    };

    addToCart(data);
    flyToCart(img);
  });
});



