// --- Panier minimal global (évite le crash si absent) ---
window.cart = JSON.parse(localStorage.getItem('cart') || '[]');

function updateCartBubble(){
  const countEl = document.querySelector('.cart-count');
  if (!countEl) return;
  const totalQty = window.cart.reduce((s, i) => s + (i.qty || 1), 0);
  countEl.textContent = String(totalQty);
}
function saveCart(){
  localStorage.setItem('cart', JSON.stringify(window.cart));
  updateCartBubble();
}

// Ajout au panier (global)
window.addToCart = function(item){
  if (!item || !item.id) return;
  const found = window.cart.find(x => x.id === item.id);
  if (found) {
    found.qty = (found.qty || 1) + 1;
  } else {
    window.cart.push({ ...item, qty: 1 });
  }
  saveCart();
};

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

 // remplace l'ancien grid?.addEventListener('click', ...)
document.addEventListener('click', (e) => {
  // BUY
  const buyBtn = e.target.closest('.btn-buy');
  if (buyBtn) {
    const card = buyBtn.closest('.product-card');
    const img  = card?.querySelector('.product-img, img');
    openBuyModal({
      id: buyBtn.dataset.id,
      name: buyBtn.dataset.name,
      price: Number(buyBtn.dataset.price || 0),
      img: buyBtn.dataset.img,
      sourceImgEl: img || null
    });
    return;
  }

  // ADD
  const addBtn = e.target.closest('.btn-add');
  if (addBtn) {
    const card = addBtn.closest('.product-card');
    const img  = card?.querySelector('.product-img, img');
    addToCart({
      id: addBtn.dataset.id,
      name: addBtn.dataset.name,
      price: Number(addBtn.dataset.price || 0),
      img: addBtn.dataset.img
    });
    flyToCart(img);
  }
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

// après succès d'inscription
localStorage.setItem('signupProfile', JSON.stringify({
  nom: payload.nom, prenom: payload.prenom, email: payload.email,
  telephone: payload.telephone, adresse: payload.adresse
}));

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


/* ================== PANIER — BLOC COMPLET, AUTONOME ================== */
(function(){
  const CURRENCY = 'DA';
  const money    = n => Math.round(Number(n||0)) + ' ' + CURRENCY;
  const toNumber = x => {
    const num = String(x||'').replace(/\s/g,'').replace(/[^0-9.,-]/g,'').replace(',', '.');
    const n = parseFloat(num);
    return isNaN(n) ? 0 : n;
  };

  // --- Storage helpers ---
  function getCart(){ try{ return JSON.parse(localStorage.getItem('cart')||'[]'); }catch(_){ return []; } }
  function setCart(arr){ localStorage.setItem('cart', JSON.stringify(arr)); updateCartBubble(arr); }
  function updateCartBubble(cart){
    cart = cart || getCart();
    const el = document.querySelector('.cart-count');
    if (el){
      const n = cart.reduce((s,i)=> s + (i.qty||1), 0);
      el.textContent = String(n);
    }
  }
  updateCartBubble();

  // --- Ajouter au panier (delegation globale) ---
  document.addEventListener('click', (e)=>{
    const btn = e.target.closest('.btn-add'); if (!btn) return;
    e.preventDefault();

    const card = btn.closest('.product-card');
    const imgEl= card?.querySelector('.product-img, img');
    const priceText = btn.dataset.price || card?.querySelector('.price, .price-chip')?.textContent;
    const item = {
      id:   btn.dataset.id   || card?.dataset.id || 'ID-'+Date.now(),
      name: btn.dataset.name || card?.querySelector('.product-title')?.textContent?.trim() || 'Article',
      price: toNumber(priceText),
      img:  btn.dataset.img  || imgEl?.src || '',
      qty:  1
    };

    const cart = getCart();
    const found = cart.find(x => x.id === item.id);
    if (found) found.qty = (found.qty||1)+1; else cart.push(item);
    setCart(cart);

    // Anim facultative si tu l'as
    if (typeof flyToCart === 'function' && imgEl) flyToCart(imgEl);
  });

  // --- Ouvrir le tiroir (contenu rendu à l’ouverture) ---
  const cartDrawerEl = document.getElementById('cartDrawer');
  cartDrawerEl?.addEventListener('show.bs.offcanvas', renderCart);

  function renderCart(){
    const cart = getCart();
    const wrap = document.getElementById('cartItems');
    const subEl= document.getElementById('cartSubtotal');
    if (!wrap) return;

    if (!cart.length){
      wrap.innerHTML = '<div class="text-center text-muted">Votre panier est vide.</div>';
      if (subEl) subEl.textContent = money(0);
      document.getElementById('cartConfirmBtn')?.setAttribute('disabled','disabled');
      document.getElementById('cartClearBtn')?.setAttribute('disabled','disabled');
      return;
    }
    document.getElementById('cartConfirmBtn')?.removeAttribute('disabled');
    document.getElementById('cartClearBtn')?.removeAttribute('disabled');

    let sub = 0;
    wrap.innerHTML = cart.map((it, idx)=>{
      const line = (Number(it.price||0) * Number(it.qty||1)); sub += line;
      return `
        <div class="cart-row" data-idx="${idx}">
          <img src="${it.img||''}" alt="">
          <div>
            <p class="cart-title">${(it.name||'')}</p>
            <div class="cart-meta">Ref: ${it.id||''}</div>
            <div class="cart-controls mt-1">
              <button class="btn btn-sm btn-outline-dark qty-minus" type="button">−</button>
              <input class="form-control form-control-sm cart-qty" type="number" min="1" value="${it.qty||1}">
              <button class="btn btn-sm btn-outline-dark qty-plus" type="button">+</button>
              <button class="cart-remove ms-2" title="Supprimer" aria-label="Supprimer l’article">✕</button>
            </div>
          </div>
          <div class="cart-price">${money(line)}</div>
        </div>`;
    }).join('');
    if (subEl) subEl.textContent = money(sub);
  }

  // --- + / − / supprimer / saisie directe ---
  document.getElementById('cartItems')?.addEventListener('click', (e)=>{
    const row = e.target.closest('.cart-row'); if (!row) return;
    const idx = Number(row.dataset.idx||-1); const cart = getCart(); if (idx<0 || !cart[idx]) return;

    if (e.target.classList.contains('qty-minus')){ cart[idx].qty = Math.max(1,(cart[idx].qty||1)-1); setCart(cart); renderCart(); }
    if (e.target.classList.contains('qty-plus')) { cart[idx].qty = (cart[idx].qty||1)+1; setCart(cart); renderCart(); }
    if (e.target.classList.contains('cart-remove')){ cart.splice(idx,1); setCart(cart); renderCart(); }
  });
  document.getElementById('cartItems')?.addEventListener('input', (e)=>{
    if (!e.target.classList.contains('cart-qty')) return;
    const row = e.target.closest('.cart-row'); const idx = Number(row.dataset.idx||-1);
    const cart = getCart(); if (idx<0 || !cart[idx]) return;
    const q = Math.max(1, parseInt(e.target.value||'1',10));
    cart[idx].qty = q; setCart(cart); renderCart();
  });

  // --- Vider ---
  document.getElementById('cartClearBtn')?.addEventListener('click', ()=>{
    if (!confirm('Vider le panier ?')) return;
    setCart([]); renderCart();
  });

  // --- Compteur à l’ouverture de page ---
  document.addEventListener('DOMContentLoaded', updateCartBubble);
})();


// 1) Simule 1 article pour voir l'affichage
localStorage.setItem('cart', JSON.stringify([{id:'TEST1', name:'Parure Test', price:1990, qty:1, img:''}]));
// 2) Clique la bulle : tu dois voir "Parure Test" + sous-total 1990 DA



