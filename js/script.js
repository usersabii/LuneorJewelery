
/* === Animation + compteur pour .btn-add (sans rien casser) === */
(function () {
  // éviter d'attacher deux fois si tu reloads souvent
  if (window.__flyHooked) return;
  window.__flyHooked = true;

  // 1) Animation d'aspiration vers la bulle
  function flyToCart(sourceImgEl, bubbleEl) {
    if (!sourceImgEl || !bubbleEl) return;

    const r1 = sourceImgEl.getBoundingClientRect();
    const r2 = bubbleEl.getBoundingClientRect();

    const ghost = sourceImgEl.cloneNode(true);
    ghost.style.position = 'fixed';
    ghost.style.left = r1.left + 'px';
    ghost.style.top = r1.top + 'px';
    ghost.style.width = sourceImgEl.clientWidth + 'px';
    ghost.style.height = sourceImgEl.clientHeight + 'px';
    ghost.style.borderRadius = '12px';
    ghost.style.transition = 'transform .65s cubic-bezier(.22,.75,.2,1), opacity .65s';
    ghost.style.zIndex = '9999';
    ghost.style.pointerEvents = 'none';
    document.body.appendChild(ghost);

    const tx = (r2.left + r2.width/2) - (r1.left + r1.width/2);
    const ty = (r2.top  + r2.height/2) - (r1.top  + r1.height/2);

    requestAnimationFrame(() => {
      ghost.style.transform = `translate(${tx}px, ${ty}px) scale(.18)`;
      ghost.style.opacity = '0.35';
    });

    ghost.addEventListener('transitionend', () => ghost.remove(), { once: true });
  }

  // 3) Accroche sur tous les boutons .btn-add (délégation globale)
  document.addEventListener('click', (e) => {
    const addBtn = e.target.closest('.btn-add');
    if (!addBtn) return;

    // Trouver l’image de la carte pour l’anim
    const card = addBtn.closest('.product-card');
    const imgEl = card?.querySelector('.product-img, img');
    const bubbleEl = document.querySelector('.cart-bubble, #cart-bubble');

    // D’abord on ajoute au panier via ta fonction existante si elle existe
    if (typeof window.addToCart === 'function') {
      window.addToCart({
        id: addBtn.dataset.id,
        name: addBtn.dataset.name,
        price: Number(addBtn.dataset.price || 0),
        img: addBtn.dataset.img || (imgEl?.getAttribute('src') || ''),
        qty: 1
      });
    } else {
      // Fallback ultra léger qui ne perturbe pas ton code
      let cart = [];
      try { cart = JSON.parse(localStorage.getItem('cart') || '[]'); } catch(_) {}
      const id = addBtn.dataset.id;
      const found = cart.find(x => x.id === id);
      if (found) found.qty = (found.qty || 1) + 1;
      else cart.push({
        id,
        name: addBtn.dataset.name,
        price: Number(addBtn.dataset.price || 0),
        img: addBtn.dataset.img || (imgEl?.getAttribute('src') || ''),
        qty: 1
      });
      localStorage.setItem('cart', JSON.stringify(cart));
    }


    // Lance l’animation d’aspiration
    flyToCart(imgEl, bubbleEl);
  });
})();

// === Panier : helpers uniques (source de vérité) ===
(function () {
  const STORAGE_KEY = 'cart';

  function getCart() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
    catch { return []; }
  }

  function setCart(arr) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(arr || []));
    updateCartBubble(arr);
  }

  function updateCartBubble(cart) {
    cart = Array.isArray(cart) ? cart : getCart();
    const total = cart.reduce((s, it) => s + (parseInt(it.qty, 10) > 0 ? parseInt(it.qty, 10) : 1), 0);
    const el = document.querySelector('.cart-count'); // <span class="cart-count" id="cart-count">
    if (el) el.textContent = String(total); // affiche 0 si panier vide
  }

  // Init au chargement : crée [] si absent et affiche 0
  document.addEventListener('DOMContentLoaded', () => {
    if (!localStorage.getItem(STORAGE_KEY)) localStorage.setItem(STORAGE_KEY, '[]');
    updateCartBubble(); // démarre bien à 0
  });

  // Expose proprement
  window.getCart = getCart;
  window.setCart = setCart;
  window.updateCartBubble = updateCartBubble;
})();

// --- Démarrer le panier à 0 à CHAQUE rechargement ---
(function () {
  const STORAGE_KEY = 'cart';
  const RESET_CART_ON_EVERY_LOAD = true; // mets false si un jour tu veux persister

  document.addEventListener('DOMContentLoaded', () => {
    if (RESET_CART_ON_EVERY_LOAD) {
      // Vide le panier à chaque reload => bulle = 0
      localStorage.setItem(STORAGE_KEY, '[]');
    } else if (!localStorage.getItem(STORAGE_KEY)) {
      // (mode persistant) initialise seulement s'il n'existe pas
      localStorage.setItem(STORAGE_KEY, '[]');
    }
    // force l’affichage du compteur (sera 0 juste après le set([]))
    if (typeof window.updateCartBubble === 'function') {
      window.updateCartBubble([]);
    }
  });
})();


// --- Panier minimal global (évite le crash si absent) ---
window.cart = JSON.parse(localStorage.getItem('cart') || '[]');

// Animation vers la bulle (facultative si elem pas dispo)
window.flyToCart = function(sourceImgEl){
  if (!sourceImgEl) return; // pas d'image => pas d'anim
  const bubble = document.querySelector('.cart-bubble');
  if (!bubble) return;

  const r1 = sourceImgEl.getBoundingClientRect();
  const r2 = bubble.getBoundingClientRect();

  const ghost = sourceImgEl.cloneNode(true);
  ghost.style.position = 'fixed';
  ghost.style.left = r1.left + 'px';
  ghost.style.top = r1.top + 'px';
  ghost.style.width = sourceImgEl.clientWidth + 'px';
  ghost.style.height = sourceImgEl.clientHeight + 'px';
  ghost.style.transition = 'transform .6s cubic-bezier(.22,.75,.2,1), opacity .6s';
  ghost.style.zIndex = '9999';
  ghost.style.pointerEvents = 'none';
  document.body.appendChild(ghost);

  const tx = r2.left - r1.left;
  const ty = r2.top - r1.top;

  requestAnimationFrame(()=>{
    ghost.style.transform = `translate(${tx}px, ${ty}px) scale(.2)`;
    ghost.style.opacity = '0.3';
  });
  setTimeout(()=> ghost.remove(), 650);
};

