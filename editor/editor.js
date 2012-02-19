/**
 * Three.js scene editor for CSS3D objects.
 */
window.Acko = window.Acko || {};

$(function () {

  // Initialize scene.
  var $section = $('section'),
      $css3d;
  setTimeout(function () {

    // Viewport
    var demo = new Acko.Scene('#hackery', {
      mode: 2,
      fov: 55,
      editor: true,
      load: true,
      data: Acko.sceneData,
      continuous: true,
    });

    // Selection overlay
    var overlay = new Acko.Scene('#overlay', {
      mode: 2,
      fov: 55,
      editor: false,
      load: false,
      continuous: true,
    });

    // Spawn editor
    var editor = new Acko.Editor('body', demo, overlay);

    // Fix for weird safari rendering bug where nothing shows up until you twiddle the CSS.
    setTimeout(function () {
      $('header').css('height', 'auto');
      setTimeout(function () {
        $('header').css('height', '100%');
      }, 0);
    }, 10);

  }, 200);

});

/**
 * Editor controller
 */
Acko.Editor = function (element, demo, overlay) {

  this.demo = demo;
  this.scene = demo.scene;
  this.canvas = demo.renderer.domElement;

  this.overlay = overlay;
  this.overscene = overlay && overlay.scene;

  this.init($(element)[0]);
  this.prepareOverlay();

  this.moveStep = 2.5;
  this.scaleStep = 5;
  this.angleStep = τ / 24;

  this.editables = [];
  this.selected = false;
  this.selectedColor = 0;

  this.update();
};

