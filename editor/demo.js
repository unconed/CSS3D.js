/**
 * Three.js scene editor for CSS3D objects.
 */
window.Acko = window.Acko || {};

$(function () {

  // Initialize scene.
  setTimeout(function () {

    // Viewport
    var demo = new Acko.Scene('#demo', {
      mode: 2,
      fov: 40,
      editor: true,
      load: true,
      data: Acko.sceneData,
      continuous: true,
    });

    setTimeout(function () {
      $('#demo').css('-webkit-transform', 'translateZ(0px)')
    }, 200);

  }, 200);

});