document.addEventListener('DOMContentLoaded', updateCartBubble);
// #account-form : ENVOIE seulement à l’inscription
document.getElementById('account-form')?.addEventListener('submit', async (e)=>{
  e.preventDefault();
  const form = e.currentTarget;
  const payload = Object.fromEntries(new FormData(form));
  console.log('[signup] payload', payload);

  try{
    const r = await fetch('/.netlify/functions/signup', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify(payload)
    });
    const txt = await r.text();
    console.log('[signup] resp', txt);
    if(!r.ok) throw new Error(txt);

    // mémoriser le profil pour la commande
    localStorage.setItem('signupProfile', JSON.stringify(payload));

    // fermer le modal d’inscription si Bootstrap
    bootstrap.Modal.getInstance(document.getElementById('account-modal'))?.hide();
  }catch(err){
    alert('Inscription échouée : ' + err.message);
  }
});
// Bouton "Confirmer la commande" : ENVOIE seulement à la commande
document.getElementById('confirmBuyBtn')?.addEventListener('click', async ()=>{
  const profile = JSON.parse(localStorage.getItem('signupProfile') || '{}');
  if(!profile.nom || !profile.telephone || !profile.adresse){
    alert("Veuillez vous inscrire (nom, téléphone, adresse).");
    new bootstrap.Modal(document.getElementById('account-modal')).show();
    return;
  }

  const qty = Math.max(1, parseInt(document.getElementById('qtyInput').value||'1',10));
  const pay = document.querySelector('input[name="pay"]:checked')?.value || 'cod';
  const del = document.getElementById('deliverySelect').value;
  const p   = window.__currentBuy || {};   // rempli par openBuyModal
  const orderId = 'LNJ-' + Date.now().toString().slice(-6);

  const order = {
    __kind:'order',
    orderId,
    payment: pay.toUpperCase() === 'COD' ? 'COD' : 'CARD',
    delivery: del,
    items: [{ id:p.id, name:p.name, qty, price:p.price }],
    total: qty * (p.price || 0),
    client: profile
  };
  console.log('[order] body', order);

  try{
    const r = await fetch('/.netlify/functions/order', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify(order)
    });
    const txt = await r.text();
    console.log('[order] resp', txt);
    if(!r.ok) throw new Error(txt);

    // Ajouter au panier + animation (si tu veux)
    for(let i=0;i<qty;i++) addToCart({ id:p.id, name:p.name, price:p.price, img:p.img });
    if (p.sourceImgEl) flyToCart(p.sourceImgEl);

    bootstrap.Modal.getInstance(document.getElementById('buyNowModal'))?.hide();
    showOrderToast(orderId, pay);
  }catch(err){
    alert('Commande échouée : ' + err.message);
  }
});

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
        to: v => `DA${Math.round(v)}`,
        from: v => Number(String(v).replace(/[^\d.]/g,'')) 
      },{
        to: v => `DA${Math.round(v)}`,
        from: v => Number(String(v).replace(/[^\d.]/g,'')) 
      }],
      pips: { mode: 'positions', values: [0,20,40,60,80,100], density: 4 }
    });
  
    // slider -> inputs + badge
    sliderEl.noUiSlider.on('update', (values) => {
      const [v1, v2] = values.map(v => Math.round(Number(String(v).replace(/[^\d.]/g,''))));
      minIn.value = v1; maxIn.value = v2;
      bMin.textContent = `DA${v1}`; bMax.textContent = `DA${v2}`;
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
  const buyModalEl   = document.getElementById('buyNowModal');
  const buyModal     = buyModalEl ? new bootstrap.Modal(buyModalEl) : null;

  const titleEl = document.getElementById('buyModalTitle');
  const imgEl   = document.getElementById('buyModalImg');
  const priceEl = document.getElementById('buyModalPrice');
  const totalEl = document.getElementById('buyModalTotal');
  const qtyIn   = document.getElementById('qtyInput');
  const qPlus   = document.getElementById('qtyPlus');
  const qMinus  = document.getElementById('qtyMinus');
  const payHint = document.getElementById('payHint');
  const delSel  = document.getElementById('deliverySelect');
  const etaEl   = document.getElementById('deliveryEta');
  const confirm = document.getElementById('confirmBuyBtn');

  let current = { id:'', name:'', price:0, img:'' , sourceImgEl:null };

  function format(n){ return 'DA' + Number(n).toFixed(0); }
  function updateTotal(){
    const q = Math.max(1, parseInt(qtyIn.value||'1',10));
    totalEl.textContent = format(q * current.price);
  }

  // Ouvre le modal avec les données du produit
  document.getElementById('products-grid')?.addEventListener('click', (e)=>{
    const btn = e.target.closest('.btn-buy');
    if(!btn) return;

    const card = btn.closest('.product-card');
    const img  = card?.querySelector('.product-img');

    current = {
      id:    btn.dataset.id,
      name:  btn.dataset.name,
      price: Number(btn.dataset.price||0),
      img:   btn.dataset.img,
      sourceImgEl: img || null
    };

    titleEl.textContent = current.name;
    imgEl.src = current.img;
    priceEl.textContent = format(current.price);
    qtyIn.value = 1;
    updateTotal();
    delSel.value = 'standard';
    etaEl.textContent = 'Estimation : 3-5 jours.';
    payHint.textContent = 'Paiement carte : simulation pour l’instant.';
    buyModal?.show();
  });

  // Qty +/-
  qPlus?.addEventListener('click', ()=>{ qtyIn.value = Number(qtyIn.value||1)+1; updateTotal(); });
  qMinus?.addEventListener('click', ()=>{
    qtyIn.value = Math.max(1, Number(qtyIn.value||1)-1); updateTotal();
  });
  qtyIn?.addEventListener('input', updateTotal);

  // Paiement hint
  document.querySelectorAll('input[name="pay"]').forEach(r=>{
    r.addEventListener('change', ()=>{
      payHint.textContent = r.value === 'cod'
        ? 'Vous payez à la livraison (main à main).'
        : 'Paiement carte : simulation pour l’instant.';
    });
  });

  // Livraison ETA
  delSel?.addEventListener('change', ()=>{
    const opt = delSel.selectedOptions[0];
    etaEl.textContent = 'Estimation : ' + (opt.dataset.days || '');
  });

  // Confirmer = ajoute au panier + animation + fermer
  confirm?.addEventListener('click', ()=>{
    const qty = Math.max(1, parseInt(qtyIn.value||'1',10));
    // Ajoute N fois (ou adapte ta fonction addToCart pour accepter une qty)
    for(let i=0;i<qty;i++){
      addToCart({ id: current.id, name: current.name, price: current.price, img: current.img });
    }
    flyToCart(current.sourceImgEl);
    buyModal?.hide();
  });
});
function openBuyModal(product){
  // remplace les set… actuels par l’usage de product.{id,name,price,img,sourceImgEl}
  current = product;
  // ... remplis titre, image, prix, qty=1, total, etc.
  buyModal?.show();
}

