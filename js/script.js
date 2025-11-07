// === LIVRAISON (mobile only) ===============================================
document.addEventListener('DOMContentLoaded', () => {
  const links = document.querySelectorAll('.link-livraison'); // menu mobile
  const isMobile = () => window.matchMedia('(max-width: 991.98px)').matches; // ~breakpoint Bootstrap lg

  const closeOffcanvas = () => {
    const oc = document.getElementById('mobileMenu');
    if (!oc || !window.bootstrap) return;
    const inst = bootstrap.Offcanvas.getInstance(oc) || new bootstrap.Offcanvas(oc);
    inst.hide();
  };

  const showOnlyLivraisonMobile = (e) => {
    if (!isMobile()) return;         // sur desktop : on laisse le lien #livraison normal
    e.preventDefault();              // empêche le jump
    // cache toutes les sections SPA
    document.querySelectorAll('.page-section').forEach(sec => {
      sec.classList.add('hidden');
      sec.setAttribute('aria-hidden', 'true');
    });
    // affiche la section livraison
    const liv = document.getElementById('livraison');
    if (liv) {
      liv.classList.remove('hidden');
      liv.setAttribute('aria-hidden', 'false');
    }
    closeOffcanvas();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  links.forEach(a => a.addEventListener('click', showOnlyLivraisonMobile));
});



/* === Animation + compteur pour .btn-add (mobile-safe) === */
(function () {
  if (window.__flyHooked) return;
  window.__flyHooked = true;

  // ---------- Utils ----------
  const $  = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));
  const STORAGE_KEY = 'cart';

  function visible(el){
    if (!el) return false;
    const r = el.getBoundingClientRect();
    const style = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
  }

  // Choisit la bonne bulle:
  // 1) si le bouton fournit data-cart-target on l'utilise,
  // 2) sinon on prend la bulle visible (ex: header sticky en mobile).
  function pickCartBubble(btn){
    const sel = btn?.dataset?.cartTarget;
    if (sel) return $(sel);
    const candidates = $$('.cart-bubble, #cart-bubble, [data-cart-bubble="1"]');
    return candidates.find(visible) || candidates[0] || null;
  }

  // ---------- Animation ----------
  function flyToCart(sourceImgEl, bubbleEl) {
    if (!sourceImgEl || !bubbleEl) return;

    const r1 = sourceImgEl.getBoundingClientRect();
    const r2 = bubbleEl.getBoundingClientRect();

    const ghost = sourceImgEl.cloneNode(true);
    Object.assign(ghost.style, {
      position: 'fixed',
      left: r1.left + 'px',
      top:  r1.top  + 'px',
      width:  r1.width + 'px',
      height: r1.height + 'px',
      borderRadius: '12px',
      transition: 'transform .55s cubic-bezier(.22,.75,.2,1), opacity .55s',
      zIndex: '9999',
      pointerEvents: 'none',
      margin: 0,
      transform: 'translate3d(0,0,0)',
      opacity: '1'
    });
    document.body.appendChild(ghost);

    const tx = (r2.left + r2.width/2) - (r1.left + r1.width/2);
    const ty = (r2.top  + r2.height/2) - (r1.top  + r1.height/2);
    const scale = Math.max(0.18, Math.min(0.4, r2.width / Math.max(r1.width, 1)));

    requestAnimationFrame(() => {
      ghost.style.transform = `translate3d(${tx}px, ${ty}px, 0) scale(${scale})`;
      ghost.style.opacity = '0.35';
    });

    ghost.addEventListener('transitionend', () => ghost.remove(), { once: true });
  }

  // ---------- Compteur / Bulle ----------
  function readCart(){
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
    catch { return []; }
  }
  function writeCart(arr){
    localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
    document.dispatchEvent(new CustomEvent('cart:updated')); // notifie la bulle
  }
  function bumpItem({id, name, price, img, qty=1}){
    const cart = readCart();
    const it = cart.find(x => x.id === id);
    if (it) it.qty = (it.qty || 1) + qty;
    else cart.push({ id, name, price, img, qty });
    writeCart(cart);
  }
  function totalQty(){
    return readCart().reduce((s, x) => s + (x.qty||0), 0);
  }
  // remplace pickCartBubble + renderBadge par ceci

function pickCartBubble(btn){
  const sel = btn?.dataset?.cartTarget;
  if (sel) return document.querySelector(sel);
  const list = Array.from(document.querySelectorAll('[data-cart-bubble="1"], .cart-bubble, #cart-bubble'));
  // on prend la bulle visible
  return list.find(el => {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return r.width>0 && r.height>0 && cs.display!=='none' && cs.visibility!=='hidden';
  }) || list[0] || null;
}

function renderBadge(){
  // 1) On trouve la bulle
  const bubble = pickCartBubble(document.body);
  if (!bubble) return;

  // 2) On trouve UNIQUEMENT l’élément compteur
  const countEl = bubble.querySelector('[data-cart-count], #cartBadge, .badge');
  if (!countEl) return; // on ne touche jamais au conteneur/icone

  const n = totalQty();
  countEl.textContent = n;

  // Montrer/cacher juste le COMPTEUR (pas le conteneur du panier)
  if (n <= 0) {
    countEl.style.display = 'none';
  } else {
    countEl.style.display = '';
  }
}

  document.addEventListener('cart:updated', renderBadge);
  window.addEventListener('storage', e => { if (e.key === STORAGE_KEY) renderBadge(); });
  document.addEventListener('DOMContentLoaded', renderBadge, { once:true });

  // ---------- Listener global (anti double-tap) ----------
  document.addEventListener('pointerup', (e) => {
    const addBtn = e.target.closest('.btn-add');
    if (!addBtn) return;

    // Anti double tap iOS
    if (e.pointerType === 'touch') {
      if (addBtn.dataset.busy === '1') return;
      addBtn.dataset.busy = '1';
      setTimeout(() => delete addBtn.dataset.busy, 300);
    }

    // Image source pour l'anim
    const card  = addBtn.closest('.product-card');
    const imgEl = (addBtn.dataset.flyImg && $(addBtn.dataset.flyImg)) || card?.querySelector('.product-img, img');
    const bubbleEl = pickCartBubble(addBtn);

    // Ajout au panier : on respecte ta fonction si elle existe
    if (typeof window.addToCart === 'function') {
      window.addToCart({
        id: addBtn.dataset.id,
        name: addBtn.dataset.name,
        price: Number(addBtn.dataset.price || 0),
        img: addBtn.dataset.img || (imgEl?.getAttribute('src') || ''),
        qty: Number(addBtn.dataset.qty || 1)
      });
      // Si addToCart ne déclenche pas 'cart:updated', on peut forcer:
      document.dispatchEvent(new CustomEvent('cart:updated'));
    } else {
      bumpItem({
        id: addBtn.dataset.id,
        name: addBtn.dataset.name,
        price: Number(addBtn.dataset.price || 0),
        img: addBtn.dataset.img || (imgEl?.getAttribute('src') || ''),
        qty: Number(addBtn.dataset.qty || 1)
      });
    }

    // Animation
    flyToCart(imgEl, bubbleEl);
  }, { passive:true });

  // Petit style recommandé:
  // .btn-add{ touch-action: manipulation; }
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
      headers:{'Content-Type':'text/plain;charset=utf-8'},
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

function doGet(e){
  const r = e.parameter?.r || '';
  if (r === 'return') {
    // Page de remerciement simple (le front pourra rediriger ici)
    const orderId = e.parameter?.orderId || '';
    const html = HtmlService.createHtmlOutput(
      `<meta charset="utf-8">
       <style>body{font-family:sans-serif;padding:24px}</style>
       <h2>Merci !</h2>
       <p>Numéro de commande: <b>${orderId}</b></p>
       <p>Nous vérifions votre paiement…</p>
       <script>
         // Ping le backend pour l'état
         fetch('${webAppBase()}',{method:'POST',headers:{'Content-Type':'application/json'},
           body: JSON.stringify({__kind:'pay_status', orderId:'${orderId}'})
         }).then(r=>r.json()).then(d=>{
           document.body.insertAdjacentHTML('beforeend',
             '<p>Statut: <b>'+ (d.status||'inconnu') +'</b></p>');
         }).catch(()=>{});
       </script>`
    );
    return html;
  }
  if (r === 'notify') {
    // Dans la vraie intégration, le PSP enverra un POST signé.
    // Ici on accepte aussi GET pour la démonstration.
    return payNotify_(e);
  }
  return ContentService.createTextOutput(JSON.stringify({ok:true,note:'POST uniquement'}))
        .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e){
  try{
    const data  = parseBody(e);
    const book  = SpreadsheetApp.openById(SHEET_ID);
    const agent = e?.headers?.['user-agent'] || '';

    // 1) Création / MAJ commande (ton code)
    if (data.__kind === 'order'){
      const sh = book.getSheetByName(SHEET_ORDERS);
      if (!sh) throw new Error('Onglet introuvable: ' + SHEET_ORDERS);
      const orderId = data.orderId || Utilities.getUuid();

      // anti-doublon runtime (60s)
      const cache = CacheService.getScriptCache();
      const ckey = 'order:' + orderId;
      if (cache.get(ckey)) {
        return ContentService.createTextOutput(JSON.stringify({ ok:true, kind:'order', orderId }))
          .setMimeType(ContentService.MimeType.JSON);
      }
      cache.put(ckey, '1', 60);

      const rowVals = [
        new Date(), orderId,
        data.client?.nom || '', data.client?.prenom || '', data.client?.email || '',
        data.client?.telephone || '', data.client?.adresse || '',
        data.payment || '', data.delivery || '',
        JSON.stringify(data.items || []), Number(data.total || 0),
        'Nouveau', agent
      ];
      // upsert par orderId (col B)
      const last = sh.getLastRow();
      if (last >= 2) {
        const ids = sh.getRange(2, 2, last - 1, 1).getValues().map(r => r[0]);
        const idx = ids.indexOf(orderId);
        if (idx !== -1) {
          sh.getRange(idx + 2, 1, 1, rowVals.length).setValues([rowVals]);
          return ContentService.createTextOutput(JSON.stringify({ ok:true, kind:'order', orderId, updated:true }))
                               .setMimeType(ContentService.MimeType.JSON);
        }
      }
      sh.appendRow(rowVals);
      return ContentService.createTextOutput(JSON.stringify({ ok:true, kind:'order', orderId, inserted:true }))
                           .setMimeType(ContentService.MimeType.JSON);
    }

    // 2) Démarrer un paiement (front → backend)
    if (data.__kind === 'pay_start') {
      return payStart_(data);
    }

    // 3) Statut de paiement (front “Merci”)
    if (data.__kind === 'pay_status') {
      return payStatus_(data);
    }

    // 4) fallback
    return ContentService.createTextOutput(JSON.stringify({ok:false, error:'__kind inconnu'}))
                         .setMimeType(ContentService.MimeType.JSON);
  }catch(err){
    return ContentService.createTextOutput(JSON.stringify({ok:false, error:String(err)}))
                         .setMimeType(ContentService.MimeType.JSON);
  }
}

accountForm.addEventListener('submit', e => {
  e.preventDefault();
  // transforme le form en query string
  const params = new URLSearchParams(new FormData(e.target)).toString();
  // en GET & no-cors pour ne pas déclencher de preflight
  fetch('https://script.google.com/macros/s/AKfycbzOXpEENB1TmkRu9-BqtcGuxsneUarZF3fIe3H4QkJD3_qfyJ0nk7nBKOfSCa9Vv17T/exec' + params, {
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
      headers:{'Content-Type':'text/plain;charset=utf-8'},
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
   shop.js — Luneor
   - Commande Panier & Achat Direct (envoi WebApp + journal local)
   - Add-to-Cart unifié (clé stable, anti-doublon, rendu)
   - Hover Swap image (utilise la 2ᵉ image de data-gallery)
   ========================================================= */

/* =========================
   [A] UTILITAIRES COMMUNS
   ========================= */  
   (() => {
    'use strict';
  
    const WEBAPP_URL = 'https://script.google.com/macros/s/AKfycbzOXpEENB1TmkRu9-BqtcGuxsneUarZF3fIe3H4QkJD3_qfyJ0nk7nBKOfSCa9Vv17T/exec';
  
    // Storage panier
    const CART_KEY = 'cart';
    const getCart = () => { try { return JSON.parse(localStorage.getItem(CART_KEY) || '[]'); } catch { return []; } };
    const setCart = (list) => localStorage.setItem(CART_KEY, JSON.stringify(list || []));
    const sumCart = (list) => list.reduce((s, i) => s + Number(i.price || 0) * Number(i.qty || 0), 0);
  
    // Profil client
    const getProfile = () => { try { return JSON.parse(localStorage.getItem('signupProfile') || '{}'); } catch { return {}; } };
  
    // Divers
    const uuid = () => (crypto?.randomUUID?.() || String(Date.now()));
    const fmtDA = (n) => `${Number(n || 0).toFixed(2)} DA`;
  
    // POST WebApp
    async function post(payload){
      const res = await fetch(WEBAPP_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // <= SIMPLE
        body: JSON.stringify(payload)
      });
      const text = await res.text();
      let data; try { data = JSON.parse(text); } catch { throw new Error('Réponse non-JSON: '+text); }
      if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText} — ${data?.error||''}`);
      if (!data.ok) throw new Error(data?.error || 'Erreur serveur');
      return data;
    }
    
    
  
    // Expose utilitaires nécessaires aux autres modules via window (minime)
    window.__SHOP = { getCart, setCart, sumCart, getProfile, uuid, post, fmtDA };
  })();
  
  /* ===========================================
     [B] COMMANDES — Panier & Achat (fonctions)
     =========================================== */
 // Confirmer commande depuis le panier
window.__confirmCartOnce = async function (ev) {
  try {
    const btn = document.getElementById('btnConfirmerPanier'); if (!btn) return false;
    if (btn.dataset.lock) return false;
    btn.dataset.lock = '1'; setTimeout(() => delete btn.dataset.lock, 600);

    const items = window.__SHOP.getCart();
    if (!items.length) { alert('Panier vide'); return false; }

    const delivery = document.getElementById('cartDeliverySelect')?.value || 'standard';
    const payVal   = (document.querySelector('input[name="cartPay"]:checked')?.value || 'cod').toLowerCase();
    const payment  = (payVal === 'cod') ? 'COD' : 'CARD';
    const profile  = window.__SHOP.getProfile();

    const orderId = btn.dataset.orderId || (btn.dataset.orderId = window.__SHOP.uuid());
    const payload = {
      __kind:'order',
      orderId,
      client: profile,
      payment,
      delivery,
      items,
      total: window.__SHOP.sumCart(items),
      source:'cart'
    };

    // === SPINNER on ===
    window.__loading && window.__loading.show('Enregistrement de la commande…');
    await new Promise(r => requestAnimationFrame(r));

    const out = await window.__SHOP.post(payload);

    // Cache le spinner avant l’alerte
    window.__loading && window.__loading.hide();

    alert('Commande (panier) ✅ ID: ' + (out.orderId || orderId));
    window.__markOrderOk && window.__markOrderOk('cart', out.orderId || orderId);

    // Journal local
    try {
      const log = JSON.parse(localStorage.getItem('ordersLog') || '[]');
      log.unshift({ orderId: out.orderId || orderId, source: 'cart', ts: Date.now(), total: window.__SHOP.sumCart(items), items });
      localStorage.setItem('ordersLog', JSON.stringify(log.slice(0, 50)));
    } catch {}

    // Reset visuel
    window.__SHOP.setCart([]);
    const box = document.querySelector('#cartItems'); if (box) box.innerHTML = '<div class="text-muted">Panier vide</div>';
    const sub = document.querySelector('#cartSubtotal'); if (sub) sub.textContent = window.__SHOP.fmtDA(0);
    document.querySelectorAll('#js-cart-badge, .cart-badge, [data-cart-badge]').forEach(b => b.textContent = '0');

  } catch (err) {
    console.error('[cart-confirm] FAIL', err);
    alert('Échec commande panier ❌ ' + err.message);
  } finally {
    window.__loading && window.__loading.hide();
  }
  return false;
};

  
    // Achat direct (modal)
window.__buyOnce = async function (ev) {
  try {
    const btn = document.getElementById('confirmBuyBtn'); if (!btn) return false;
    if (btn.dataset.lock) return false;
    btn.dataset.lock = '1'; setTimeout(() => delete btn.dataset.lock, 600);

    const profile = window.__SHOP.getProfile();
    if (!(profile.nom && profile.telephone && profile.adresse)) {
      alert('Complétez nom + téléphone + adresse avant achat direct.');
      return false;
    }

    const sku   = btn.dataset.sku   || (window.__currentBuy && window.__currentBuy.id);
    const name  = btn.dataset.name  || (window.__currentBuy && window.__currentBuy.name) || sku;
    const price = Number(btn.dataset.price || (window.__currentBuy && window.__currentBuy.price) || 0);
    if (!sku) { alert('Produit introuvable'); return false; }

    const orderId = btn.dataset.orderId || (btn.dataset.orderId = window.__SHOP.uuid());
    const payload = {
      __kind:'order',
      orderId,
      client: profile,
      payment:'to-choose',
      delivery:'to-choose',
      items:[{ sku, name, price, qty:1 }],
      total: price,
      source:'buy_button'
    };

    // === SPINNER on ===
    window.__loading && window.__loading.show('Validation de votre achat…');
    // Laisse le temps à l'overlay de se peindre
    await new Promise(r => requestAnimationFrame(r));

    const out = await window.__SHOP.post(payload);

    // Cache le spinner dès que le réseau a répondu
    window.__loading && window.__loading.hide();

    alert('Commande (achat direct) ✅ ID: ' + (out.orderId || orderId));
    window.__markOrderOk && window.__markOrderOk('buy', out.orderId || orderId);
    btn.dataset.ok = '1';

    // Journal local (inchangé)
    try {
      const log = JSON.parse(localStorage.getItem('ordersLog') || '[]');
      log.unshift({ orderId: out.orderId || orderId, source: 'buy', ts: Date.now(), total: price, items: [{ sku, name, price, qty: 1 }] });
      localStorage.setItem('ordersLog', JSON.stringify(log.slice(0, 50)));
    } catch {}
  } catch (err) {
    console.error('[buy] FAIL', err);
    alert('Échec achat direct ❌ ' + err.message);
  } finally {
    // Sécurité si on est passé par catch/alert avant hide()
    window.__loading && window.__loading.hide();
  }
  return false;
 };

    
    // Binding propre (sans capture globale)
    function bindBuyConfirm() {
      const buyBtn = document.getElementById('confirmBuyBtn');
      if (buyBtn) {
        if (buyBtn.tagName === 'BUTTON') buyBtn.type = 'button';
        buyBtn.onclick = (e) => (window.__buyOnce ? window.__buyOnce(e) : false);
        if (!buyBtn.dataset.captureBound) {
          buyBtn.addEventListener('click', (ev) => { if (window.__buyOnce) window.__buyOnce(ev); }, true);
          buyBtn.dataset.captureBound = '1';
        }
      }
      const cartBtn = document.getElementById('btnConfirmerPanier');
      if (cartBtn) {
        if (cartBtn.tagName === 'BUTTON') cartBtn.type = 'button';
        cartBtn.onclick = (e) => (window.__confirmCartOnce ? window.__confirmCartOnce(e) : false);
        if (!cartBtn.dataset.captureBound) {
          cartBtn.addEventListener('click', (ev) => { if (window.__confirmCartOnce) window.__confirmCartOnce(ev); }, true);
          cartBtn.dataset.captureBound = '1';
        }
      }
    }
  
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', bindBuyConfirm, { once: true });
    } else { bindBuyConfirm(); }
    new MutationObserver(bindBuyConfirm).observe(document.documentElement, { childList: true, subtree: true });
  
  /* ======================================
     [C] ADD-TO-CART — Unifié & Idempotent
     ====================================== */
  (() => {
    'use strict';
    const { fmtDA } = window.__SHOP;
    const ADD_SEL = '.js-add, .add-to-cart, .btn-add, [data-action="add-to-cart"]';
    const CART_KEY = 'cart';
  
    function readCart() { try { return JSON.parse(localStorage.getItem(CART_KEY) || '[]'); } catch { return []; } }
    function writeCart(list) { localStorage.setItem(CART_KEY, JSON.stringify(list || [])); }
  
    function attachAdd(btn) {
      if (btn.tagName === 'BUTTON') btn.type = 'button';
      btn.onclick = (e) => (window.__addOnce ? window.__addOnce(e) : false);
      if (!btn.dataset.captureBound) {
        btn.addEventListener('click', function (ev) {
          if (ev.__addOnceRan) return;
          ev.__addOnceRan = true;
          if (window.__addOnce) window.__addOnce(ev);
        }, true); // capture sur ce bouton uniquement
        btn.dataset.captureBound = '1';
      }
    }

    function bindAllAdd() {
      document.querySelectorAll(ADD_SEL).forEach(attachAdd);
    }
  
    window.__addOnce = function (ev) {
      try {
        const btn = ev?.currentTarget || (ev?.target?.closest && ev.target.closest(ADD_SEL));
        if (!btn) return false;
  
        // Empêche autres handlers pour CE clic
        if (ev) {
          ev.preventDefault && ev.preventDefault();
          ev.stopImmediatePropagation && ev.stopImmediatePropagation();
          ev.stopPropagation && ev.stopPropagation();
        }
  
        // Anti double-clic
        if (btn.dataset.lock) return false;
        btn.dataset.lock = '1'; setTimeout(() => delete btn.dataset.lock, 600);
  
        // Données produit robustes
        let sku = btn.dataset.sku || btn.getAttribute('data-id') || btn.id || '';
        if (!sku) sku = btn.dataset.idx || (btn.dataset.idx = 'sku-' + Math.random().toString(36).slice(2, 9));
        const name = btn.dataset.name || btn.getAttribute('data-title') || sku;
        const price = Number(btn.dataset.price || btn.getAttribute('data-price') || 0);
  
        // Anti double-événement (touch + click)
        const now = Date.now();
        const debKey = sku + '|' + price;
        if (window.__lastAddKey === debKey && (now - (window.__lastAddTs || 0)) < 1000) return false;
        window.__lastAddKey = debKey; window.__lastAddTs = now;
  
        // Fusion par clé stable sku|price
        const compositeKey = `${sku}|${Number(price || 0)}`;
        const list = readCart();
        const idx = list.findIndex(x => (x.k || `${x.sku}|${Number(x.price || 0)}`) === compositeKey);
        if (idx >= 0) list[idx].qty = Number(list[idx].qty || 0) + 1;
        else list.push({ k: compositeKey, sku, name, price, qty: 1 });
        writeCart(list);
  
        // Badge (tous)
        document.querySelectorAll('#js-cart-badge, .cart-badge, [data-cart-badge]').forEach(b => {
          const totalQty = list.reduce((s, i) => s + Number(i.qty || 0), 0);
          b.textContent = String(totalQty);
        });
  
        // Rendu minimal si pas de renderCart()
        if (typeof window.renderCart === 'function') {
          try { window.renderCart(); } catch {}
        } else {
          const box = document.querySelector('#cartItems');
          const sub = document.querySelector('#cartSubtotal');
          const makeKey = (it) => it.k || `${it.sku}|${Number(it.price || 0)}`;
          if (box) {
            box.innerHTML = list.length
              ? list.map(it => `
                <div class="d-flex justify-content-between align-items-center" data-k="${makeKey(it)}">
                  <div class="me-2">
                    <div class="fw-semibold">${it.name || it.sku || 'Produit'}</div>
                    <div class="small text-muted">× ${it.qty}</div>
                  </div>
                  <div class="ms-2 fw-semibold">${fmtDA(Number(it.price || 0) * Number(it.qty || 0))}</div>
                </div>
              `).join('')
              : `<div class="text-muted">Panier vide</div>`;
          }
          if (sub) {
            const tot = list.reduce((s, i) => s + Number(i.price || 0) * Number(i.qty || 0), 0);
            sub.textContent = fmtDA(tot);
          }
        }
      } catch (err) {
        console.error('[ADD-ONCE] error', err);
      }
      return false;
    };
     // Compat HTML: si un bouton a onclick="addToCart(...)"
     window.addToCart = function(ev){
        return window.__addOnce ? window.__addOnce(ev || window.event) : false;
      };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', bindAllAdd, { once: true });
    } else { bindAllAdd(); }
    new MutationObserver(bindAllAdd).observe(document.documentElement, { childList: true, subtree: true });
  })();
  
  
  /* =========================================
   [E] CLEAR CART + CLOSE CART PANEL (UI)
   ========================================= */
(() => {
  'use strict';
  const { setCart, fmtDA } = window.__SHOP;
  const CLEAR_SEL = '#btnViderPanier, .btn-clear-cart, [data-action="clear-cart"]';

  function updateCartViewsEmpty() {
    // Rendu minimal
    const box = document.querySelector('#cartItems');
    const sub = document.querySelector('#cartSubtotal');
    if (box) box.innerHTML = '<div class="text-muted">Panier vide</div>';
    if (sub) sub.textContent = fmtDA(0);

    // Badge(s)
    document.querySelectorAll('#js-cart-badge, .cart-badge, [data-cart-badge]').forEach(b => b.textContent = '0');

    // Si un renderCart() existe, on le laisse rafraîchir aussi
    if (typeof window.renderCart === 'function') {
      try { window.renderCart(); } catch {}
    }
  }

  function closeCartUI() {
    // 1) Bouton de fermeture Bootstrap (offcanvas/modal)
    const closer = document.querySelector(
      '.offcanvas.show [data-bs-dismiss="offcanvas"], .modal.show [data-bs-dismiss="modal"], [data-action="close-cart"]'
    );
    if (closer) { closer.click(); return; }

    // 2) Si pas de bouton, on tente de masquer les conteneurs visibles
    const off = document.querySelector('.offcanvas.show'); if (off) off.classList.remove('show');
    const modal = document.querySelector('.modal.show');   if (modal) modal.classList.remove('show');

    // 3) Event custom pour ton code (si tu l’écoutes)
    document.dispatchEvent(new CustomEvent('cart:close'));
  }

  window.__clearCart = function(ev) {
    if (ev) { ev.preventDefault?.(); ev.stopImmediatePropagation?.(); ev.stopPropagation?.(); }
    setCart([]);            // vide le storage
    updateCartViewsEmpty(); // remet l’UI à zéro
    closeCartUI();          // ferme le tiroir/modal
    return false;
  };

  function bindClearCart() {
    document.querySelectorAll(CLEAR_SEL).forEach(btn => {
      if (btn.tagName === 'BUTTON') btn.type = 'button';
      btn.onclick = (e) => window.__clearCart(e);
      if (!btn.dataset.captureBound) {
        btn.addEventListener('click', (e) => window.__clearCart(e), true);
        btn.dataset.captureBound = '1';
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindClearCart, { once: true });
  } else { bindClearCart(); }
  new MutationObserver(bindClearCart).observe(document.documentElement, { childList: true, subtree: true });
})();


/* =======================================
   FLY-TO-CART v2 (autonome + debug)
   ======================================= */
   (() => {
    'use strict';
    // Active les logs pour debug
    window.DEBUG_FLY = true;
    const ADD_SEL   = '.js-add, .add-to-cart, .btn-add, [data-action="add-to-cart"]';
    const BADGE_SEL = '#js-cart-badge, .cart-badge, [data-cart-badge], #cartBadge, .nav-cart-badge';
    const log = (...a) => { if (window.DEBUG_FLY) console.log('[FLY]', ...a); };
  
    function findBadge() {
      const b = document.querySelector(BADGE_SEL);
      if (!b) log('⚠️ Badge introuvable (fallback coin haut droit)'); else log('✅ Badge trouvé', b);
      return b;
    }
    function startFrom(target) {
      const card = target.closest('.product-card');
      const img  = card?.querySelector('.product-media .product-img, .product-media img') || null;
      const el   = img || target;
      const rect = el.getBoundingClientRect();
      log('startFrom =>', img ? 'image' : 'bouton', rect);
      return { el, rect, isImg: !!img };
    }
    function getFallbackDestRect() {
      const m = 16; return { left: innerWidth - m, top: m, width: 0, height: 0 };
    }
    function flyFrom(target) {
      const badge = findBadge();
      const { el, rect, isImg } = startFrom(target);
      const dest = badge ? badge.getBoundingClientRect() : getFallbackDestRect();
  
      const ghost = isImg ? el.cloneNode(true) : document.createElement('div');
      if (!isImg) {
        ghost.className = 'cart-fly-dot';
        ghost.style.background = 'currentColor';
        ghost.style.borderRadius = '999px';
        ghost.style.width = '16px';
        ghost.style.height = '16px';
      } else {
        ghost.className = 'cart-fly-ghost';
        ghost.style.width = rect.width + 'px';
        ghost.style.height = rect.height + 'px';
        ghost.style.objectFit = 'cover';
        ghost.style.borderRadius = '12px';
        ghost.style.boxShadow = '0 6px 16px rgba(0,0,0,.2)';
      }
      Object.assign(ghost.style, {
        position:'fixed', left: rect.left+'px', top: rect.top+'px', zIndex:9999,
        margin:0, opacity:.95, pointerEvents:'none',
        transition:'transform .6s cubic-bezier(.22,.61,.36,1), opacity .6s ease',
        transform:'translate(0,0) scale(1)', willChange:'transform'
      });
      document.body.appendChild(ghost);
  
      const dx = (dest.left + dest.width/2) - (rect.left + rect.width/2);
      const dy = (dest.top  + dest.height/2) - (rect.top  + rect.height/2);
  
      requestAnimationFrame(() => {
        ghost.style.transform = `translate(${dx}px, ${dy}px) scale(${isImg ? 0.15 : 0.6})`;
        ghost.style.opacity   = '0.2';
      });
  
      setTimeout(() => {
        try { ghost.remove(); } catch {}
        if (badge) {
          badge.classList.add('cart-badge-pulse');
          setTimeout(() => badge.classList.remove('cart-badge-pulse'), 500);
        }
      }, 650);
    }
  
    // Écoute globale (capture) pour tous les boutons "Ajouter"
    document.addEventListener('click', (e) => {
      const btn = e.target.closest(ADD_SEL);
      if (!btn) return;
      try { flyFrom(btn); } catch (err) { log('error', err); }
    }, true);
  
    log('Fly-to-cart initialisé (script.js).');
  })();






/* =========================
   UI SUCCESS PATCH (toasts + anti "non enregistré")
   ========================= */
   (() => {
    'use strict';
  
    // Petit toast simple (centre-bas)
    window.__showToast = function (msg='Commande reçue ✅') {
      const t = document.createElement('div');
      t.textContent = msg;
      Object.assign(t.style, {
        position: 'fixed', left: '50%', bottom: '24px', transform: 'translateX(-50%)',
        background: '#111', color: '#fff', padding: '10px 14px', borderRadius: '10px',
        fontWeight: '600', zIndex: 99999, boxShadow: '0 6px 18px rgba(0,0,0,.25)',
        opacity: '0', transition: 'opacity .18s ease'
      });
      document.body.appendChild(t);
      requestAnimationFrame(()=> t.style.opacity='1');
      setTimeout(()=> { t.style.opacity='0'; setTimeout(()=> t.remove(), 200); }, 2000);
    };
  
    // Marqueur de succès récent (fenêtre 4s)
    window.__markOrderOk = function (type, orderId) {
      const ts = Date.now();
      window.__lastOrderOkTs = ts;
      try { localStorage.setItem('lastOrderOk', JSON.stringify({ type, orderId, ts })); } catch {}
      window.__showToast('Commande reçue ✅');
      document.dispatchEvent(new CustomEvent('order:ok', { detail: { type, orderId, ts }}));
    };
  
    // Si un autre script affiche "non enregistré", on le remplace pendant 4s après succès
    const BAD_STR = ['non enregistré', 'non enregistrée', 'non reçu', 'non reçue'];
    const okObserver = new MutationObserver((muts) => {
      if (!window.__lastOrderOkTs || Date.now() - window.__lastOrderOkTs > 4000) return;
      for (const m of muts) {
        for (const n of m.addedNodes || []) {
          if (n.nodeType !== 1) continue;
          const txt = (n.textContent || '').toLowerCase();
          if (BAD_STR.some(s => txt.includes(s))) {
            n.textContent = 'Commande reçue ✅';
          }
        }
      }
    });
    okObserver.observe(document.body, { childList: true, subtree: true });
  })();

 /* ====== INSCRIPTION — Binder universel (drop-in) ====== */
(() => {
  'use strict';

  // 1) on utilise le post() que tu as déjà
  const postApi = window.__SHOP && window.__SHOP.post;
  if (!postApi) {
    console.error('[signup] __SHOP.post introuvable. Vérifie que la section [A] UTILITAIRES COMMUNS est chargée.');
    return;
  }

  // 2) on cherche un form "inscription" par sélecteurs probables
  const CANDIDATES = [
    '#signupForm',
    'form[data-role="signup"]',
    '.signup-form',
    'form#register',
    'form[id*="signup"]',
    'form[name*="signup"]',
    'form[id*="inscription"]',
    'form[class*="inscription"]'
  ];

  function pickForm() {
    for (const sel of CANDIDATES) {
      const f = document.querySelector(sel);
      if (f) return f;
    }
    // fallback: premier form qui a email/tel
    return Array.from(document.querySelectorAll('form')).find(f =>
      f.querySelector('[name="email"],[name*="mail"],[name="telephone"],[name="phone"],[name="tel"]')
    ) || null;
  }

  function toProfile(form) {
    const fd = new FormData(form);
    return {
      nom:       fd.get('nom')       || fd.get('name')      || '',
      prenom:    fd.get('prenom')    || fd.get('firstname') || '',
      email:     fd.get('email')     || fd.get('mail')      || '',
      telephone: fd.get('telephone') || fd.get('phone')     || fd.get('tel') || '',
      adresse:   fd.get('adresse')   || fd.get('address')   || '',
      ville:     fd.get('ville')     || fd.get('city')      || '',
      wilaya:    fd.get('wilaya')    || fd.get('region')    || '',
      notes:     fd.get('notes')     || fd.get('message')   || ''
    };
  }

  function bindSignup() {
    const form = pickForm();
    if (!form) { console.warn('[signup] aucun formulaire trouvé'); return; }
    if (form.dataset.signupBound) return;
    form.dataset.signupBound = '1';

    // S’assure que le bouton soumet bien
    const btn = form.querySelector('button[type="submit"], input[type="submit"], #btnSignup, .btn-signup');
    if (btn && btn.tagName === 'BUTTON' && btn.type !== 'submit') btn.type = 'submit';

    // écouteur submit (capture pour passer avant d’autres scripts)
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const profile = toProfile(form);
      try {
        window.__loading.show('Inscription en cours…');
        const out = await postApi({ __kind: 'signup', profile });
        // mémorise le profil pour l’achat direct
        try { localStorage.setItem('signupProfile', JSON.stringify(profile)); } catch {}
        // feedback utilisateur
        if (window.__showToast) window.__showToast('Inscription enregistrée ✅');
        else alert('Inscription enregistrée ✅');
        form.reset();
        console.log('[signup] OK', out);
      } catch (err) {
        console.error('[signup] FAIL', err);
        alert('Échec inscription ❌ ' + err.message);
      } finally {
        window.__loading.hide();                                // 👈 AJOUT
      }
    }, { capture: true });

    console.log('[signup] bound to form:', form);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindSignup, { once: true });
  } else {
    bindSignup();
  }
  // si le DOM change (SPA / injection), on rebinde
  new MutationObserver(bindSignup).observe(document.documentElement, { childList: true, subtree: true });
})();








/* ==== LOADING OVERLAY v2 (auto-CSS + debug) ==== */
(() => {
  const CSS = `
    .loading-overlay{position:fixed;inset:0;display:grid;place-items:center;background:rgba(0,0,0,.35);z-index:99999;backdrop-filter:blur(2px)}
    .loading-box{display:flex;flex-direction:column;align-items:center;gap:12px;color:#fff;font-weight:600}
    .loading-spinner{width:48px;height:48px;border:4px solid #fff;border-top-color:transparent;border-radius:50%;animation:loading-spin .8s linear infinite}
    .loading-msg{font-size:14px;opacity:.9}
    @keyframes loading-spin{to{transform:rotate(360deg)}}
  `;
  function ensureStyle(){
    if (!document.getElementById('loading-css')) {
      const st = document.createElement('style');
      st.id = 'loading-css';
      st.textContent = CSS;
      document.head.appendChild(st);
    }
  }
  function makeOverlay(msg){
    const wrap = document.createElement('div');
    wrap.className = 'loading-overlay';
    wrap.innerHTML = `
      <div class="loading-box">
        <div class="loading-spinner"></div>
        <div class="loading-msg">${msg || 'Veuillez patienter…'}</div>
      </div>`;
    return wrap;
  }
  window.__loading = {
    el: null,
    show(msg){
      try{
        if (this.el) return;
        ensureStyle();
        this.el = makeOverlay(msg);
        document.body.appendChild(this.el);
        document.body.style.cursor = 'progress';
        console.log('[loading] show:', msg || '');
      }catch(e){ console.warn('[loading] show error', e); }
    },
    hide(){
      try{
        if (!this.el) return;
        this.el.remove();
        this.el = null;
        document.body.style.cursor = '';
        console.log('[loading] hide');
      }catch(e){ console.warn('[loading] hide error', e); }
    }
  };
  // Test manuel dans la console: window._testLoading()
  window._testLoading = function(){
    window.__loading.show('Test…');
    setTimeout(()=> window.__loading.hide(), 2000);
  };
})();

/* Stopper l'ouverture auto du modal d'inscription, sans toucher au HTML */
(() => {
  const m = document.getElementById('account-modal');
  if (!m) return;

  function forceClose() {
    // retire les classes d'affichage éventuelles
    m.classList.remove('show', 'd-block');
    m.style.display = 'none';
    m.setAttribute('aria-hidden', 'true');
    // nettoie le body et le backdrop si ajoutés
    document.body.classList.remove('modal-open');
    document.querySelector('.modal-backdrop')?.remove();
  }

  // 1) à la fin du chargement
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', forceClose, { once: true });
  } else {
    forceClose();
  }

  // 2) si un autre script tente de l'ouvrir juste après (filet de sécu)
  setTimeout(forceClose, 0);
})();

document.getElementById('modal-close')?.addEventListener('click', closeModal);
// ou
const el = document.getElementById('modal-close');
if (el) el.addEventListener('click', closeModal);





/* ===== Variantes “Collier prénom” (vignettes + swap) ===== */
(() => {
  const $ = (s,r=document)=>r.querySelector(s);
  const $$ = (s,r=document)=>[...r.querySelectorAll(s)];
  const parse = (x)=>{ try{return JSON.parse(x||'[]')}catch(_){ return [] } };

  function build(container){
    const card = container.closest('.product-card'); if(!card) return;
    const target = container.dataset.target || '.product-img';
    const imgEl  = $(target, card) || $('.product-img', card);
    const vars   = parse(container.getAttribute('data-variants'));
    if(!vars.length) return;

    container.innerHTML = '';
    vars.forEach((v,i)=>{
      const b = document.createElement('button');
      b.type='button';
      b.className='swatch'+(i===0?' is-active':'');
      b.innerHTML = `
        <img src="${v.thumb || v.img}" alt="${v.label||''}">
        <span class="lab">${v.label||''}</span>`;
      b.addEventListener('click', ()=>{
        container.querySelectorAll('.swatch').forEach(s=>s.classList.remove('is-active'));
        b.classList.add('is-active');

        if(imgEl){ imgEl.src = v.img; imgEl.alt = (v.label? v.label+' – ' : '') + ($('.product-title',card)?.textContent||''); }

        // MAJ boutons Add/Buy (nom + image)
        const add=$('.btn-add',card), buy=$('.btn-buy',card);
        const base = (add?.dataset.name || buy?.dataset.name || $('.product-title',card)?.textContent || 'Collier Prénom').split(' – ')[0];
        const full = `${base} – ${v.label||''}`.trim();
        [add,buy].forEach(btn=>{
          if(!btn) return;
          btn.dataset.name = full;
          if(v.img) btn.dataset.img = v.img;
        });
      });
      container.appendChild(b);
    });
  }

  function init(){
    $$('.product-variants').forEach(build);
  }
  if(document.readyState==='loading'){ document.addEventListener('DOMContentLoaded',init,{once:true}); }
  else init();

  new MutationObserver(()=>init()).observe(document.documentElement,{childList:true,subtree:true});
})();

/* ===== Variantes & Quick View (colliers prénom) ===== */
(() => {
  const $ = (s, root=document) => root.querySelector(s);
  const $$ = (s, root=document) => [...root.querySelectorAll(s)];

  /** Parse un JSON d’attribut data-variants en tolérant espaces */
  function parseVariants(str){
    try { return JSON.parse(str || '[]'); } catch(e){ console.warn('JSON variants invalide', e); return []; }
  }

  /** Crée les vignettes dans un conteneur .pc-swatches / .hover-panel__swatches / .product-variants */
  function buildSwatches(container){
    const card = container.closest('.product-card'); if (!card) return;
    const targetSel = container.dataset.target || '.product-img';
    const targetImg = $(targetSel, card) || $('.product-img', card);
    const variants = parseVariants(container.getAttribute('data-variants'));
    if (!variants.length) return;

    // Vide puis crée
    container.innerHTML = '';
    variants.forEach((v, idx) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'swatch';
      btn.innerHTML = `
        <img src="${v.thumb || v.img}" alt="${v.label||''}">
        <span class="lab">${v.label || 'Variante'}</span>
      `;
      btn.addEventListener('click', () => {
        // 1) change l'image principale de la carte
        if (targetImg) { targetImg.src = v.img; targetImg.alt = (v.label ? (v.label + ' – ') : '') + (card.querySelector('.product-title')?.textContent || ''); }
        // 2) état actif
        container.querySelectorAll('.swatch').forEach(s=>s.classList.remove('is-active'));
        btn.classList.add('is-active');
        // 3) synchronise les boutons Ajouter/Acheter (nom + image)
        const add = $('.btn-add', card); const buy = $('.btn-buy', card);
        const base = (add?.dataset.name || buy?.dataset.name || card.querySelector('.product-title')?.textContent || 'Collier Prénom').split(' – ')[0];
        const full = `${base} – ${v.label || ''}`.trim();
        [add, buy].forEach(b=>{
          if (!b) return;
          b.dataset.name = full;
          if (v.img) b.dataset.img = v.img;
        });
      });
      container.appendChild(btn);
      // Active par défaut si l’image principale correspond
      const current = targetImg?.getAttribute('src') || '';
      if (current && (current.endsWith(v.img) || current === v.img)) btn.classList.add('is-active');
      // Sinon active la 1ère
      if (idx === 0 && !container.querySelector('.swatch.is-active')) btn.classList.add('is-active');
    });
  }

  /** Hydrate toutes les zones variantes présentes dans la page */
  function initInlineSwatches(){
    ['.pc-swatches', '.hover-panel__swatches', '.product-variants'].forEach(sel=>{
      $$(sel).forEach(buildSwatches);
    });
  }

  /** QUICK VIEW — ouvre le modal pour la carte donnée */
  function openQuickView(card){
    const title   = card.querySelector('.product-title')?.textContent?.trim() || 'Produit';
    const priceTx = card.querySelector('.price')?.textContent?.trim() || '';
    const addBtn  = card.querySelector('.btn-add');
    const buyBtn  = card.querySelector('.btn-buy');
    const baseName= addBtn?.dataset.name || buyBtn?.dataset.name || title;
    const mainImg = card.querySelector('.product-img')?.getAttribute('src') || '';

    // Récupère variants en priorité depuis .pc-swatches / .hover-panel__swatches / .product-variants
    let variants = [];
    const variantContainer = card.querySelector('.pc-swatches, .hover-panel__swatches, .product-variants');
    if (variantContainer) variants = parseVariants(variantContainer.getAttribute('data-variants'));
    // fallback: depuis data-gallery
    if (!variants.length){
      const gal = (card.getAttribute('data-gallery')||'').split(',').map(s=>s.trim()).filter(Boolean);
      variants = gal.map((img,i)=> ({ label: `Variante ${i+1}`, img, thumb: img }));
      if (!variants.length && mainImg) variants = [{label: title, img: mainImg, thumb: mainImg}];
    }
    if (!variants.length) return;

    // Remplit le modal
    $('#qvTitle').textContent = title;
    $('#qvPrice').textContent = priceTx;
    const qvImg = $('#qvMainImg'); qvImg.src = mainImg || variants[0].img; qvImg.alt = title;

    const sw = $('#qvSwatches'); sw.innerHTML = '';
    let activeIndex = Math.max(0, variants.findIndex(v => v.img === mainImg));
    variants.forEach((v, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'swatch' + (i===activeIndex ? ' is-active' : '');
      b.innerHTML = `<img src="${v.thumb || v.img}" alt="${v.label||''}"><span class="lab">${v.label||''}</span>`;
      b.addEventListener('click', () => {
        sw.querySelectorAll('.swatch').forEach(s=>s.classList.remove('is-active'));
        b.classList.add('is-active');
        qvImg.src = v.img;
        // mets à jour les datasets pour add/buy dans le modal
        $('#qvAdd').dataset.name = `${baseName.split(' – ')[0]} – ${v.label||''}`.trim();
        $('#qvAdd').dataset.img  = v.img;
        $('#qvBuy').dataset.name = $('#qvAdd').dataset.name;
        $('#qvBuy').dataset.img  = v.img;
      });
      sw.appendChild(b);
    });

    // datasets des boutons du modal (SKU/NAME/PRICE)
    const sku   = addBtn?.dataset.id || buyBtn?.dataset.id || 'SKU-NAME';
    const price = addBtn?.dataset.price || buyBtn?.dataset.price || '0';
    $('#qvAdd').dataset.id = sku;
    $('#qvAdd').dataset.price = price;
    $('#qvAdd').dataset.name = baseName;
    $('#qvAdd').dataset.img  = qvImg.src;

    $('#qvBuy').dataset.id = sku;
    $('#qvBuy').dataset.price = price;
    $('#qvBuy').dataset.name = baseName;
    $('#qvBuy').dataset.img  = qvImg.src;

    // Ouvre le modal
    const modal = bootstrap.Modal.getOrCreateInstance($('#qvModal'));
    modal.show();

    // Sélectionne la bonne vignette au chargement
    sw.querySelectorAll('.swatch')[activeIndex]?.click();
  }

  /** Clic sur l'image de la carte => QuickView (mais pas sur “Ajouter/Acheter/Fav”) */
  document.addEventListener('click', (e) => {
    const media = e.target.closest('.product-media');
    if (!media) return;
    const card = media.closest('.product-card'); if (!card) return;
    if (e.target.closest('.btn-add, .btn-buy, .btn-fav')) return; // ne pas intercepter ces boutons
    openQuickView(card);
  }, true);

  /** Boutons du modal => branchés sur ton panier / achat existants */
  $('#qvAdd')?.addEventListener('click', (e) => {
    const d = e.currentTarget.dataset;
    // Simule un vrai bouton .btn-add pour réutiliser __addOnce si présent
    const fake = document.createElement('button');
    fake.className = 'btn-add'; fake.dataset.id = d.id; fake.dataset.name = d.name; fake.dataset.price = d.price; fake.dataset.img = d.img;
    if (typeof window.__addOnce === 'function') window.__addOnce({ currentTarget: fake, target: fake, preventDefault(){}, stopPropagation(){}, stopImmediatePropagation(){} });
    bootstrap.Modal.getInstance($('#qvModal'))?.hide();
    window.__showToast && window.__showToast('Ajouté au panier ✅');
  });

  $('#qvBuy')?.addEventListener('click', (e) => {
    const d = e.currentTarget.dataset;
    // Prépare les datasets pour ton flux achat direct
    const buyBtn = document.getElementById('confirmBuyBtn');
    if (buyBtn){
      buyBtn.dataset.sku = d.id; buyBtn.dataset.name = d.name; buyBtn.dataset.price = d.price;
      window.__currentBuy = { id:d.id, name:d.name, price:Number(d.price||0) };
      bootstrap.Modal.getInstance($('#qvModal'))?.hide();
      setTimeout(()=> typeof window.__buyOnce === 'function' && window.__buyOnce(new Event('click')), 200);
    } else {
      // fallback : ajoute au panier
      $('#qvAdd').click();
    }
  });

  // Hydrate les swatches inline à l’arrivée du DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initInlineSwatches, { once:true });
  } else { initInlineSwatches(); }
  // Si des cartes sont injectées dynamiquement
  new MutationObserver(() => initInlineSwatches()).observe(document.documentElement, { childList:true, subtree:true });
})();


// iPad/iOS : tap sur l'image => révèle les CTA quelques secondes
(() => {
  const isNoHover = window.matchMedia && window.matchMedia('(hover: none)').matches;
  if (!isNoHover) return;

  document.addEventListener('click', (e) => {
    const media = e.target.closest('.product-card .product-media');
    if (!media) return;
    const cta = media.parentElement.querySelector('.product-cta');
    if (!cta) return;

    cta.style.transition = 'opacity .2s ease, transform .2s ease';
    cta.style.opacity = '1';
    cta.style.visibility = 'visible';
    cta.style.transform = 'none';
    cta.style.pointerEvents = 'auto';

    clearTimeout(cta.__hideTimer);
    cta.__hideTimer = setTimeout(()=>{
      // ne pas recacher si on est en train d’appuyer un bouton
      if (document.activeElement && cta.contains(document.activeElement)) return;
      cta.style.removeProperty('opacity');
      cta.style.removeProperty('visibility');
      cta.style.removeProperty('transform');
      cta.style.removeProperty('pointer-events');
    }, 4000);
  }, true);
})();



// Affiche/masque le bloc .card-options[data-for="cartPay"] quand on choisit "carte"
(() => {
  const GROUP = 'cartPay'; // <- remplace si ton name est différent
  function val() {
    return (document.querySelector(`input[name="${GROUP}"]:checked`)?.value || '').toLowerCase();
  }
  function toggle() {
    const box = document.querySelector(`.card-options[data-for="${GROUP}"]`);
    if (!box) return;
    const show = ['card','carte'].includes(val());
    box.classList.toggle('d-none', !show);
    box.setAttribute('aria-hidden', show ? 'false' : 'true');
  }
  document.addEventListener('change', (e)=>{
    if (e.target?.name === GROUP) toggle();
  });
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', toggle, { once:true });
  } else {
    toggle();
  }
})();


// Patch simple si ton HTML appelle closeModal()
function closeModal() {
  const m = document.getElementById('account-modal');
  if (!m) return;
  m.classList.remove('show', 'd-block');
  m.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('modal-open');
  document.querySelectorAll('.modal-backdrop').forEach(b => b.remove());
}



/* === PATCH: Sync des badges de panier (header + bulle) === */
(function () {
  'use strict';

  // Expose une fonction globale pour MAJ tous les badges
  window.updateCartBadges = function (totalQty) {
    // Tous les badges "génériques" que tu utilises déjà
    document.querySelectorAll('#js-cart-badge, .cart-badge, [data-cart-badge], #cartBadge, .nav-cart-badge')
      .forEach(el => el.textContent = String(totalQty));

    // Le compteur de la bulle mobile (ton span spécifique)
    const bubbleCount = document.getElementById('cart-count');
    if (bubbleCount) bubbleCount.textContent = String(totalQty);
  };

  // Si tu stockes le panier en localStorage, on peut re-peupler à chaud
  try {
    const list = JSON.parse(localStorage.getItem('cart') || '[]');
    const qty = list.reduce((s, i) => s + Number(i.qty || 0), 0);
    window.updateCartBadges(qty);
  } catch {}
})();


// ... juste après writeCart(list)
const currentList = Array.isArray(list) ? list : (function () {
  try { return JSON.parse(localStorage.getItem('cart') || '[]'); }
  catch { return []; }
})();

const totalQty = currentList.reduce((s, i) => s + Number(i.qty || 0), 0);
if (typeof window.updateCartBadges === 'function') window.updateCartBadges(totalQty);




/* === PATCH: cible = bulle sur mobile, sinon plus proche du point de départ === */
(function(){
  'use strict';

  function isVisible(el){
    if (!el) return false;
    const rects = el.getClientRects();
    if (!rects || !rects.length) return false;
    const cs = getComputedStyle(el);
    return cs.display !== 'none' && cs.visibility !== 'hidden' && cs.opacity !== '0';
  }

  // >>> remplace ton ancienne getDestEl par celle-ci
  function getDestEl(startRect){
    // 1) MOBILE (<= 992px) : TOUJOURS prioriser la bulle
    const isMobile = window.matchMedia('(max-width: 991.98px)').matches;
    const bubble = document.querySelector('#cart-bubble, .cart-bubble');
    if (isMobile && bubble && isVisible(bubble)) return bubble;

    // 2) Sinon, choisir le "cart" visible le PLUS PROCHE du point de départ
    const selectors = [
      '#cart-bubble .cart-count', '#cart-bubble', '.cart-bubble .cart-count', '.cart-bubble',
      '#cart-count', '#cartBadge', '#js-cart-badge', '.cart-badge', '[data-cart-badge]'
    ];
    let best = null, bestD = Infinity;
    for (const sel of selectors){
      const el = document.querySelector(sel);
      if (!isVisible(el)) continue;
      const r = el.getBoundingClientRect();
      const sx = startRect.left + startRect.width/2;
      const sy = startRect.top  + startRect.height/2;
      const dx = (r.left + r.width/2) - sx;
      const dy = (r.top  + r.height/2) - sy;
      const d2 = dx*dx + dy*dy;
      if (d2 < bestD){ bestD = d2; best = el; }
    }
    return best; // peut être null → fallback coin en haut à droite
  }

  // >>> remplace l’intérieur de __flyToCart pour lui passer startRect à getDestEl
  window.__flyToCart = function(startEl){
    const start = (startEl && startEl.getBoundingClientRect) ? startEl : document.body;
    const srect = start.getBoundingClientRect();

    const destEl = getDestEl(srect);
    const drect = destEl
      ? destEl.getBoundingClientRect()
      : { left: innerWidth - 16, top: 16, width: 0, height: 0 };

    const ghost = document.createElement('div');
    ghost.style.cssText = `
      position:fixed; left:${srect.left + srect.width/2 - 8}px; top:${srect.top + srect.height/2 - 8}px;
      width:16px; height:16px; border-radius:999px; background:currentColor; z-index:99999;
      transform:translate(0,0) scale(1); opacity:.95; pointer-events:none;
      transition:transform .6s cubic-bezier(.22,.61,.36,1), opacity .6s ease;
      will-change:transform, opacity;
    `;
    document.body.appendChild(ghost);

    const dx = (drect.left + drect.width/2) - (srect.left + srect.width/2);
    const dy = (drect.top  + drect.height/2) - (srect.top  + srect.height/2);
    requestAnimationFrame(()=>{
      ghost.style.transform = `translate(${dx}px, ${dy}px) scale(.55)`;
      ghost.style.opacity = '0.2';
    });

    setTimeout(()=>{
      ghost.remove();
      if (destEl){
        destEl.classList.add('cart-badge-pulse');
        setTimeout(()=> destEl.classList.remove('cart-badge-pulse'), 500);
      }
    }, 650);
  };
})();

  
setTimeout(() => {
  // recalcule et met à jour #cart-count + badges header
  document.dispatchEvent(new Event('cart:changed')); // optionnel si tu l’écoutes
}, 60);




/* ============================================================
   SEARCH SUGGEST — desktop sidebar + mobile overlay
   - Suggestions populaires + catégories + produits
   - Recherches récentes (localStorage)
   - Filtrage de la grille + affichage du shop
   ============================================================ */
   (function(){
    'use strict';
  
    const GRID_ID = 'products-grid';
    const SHOP_ID = 'shop-section';
    const REC_KEY = 'searchRecent';
    const MAX_REC = 6;
  
    // 0) utilitaires
    const $ = (s, r=document) => r.querySelector(s);
    const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));
    const deb = (fn, ms=200) => { let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a), ms); }; };
  
    // 1) sources (marketing)
    const popular = [
      {label:'Colliers minimalistes', q:'collier minimaliste', tag:'Tendance'},
      {label:'Boucles d’oreilles perles', q:'perle', tag:'Classique'},
      {label:'Parures soirée', q:'set soirée', tag:'Occasion'},
      {label:'Bagues ajustables', q:'bague ajustable', tag:'Pratique'},
    ];
    const shortcuts = [
      {label:'Colliers', type:'necklace'},
      {label:'Boucles d’oreilles', type:'earring'},
      {label:'Bracelets', type:'bracelet'},
      {label:'Parures', type:'set'},
      {label:'Chaîne de cheville', type:'anklet'},
    ];
  
    function getRecent(){
      try { return JSON.parse(localStorage.getItem(REC_KEY)||'[]'); } catch{ return []; }
    }
    function addRecent(q){
      const list = getRecent().filter(x => x!==q);
      list.unshift(q);
      localStorage.setItem(REC_KEY, JSON.stringify(list.slice(0, MAX_REC)));
    }
  
    // 2) show shop + filter
    function showShop(){
      $$('.page-section').forEach(s => s.classList.add('hidden'));
      $('#'+SHOP_ID)?.classList.remove('hidden');
      $('#'+SHOP_ID)?.scrollIntoView({behavior:'smooth', block:'start'});
    }
  
    function filterGridByQuery(query){
      const grid = $('#'+GRID_ID);
      if (!grid) return;
      const q = (query||'').trim().toLowerCase();
  
      let shown = 0;
      $$('#'+GRID_ID+' .product-card').forEach(card => {
        const col = card.closest('.col, .col-6, .col-md-4, .col-lg-3') || card;
        const hay = [
          card.querySelector('.product-title')?.textContent || '',
          card.dataset.type || '',
          card.dataset.metal || '',
          card.dataset.desc || ''
        ].join(' ').toLowerCase();
  
        const ok = q ? hay.includes(q) : true;
        col.classList.toggle('d-none', !ok);
        if (ok) shown++;
      });
      grid.classList.toggle('empty', shown===0);
    }
  
    function filterGridByType(type){
      const grid = $('#'+GRID_ID);
      if (!grid) return;
      let shown = 0;
      $$('#'+GRID_ID+' .product-card').forEach(card => {
        const col = card.closest('.col, .col-6, .col-md-4, .col-lg-3') || card;
        const ok = card.dataset.type === type;
        col.classList.toggle('d-none', !ok);
        if (ok) shown++;
      });
      grid.classList.toggle('empty', shown===0);
    }
  
    // 3) construire suggestions (data-driven sur titres des produits)
    function productIndex(){
      return $$('#'+GRID_ID+' .product-card').map(c => ({
        title: (c.querySelector('.product-title')?.textContent || '').trim(),
        type: c.dataset.type || '',
        node: c
      }));
    }
  
    function buildSuggestBox(anchor){
      let box = anchor.parentElement.querySelector('.search-suggest');
      if (!box) {
        box = document.createElement('div');
        box.className = 'search-suggest';
        anchor.parentElement.appendChild(box);
      }
      return box;
    }
  
    function renderSuggestions(anchor, query){
      const box = buildSuggestBox(anchor);
      const q = (query||'').trim().toLowerCase();
      const idx = productIndex();
  
      // produits matchés
      const prod = q
        ? idx.filter(it => it.title.toLowerCase().includes(q)).slice(0,5)
        : idx.slice(0,5);
  
      // HTML
      let html = '';
  
      // Section chips (catégories rapides)
      html += `<div class="search-suggest__section">
        <div class="search-chip-row">
          ${shortcuts.map(s=>`<button class="search-chip" data-type="${s.type}">${s.label}</button>`).join('')}
        </div>
      </div>`;
  
      // populaires
      html += `<div class="search-suggest__title">Populaire</div>`;
      html += popular.map(p => `
        <div class="search-item" data-q="${p.q}">
          <span class="tag">${p.tag}</span>
          <div>
            <div>${p.label}</div>
            <div class="muted">${p.q}</div>
          </div>
        </div>`).join('');
  
      // récents
      const rec = getRecent();
      if (rec.length){
        html += `<div class="search-suggest__title">Récemment recherché</div>`;
        html += rec.map(r => `<div class="search-item" data-q="${r}"><i class="bi bi-clock-history"></i><div>${r}</div></div>`).join('');
      }
  
      // produits
      if (prod.length){
        html += `<div class="search-suggest__title">Produits</div>`;
        html += prod.map(p => `<div class="search-item" data-q="${p.title}"><i class="bi bi-search"></i><div>${p.title}</div></div>`).join('');
      }
  
      box.innerHTML = html;
  
      // interactions
      box.querySelectorAll('[data-q]').forEach(el=>{
        el.onclick = () => {
          const val = el.getAttribute('data-q');
          anchor.value = val;
          addRecent(val);
          box.remove();
          showShop();
          filterGridByQuery(val);
        };
      });
      box.querySelectorAll('[data-type]').forEach(el=>{
        el.onclick = () => {
          const type = el.getAttribute('data-type');
          box.remove();
          showShop();
          filterGridByType(type);
        };
      });
    }
  
    function bindSearch(input){
      if (!input) return;
      const update = deb(() => renderSuggestions(input, input.value), 120);
  
      input.addEventListener('input', update);
  
      // Enter => valider
      input.addEventListener('keydown', (e)=>{
        if (e.key === 'Enter'){
          const val = input.value.trim();
          if (!val) return;
          addRecent(val);
          input.blur();
          const box = input.parentElement.querySelector('.search-suggest');
          if (box) box.remove();
          showShop();
          filterGridByQuery(val);
        }
      });
  
      // focus => ouvrir
      input.addEventListener('focus', () => renderSuggestions(input, input.value));
  
      // clic hors => fermer
      document.addEventListener('click', (e)=>{
        if (!e.target.closest('.search-suggest') && e.target !== input){
          input.parentElement.querySelector('.search-suggest')?.remove();
        }
      });
    }
  
    // 4) brancher desktop + mobile
    bindSearch(document.querySelector('.shop-sidebar .filter-search input'));
    bindSearch(document.getElementById('mobileSearchInput'));
  
  })();

  
/* ===== Catégories -> ouvrir Shop + filtrer par type ===== */
(function () {
  'use strict';

  // Shop et grille : on accepte ID ou data-page pour être robustes
  const SHOP_SEL = '#shop-section, [data-page="shop"]';
  const GRID_SEL = '#products-grid, .products-grid';

  // FR -> data-type des .product-card
  const TYPE_MAP = {
    'collier':'necklace','colliers':'necklace',
    'bague':'ring','bagues':'ring',
    'bracelet':'bracelet','bracelets':'bracelet',
    'boucle':'earring','boucles':'earring',
    "boucles d’oreilles":'earring',"boucles d'oreilles":'earring',
    'parure':'set','parures':'set',
    'cheville':'anklet','chaîne':'anklet','chaine':'anklet'
  };

  function getShop() {
    return document.querySelector(SHOP_SEL);
  }
  function getGrid() {
    return document.querySelector(GRID_SEL);
  }

  function showShop() {
    // cache seulement les sections de page (pas le footer)
    document.querySelectorAll('.page-section').forEach(s => s.classList.add('hidden'));
    const shop = getShop();
    if (!shop) { console.warn('[cat] Section shop introuvable via', SHOP_SEL); return; }
    shop.classList.remove('hidden');
    shop.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function filterByType(type) {
    const grid = getGrid();
    if (!grid) { console.warn('[cat] Grille introuvable via', GRID_SEL); return; }

    let shown = 0;
    grid.querySelectorAll('.product-card').forEach(card => {
      const ok = !type || (card.dataset.type || '') === type;
      // masque la colonne Bootstrap qui contient la card
      const wrap = card.closest('.col-6, .col, [class*="col-"]') || card;
      wrap.classList.toggle('d-none', !ok);
      if (ok) shown++;
    });
    grid.classList.toggle('empty', shown === 0);
  }

  function handleCategory(raw) {
    const key = String(raw || '').trim().toLowerCase();
    const type = TYPE_MAP[key] || ''; // '' = tout
    showShop();
    filterByType(type);
  }

  // Un seul listener pour tout élément portant data-cat
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-cat]');
    if (!el) return;
    e.preventDefault();
    handleCategory(el.getAttribute('data-cat'));
  });

  // Bouton "Shop" du header (montre tout)
  const navShop = document.getElementById('nav-shop');
  if (navShop) {
    navShop.addEventListener('click', (e) => {
      e.preventDefault();
      showShop();
      filterByType(''); // tout
    });
  }
})();


window.updateCartBadges = window.updateCartBadges || function (n) {
  document.querySelectorAll('#js-cart-badge, .cart-badge, [data-cart-badge], #cart-count')
    .forEach(b => b.textContent = String(n));
};




/* ========= CONFIG ========= */
const GAS_URL = 'https://script.google.com/macros/s/AKfycbxX5f2Co1vfdCxjbISfyiwJcqrhksoshPnM4wBB-ZG4s0_1oRBp8rC1YHfr9NKVYbY2/exec'; // remplace par ton URL
let pendingItem = null;

/* ========= Modal minimal (si tu en as déjà un, branche seulement l'écouteur "submit") ========= */
function ensureCheckoutModal(){
  let m = document.getElementById('checkoutModal');
  if (m) return m;
  const wrap = document.createElement('div');
  wrap.innerHTML = `
  <div id="checkoutModal" style="position:fixed;inset:0;display:none;align-items:center;justify-content:center;background:rgba(0,0,0,.35);z-index:9999">
    <form id="checkoutForm" style="background:#fff;padding:16px;border-radius:14px;max-width:420px;width:92%;display:grid;gap:8px">
      <h3 style="margin:0 0 6px">Vos coordonnées</h3>
      <input id="c_nom" placeholder="Nom" required>
      <input id="c_prenom" placeholder="Prénom" required>
      <input id="c_tel" placeholder="Téléphone" required>
      <input id="c_email" type="email" placeholder="Email (optionnel)">
      <input id="c_adresse" placeholder="Adresse (optionnel)">
      <input id="c_qty" type="number" min="1" value="1" required>
      <select id="c_payment">
        <option value="COD">Paiement à la livraison</option>
        <option value="Virement">Virement/CCP</option>
      </select>
      <select id="c_delivery">
        <option value="Standard">Livraison Standard</option>
        <option value="Express">Livraison Express</option>
      </select>
      <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:6px">
        <button type="button" id="c_cancel">Annuler</button>
        <button type="submit" id="c_submit" style="background:#111;color:#fff;border-radius:8px;padding:8px 12px">Confirmer la commande</button>
      </div>
      <small id="c_status" style="color:#666"></small>
    </form>
  </div>`;
  document.body.appendChild(wrap.firstElementChild);
  document.getElementById('c_cancel').onclick = () => (document.getElementById('checkoutModal').style.display='none');
  return document.getElementById('checkoutModal');
}

/* ========= Clic sur "Acheter" : mémoriser l'article et ouvrir le modal ========= */
document.addEventListener('click', (e)=>{
  const btn = e.target.closest('.btn-buy');
  if(!btn) return;

  const card = btn.closest('.product-card') || document;
  const title = (card.querySelector('.product-title')?.textContent || btn.dataset.name || 'Produit').trim();
  const variant = card.querySelector('.product-variants .swatch.is-active .lab')?.textContent?.trim() || '';
  const img = card.querySelector('.product-img')?.src || '';
  const sku = btn.dataset.id || 'SKU_UNKNOWN';
  const price = Number(btn.dataset.price || 0);

  pendingItem = {
    sku,
    name: variant ? `${title} – ${variant}` : title,
    variant: variant || '',
    img,
    unit_price: price
  };

  const modal = ensureCheckoutModal();
  modal.style.display = 'flex';
  modal.querySelector('#c_qty').value = 1;
});

/* ========= Envoi au format attendu par TON Apps Script ========= */
document.addEventListener('submit', async (e)=>{
  if (e.target.id !== 'checkoutForm') return;
  e.preventDefault();
  const f = e.target;
  const status = f.querySelector('#c_status');
  const submitBtn = f.querySelector('#c_submit');

  if(!pendingItem){ status.textContent = 'Aucun article sélectionné.'; return; }

  const qty = Math.max(1, Number(f.querySelector('#c_qty').value || 1));
  const total = pendingItem.unit_price * qty;

  const payload = {
    __kind: 'order',                 // << clé que ton script attend
    source: 'direct',                // 'cart' pour aller dans "CommandesPanier"
    orderId: '',                     // optionnel (laisse vide pour qu’il génère un UUID)
    client: {
      nom:     f.querySelector('#c_nom').value.trim(),
      prenom:  f.querySelector('#c_prenom').value.trim(),
      email:   f.querySelector('#c_email').value.trim(),
      telephone: f.querySelector('#c_tel').value.trim(),
      adresse: f.querySelector('#c_adresse').value.trim()
    },
    payment:  f.querySelector('#c_payment').value,
    delivery: f.querySelector('#c_delivery').value,
    items: [
      {
        sku: pendingItem.sku,
        name: pendingItem.name,
        variant: pendingItem.variant,
        img: pendingItem.img,
        qty,
        unit_price: pendingItem.unit_price,
        total
      }
    ],
    total
  };

  status.textContent = 'Envoi de votre commande…';
  submitBtn.disabled = true;

  try{
    const res = await fetch(GAS_URL, {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify(payload)
    });
    const data = await res.json();

    if(res.ok && data.ok){
      status.textContent = '✅ Commande reçue ! Nous vous contactons très vite.';
      // fermer le modal un peu après
      setTimeout(()=>{ document.getElementById('checkoutModal').style.display='none'; }, 900);
      f.reset();
      pendingItem = null;
    } else {
      throw new Error(data.error || 'Erreur serveur');
    }
  }catch(err){
    console.error(err);
    status.textContent = '❌ Impossible d’enregistrer la commande. Réessayez.';
  }finally{
    submitBtn.disabled = false;
  }
});
