let renderer = new THREE.WebGLRenderer();
let scene = new THREE.Scene();
let aspect = window.innerWidth / window.innerHeight;
let camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 1500);
let cameraRotation = 0;
let cameraRotationSpeed = 0.001;
let cameraAutoRotation = true;
let orbitControls = new THREE.OrbitControls(camera);


let spotLight = new THREE.SpotLight(0xffffff, 1, 0, 10, 2);

let textureLoader = new THREE.TextureLoader();

let planetProto = {
  sphere: function (size) {
    let sphere = new THREE.SphereGeometry(size, 32, 32);
    return sphere;
  },
  material: function (options) {
    let material = new THREE.MeshPhongMaterial();
    if (options) {
      for (var property in options) {
        material[property] = options[property];
      }
    }
    return material;
  },
  glowMaterial: function (intensity, fade, color) {
    let glowMaterial = new THREE.ShaderMaterial({
      uniforms: {
        'c': { type: 'f', value: intensity },
        'p': { type: 'f', value: fade },
        glowColor: { type: 'c', value: new THREE.Color(color) },
        viewVector: { type: 'v3', value: camera.position }
      },
      vertexShader: `
        uniform vec3 viewVector;
        uniform float c;
        uniform float p;
        varying float intensity;
        void main() {
          vec3 vNormal = normalize( normalMatrix * normal );
          vec3 vNormel = normalize( normalMatrix * viewVector );
          intensity = pow( c - dot(vNormal, vNormel), p );
          gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
        }`,
      fragmentShader: `
        uniform vec3 glowColor;
        varying float intensity;
        void main() {
          vec3 glow = glowColor * intensity;
          gl_FragColor = vec4( glow, 1.0 );
        }`,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      transparent: true
    });
    return glowMaterial;
  },
  texture: function (material, property, uri) {
    let textureLoader = new THREE.TextureLoader();
    textureLoader.crossOrigin = true;
    textureLoader.load(
      uri,
      function (texture) {
        material[property] = texture;
        material.needsUpdate = true;
      });
  }
};

let createPlanet = function (options) {
  let surfaceGeometry = planetProto.sphere(options.surface.size);
  let surfaceMaterial = planetProto.material(options.surface.material);
  let surface = new THREE.Mesh(surfaceGeometry, surfaceMaterial);

  let atmosphereGeometry = planetProto.sphere(options.surface.size + options.atmosphere.size);
  let atmosphereMaterialDefaults = {
    side: THREE.DoubleSide,
    transparent: true
  };

  let atmosphereMaterialOptions = Object.assign(atmosphereMaterialDefaults, options.atmosphere.material);
  let atmosphereMaterial = planetProto.material(atmosphereMaterialOptions);
  let atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);

  let atmosphericGlowGeometry = planetProto.sphere(options.surface.size + options.atmosphere.size + options.atmosphere.glow.size);
  let atmosphericGlowMaterial = planetProto.glowMaterial(options.atmosphere.glow.intensity, options.atmosphere.glow.fade, options.atmosphere.glow.color);
  let atmosphericGlow = new THREE.Mesh(atmosphericGlowGeometry, atmosphericGlowMaterial);

  let planet = new THREE.Object3D();
  surface.name = 'surface';
  atmosphere.name = 'atmosphere';
  atmosphericGlow.name = 'atmosphericGlow';
  planet.add(surface);
  planet.add(atmosphere);
  planet.add(atmosphericGlow);

  for (let textureProperty in options.surface.textures) {
    planetProto.texture(
      surfaceMaterial,
      textureProperty,
      options.surface.textures[textureProperty]);
  }

  for (let textureProperty in options.atmosphere.textures) {
    planetProto.texture(
      atmosphereMaterial,
      textureProperty,
      options.atmosphere.textures[textureProperty]);
  }

  return planet;
};

let earth = createPlanet({
  surface: {
    size: 0.5,
    material: {
      bumpScale: 0.05,
      specular: new THREE.Color('grey'),
      shininess: 10
    },
    textures: {
      map: 'https://s3-us-west-2.amazonaws.com/s.cdpn.io/141228/earthmap1k.jpg',
      bumpMap: 'https://s3-us-west-2.amazonaws.com/s.cdpn.io/141228/earthbump1k.jpg',
      specularMap: 'https://s3-us-west-2.amazonaws.com/s.cdpn.io/141228/earthspec1k.jpg'
    }
  },
  atmosphere: {
    size: 0.003,
    material: {
      opacity: 0.8
    },
    textures: {
      map: 'https://www.solarsystemscope.com/textures/download/8k_earth_daymap.jpg',
      alphaMap: 'https://s3-us-west-2.amazonaws.com/s.cdpn.io/141228/earthcloudmaptrans.jpg'
    },
    glow: {
      size: 0.02,
      intensity: 0.7,
      fade: 7,
      color: 0x93cfef
    }
  }
});