document.addEventListener('DOMContentLoaded', ()=>{
  const shopLink = document.getElementById('nav-shop');

  // Si déjà vu, on coupe le brillant
  if (localStorage.getItem('shop_seen') === '1'){
    shopLink?.classList.add('cta-seen');
  }

  // Au clic, affiche la section shop + mémorise
  shopLink?.addEventListener('click', (e)=>{
    e.preventDefault();
    // ta fonction existante :
    showSection('shop-section');     // n’affiche que la section Shop

    localStorage.setItem('shop_seen','1');
    shopLink.classList.add('cta-seen');
  });
});

document.addEventListener('DOMContentLoaded', () => {
  // Ouvrir/fermer la recherche
  const overlay = document.getElementById('searchOverlay');
  document.getElementById('openSearch')?.addEventListener('click', () => {
    overlay.classList.add('show');
    setTimeout(()=> document.getElementById('mobileSearchInput')?.focus(), 50);
  });
  document.getElementById('closeSearch')?.addEventListener('click', () => {
    overlay.classList.remove('show');
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') overlay.classList.remove('show');
  });

  // Liens Accueil / Shop (réutilise ta logique SPA)
  const hideOffcanvas = () => {
    const oc = document.getElementById('mobileMenu');
    bootstrap.Offcanvas.getInstance(oc)?.hide();
  };
  document.getElementById('mobile-home')?.addEventListener('click', (e)=>{
    e.preventDefault(); hideOffcanvas();
    showSection('hero'); window.scrollTo({top:0, behavior:'smooth'});
  });
  document.getElementById('mobile-shop')?.addEventListener('click', (e)=>{
    e.preventDefault(); hideOffcanvas();
    showSection('shop-section'); window.scrollTo({top:0, behavior:'smooth'});
  });
});




// -------- Helpers blindés --------
function revealDeep(root){
  if(!root) return;
  // enlève TOUS les verrous sur root + ses DESCENDANTS
  const nodes = [root, ...root.querySelectorAll('*')];
  nodes.forEach(el=>{
    el.removeAttribute('hidden');
    el.classList.remove('d-none','is-hidden','hidden');
    if (el.style && el.style.display === 'none') el.style.removeProperty('display');
    el.setAttribute('aria-hidden','false');
  });
}
function hideRoot(root){
  if(!root) return;
  // ne cache que la racine (suffit)
  root.setAttribute('hidden','');
  root.classList.add('d-none','is-hidden');
  root.style.display = 'none';
  root.setAttribute('aria-hidden','true');
}

function goHome(){
  // cache SHOP
  document.querySelectorAll('[data-page="shop"]').forEach(hideRoot);
  // révèle HOME en profondeur
  document.querySelectorAll('[data-page="home"]').forEach(revealDeep);
  window.scrollTo({top:0, behavior:'smooth'});
}
function goShop(){
  document.querySelectorAll('[data-page="home"]').forEach(hideRoot);
  document.querySelectorAll('[data-page="shop"]').forEach(revealDeep);
  window.scrollTo({top:0, behavior:'smooth'});
}

// -------- Branches (desktop + mobile) --------
document.addEventListener('DOMContentLoaded', () => {
  // Au chargement : Accueil complet
  goHome();

  document.getElementById('nav-accueil')?.addEventListener('click', e => { e.preventDefault(); goHome(); });
  document.getElementById('nav-shop')?.addEventListener('click', e => { e.preventDefault(); goShop(); });

  document.getElementById('mobile-home')?.addEventListener('click', e => {
    e.preventDefault(); goHome();
    const oc = document.getElementById('mobileMenu');
    if (oc) bootstrap.Offcanvas.getInstance(oc)?.hide();
  });
  document.getElementById('mobile-shop')?.addEventListener('click', e => {
    e.preventDefault(); goShop();
    const oc = document.getElementById('mobileMenu');
    if (oc) bootstrap.Offcanvas.getInstance(oc)?.hide();
  });
});

document.addEventListener('click', (e)=>{
  const chipLink = e.target.closest('.type-filter a.chip[href]');
  if (chipLink) e.preventDefault();
});

document.getElementById('cta-parures')?.addEventListener('click', (e)=>{
  e.preventDefault();
  // Affiche l'écran Shop (ta fonction existante)
  if (typeof goShop === 'function') goShop();

  // Si tu as le système d’événement de filtres :
  document.dispatchEvent(new CustomEvent('filters:change', { detail:{ types: ['set'] } }));

  document.getElementById('shop-section')?.scrollIntoView({behavior:'smooth'});
});


// --- ouverture robuste du modal ---
function openBuyModal(p){
  // éléments du modal
  const mEl = document.getElementById('buyNowModal');
  if (!mEl) return console.warn('Modal #buyNowModal introuvable');
  // Instance Bootstrap (crée-la si besoin)
  const modal = bootstrap.Modal.getOrCreateInstance(mEl);

  // Remplir le contenu
  document.getElementById('buyModalTitle').textContent = p.name || '';
  document.getElementById('buyModalImg').src = p.img || '';
  document.getElementById('buyModalPrice').textContent = 'DA' + (p.price || 0);
  const qtyIn = document.getElementById('qtyInput');
  qtyIn.value = 1;
  // total
  const updateTotal = () => {
    const q = Math.max(1, parseInt(qtyIn.value||'1', 10));
    document.getElementById('buyModalTotal').textContent = 'DA' + (q * (p.price||0));
  };
  qtyIn.oninput = updateTotal; updateTotal();

  // montrer le modal
  modal.show();

  // mémoriser l’image source pour l’animation après confirmation
  window.__currentBuy = { ...p };
}

