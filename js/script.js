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

// Au clic sur le lien “Shop” de ta nav
document.getElementById('nav-shop').addEventListener('click', e => {
  e.preventDefault();            // empêche le navigateur de suivre le lien
  showSection('shop-section');   // n'affiche que la section Shop
});