let neoData = [
  { full_name: "Atira", a: 0.7, e: 0.3322, i: 25.62, height: 1.4, size: 0.03, velocity: 1},
  { full_name: "'Aylo'chaxnim", a: 0.55, e: 0.177, i: -15.8, height: 0.4, size: 0.04, velocity: -1.4},
  { full_name: "TG45", a: 2.1, e: 0.37, i: 23.33, height: 0.6, size: 0.06, velocity: 0.5, url: 'https://www.solarsystemscope.com/textures/download/2k_moon.jpg'},
  { full_name: "XZ130", a: 0.6, e: 0.45, i: 2.95, height: 0.4, size: 0.02, velocity: 0.6,},
  { full_name: "Moon", a: 4, e: 0.1, i: 5.1, height: 0.9, size: 0.15, velocity: 0.3, url: 'https://seang2341.github.io/Ksiezyc/'},
];

function orbitalToCartesian(a, e, i, theta) {
  const radian = Math.PI / 180;
  i *= radian;  
  theta *= radian;  

  const p = a * (1 - e * e);  
  const r = p / (1 + e * Math.cos(theta));  

  const x_orbital = r * Math.cos(theta);
  const y_orbital = r * Math.sin(theta);

  const x = x_orbital;
  const y = y_orbital * Math.cos(i);
  const z = y_orbital * Math.sin(i);

  return { x, y, z };
}

function placeNEOMarkers() {
    neoData.forEach(neo => {
        neo.theta = 0; 
        const markerMesh = createNEOMarker(neo);

        earth.getObjectByName('surface').add(markerMesh);
        neo.mesh = markerMesh;
    });
    
    function updateMarkers() {
        neoData.forEach(neo => {
            neo.theta += neo.velocity; 

            neo.theta = (neo.theta + 360) % 360;

            const { x, y, z } = orbitalToCartesian(neo.a, neo.e, neo.i, neo.theta);

            const latitude = (Math.asin(z / Math.sqrt(x * x + y * y + z * z)) * 180 / Math.PI);
            const longitude = (Math.atan2(y, x) * 180 / Math.PI);

            const newPosition = markerProto.latLongToVector3(latitude, longitude, 0.4, neo.height);
            neo.mesh.position.copy(newPosition);
        });

        requestAnimationFrame(updateMarkers);
    }

    updateMarkers();
}


function createNEOMarker(neo) {
  const theta = neo.theta; 
  const { x, y, z } = orbitalToCartesian(neo.a, neo.e, neo.i, theta);

  const latitude = (Math.asin(z / Math.sqrt(x * x + y * y + z * z)) * 180 / Math.PI);
  const longitude = (Math.atan2(y, x) * 180 / Math.PI);

  const geometry = new THREE.SphereGeometry(neo.size, 12, 12);
  const material = new THREE.MeshPhongMaterial({
    color: '#999999',
    shininess: 1,
    specular: 0x555555
  });
  const marker = new THREE.Mesh(geometry, material);

  const newPosition = markerProto.latLongToVector3(latitude, longitude, 0.4, neo.height);
  marker.position.copy(newPosition);
  marker.name = neo.full_name; 

  if (neo.url) {
    marker.userData.url = neo.url;
  }

  return marker;
}


const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

window.addEventListener('click', (event) => {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);

  const intersects = raycaster.intersectObjects(earth.getObjectByName('surface').children);

  if (intersects.length > 0) {
    const intersectedObject = intersects[0].object;

    if (intersectedObject.userData.url) {
      window.open(intersectedObject.userData.url, '_blank');
    }
  }
});

let markerProto = {
  latLongToVector3: function latLongToVector3(latitude, longitude, radius, height) {
      var phi = latitude * Math.PI / 180;
      var theta = (longitude - 180) * Math.PI / 180;

      var x = -(radius + height) * Math.cos(phi) * Math.cos(theta);
      var y = (radius + height) * Math.sin(phi);
      var z = (radius + height) * Math.cos(phi) * Math.sin(theta);

      return new THREE.Vector3(x, y, z);
  },
  
  marker: function marker(size, vector3Position) {
      let markerGeometry = new THREE.SphereGeometry(size);
      
      return markerMesh;
  }
};



let placeMarker = function (object, options) {
  let position = markerProto.latLongToVector3(options.latitude, options.longitude, options.radius, options.height);
  let marker = markerProto.marker(options.size, options.texture, position);
  object.add(marker);
};