// --- écouteur global pour tous les .btn-buy de la page ---
document.addEventListener('click', (e) => {
  const btn = e.target.closest('.btn-buy');
  if (!btn) return;

  e.preventDefault();

  const card = btn.closest('.product-card');
  const img  = card?.querySelector('.product-img, img');

  const product = {
    id:    btn.dataset.id || '',
    name:  btn.dataset.name || card?.querySelector('.product-title')?.textContent?.trim() || '',
    price: Number(btn.dataset.price || 0),
    img:   btn.dataset.img || img?.getAttribute('src') || '',
    sourceImgEl: img || null
  };

  openBuyModal(product);
});

// --- confirmer la commande (ajout panier + animation + fermer) ---
document.getElementById('confirmBuyBtn')?.addEventListener('click', () => {
  const q = Math.max(1, parseInt(document.getElementById('qtyInput').value||'1', 10));
  const p = window.__currentBuy || {};
  for (let i=0; i<q; i++){
    addToCart({ id:p.id, name:p.name, price:p.price, img:p.img });
  }
  if (p.sourceImgEl) flyToCart(p.sourceImgEl);
  bootstrap.Modal.getInstance(document.getElementById('buyNowModal'))?.hide();
});

document.getElementById('confirmBuyBtn')?.addEventListener('click', async () => {
  const qty = Math.max(1, parseInt(document.getElementById('qtyInput').value||'1',10));
  const pay = document.querySelector('input[name="pay"]:checked')?.value || 'card';
  const del = document.getElementById('deliverySelect').value;

  // récupère le client
  const client = JSON.parse(localStorage.getItem('signupProfile') || '{}');
  if (!client?.nom || !client?.telephone || !client?.adresse) {
    // si pas d'info → rouvrir le modal d'inscription
    const accModal = new bootstrap.Modal(document.getElementById('account-modal'));
    accModal.show();
    return;
  }

  // produit courant (déjà mémorisé lors de openBuyModal)
  const p = window.__currentBuy || {};
  const orderId = 'LNJ-' + Date.now().toString().slice(-6); // simple ID

  const order = {
    orderId,
    payment: pay === 'cod' ? 'COD' : 'CARD',
    delivery: del,
    items: [{ id: p.id, name: p.name, qty, price: p.price }],
    total: qty * (p.price || 0),
    client
  };

  try{
    // 1) enregistre dans Sheets via Netlify Function
    const r = await fetch('/.netlify/functions/order', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify(order)
    });
    if (!r.ok) throw new Error(await r.text());

    // 2) ajoute au panier local (facultatif si tu veux) + animation
    for(let i=0;i<qty;i++){
      addToCart({ id:p.id, name:p.name, price:p.price, img:p.img });
    }
    if (p.sourceImgEl) flyToCart(p.sourceImgEl);

    // 3) ferme le modal achat
    bootstrap.Modal.getInstance(document.getElementById('buyNowModal'))?.hide();

    // 4) toast de confirmation
    showOrderToast(orderId, pay);

  }catch(err){
    alert('Commande non enregistrée : ' + err.message);
    console.error(err);
  }
});

function showOrderToast(orderId, pay){
  const body = document.getElementById('orderToastBody');
  body.innerHTML = (pay === 'cod')
    ? `Votre commande <b>${orderId}</b> est enregistrée.<br>Paiement <b>à la livraison</b>. Vous recevrez une confirmation sous peu.`
    : `Votre commande <b>${orderId}</b> est enregistrée.`;

  const t = new bootstrap.Toast(document.getElementById('orderToast'), { delay: 4500 });
  t.show();
}

function money(n){ return Math.round(Number(n||0)) + ' DA'; }


/* === LNJ — Compteur bulle panier 100% passif (n'affecte pas l'animation) === */
(function () {
  const KEY = 'cart';
  const BUBBLE_SEL = '.cart-count';

  function getCart() {
    try { return JSON.parse(localStorage.getItem(KEY) || '[]'); }
    catch { return []; }
  }
  function computeCount(c) {
    return (c || []).reduce((s, i) => s + (parseInt(i?.qty || 1, 10) || 1), 0);
  }
  function updateBubble() {
    const el = document.querySelector(BUBBLE_SEL);
    if (!el) return;
    el.textContent = String(computeCount(getCart()));
  }

  // 0 au chargement, puis synchro avec localStorage
  document.addEventListener('DOMContentLoaded', () => {
    const el = document.querySelector(BUBBLE_SEL);
    if (el) el.textContent = '0';
    updateBubble();
  });

  // Patch non intrusif: on observe quand 'cart' est écrit
  const _setItem = localStorage.setItem.bind(localStorage);
  localStorage.setItem = function (k, v) {
    _setItem(k, v);
    if (k === KEY) document.dispatchEvent(new Event('cart:updated'));
  };

  // Mises à jour: onglet courant + autres onglets
  document.addEventListener('cart:updated', updateBubble);
  window.addEventListener('storage', (e) => {
    if (e.key === KEY) updateBubble();
  });

  // Expose au besoin
  window.LNJ_updateCartBubble = updateBubble;
})();












