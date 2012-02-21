/**
 * Very spartan three.js CSS/DOM renderer.
 * by Steven Wittens
 * https://github.com/unconed/CSS3D.js
 *
 * ===========================================================================
 *
 * Places 3D transformed objects in the DOM, and controls the camera using
 * a perspective transform on a parent div.
 *
 * All rendering is done using the browser's render layers.
 *
 * ===========================================================================
 *
 * Only supports:
 * - THREE.Line (many vertices)
 * - THREE.PlaneGeometry mesh (one x/y segment)
 *
 * Planes can be rendered as solid rectangles, or used to contain arbitrary
 * DOM elements. If given a name, a text/html template is requested to fill the div.
 * 
 *
 * options {
 *   perspective: (optional) Override the DOM element which receives the camera's perspective.
 *                          or 'false' to override perspective manually.
 * }
 *
 */
window.Acko = window.Acko || {};

(function (Acko) {

/**
 * CSS 3D renderer for Three.JS.
 */
var CSS3D = Acko.CSS3DRenderer = function (options) {

  // Parse options.
  options = options || {};

  // Prepare render state.
  var
  _width, _height, _widthHalf, _heightHalf,
  _projScreenMatrix = new THREE.Matrix4(),
  _projScreenobjectMatrixWorld = new THREE.Matrix4(),

  // Prepare viewport + camera divs.
  _canvas = document.createElement('div'),
  _camera = document.createElement('div');

  _canvas.className = 'css3d-renderer';
  _camera.className = 'css3d-camera';

  _canvas.appendChild(_camera);

  this.domElement = _canvas;

  /**
   * Sets CSS 3D viewport size for perspective calculations.
   */
  this.setSize = function (width, height) {

    _width = width; _height = height;
    _widthHalf = _width / 2; _heightHalf = _height / 2;

  };

  /**
   * Render the scene using the given camera.
   *
   * DOM renderables are created for all objects.
   */
  this.render = function (scene, camera) {

    var objects, object, o,
        renderable,
        visible,
        color,
        lineLength, svg;

    scene.updateMatrixWorld();

    syncScene(scene);

    updateCamera(camera);

    objects = scene.objects;

    for ( o = 0, ol = objects.length; o < ol; o ++ ) {

      object = objects[ o ];
      domrender = object.domrender;

      // Ignore objects that have no updates.
      if (!domrender || !domrender.needsRender) continue;

      // Apply visibility state.
      if (object.visible) {
        if (!domrender.visible) {
          domrender.show();
        }
      }
      else {
        if (domrender.visible) {
          domrender.hide();
        }
      }

      // Update object and mark as done.
      domrender.update();
      domrender.needsRender = false;

    }
  };

  /**
   * Make renderable for object from the scene.
   */
  function addSceneObject(scene, object) {
    var domrender = object.domrender;
    if (typeof domrender == 'undefined') {
      domrender = object.domrender = CSS3D.Renderable.factory(object);
    }
    if (domrender) {
      domrender.insertInto(_camera);
    }
  }

  /**
   * Remove renderable for removed object in scene.
   */
  function removeSceneObject(scene, object) {
    var domrender = object.domrender;
    if (domrender) {
      domrender.remove();
    }
  }

  /**
   * Sync up with add/removed objects in the scene.
   */
  function syncScene(scene) {
    var i, object, domrender;

    // Insert new objects into the DOM
    while (scene.__objectsAdded.length) {
      addSceneObject(scene, scene.__objectsAdded[0]);
      scene.__objectsAdded.splice(0, 1);
    }

    // Remove deleted objects from the dom.
    while (scene.__objectsRemoved.length) {
      removeSceneObject(scene, scene.__objectsRemoved[0]);
      scene.__objectsRemoved.splice(0, 1);
    }
  }

  /**
   * Generate the transform for the given camera and perspective depth.
   */
  function cameraTransform(camera, perspective) {
    var t = '';

    var l = camera.position.length();

    camera.matrixWorldInverse.getInverse(camera.matrixWorld);

    t += 'translate3d(0,0,'+ epsilon(perspective) + 'px) ';
    t += CSS3D.toCSSMatrix(camera.matrixWorldInverse, true);
    t += ' translate3d('+ _widthHalf + 'px,'+ _heightHalf + 'px,0)';

    return t;
  }

  /**
   * Apply CSS transform for the given camera and set perspective.
   */
  function updateCamera(camera) {
    var perspective = .5 / Math.tan(camera.fov * π / 360) * _height;
    var transform = cameraTransform(camera, perspective);

    _camera.style.WebkitTransform = transform;
       _camera.style.MozTransform = transform;
         _camera.style.OTransform = transform;
        _camera.style.msTransform = transform;
          _camera.style.transform = transform;

    if (options.perspective !== false) {
      var element = options.perspective || CSS3D.perspective || _canvas,
          p = perspective + 'px';

      element.style.WebkitPerspective = p;
         element.style.MozPerspective = p;
           element.style.OPerspective = p;
          element.style.msPerspective = p;
            element.style.terspective = p;
    }

  }

  this.updateCamera = updateCamera;
}

/**
 * Get contents of script tag with the id "template-<id>".
 */
CSS3D.getTemplate = function (id) {
  var e = document.getElementById('template-' + id);
  return e && e.innerText;
};

/**
 * Convert material to RGBA.
 */
CSS3D.toCSSColor = function (material) {
  var color = material.color;
  return 'rgba('+
              (color.r * 255)+','+
              (color.g * 255)+','+
              (color.b * 255)+','
              +material.opacity+')';
}

/**
 * Convert THREE.js camera to CSS matrix.
 */
CSS3D.toCSSMatrix = function (matrix, invertCamera) {
  var m = matrix, c;
  if (invertCamera) {
    // Flip Y for difference in Y orientation between GL and CSS.
    c = [
      m.n11,-m.n21, m.n31, m.n41,
      m.n12,-m.n22, m.n32, m.n42,
      m.n13,-m.n23, m.n33, m.n43,
      m.n14,-m.n24, m.n34, m.n44,
    ];
  }
  else {
    c = [
      m.n11, m.n21, m.n31, m.n41,
      m.n12, m.n22, m.n32, m.n42,
      m.n13, m.n23, m.n33, m.n43,
      m.n14, m.n24, m.n34, m.n44,
    ];
  }

  for (var i in c) c[i] = epsilon(c[i]);

  return 'matrix3d('+c.join(',')+')';
}

/**
 * Base class for DOM renderable.
 */
CSS3D.Renderable = function (object) {
  this.object = object;

  this.needsRender = true;
  this.visible = true;
  this.selected = false;
  this.tagged = false;
  this.editable = false;

  this.$element = null;
  this.init();
};

CSS3D.Renderable.prototype = {
  // Active markup for the element.
  $markup: function () {
    return $('<div>');
  },

  // Prepare DOM view
  init: function () {
    this.$element = this.$markup();
  },

  // DOM manipulation
  insertInto: function (container) {
    $(container).append(this.$element);
  },

  remove: function () {
    this.$element.remove();
  },

  // Update/refresh object
  update: function () {

  },

  // Visibility
  show: function () {
    this.$element.show();
    this.visible = true;
  },

  hide: function () {
    this.$element.hide();
    this.visible = false;
  },
};


//////////////////////

/**
 * Renderable: DOM/HTML object.
 */
CSS3D.HTML = function (object) {
  this.object = null;
  this.type = 'CSSHTML';
  this.supr(object);
  this.editable = true;

  this.state = false;
};

CSS3D.HTML.v = new THREE.Vector4();

CSS3D.HTML.prototype = $.extend(new CSS3D.Renderable(), {

  // Straight DOM div
  $markup: function () {
    var $div = $('<div>');
    $div.css({
      position: 'absolute',
      WebkitTransformOrigin: '0% 0%',
         MozTransformOrigin: '0% 0%',
           OTransformOrigin: '0% 0%',
          msTransformOrigin: '0% 0%',
            transformOrigin: '0% 0%',
    });

    if (this.object.name != '') {
      $div.append(CSS3D.getTemplate(this.object.name));
    }
    $div.addClass('css3d-' + this.object.name);

    return $div;
  },

  // Simple transform
  transform: function (objectMatrixWorld) {
    return [
      CSS3D.toCSSMatrix(objectMatrixWorld),
    ].join(' ');
  },

  // Apple color and transform.
  update: function () {

    var object = this.object,
        objectMatrixWorld = object.matrixWorld,
        objectMaterial = object.material;

    // Text color.
    var color = CSS3D.toCSSColor(objectMaterial);

    // CSS transform
    var t = this.transform(objectMatrixWorld);
    this.$element.css({
      color: color,
      WebkitTransform: t,
         MozTransform: t,
           OTransform: t,
          msTransform: t,
            transform: t,
    });

    if (this.selected ^ this.state) {
      this.$element.css({ opacity: this.selected ? .75 : 1 });
      this.state = this.selected;
    }

  },

});
CSS3D.HTML.prototype.supr = CSS3D.Renderable;

///////////////////////

/**
 * Renderable: Solid plane.
 */
CSS3D.Plane = function (object) {
  this.object = null;
  this.type = 'CSSPlane';
  this.supr(object);
  this.editable = true;

  this.state = false;
};

CSS3D.Plane.v = new THREE.Vector4();

CSS3D.Plane.prototype = $.extend(new CSS3D.Renderable(), {

  // 1x1 px solid DIV
  $markup: function () {
    var $div = $('<div>');
    $div.css({
      position: 'absolute',
      width:  1 +'px',
      height: 1 +'px',
      WebkitTransformOrigin: '0% 0%',
    });
    $div[0].editRender = this;
    return $div;
  },

  // Object transform + given width/height
  transform: function (width, height, objectMatrixWorld) {

    // overdraw to avoid seams, 1px = 1 unit
    // width
    var l, fx, fy, v = CSS3D.Plane.v;
    v.set(objectMatrixWorld.n11, objectMatrixWorld.n21, objectMatrixWorld.n31, objectMatrixWorld.n41);
    l = width * v.length(),
    fx = (l+.25)/l;
    // height
    v.set(objectMatrixWorld.n12, objectMatrixWorld.n22, objectMatrixWorld.n32, objectMatrixWorld.n42);
    l = width * v.length(),
    fy = (l+.25)/l;

    return [
      CSS3D.toCSSMatrix(objectMatrixWorld),
      // fix for handedness issues in chrome
      'matrix3d(1,0,0,0, 0,1,0,0, 0,0,-1,0, 0,0,0,1)',
      'rotateY(180deg)',
      //
      'scale3d('+ epsilon(fx*width) +','+ epsilon(fy*height) +',1)',
      'translate3d('+ epsilon(-.5 * fx) +'px,'+ epsilon(-.5 * fy) +'px,0)',
    ].join(' ');
  },

  // Apply transform, color.
  update: function () {

    var object = this.object,
        objectGeometry = object.geometry,
        objectMatrixWorld = object.matrixWorld,
        objectMaterial = object.material,
        objectColor = objectMaterial.color;

    var vertices = objectGeometry.vertices;

    var width = vertices[1].position.x*2;
    var height = vertices[1].position.y*2;

    // Global plane color.
    var color = CSS3D.toCSSColor(objectMaterial);
    if (this.tagged) {
      color = 'rgba(30,90,170,.75)';
    }

    var t = this.transform(width, height, objectMatrixWorld);
    this.$element.css({
      background: color,
      WebkitTransform: t,
         MozTransform: t,
           OTransform: t,
          msTransform: t,
            transform: t,
      WebkitBackfaceVisibility: 'hidden',
         MozBackfaceVisibility: 'hidden',
           OBackfaceVisibility: 'hidden',
          msBackfaceVisibility: 'hidden',
            backfaceVisibility: 'hidden',
    });

    if (this.selected ^ this.state) {
      this.$element.css({ opacity: this.selected ? .75 : 1 });
      this.state = this.selected;
    }

  },

});
CSS3D.Plane.prototype.supr = CSS3D.Renderable;

///////////////////////

/**
 * Renderable: (Poly-)Line.
 */
CSS3D.Line = function (object) {
  this.object = null;
  this.type = 'CSSLine';
  this.supr(object);

  this.$lines = [];
  this.lineCount = 0;
};

CSS3D.Line.diff = new THREE.Vector3();

CSS3D.Line.prototype = $.extend(new CSS3D.Renderable(), {

  // Each line segment is a 1x1 px solid div.
  $line: function () {
    var $div = $('<div>');
    $div.css({
      position: 'absolute',
      width: 1 +'px',
      height: 1 +'px',
      WebkitTransformOrigin: '0% 0%',
         MozTransformOrigin: '0% 0%',
           OTransformOrigin: '0% 0%',
          msTransformOrigin: '0% 0%',
            transformOrigin: '0% 0%',
    });
    return $div;
  },

  // Get next available line segment (and instantiate DOM object).
  getNextLine: function () {
    var $line = this.$lines[this.lineCount];
    if (!$line) {
      this.$lines[this.lineCount] = $line = this.$line();
      this.$element.append($line);
    }
    this.lineCount++;
    return $line;
  },

  // Begin building new polyline
  newPass: function () {
    this.lineCount = 0;
  },

  // Cleanup left-over line segments.
  garbageCollect: function () {
    while (this.$lines.length > this.lineCount) {
      var $line = this.$lines.pop();
      $line.remove();
    }
  },

  // Get transform for line segment of given width and axis spin.
  transform: function (v1, v2, width, spin) {

    var d = CSS3D.Line.diff;
    d.sub(v2, v1);

    // Orient line using euler angles.
    function s(x) { return x*x };
    var phi = Math.atan2(d.z, d.x),
        theta = Math.atan2(d.y, Math.sqrt(s(d.z) + s(d.x)));

    // Transform 1 px square into a rectangle centered on the line.
    return [
      'translate3d('+ epsilon(v1.x) + 'px,' + epsilon(v1.y) + 'px,' + epsilon(v1.z) +'px)',
      'rotateY('+ epsilon(-phi)  +'rad)',
      'rotateZ('+ epsilon(theta) +'rad)',
      'rotateX('+ epsilon(spin)  +'deg)',
      'scale3d('+ epsilon(d.length()) +','+ epsilon(width) +',1)',
      'translate3d(0,-.5px,0)',
    ].join(' ');
  },

  // Generate/Update line segments as needed, apply color.
  update: function () {

    var object = this.object, v, $line,
        objectMatrixWorld = object.matrixWorld,
        objectMaterial = object.material,
        objectGeometry = object.geometry,
        vertices = objectGeometry.vertices;

    // Reset counts re: number of lines in this renderable.
    this.newPass();

    // Global line color.
    var color = CSS3D.toCSSColor(objectMaterial);

    // Pairwise vertex iteration.
    var v1 = vertices[0].position, v2, t;
    for (v = 1, vl = vertices.length; v < vl; v++) {

      v2 = v1;
      v1 = vertices[v].position;

      // Insert two lines in the scene at 90 degree angles.
      t = this.transform(v2, v1, object.material.linewidth, 0);
      $line = this.getNextLine();
      $line.css({
        backgroundColor: color,
        WebkitTransform: t,
           MozTransform: t,
             OTransform: t,
            msTransform: t,
      });

      t = this.transform(v2, v1, object.material.linewidth, 90);
      $line = this.getNextLine();
      $line.css({
        backgroundColor: color,
        WebkitTransform: t,
           MozTransform: t,
             OTransform: t,
            msTransform: t,
              transform: t,
      });

    }

    this.garbageCollect();
  }


});
CSS3D.Line.prototype.supr = CSS3D.Renderable;

////////////////////

/**
 * Return the appropriate renderable for a Three.JS object (if compatible).
 */
CSS3D.Renderable.factory = function (object) {
  if (object instanceof THREE.Mesh) {
    if (object.geometry instanceof THREE.PlaneGeometry) {
      if (object.name != '') {
        return new CSS3D.HTML(object);
      }
      else {
        return new CSS3D.Plane(object);
      }
    }
  }
  if (object instanceof THREE.Line) {
    return new CSS3D.Line(object);
  }
  return false;
}

// Allow for global perspective override.
CSS3D.perspective = null;

/**
 * Avoid issues with parsing scientific notation in CSS matrices.
 */
function epsilon(x) {
  if (Math.abs(x) < 1e-6) {
    return 0;
  }
  return x;
}

})(window.Acko);