Acko.Editor.prototype = {

  // Editor control view of doom.
  $markup: function () {
    var $div = $('<div id="editor"><div class="swatches"></div><div class="controls"></div><textarea class="output"></textarea><div class="info"></div></div>'),
        $swatches = $div.find('.swatches'),
        $controls = $div.find('.controls'),
        i, that = this;

    // Color swatches
    var colors = Acko.serialize.palette;
    for (i in colors) (function (i, color) {
      var $swatch = $('<div class="swatch">'+ (i) +'</div>');
      $swatch.css('backgroundColor', Acko.Editor.toCSSColor(colors[i]));
      $swatch.click(function () {
        that.applyColor(i);
      });
      $swatches.append($swatch);
    })(i, colors[i]);

    // toolbar
    var controls = {
      13: '+',
      8: '–',
      32: '⌥',
      '-': null,
      49: '↺ X',
      50: 'X ↻',
      51: '↺ Y',
      52: 'Y ↻',
      53: '↺ Z',
      54: 'Z ↻',
    }
    for (i in controls) (function (callback, label) {
      var $button = label ? $('<button>'+ label +'</button>') : $('<span class="spacer">');
      $button.click(function () {
        var o = that.getSelectedObject();
        if ((callback == 13) || o) {
          var e = jQuery.Event('keydown');
          e.keyCode = +callback;
          handleKey(e);
        }
      });
      $controls.append($button);
    })(i, controls[i]);

    // Double click = unselect
    $('.css3d-renderer').dblclick(function (e) {
      if ($(e.target).is('button')) return;
      that.unselect();
    });

    // Key shortcuts
    function handleKey(e) {
      if (e.metaKey || e.ctrlKey) return;

      var eventReturn, abortTagged;

      var o = that.getSelectedObject(), os = [], i;
      if (o) {
        os = [o];

        // Prepare list of tagged objects.
        if (o.domrender.tagged) {
          for (i in that.editables) (function (oo) {
            if (oo.domrender.tagged && oo != o) {
              os.push(oo);
            }
          })(that.editables[i]);
        }
      }

      // Global commands
      switch (e.keyCode){
        case 219: // [
          that.moveStep *= .1;
          that.scaleStep *= .1;
          that.angleStep *= .1;
          break;

        case 221: // ]
          that.moveStep *= 10;
          that.scaleStep *= 10;
          that.angleStep *= 10;
          break;

        case 13: // return
          that._add();
          break;
      }

      // Object commands
      for (i in os) (function (o) {
        if (abortTagged) return;

        var c = e.shiftKey;
        switch (e.keyCode){
          case 65: // a
            c ? that._scaleX(o, -1) : that._moveX(o, -1);
            break;
          case 68: // d
            c ? that._scaleX(o, 1) : that._moveX(o, 1);
            break;
          case 87: // w
            c ? that._scaleY(o, 1) : that._moveZ(o, -1);
            break;
          case 83: // s
            c ? that._scaleY(o, -1) : that._moveZ(o, 1);
            break;
          case 81: // q
            c ? that._scaleZ(o, 1) : that._moveY(o, 1);
            break;
          case 69: // e
            c ? that._scaleZ(o, -1) : that._moveY(o, -1);
            break;

          case 84: // t
            that._tag(o);
            abortTagged = true;
            break;
          case 85: // u
            if (!o.domrender.tagged)
              that._tag(o);
            that._tag(o);
            break;

          case 49: // 1
            that._rotateXR(o);
            break;
          case 50: // 2
            that._rotateXL(o);
            break;
          case 51: // 3
            that._rotateYR(o);
            break;
          case 52: // 4
            that._rotateYL(o);
            break;
          case 53: // 5
            that._rotateZR(o);
            break;
          case 54: // 6
            that._rotateZL(o);
            break;

          case 32: // space
            that._copy(o);
            break;
          case 8: // backspace
            that._remove(o);
            break;
          default:
            return;
        }
        that.updateObjectMatrix(o);
        eventReturn = false;
      })(os[i]);

      return eventReturn;
    }

    $(document).keydown(handleKey);

    return $div;
  },

  // Generate a new object matrix based on pos/rot/scale
  updateObjectMatrix: function (object) {
    var m = new THREE.Matrix4();
    var s = object.scale,
        p = object.position;

    object.matrix.identity();

    m.set(
      1,   0,   0,   p.x,
      0,   1,   0,   p.y,
      0,   0,   1,   p.z,
      0,   0,   0,   1//,
    );
    object.matrix.multiplySelf(m);

    m.setRotationFromEuler(object.rotation, object.eulerOrder);
    object.matrix.multiplySelf(m);

    m.set(
      s.x, 0,   0,   s.x/2,
      0,   s.y, 0,   s.y/2,
      0,   0,   s.z, 0,
      0,   0,   0,   1//,
    );
    object.matrix.multiplySelf(m);

    object.updateMatrixWorld(true);
    if (object.domrender) {
      object.domrender.needsRender = true;
    }
    this.update();
  },

  // Add object into scene/editor.
  addObject: function (object) {
    var object = object || Acko.serialize.unzip({ paletteColor: this.selectedColor })[0];

    this.updateObjectMatrix(object);

  	this.scene.add(object);
  	this.update();
  },

  // Remove object from scene/editor.
  removeObject: function (object) {
    this.scene.remove(object);
  	this.update();
  },

  // Change an object's color
  applyColor: function (n) {
    var object = this.getSelectedObject();
    if (object) {
      object.material.color = Acko.Editor.toMaterialColor(Acko.serialize.palette[n]);
      object.material.paletteColor = n;
      object.domrender.needsRender = true;
    }
    this.selectedColor = +n;
    this.update();
  },

  //////////////
  // command callbacks

  _copy: function (object) {
    var objects = Acko.serialize.unzip(Acko.serialize.zip(object));
    if (object.domrender.tagged) {
      object.domrender.tagged = false;
      setTimeout(function () {
        objects[0].domrender.tagged = true;
      }, 30);
      object.updateMatrixWorld(true);
    }
    this.addObject(objects[0]);
  },

  _add: function (object) {
    this.addObject();
  },

  _remove: function (object) {
    this.select(this.selected - 1);
    this.removeObject(object);
  },

  _scaleX: function (object, d) {
    object.scale.x += d * this.scaleStep;
  },

  _scaleY: function (object, d) {
    object.scale.y += d * this.scaleStep;
  },

  _scaleZ: function (object, d) {
    object.scale.z += d * this.scaleStep;
  },

  _moveX: function (object, d) {
    object.position.x += d * this.moveStep;
  },

  _moveY: function (object, d) {
    object.position.y += d * this.moveStep;
  },

  _moveZ: function (object, d) {
    object.position.z += d * this.moveStep;
  },

  _rotateXL: function (object) {
    object.rotation.x -= this.angleStep;
  },

  _rotateXR: function (object) {
    object.rotation.x += this.angleStep;
  },

  _rotateYL: function (object) {
    object.rotation.y -= this.angleStep;
  },

  _rotateYR: function (object) {
    object.rotation.y += this.angleStep;
  },

  _rotateZL: function (object) {
    object.rotation.z += - this.angleStep;
  },

  _rotateZR: function (object) {
    object.rotation.z += this.angleStep;
  },

  _tag: function (object) {
    object.domrender.tagged = !object.domrender.tagged;
  },

  //////////////

  // Prepare view
  init: function (element) {
    this.container = element;
    this.$element = this.$markup();
    this.$swatches = this.$element.find('.swatch');
    this.$info = this.$element.find('.info');

    $('body').addClass('css3d-editor');
    $(this.demo.renderer.domElement).addClass('css3d-editor');
    $(this.overlay.renderer.domElement).addClass('css3d-editor');

    $(this.container).append(this.$element);

    var that = this;
    $(document).keydown(function (e) {
      if (e.keyCode == 9) {
        that[e.shiftKey ? 'previous' : 'next']();
        return false;
      }
    });

  },

  // Select next object
  next: function () {
    if (this.selected === false) {
      this.select(0);
    }
    else {
      this.select(this.selected + 1);
    }
  },

  // Select previous object
  previous: function () {
    if (this.selected === false) {
      this.select(this.editables.length - 1);
    }
    else {
      this.select(this.selected - 1);
    }
  },

  // Clear selection
  unselect: function () {
    if (this.selected !== false) {
      var render = this.getSelectedRender();
      render.selected = false;
      render.needsRender = true;

      this.selected = false;

      this.$swatches.removeClass('selected');
    }
    this.updateOverlay();
  },

  // Select object
  select: function (i) {
    this.unselect();

    if (i < 0 || i >= this.editables.length) return;

    this.selected = i;

    var render = this.getSelectedRender();
    render.selected = true;
    render.needsRender = true;

    var object = this.getSelectedObject();
    $(this.$swatches[object.material.paletteColor]).addClass('selected');

    this.updateOverlay();
  },

  // Get renderable for selected object
  getSelectedRender: function () {
    return this.editables[this.selected].domrender;
  },

  // Get selected object
  getSelectedObject: function () {
    return this.editables[this.selected];
  },

  // Request update of editor view
  update: function () {
    var that = this;
    if (this.updateTimer) return;
    this.updateTimer = setTimeout(function () {
      that._update();
      that.updateTimer = null;
    }, 30);
  },

  // Update editor view
  _update: function () {

    var that = this,
        fresh = false;
        old = this.editables;

    this.editables = [];

    // Look for new editables.
    var i;
    for (i in this.scene.objects) (function (i, object) {
      var r = object.domrender;
      if (r.editable) {
        if (!fresh && (old.indexOf(object) == -1)) {
          fresh = that.editables.length;
        }
        that.editables.push(object);
      }
    })(i, this.scene.objects[i]);

    // Select new objects.
    if (fresh !== false) {
      this.select(fresh);
    }

    // Update serialization.
    this.serialize();

    // Update selection overlay.
    this.updateOverlay();

  },

  //////////////
  prepareOverlay: function () {

    // XYZ axes
    var colors = [
      0xff3615,
      0x85de3b,
      0x4382df,
    ];

    this.overlays = [];
    for (var i = 0; i < 3; i++) {
      geometry = new THREE.Geometry();

      geometry.vertices.push(new THREE.Vertex(new THREE.Vector3(0, 0, 0)));
      geometry.vertices.push(new THREE.Vertex(new THREE.Vector3(0, 0, 0)));

      var line = new THREE.Line(geometry, new THREE.LineBasicMaterial({color: colors[i], opacity: 0.8, linewidth: 3 }));
      this.overscene.add(line);

      this.overlays.push(line);
    }

  },

  updateOverlay: function () {

    var o = this.getSelectedObject();

    // Make sure overlay is repainted
    for (i in this.overlays) {
      this.overlays[i].domrender.needsRender = true;
      this.overlays[i].visible = !!o;
    }

    if (!o) return;

    // Position XYZ axes.
    var axisLength = 1;

    var info = [
      [ [ -axisLength/2, -axisLength/2, 0 ], [ axisLength/2, -axisLength/2, 0 ], 0xba3615 ],
      [ [ -axisLength/2, -axisLength/2, 0 ], [ -axisLength/2, axisLength/2, 0 ], 0x65970b ],
      [ [ -axisLength/2, -axisLength/2, 0 ], [ -axisLength/2, -axisLength/2, axisLength ], 0x4362d1 ],
    ];

    var v = new THREE.Vector3(), vertices;

    for (var i = 0; i < info.length; i++) {
      vertices = this.overlays[i].geometry.vertices;

      v.set(info[i][0][0], info[i][0][1], info[i][0][2]);
      o.matrixWorld.multiplyVector3(v);
      vertices[0] = new THREE.Vertex(v.clone());

      v.set(info[i][1][0], info[i][1][1], info[i][1][2]);
      o.matrixWorld.multiplyVector3(v);
      vertices[1] = new THREE.Vertex(v.clone());
    }

    // Update property display
    var object = this.getSelectedObject(), text = '';
    if (object) {
      var p = object.position,
          r = object.rotation,
          s = object.scale;

          function c(x) {
            return (''+x).substring(0,5);
          }

      text = [
      'Position: &nbsp;' + c(p.x) + ', &nbsp;' + c(p.y) + ', &nbsp;' + c(p.z),
      'Rotation: &nbsp;' + c(r.x) + ', &nbsp;' + c(r.y) + ', &nbsp;' + c(r.z),
      'Scale: &nbsp;' + c(s.x) + ', &nbsp;' + c(s.y) + ', &nbsp;' + c(s.z),
      ].join('<br>');
    }
    this.$info.html(text);

  },

  //////////////////////////////////////////////////////////////

  serialize: function () {
    var that = this;
    setTimeout(function () {

      var output = Acko.serialize.zip(that.scene.objects);

      var parents = [window.opener, window.parent];
      $.each(parents, function () {
        if (this && (this != window)) {
          this.postMessage({ 'sceneUpdate': output }, '*');
        }
      });

      $('textarea.output').val('Acko.sceneData = '+ output +';\n\n');

    }, 0);
  },

};

Acko.Editor.toCSSColor = function (color) {
  var r = color >> 16,
      g = (color >> 8) & 0xFF,
      b = color & 0xFF;

  return 'rgb('+r+','+g+','+b+')';
}

Acko.Editor.toMaterialColor = function (color) {
  var r = color >> 16 & 0xFF,
      g = (color >> 8) & 0xFF,
      b = color & 0xFF;

  return {r:r/255,g:g/255,b:b/255};
}