/* =========================================================
   LUNEOR SHOP FILTERS — PRÊT À COLLER
   - Recherche texte
   - Types (chips) SÉLECTION EXCLUSIVE (1 actif max)
   - Métal (radio) exclusif
   - Prix min/max + presets
   - Reset global
   - Masque la colonne Bootstrap parente d'une .product-card
   ========================================================= */

   (() => {
    'use strict';
  
    /* ---------- CONFIG ---------- */
    const CONFIG = {
      sidebar:        '.shop-sidebar',
      productCard:    '.product-card',
      productTitle:   '.product-title',
      productPriceEl: '.price',
      gridWrapperSel: '[class*="col-"]',
  
      // Recherche
      searchInput:    '.filter-search input[type="text"]',
  
      // Types (chips)
      typeChipGroup:  '.chip-group',
      typeChip:       '.chip[data-type]',
      typeResetBtn:   '.chip-reset',
  
      // Métal (radios)
      metalRadios:    'input[name="metal"]',
  
      // Prix
      minInput:       '#price-min-input',
      maxInput:       '#price-max-input',
      priceBadgeMin:  '#price-badge-min',
      priceBadgeMax:  '#price-badge-max',
      pricePresets:   '.price-presets [data-range]',
      priceSlider:    '#price-slider', // optionnel: noUiSlider
  
      // Reset global
      resetBtn:       '.btn-reset',
  
      // Valeurs par défaut prix
      PRICE_MIN_DEFAULT: 0,
      PRICE_MAX_DEFAULT: 5000
    };
  
    /* ---------- STATE ---------- */
    const STATE = {
      search: '',
      types: new Set(),      // ex: ring, necklace, earring, bracelet, anklet, set
      metal: null,           // 'gold' | 'silver' | null
      priceMin: 0,
      priceMax: Infinity
    };
  
    /* ---------- UTILS ---------- */
    const $  = (root, sel) => root?.querySelector(sel) || null;
    const $$ = (root, sel) => Array.from(root?.querySelectorAll(sel) || []);
    const clamp = (n, lo, hi) => Math.min(Math.max(n, lo), hi);
  
    const toNumber = (str) => {
      if (typeof str !== 'string') return NaN;
      const cleaned = str.replace(/[^\d.,]/g, '').replace(',', '.');
      return parseFloat(cleaned);
    };
  
    const DA = (n) => (isFinite(n) ? `${n}DA` : '');
  
    const debounce = (fn, delay = 200) => {
      let t;
      return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), delay); };
    };
  
    const getWrapper = (card) => card.closest(CONFIG.gridWrapperSel) || card;
  
    const getPrice = (card, selectors) => {
      // 1) data-price sur la carte
      const dp = card.getAttribute('data-price');
      if (dp && !isNaN(parseFloat(dp))) return parseFloat(dp);
  
      // 2) élément prix textuel (ex: "1200DA")
      const priceEl = card.querySelector(selectors.productPriceEl);
      if (priceEl) {
        const n = toNumber(priceEl.textContent || '');
        if (!isNaN(n)) return n;
      }
  
      // 3) inner [data-price] (ex: bouton)
      const inner = card.querySelector('[data-price]');
      if (inner) {
        const n = parseFloat(inner.getAttribute('data-price') || '');
        if (!isNaN(n)) return n;
      }
  
      return NaN;
    };
  
    /* ---------- CORE ---------- */
    function applyFilters(dom) {
      const products = dom.products;
      const searchTerm = STATE.search.trim().toLowerCase();
      const hasType = STATE.types.size > 0;
      const hasMetal = !!STATE.metal;
      const min = isFinite(STATE.priceMin) ? STATE.priceMin : -Infinity;
      const max = isFinite(STATE.priceMax) ? STATE.priceMax : Infinity;
  
      products.forEach(card => {
        const type  = (card.dataset.type  || '').toLowerCase();
        const metal = (card.dataset.metal || '').toLowerCase();
        const title = (card.querySelector(dom.selectors.productTitle)?.textContent || '').toLowerCase();
        const price = getPrice(card, dom.selectors);
  
        const matchType   = !hasType  || STATE.types.has(type);
        const matchMetal  = !hasMetal || (metal === STATE.metal);
        const matchSearch = !searchTerm || title.includes(searchTerm) || type.includes(searchTerm) || metal.includes(searchTerm);
        const matchPrice  = isNaN(price) ? true : (price >= min && price <= max);
  
        const visible = matchType && matchMetal && matchSearch && matchPrice;
        getWrapper(card).style.display = visible ? '' : 'none';
      });
    }
  
    function updatePriceBadges(dom) {
      if (dom.badgeMin) dom.badgeMin.textContent = isFinite(STATE.priceMin) ? STATE.priceMin : CONFIG.PRICE_MIN_DEFAULT;
      if (dom.badgeMax) dom.badgeMax.textContent = isFinite(STATE.priceMax) ? DA(STATE.priceMax) : DA(CONFIG.PRICE_MAX_DEFAULT);
    }
  
    function normalizePrice(dom) {
      let minVal = toNumber(dom.minInput?.value || '');
      let maxVal = toNumber(dom.maxInput?.value || '');
      if (!isFinite(minVal)) minVal = CONFIG.PRICE_MIN_DEFAULT;
      if (!isFinite(maxVal)) maxVal = CONFIG.PRICE_MAX_DEFAULT;
      if (minVal > maxVal) [minVal, maxVal] = [maxVal, minVal];
  
      // Arrondis doux si slider
      minVal = Math.round(minVal);
      maxVal = Math.round(maxVal);
  
      STATE.priceMin = clamp(minVal, CONFIG.PRICE_MIN_DEFAULT, CONFIG.PRICE_MAX_DEFAULT);
      STATE.priceMax = clamp(maxVal, CONFIG.PRICE_MIN_DEFAULT, CONFIG.PRICE_MAX_DEFAULT);
      updatePriceBadges(dom);
    }
  
    /* ---------- EVENTS ---------- */
    function bindEvents(dom) {
      // Recherche
      dom.searchInput?.addEventListener('input', debounce((e) => {
        STATE.search = String(e.target.value || '');
        applyFilters(dom);
      }, 250));
  
      // Types (chips) — SÉLECTION EXCLUSIVE (1 seul actif)
      dom.chips.forEach(btn => {
        btn.addEventListener('click', () => {
          const t = (btn.getAttribute('data-type') || '').toLowerCase();
          const isActive = btn.getAttribute('aria-pressed') === 'true';
  
          // Réinitialise tous les chips
          STATE.types.clear();
          dom.chips.forEach(b => {
            b.setAttribute('aria-pressed', 'false');
            b.classList.remove('is-active');
          });
  
          // Si le chip cliqué n'était pas actif, on l'active (sinon on laisse tout désélectionné)
          if (!isActive) {
            STATE.types.add(t);
            btn.setAttribute('aria-pressed', 'true');
            btn.classList.add('is-active');
          }
  
          applyFilters(dom);
        });
      });
  
      // Reset des types (désactive tout)
      dom.chipReset?.addEventListener('click', () => {
        STATE.types.clear();
        dom.chips.forEach(b => { b.setAttribute('aria-pressed', 'false'); b.classList.remove('is-active'); });
        applyFilters(dom);
      });
  
      // Métal (radios)
      dom.metalRadios.forEach(r => {
        r.addEventListener('change', () => {
          const checked = dom.metalRadios.find(m => m.checked);
          STATE.metal = checked ? (checked.value || '').toLowerCase() : null;
          applyFilters(dom);
        });
      });
  
      // Prix (inputs)
      dom.minInput?.addEventListener('input', () => { normalizePrice(dom); applyFilters(dom); });
      dom.maxInput?.addEventListener('input', () => { normalizePrice(dom); applyFilters(dom); });
  
      // Prix (presets)
      dom.presetButtons.forEach(btn => {
        btn.addEventListener('click', () => {
          const [a, b] = (btn.getAttribute('data-range') || '').split(',').map(toNumber);
          if (dom.minInput && isFinite(a)) dom.minInput.value = a;
          if (dom.maxInput && isFinite(b)) dom.maxInput.value = b;
          normalizePrice(dom);
          applyFilters(dom);
        });
      });
  
      // Slider (optionnel noUiSlider)
      if (dom.slider && window.noUiSlider) {
        const startMin = isFinite(toNumber(dom.minInput?.value || '')) ? toNumber(dom.minInput.value) : CONFIG.PRICE_MIN_DEFAULT;
        const startMax = isFinite(toNumber(dom.maxInput?.value || '')) ? toNumber(dom.maxInput.value) : CONFIG.PRICE_MAX_DEFAULT;
  
        noUiSlider.create(dom.slider, {
          start: [startMin, startMax],
          connect: true,
          range: { min: CONFIG.PRICE_MIN_DEFAULT, max: CONFIG.PRICE_MAX_DEFAULT },
          step: 5
        });
  
        dom.slider.noUiSlider.on('update', (values) => {
          const [vMin, vMax] = values.map(v => Math.round(parseFloat(v)));
          if (dom.minInput) dom.minInput.value = vMin;
          if (dom.maxInput) dom.maxInput.value = vMax;
          normalizePrice(dom);
          applyFilters(dom);
        });
      }
  
      // Reset global
      dom.resetBtn?.addEventListener('click', () => {
        // Recherche
        if (dom.searchInput) dom.searchInput.value = '';
        STATE.search = '';
  
        // Types
        STATE.types.clear();
        dom.chips.forEach(b => { b.setAttribute('aria-pressed', 'false'); b.classList.remove('is-active'); });
  
        // Métal (décocher tous)
        dom.metalRadios.forEach(r => { r.checked = false; });
        STATE.metal = null;
  
        // Prix
        if (dom.minInput) dom.minInput.value = String(CONFIG.PRICE_MIN_DEFAULT);
        if (dom.maxInput) dom.maxInput.value = String(CONFIG.PRICE_MAX_DEFAULT);
        if (dom.slider?.noUiSlider) dom.slider.noUiSlider.set([CONFIG.PRICE_MIN_DEFAULT, CONFIG.PRICE_MAX_DEFAULT]);
        normalizePrice(dom);
  
        applyFilters(dom);
      });
    }
  
    /* ---------- INIT ---------- */
    function init() {
      const root = document;
      const sidebar = $(root, CONFIG.sidebar);
      if (!sidebar) return;
  
      const dom = {
        selectors: {
          productTitle:   CONFIG.productTitle,
          productPriceEl: CONFIG.productPriceEl
        },
        products:      $$(root, CONFIG.productCard),
        searchInput:   $(sidebar, CONFIG.searchInput),
        chips:         $$(sidebar, CONFIG.typeChip),
        chipReset:     $(sidebar, CONFIG.typeResetBtn),
        metalRadios:   $$(sidebar, CONFIG.metalRadios),
        minInput:      $(sidebar, CONFIG.minInput),
        maxInput:      $(sidebar, CONFIG.maxInput),
        badgeMin:      $(root,   CONFIG.priceBadgeMin),
        badgeMax:      $(root,   CONFIG.priceBadgeMax),
        presetButtons: $$(sidebar, CONFIG.pricePresets),
        slider:        $(root, CONFIG.priceSlider),
        resetBtn:      $(sidebar, CONFIG.resetBtn)
      };
  
      // État initial (respecte ce qui est déjà coché/écrit dans le DOM)
      STATE.search   = String(dom.searchInput?.value || '');
      const checked  = dom.metalRadios.find(m => m.checked);
      STATE.metal    = checked ? (checked.value || '').toLowerCase() : null;
  
      const initMin  = toNumber(dom.minInput?.value || '');
      const initMax  = toNumber(dom.maxInput?.value || '');
      STATE.priceMin = isFinite(initMin) ? initMin : CONFIG.PRICE_MIN_DEFAULT;
      STATE.priceMax = isFinite(initMax) ? initMax : CONFIG.PRICE_MAX_DEFAULT;
  
      // Types init — si plusieurs sont marqués 'aria-pressed=true', on ne garde que le premier (exclusif)
      const pressedChips = dom.chips.filter(b => b.getAttribute('aria-pressed') === 'true');
      if (pressedChips.length > 0) {
        const keep = pressedChips[0];
        dom.chips.forEach(b => {
          const on = (b === keep);
          b.setAttribute('aria-pressed', on ? 'true' : 'false');
          b.classList.toggle('is-active', on);
        });
        const t = (keep.getAttribute('data-type') || '').toLowerCase();
        STATE.types.clear();
        STATE.types.add(t);
      } else {
        STATE.types.clear();
        dom.chips.forEach(b => { b.setAttribute('aria-pressed', 'false'); b.classList.remove('is-active'); });
      }
  
      updatePriceBadges(dom);
      bindEvents(dom);
      applyFilters(dom);
    }
  
    document.addEventListener('DOMContentLoaded', init);
  })();

  


  /* === PRODUCT MODAL JS === */
