/**
 * Widget wrapper to place Three.js scenes in the DOM.
 */
window.Acko = window.Acko || {};

Acko.hasWebGL = function () {
  try {
    return !!window.WebGLRenderingContext &&
           !!document.createElement('canvas').getContext('experimental-webgl');
  } catch(e) {
    return false;
  }
};

Acko.Scene = function (element, options) {

  options = options || {};

  this.mode = options.mode;
  this.fov = options.fov || 85;
  this.editor = options.editor;
  this.load = options.load;
  this.data = options.data || [];

  this.continuous = !!options.continuous;
  this.init($(element)[0]);

  this.load && this.initScene();
  this.editor && this.initDebug();

  this.loop();

};

Acko.Scene.prototype = {

  init: function (element) {
    // Set the scene size based on the container or window.
    this.element = element;
    this.width = element.offsetWidth || window.innerWidth,
    this.height = element.offsetHeight || 800;

    // Track resizes.
    var that = this;
    $(window).resize(function () {
      that.resize();
    });

    // Create a Three.JS renderer
    switch (this.mode) {
      case 1:
      this.renderer = new THREE.WebGLRenderer({ antialias: true });
      break;

      case 2:
      this.renderer = new Acko.CSS3DRenderer();
      break;

      case 3:
      this.renderer = new THREE.SVGRenderer();
      break;

      case 4:
      this.renderer = new THREE.CanvasRenderer();
      break;
    }

    this.renderer.debug = this.editor;

    // Start the renderer
    this.renderer.setSize(this.width, this.height);

    // Insert into DOM
    $(element).append(this.renderer.domElement);

    // Set some camera attributes
    var VIEW_ANGLE = this.fov,
        ASPECT = this.width / this.height,
        NEAR = 1,
        FAR = 10000;

    this.camera = new THREE.PerspectiveCamera(
                       VIEW_ANGLE,
                       ASPECT,
                       NEAR,
                       FAR );
    this.camera.name = 'Camera';

    // Set up camera controls
    this.controls = new Acko.SceneControls(this.camera, document.body, this.editor);
    this.controls.link();

    // Editor tweaks
    if (this.editor) {
      this.controls.theta = .5;
      this.controls.phi = 1;
      this.controls.update();

      var that = this;
      setTimeout(function () {
        that.controls.syncLinked();
      }, 0);
    }

    // Allow linking up with embedded editor.
    function onMessage(e) {
      var message = e.data;
      if (message.sceneUpdate) {
        that.data = message.sceneUpdate;
        that.initScene();
      }
    }
    window.addEventListener('message', onMessage, false);

    // Spawn new scene.
    this.scene = new THREE.Scene();
    this.scene.add(this.camera);
  },

  // Respond to resize of container.
  resize: function () {
    // set the scene size
    this.width = this.element.offsetWidth || window.innerWidth,
    this.height = this.element.offsetHeight || 800;

    this.renderer.setSize(this.width, this.height);

    if (!this.continuous) {
      this.render();
    }
  },

  // Render loop.
  loop: function () {
    var that = this;
    this.render(function () {
      that.continuous && that.loop();
    });
  },

  // Request scene render.
  render: function (callback) {
    if (!this.pending) {
      this.pending = true;

      var that = this;
      window.requestAnimationFrame(function () {
        that.pending = false;
        that._render();
        callback && callback();
      });
    }
  },

  // Render scene.
  _render: function () {
    this.renderer.render(this.scene, this.camera);
  },

  // Wipe scene.
  clearScene: function () {
    while (this.scene.objects.length) {
      this.scene.remove(this.scene.objects[0]);
    }
  },

  // Load scene data.
  initScene: function () {
    this.clearScene();

    var that = this, i;
    var objects = Acko.serialize.unzip(this.data);
    for (i in objects) {
      var object = objects[i];
      this.scene.add(object);
    }

  },

  // Spawn debug grid
  initDebug: function () {

    var axisLength = 25, gridStep = 100, o = 50;

    var info = [
      [ [ -axisLength * .25, 0, 0 ], [ axisLength, 0, 0 ], 0xba3615 ],
      [ [ 0, -axisLength * .25, 0 ], [ 0, axisLength, 0 ], 0x65970b ],
      [ [ 0, 0, -axisLength * .25 ], [ 0, 0, axisLength ], 0x4362d1 ],
    ];

    var positions = [],
        xticks = [-200, -100, 0, 100, 200],
        zticks = [-200, -100, 0, 100, 200];
    $.each(zticks, function (i,z) {
      $.each(xticks, function (i,x) {
        positions.push(new THREE.Vector3(x, 0, z));
      });
    });

    for (var j = positions.length - 1; j >= 0; j--) {
      var p = positions[j];
      for (var i = 0; i < info.length; i++) {
        geometry = new THREE.Geometry();

        geometry.vertices.push(new THREE.Vertex(new THREE.Vector3(info[i][0][0] + p.x, info[i][0][1] + p.y, info[i][0][2] + p.z)));
        geometry.vertices.push(new THREE.Vertex(new THREE.Vector3(info[i][1][0] + p.x, info[i][1][1] + p.y, info[i][1][2] + p.z)));

        var line = new THREE.Line(geometry, new THREE.LineBasicMaterial({color: info[i][2], opacity: 0.25, linewidth: 3 }));
        this.scene.add(line);
      }
    }
  }
};
