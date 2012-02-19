/**
 * Miscellaneous globals + behaviors.
 */
var π = Math.PI,
    τ = π*2;

window.Acko = window.Acko || {};

Acko.behaviors = {};

if (!($.browser.msie && navigator.userAgent.match(/MSIE [0-8]/))) {
  document.documentElement.className = 'js';
  $(function () {
    Acko.applyBehaviors();
  });
}

Acko.applyBehaviors = function (context) {

  context = context || document;
  for (i in Acko.behaviors) {
    Acko.behaviors[i](context);
  }
}