(() => {
  'use strict';

  const SELECTORS = {
    modal:     '#product-modal',
    image:     '.pm__image',
    title:     '.pm__title',
    desc:      '.pm__desc',
    prev:      '.pm__prev',
    next:      '.pm__next',
    closeAll:  '[data-pm-close]',
    trigger:   '.product-card .product-media img.product-img' // clic sur l'image du produit
  };

  const modal = document.querySelector(SELECTORS.modal);
  if (!modal) return;

  const imgEl   = modal.querySelector(SELECTORS.image);
  const titleEl = modal.querySelector(SELECTORS.title);
  const descEl  = modal.querySelector(SELECTORS.desc);
  const prevBtn = modal.querySelector(SELECTORS.prev);
  const nextBtn = modal.querySelector(SELECTORS.next);

  let gallery = [];
  let index = 0;
  let lastFocus = null;

  const uniq = arr => [...new Set(arr.filter(Boolean))];

  function openModal({ images, title, desc, startIndex = 0 }) {
    gallery = Array.isArray(images) ? images : [];
    index = Math.min(Math.max(parseInt(startIndex, 10) || 0, 0), Math.max(gallery.length - 1, 0));
    updateSlide();
    titleEl.textContent = title || '';
    descEl.textContent  = desc  || '';

    lastFocus = document.activeElement;
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    modal.querySelector(SELECTORS.closeAll)?.focus();
    document.addEventListener('keydown', onKey);
  }

  function closeModal() {
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    document.removeEventListener('keydown', onKey);
    if (lastFocus && typeof lastFocus.focus === 'function') lastFocus.focus();
  }

  function updateSlide() {
    if (!gallery.length) return;
    if (index < 0) index = gallery.length - 1;
    if (index >= gallery.length) index = 0;
    imgEl.src = gallery[index];
    imgEl.alt = `${titleEl.textContent || 'Image'} – ${index + 1}/${gallery.length}`;
  }

  function onKey(e) {
    if (!modal.classList.contains('is-open')) return;
    if (e.key === 'Escape') { e.preventDefault(); closeModal(); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); index--; updateSlide(); }
    if (e.key === 'ArrowRight') { e.preventDefault(); index++; updateSlide(); }
  }

  prevBtn?.addEventListener('click', () => { index--; updateSlide(); });
  nextBtn?.addEventListener('click', () => { index++; updateSlide(); });
  modal.querySelectorAll(SELECTORS.closeAll).forEach(el => el.addEventListener('click', closeModal));

  // Délégation : ouverture au clic sur l'image du produit
  document.addEventListener('click', (e) => {
    const img = e.target.closest(SELECTORS.trigger);
    if (!img) return;

    const card = img.closest('.product-card');
    if (!card) return;

    const primary = img.getAttribute('src') || '';
    const galleryAttr = (card.getAttribute('data-gallery') || '').trim();
    const extra = galleryAttr ? galleryAttr.split(',').map(s => s.trim()) : [];
    const images = uniq([primary, ...extra]);

    const title = (card.querySelector('.product-title')?.textContent || '').trim();
    const desc  = (card.getAttribute('data-desc') || '').trim();

    openModal({ images, title, desc, startIndex: 0 });
  });
})();



