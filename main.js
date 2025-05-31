/// main.js
import { submitHandler } from './transaction.js';

document.addEventListener('DOMContentLoaded', () => {
  const navSubmit = document.getElementById('nav-submit');
  if (navSubmit) {
    navSubmit.addEventListener('click', () => {
      submitHandler();
    });
  }
});