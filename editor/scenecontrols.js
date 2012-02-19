/**
 * Mouse and keyboard controls for an orbiting camera.
 */
Acko.SceneControls = function (camera, domElement, easy) {
  this.element = domElement;
  this.camera = camera;

  this.easy = easy;

  this.initState();
  this.bindMouse();
  this.update();
};

Acko.SceneControls.linked = [];

Acko.SceneControls.prototype = {

  initState: function () {
    this.width = this.element.offsetWidth,
    this.height = this.element.offsetHeight;
    this.phi = Math.PI / 2;
    this.theta = 0;
    this.orbit = 1000;
    this.dragSpeed = 2;
    this.linked = false;
    this.offsetX = 0;
    this.offsetY = 0;
    this.offsetZ = 0;
  },

  link: function () {
    Acko.SceneControls.linked.push(this);
    this.linked = true;
  },

  bindMouse: function () {
    var that = this;

    this.easy &&
    $(document).keydown(function (e) {
      if (e.metaKey) return;
      var move = { x: 0, y: 0, z: 0 };

      switch (e.keyCode) {
        case 90: // z
          that.orbit += 100;
          break;
        case 88: // x
          that.orbit -= 100;
          break;

        case 65: // a
          move.x -= 50;
          break;
        case 68: // d
          move.x += 50;
          break;
        case 87: // w
          move.z -= 50;
          break;
        case 83: // s
          move.z += 50;
          break;
        case 81: // q
          move.y += 50;
          break;
        case 69: // e
          move.y -= 50;
          break;
      }

      if (event.ctrlKey) {
        if (move.x || move.z) {
          that.offsetZ -= move.x * Math.cos(that.phi) - move.z * Math.sin(that.phi);
          that.offsetX += move.x * Math.sin(that.phi) + move.z * Math.cos(that.phi);
        }
        if (move.y) {
          that.offsetY += move.y;
        }
      }

      that.syncLinked();
    })

    this.element.addEventListener('mousedown', function (event) {
      that.drag = that.easy || event.shiftKey;
      that.lastHover = that.dragOrigin = { x: event.pageX, y: event.pageY };
    }, false);
    this.element.addEventListener('mouseup', function (event) {
      that.drag = false;
    }, false);
    this.element.addEventListener('mousemove', function (event) {
      if (that.drag) {
        var relative = { x: event.pageX - that.dragOrigin.x, y: event.pageY - that.dragOrigin.y },
            delta = { x: event.pageX - that.lastHover.x, y: event.pageY - that.lastHover.y };
        that.lastHover = { x: event.pageX, y: event.pageY };
        that.handleMouseMove(that.dragOrigin, relative, delta);
      }
    }, false);
  },

  syncLinked: function () {
    var ox = this.offsetX,
        oy = this.offsetY,
        oz = this.offsetZ,
        orbit = this.orbit,
        phi = this.phi,
        theta = this.theta;

    var list = this.linked ? Acko.SceneControls.linked : [this];

    for (var i in list) (function (control) {
      control.offsetX = ox;
      control.offsetY = oy;
      control.offsetZ = oz;
      control.orbit = orbit;
      control.phi = phi;
      control.theta = theta;
      control.update();
    })(list[i]);
  },

  handleMouseMove: function (origin, relative, delta) {
    this.phi = this.phi + delta.x * this.dragSpeed / this.width;
    this.theta = Math.min(π/2, Math.max(-π/2, this.theta + delta.y * this.dragSpeed / this.height));

    this.syncLinked();
  },

  update: function () {
    this.camera.position.x = this.offsetX + Math.cos(this.phi) * Math.cos(this.theta) * this.orbit;
    this.camera.position.y = this.offsetY + Math.sin(this.theta) * this.orbit;
    this.camera.position.z = this.offsetZ + Math.sin(this.phi) * Math.cos(this.theta) * this.orbit;

    this.camera.lookAt(new THREE.Vector3(this.offsetX, this.offsetY, this.offsetZ));
  },

};