/* Ribbon Shop Hint — PERMANENT (mobile only) */
(() => {
  'use strict';

  // S'exécute uniquement sur mobile
  if (!window.matchMedia('(max-width: 768px)').matches) return;

  const bar = document.getElementById('ribbon-shop-hint');
  if (!bar) return;

  // 1) Ne mémorise plus la fermeture : on supprime toute ancienne clé
  try { localStorage.removeItem('ribbonShopHintClosedUntil'); } catch (_) {}

  // 2) Toujours afficher le ruban (sur chaque page)
  bar.style.display = '';

  // 3) Le bouton fermer ne cache que pour la page en cours (aucune mémoire)
  bar.querySelector('.ribbon__close')?.addEventListener('click', () => {
    bar.remove(); // il réapparaîtra au prochain chargement/navigation
  });

  // 4) Option : toucher le ruban (hors bouton) ouvre le menu burger
  bar.addEventListener('click', (e) => {
    if (e.target.closest('.ribbon__close')) return;
    const burger = document.querySelector('#burger, .menu-toggle');
    if (burger) burger.click();
  });
})();






/* =========================================================
   Luneor — CART SAFE (n'interfère pas avec .btn-buy)
   - Bouclier .btn-buy pour bloquer les écouteurs globaux
   - .btn-add : 1 clic = +1 (compatible flyToCart)
   - Confirmer (panier) -> Google Sheet + fermeture offcanvas
   ========================================================= */
   (() => {
    'use strict';
    if (window.__LNR_CART_SAFE__) return; window.__LNR_CART_SAFE__ = true;
  
    /* ---------- CONFIG ---------- */
    // ⬇️ Mets ICI l’URL de ton Web App Google Apps Script (onglet PANIER, pas celui d’Acheter)
    const CART_WEBAPP_URL = 'https://script.google.com/macros/s/VOTRE_WEBAPP_PANIER/exec';
    const DRAWER_ID = 'cartDrawer'; // ton offcanvas
  
    /* ---------- BOUCLIER .btn-buy (PRO) ----------
       Empêche tout écouteur global (document) d’attraper les clics "Acheter".
       Votre propre handler sur .btn-buy continue de fonctionner (phase "target").
    ------------------------------------------------ */
    document.addEventListener('click', (e) => {
      const buy = e.target.closest('.btn-buy');
      if (!buy) return;
      // On laisse le handler attaché directement sur le bouton fonctionner,
      // mais on bloque la propagation vers document (où traînent les vieux listeners).
      e.stopPropagation();
    }, true); // en capture, donc avant les autres
  
    /* ---------- STORAGE HELPERS (clé "cart") ---------- */
    const readCart = () => {
      try { return (typeof window.getCart === 'function') ? window.getCart() : JSON.parse(localStorage.getItem('cart') || '[]'); }
      catch { return []; }
    };
    const writeCart = (arr=[]) => {
      if (typeof window.setCart === 'function') window.setCart(arr);
      else localStorage.setItem('cart', JSON.stringify(arr));
      if (typeof window.updateCartBubble === 'function') window.updateCartBubble(arr);
      else {
        const b = document.querySelector('.cart-count');
        if (b) b.textContent = String(arr.reduce((s,i)=> s + (parseInt(i.qty,10)||1), 0));
      }
    };
    const parsePrice = (txt) => Number(String(txt||'').replace(/[^\d.,]/g,'').replace(',', '.')) || 0;
    const subtotal   = (cart) => cart.reduce((s,i)=> s + (Number(i.price)||0)*(Number(i.qty)||1), 0);
    const makeOrderId = () => {
      const d=new Date(), p=n=>String(n).padStart(2,'0');
      return `LNR-${d.getFullYear()}${p(d.getMonth()+1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}-${Math.floor(Math.random()*9000+1000)}`;
    };
  
    /* ---------- API PUBLIQUE POUR L’ANIMATION ---------- */
    // Ton script flyToCart appelle addToCart → ici on fait l’addition (1 clic = +1)
    window.addToCart = function({ id, name, price, img, qty = 1 }) {
      if (!id) return;
      const cart = readCart();
      const i = cart.findIndex(x => x.id === id);
      if (i >= 0) cart[i].qty = (cart[i].qty||0) + Number(qty)||1;
      else cart.push({ id, name: name||'Produit', price: Number(price)||0, img: img||'', qty: Number(qty)||1 });
      writeCart(cart);
    };
  
    /* ---------- .btn-add SEULEMENT (jamais .btn-buy) ---------- */
    function bindAddButtons(){
      document.querySelectorAll('.btn-add').forEach(btn => {
        if (btn.dataset.lnrBound === '1') return;
        btn.dataset.lnrBound = '1';
  
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          // Si ton script d’animation est là, il va lui-même appeler window.addToCart → ne rien faire ici
          if (window.__flyHooked) return;
  
          const card  = btn.closest('.product-card');
          const id    = (btn.dataset.id || card?.dataset.id || '').trim();
          const name  = (btn.dataset.name || card?.querySelector('.product-title')?.textContent || 'Produit').trim();
          const price = Number(btn.dataset.price)
                     || Number(card?.dataset.price)
                     || parsePrice(card?.querySelector('.price')?.textContent);
          const img   = btn.dataset.img || card?.querySelector('.product-img')?.getAttribute('src') || '';
  
          window.addToCart({ id, name, price, img, qty: 1 });
        });
      });
    }
    // Rebind si contenu dynamique
    const mo = new MutationObserver(() => bindAddButtons());
    mo.observe(document.documentElement, { childList: true, subtree: true });
  
    /* ---------- RENDU OFFCANVAS (à l’ouverture) ---------- */
    function renderCart(){
      const box = document.querySelector('#cartItems');
      const sub = document.querySelector('#cartSubtotal');
      if (!box) return;
      const cart = readCart();
  
      if (!cart.length) {
        box.innerHTML = `<div class="text-muted small">Votre panier est vide.</div>`;
        if (sub) sub.textContent = `0 DA`;
        return;
      }
      box.innerHTML = cart.map(it => `
        <div class="d-flex align-items-start gap-2 border rounded p-2 cart-row" data-id="${it.id}">
          <img src="${it.img||''}" alt="" class="rounded" style="width:64px;height:64px;object-fit:cover">
          <div class="flex-grow-1">
            <div class="fw-semibold small">${it.name||'Produit'}</div>
            <div class="text-muted small">${Number(it.price)||0} DA</div>
            <div class="d-flex align-items-center gap-2 mt-1">
              <button class="btn btn-sm btn-outline-secondary qty-dec" type="button">−</button>
              <input type="number" class="form-control form-control-sm qty-input" min="1" value="${it.qty||1}" style="width:70px">
              <button class="btn btn-sm btn-outline-secondary qty-inc" type="button">+</button>
              <button class="btn btn-sm btn-link text-danger ms-auto remove-item" type="button">Supprimer</button>
            </div>
          </div>
        </div>
      `).join('');
      if (sub) sub.textContent = `${subtotal(cart)} DA`;
    }
    document.getElementById(DRAWER_ID)?.addEventListener('show.bs.offcanvas', renderCart);
  
    /* ---------- ACTIONS DANS LE DRAWER ---------- */
    (function bindDrawer(){
      const drawer = document.getElementById(DRAWER_ID);
      if (!drawer) return;
  
      drawer.addEventListener('click', (e) => {
        const row = e.target.closest('.cart-row'); if (!row) return;
        const id  = row.dataset.id;
        const cart = readCart();
        const it = cart.find(x => x.id === id); if (!it) return;
  
        if (e.target.closest('.qty-dec')) { it.qty = Math.max(1, (it.qty||1) - 1); writeCart(cart); renderCart(); return; }
        if (e.target.closest('.qty-inc')) { it.qty = (it.qty||1) + 1; writeCart(cart); renderCart(); return; }
        if (e.target.closest('.remove-item')) {
          const next = cart.filter(x => x.id !== id); writeCart(next); renderCart(); return;
        }
      });
  
      drawer.addEventListener('input', (e) => {
        const input = e.target.closest('.qty-input'); if (!input) return;
        const row = e.target.closest('.cart-row'); const id = row?.dataset.id;
        const v = Math.max(1, parseInt(input.value,10) || 1);
        const cart = readCart(); const it = cart.find(x => x.id === id); if (!it) return;
        it.qty = v; writeCart(cart); renderCart();
      });
  
      // Vider
      document.getElementById('cartClearBtn')?.addEventListener('click', () => { writeCart([]); renderCart(); });
    })();
  
    /* ---------- CONFIRMER LA COMMANDE (PANIER) ---------- */
    document.getElementById('cartConfirmBtn')?.addEventListener('click', async () => {
      const btn = document.getElementById('cartConfirmBtn');
      const cart = readCart();
      if (!cart.length) { alert('Votre panier est vide.'); return; }
  
      if (btn){ btn.disabled = true; var _t = btn.textContent; btn.textContent = 'Envoi…'; }
  
      const delivery = document.getElementById('cartDeliverySelect')?.value || 'standard';
      const payment  = document.querySelector('input[name="cartPay"]:checked')?.value || 'cod';
  
      const order = {
        orderId: makeOrderId(),
        createdAt: new Date().toISOString(),
        currency: 'DA',
        delivery, payment,
        subtotal: subtotal(cart),
        items: cart.map(({id,name,price,qty,img}) => ({ id, name, price:Number(price)||0, qty:Number(qty)||1, img })),
        userAgent: navigator.userAgent
      };
  
      try {
        const body = new URLSearchParams({ data: JSON.stringify(order) }).toString();
        await fetch(CART_WEBAPP_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
          body
        });
      } catch (err) {
        console.error('[PANIER] Envoi KO:', err);
      }
  
      // Ferme l’offcanvas (animation Bootstrap)
      const el = document.getElementById(DRAWER_ID);
      const BO = window.bootstrap && window.bootstrap.Offcanvas;
      if (el && BO) window.bootstrap.Offcanvas.getOrCreateInstance(el).hide();
      else if (el) { el.classList.remove('show'); el.setAttribute('aria-hidden','true'); }
  
      // Vide le panier (retire cette ligne si tu veux conserver)
      writeCart([]);
  
      if (btn){ btn.disabled = false; btn.textContent = _t; }
      alert('✅ Commande (panier) envoyée !');
    });
  
    /* ---------- INIT ---------- */
    document.addEventListener('DOMContentLoaded', () => {
      writeCart(readCart());   // met à jour la bulle
      bindAddButtons();        // accroche .btn-add
    });
  })();
  