let placeMarkerAtAddress = function (address, texture) {
  let encodedLocation = address.replace(/\s/g, '+');
  let httpRequest = new XMLHttpRequest();

  httpRequest.open('GET', 'https://maps.googleapis.com/maps/api/geocode/json?address=' + encodedLocation);
  httpRequest.send(null);
  httpRequest.onreadystatechange = function () {
    if (httpRequest.readyState == 4 && httpRequest.status == 200) {
      let result = JSON.parse(httpRequest.responseText);

      if (result.results.length > 0) {
        let latitude = result.results[0].geometry.location.lat;
        let longitude = result.results[0].geometry.location.lng;
      }
    }
  };
};


let galaxyGeometry = new THREE.SphereGeometry(100, 32, 32);
let galaxyMaterial = new THREE.MeshBasicMaterial({
  side: THREE.BackSide
});

let galaxy = new THREE.Mesh(galaxyGeometry, galaxyMaterial);

textureLoader.crossOrigin = true;
textureLoader.load(
  'https://s3-us-west-2.amazonaws.com/s.cdpn.io/141228/starfield.png',
  function (texture) {
    galaxyMaterial.map = texture;
    scene.add(galaxy);
  });

renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

camera.position.set(1, 1, 1);
orbitControls.enabled = !cameraAutoRotation;

scene.add(camera);
scene.add(spotLight);
scene.add(earth);

spotLight.position.set(1, 1, 1);

earth.receiveShadow = true;
earth.castShadow = true;
earth.getObjectByName('surface').geometry.center();

window.addEventListener('resize', function () {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

let render = function () {
  earth.getObjectByName('surface').rotation.y += 1 / 32 * 0.01;
  earth.getObjectByName('atmosphere').rotation.y += 1 / 16 * 0.01;
  if (cameraAutoRotation) {
    cameraRotation += cameraRotationSpeed;
    camera.position.y = 0;
    camera.position.x = 2 * Math.sin(cameraRotation);
    camera.position.z = 2 * Math.cos(cameraRotation);
    camera.lookAt(earth.position);
  }
  requestAnimationFrame(render);
  renderer.render(scene, camera);
};

render();

placeNEOMarkers();

var gui = new dat.GUI();
var guiCamera = gui.addFolder('Camera');
var guiSurface = gui.addFolder('Surface');
var guiMarkers = guiSurface.addFolder('Markers');
var guiAtmosphere = gui.addFolder('Atmosphere');
var guiAtmosphericGlow = guiAtmosphere.addFolder('Glow');

var cameraControls = new function () {
  this.speed = cameraRotationSpeed;
  this.orbitControls = !cameraAutoRotation;
}();

var surfaceControls = new function () {
  this.rotation = 0;
  this.bumpScale = 0.05;
  this.shininess = 10;
}();

var markersControls = new function () {
  this.address = '';
  this.color = '#A9A9A9';
  this.placeMarker = function () {
    placeMarkerAtAddress(this.address, this.color);
  };
}();

var atmosphereControls = new function () {
  this.opacity = 0.8;
}();

var atmosphericGlowControls = new function () {
  this.intensity = 0.7;
  this.fade = 7;
  this.color = 0x93cfef;
}();

guiCamera.add(cameraControls, 'speed', 0, 0.1).step(0.001).onChange(function (value) {
  cameraRotationSpeed = value;
});
guiCamera.add(cameraControls, 'orbitControls').onChange(function (value) {
  cameraAutoRotation = !value;
  orbitControls.enabled = value;
});

guiSurface.add(surfaceControls, 'rotation', 0, 6).onChange(function (value) {
  earth.getObjectByName('surface').rotation.y = value;
});
guiSurface.add(surfaceControls, 'bumpScale', 0, 1).step(0.01).onChange(function (value) {
  earth.getObjectByName('surface').material.bumpScale = value;
});
guiSurface.add(surfaceControls, 'shininess', 0, 30).onChange(function (value) {
  earth.getObjectByName('surface').material.shininess = value;
});

guiAtmosphere.add(atmosphereControls, 'opacity', 0, 8).onChange(function (value) {
  earth.getObjectByName('atmosphere').material.opacity = value;
});

guiAtmosphericGlow.add(atmosphericGlowControls, 'intensity', 0, 1).onChange(function (value) {
  earth.getObjectByName('atmosphericGlow').material.uniforms['c'].value = value;
});
guiAtmosphericGlow.add(atmosphericGlowControls, 'fade', 0, 50).onChange(function (value) {
  earth.getObjectByName('atmosphericGlow').material.uniforms['p'].value = value;
});
guiAtmosphericGlow.addColor(atmosphericGlowControls, 'color').onChange(function (value) {
  earth.getObjectByName('atmosphericGlow').material.uniforms.glowColor.value.setHex(value);
});
init();
animate();