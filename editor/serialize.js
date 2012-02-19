/**
 * Helper for serializing/unserializing CSS 3D scenes.
 * (planes only)
 */
window.Acko = window.Acko || {};

Acko.serialize = {};

/**
 * Serialize objects into JSON
 */
Acko.serialize.zip = function (objects) {

  var output = [];

  if (objects.constructor != Array) {
    objects = [objects];
  }

  for (i in objects) (function (i, object) {
    if (object.domrender &&
        (object.domrender.type == 'CSSPlane' ||
         object.domrender.type == 'CSSHTML')) {

      var m = object.matrix.clone();
      var o = {
        position: object.position,
        rotation: object.rotation,
        scale: object.scale,
        matrix: m.transpose().flatten(),
        color: object.material.color,
        paletteColor: +object.material.paletteColor,
      };

      if (object.name != '') {
        o.name = object.name;
      }

      output.push(o);
    }
  })(i, objects[i])

  var json = JSON.stringify(output);

  // Minify constants to 6 decimals.
  json = json.replace(/([0-9]+\.[0-9]{6})[0-9]+/g, '$1');
  json = json.replace(/\},\{/g,"},\n{");

  return json;
};

/**
 * Unserialize JSON into planes.
 */
Acko.serialize.unzip = function (json) {

  var objects = [], data;

  try {
    switch (typeof json) {
      case 'object':
        data = (json.constructor == Array) ? json : [json];
        break;
      default:
        data = JSON.parse(json);
        break;
    }
    for (i in data) {
      objects.push(Acko.serialize.makePlane(data[i]));
    }
  } catch (e) {
    throw e;
    console.warn('Error unserializing JSON', json)
  }
  return objects;
};

/**
 * Unserialize a plane into a three.js object
 */
Acko.serialize.makePlane = function (properties) {
  properties = $.extend({
    position: new THREE.Vector3(),
    rotation: new THREE.Vector3(),
    scale: new THREE.Vector3(100, 100, 100),
    matrix: null,
    color: 0,
    paletteColor: 0,
    name: '',
  }, properties);

  // Enforce palette
  properties.color = properties.paletteColor ? Acko.serialize.palette[+properties.paletteColor] : properties.color;

  // Make material + 3D object.
  var material = new THREE.MeshBasicMaterial({ color: properties.color });
  var object = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material);
  object.material.paletteColor = properties.paletteColor;
  object.name = properties.name;

  // Copy position/rotation/scale/matrix
  object.position.copy(properties.position);
  object.rotation.copy(properties.rotation);
  object.scale = properties.scale;
  object.eulerOrder = 'YXZ';
  object.matrix = new THREE.Matrix4();
  if (properties.matrix) {
    object.matrix.set.apply(object.matrix, properties.matrix);
  }

  // Manage matrix manually.
  object.matrixAutoUpdate = false;
  object.matrixWorldNeedsUpdate = true;
  object.updateMatrixWorld(true);

  return object;
}

/**
 * Helper for generating the pre-defined palette.
 */
Acko.serialize.palette = (function () {

    // RGB string to hex color
    function s(s,q) {
      var f = s.split(/\s+/), i, t = 0;
      for (i in f) {
        t += (_mul(+f[i] / 255, q) * 255) << (8*(2-i));
      }
      return t;
    }

    // Gamma-correct color scaling.
    var gamma = 2.2;
    function _mul(x,f) { return Math.max(0, Math.min(1, Math.pow(Math.pow(x, gamma) * f, 1/gamma))); }

    var colors = [
      0x000000,
      s('254 239 234', .15),
      s('254 239 234', .2),
      s('254 239 234', .3),
      s('254 239 234', .4),
      s('254 239 234', .5),
      s('254 239 234', .7),
      s('254 239 234', 1),
      s('254 239 234', 1.4),
      0x808080,

      s('125 0 23', 1.8),
      s('185 0 19', 1.6),
      s('254 185 45', 1),//s('255 195 112', 1.6),
      s('255 228 176', 1.6),
      s('255 233 210', 1),//s('210 180 165', 1.8),
      s('255 160 26', 1.4),
      s('212 182 167', 1.8),
      s('183 149 131', 1),//s('210 180 165', .7),
      0x808080,
      0x808080,

      s('163 0 24', 1),
      s('215 0 22', 1),//s('185 0 19', 1.4),
      s('253 215 53', 1),//s('255 185 52', 1.4),
      s('255 228 176', 1.4),
      s('255 217 196', 1),//s('210 180 165', 1.6),
      s('255 163 26', 1.2),
      s('253 232 95', 1),//s('255 180 102', 1.8),
      s('210 180 165', .5),
      0x808080,
      0x808080,

      s('145 0 21', 1),
      s('200 0 22', 1),//s
      s('254 200 48', 1),//s('255 185 32', 1.2),
      s('253 245 169', 1),//s('255 228 176', 1.2),
      s('245 204 183', 1),// s('210 180 165', 1.4),
      s('255 160 26', 1),
      s('210 180 165', .3),
      0x808080,
      0x808080,
      0x808080,

      s('135 0 19', 1),
      s('185 0 19', 1),
      s('254 185 45', 1),//s('255 185 42', 1),
      s('254 222 154', 1),//s('255 228 176', 1),      
      s('230 190 169', 1),//s('210 180 165', 1.2),
      s('230 144 35', 1),//s('255 160 26', .8),
      s('234 170 40', 1),//s('216 157 35', 1.2),
      0x808080,
      0x808080,
      0x808080,

      s('125 0 23', 1),
      s('185 0 29', .7),
      s('216 137 37', 1.1),//s('255 185 42', .7),
      s('255 228 176', .7),
      s('213 175 155', 1),//s('210 180 165', 1),
      s('255 140 26', .5),
      s('200 170 155', 1),
      0x808080,
      0x808080,
      0x808080,
    ];

    return colors;
})();
