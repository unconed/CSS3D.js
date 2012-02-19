CSS3D.js
========

by Steven Wittens

![CSS 3D renderer](https://raw.github.com/unconed/CSS3D.js/master/css3d.png)

#### CSS 3D renderer for Three.js ####

This experimental renderer was built for the design of [Acko.net](http://acko.net/blog/making-love-to-webkit). It lets you manage simple CSS 3D objects using Three.js.

Functionality is very limited: only planes and lines are supported (THREE.Line, THREE.PlaneGeometry). In its current form it is nowhere near a replacement for WebGL or Canvas, and browser support is buggy at best.

However, in the right setting, CSS 3D can be a useful and impressive effect, particularly when combined with parallax scrolling. I think it shows that there is a case to be made to integrate 3D more tightly into the DOM, with arbitrary meshes and shaders. In the meantime, this library opens the door for more complicated experimentation and prototyping of 3D Web UI concepts.

I don't intend to maintain or develop this further, so forking is encouraged.

#### Browser support ####

Currently, it only works in Chrome and Safari. Firefox doesn't seem to reliably support the necessary cascading of preserve-3d transforms.

#### Usage ####
  
Initialize the renderer like any other Three.js renderer, using:

    var renderer = new Acko.CSS3DRenderer({
      perspective: ... // optional
    });

By default, the renderer wraps itself in a CSS perspective for the camera. Use `perspective` to specify a custom DOM element which will receive the camera's CSS perspective instead. You can use this to link the renderer to a page-wide parallax effect. Or, specify 'false' to forego camera perspective and hardcode it yourself.
  
To nest the CSS 3D renderer, make sure you apply `transform-style: preserve-3d` as necessary.

The file `css3d.css` contains useful default styles.

#### Editor ####

A simple keyboard operator editor is included in <a href="editor.html">editor.html</a>. The scene is serialized into the textfield at the bottom. Copy/paste this into data.js to save it.

*Controls*

 * Click+Drag — Orbit camera</li>
 * Enter — New object</li>
 * Space — Clone object</li>
 * Backspace — Delete object</li>
 * Tab / Shift+Tab — Cycle through objects</li>
 * WASD/QE — Move object</li>
 * Shift+WASD/QE — Resize object</li>
 * Ctrl+WASD/QE — Move camera</li>
 * [] — Lower/raise units</li>
 * ZX — Orbit distance</li>
 * T/T/U — Tag/untag/untag all</li>

The scene editor was developed specifically for Acko.net and lacks many features (like custom colors). Colors are hardcoded in serialize.js.

© 2012 Steven Wittens - [MIT License](LICENSE.txt).

</body>
</html>
