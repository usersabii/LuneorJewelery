// Récupère le modal, le bouton de fermeture et le formulaire
const modal      = document.getElementById('account-modal');
const closeBtn   = document.getElementById('modal-close');
const accountForm = document.getElementById('account-form');

// À l’ouverture de la page, on affiche le modal seulement si on n'a pas encore créé de compte
document.addEventListener('DOMContentLoaded', () => {
  if (!localStorage.getItem('accountCreated')) {
    // On force l’affichage via Bootstrap JS API ou en manipulant la classe
    modal.classList.add('show', 'd-block');
  }
});

// Fermeture manuelle du modal via la croix
closeBtn.addEventListener('click', () => {
  modal.classList.remove('show', 'd-block');
});

// À la soumission du formulaire
accountForm.addEventListener('submit', e => {
  e.preventDefault(); // à adapter si tu envoies réellement les données
  // ... ici ton appel AJAX / fetch pour créer le compte côté serveur ...

  // Quand c'est OK côté serveur, on :
  localStorage.setItem('accountCreated', 'true'); // on garde le flag
  modal.classList.remove('show', 'd-block');      // on ferme le modal
});
