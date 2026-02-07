const VSHADER_SOURCE = `
precision mediump float;

attribute vec2 a_Position;

void main() {
  gl_Position = vec4(a_Position, 0.0, 1.0);
}
`;

const FSHADER_SOURCE = `
precision mediump float;

uniform vec4 u_FragColor;

void main() {
  gl_FragColor = u_FragColor;
}
`;

let canvas = null;
let gl = null;

let a_Position = null;
let u_FragColor = null;

let vertexBuffer = null;

let g_selectedColor = [0.5, 0.5, 1.0, 1.0];
let g_selectedSize = 20;
let g_selectedSegments = 12;
let g_selectedType = "square";

let shapesList = [];
let g_isDragging = false;
let g_lastPos = null;
let g_strokeStep = 0.02;

class Square {
  constructor(position, color, sizePx) {
    this.position = position;
    this.color = color;
    this.sizePx = sizePx;
  }

  render() {
    const x = this.position[0];
    const y = this.position[1];

    const sx = (this.sizePx / canvas.width) * 2.0;
    const sy = (this.sizePx / canvas.height) * 2.0;

    const hx = sx / 2.0;
    const hy = sy / 2.0;

    const verts = new Float32Array([
      x - hx, y - hy,
      x + hx, y - hy,
      x + hx, y + hy,

      x - hx, y - hy,
      x + hx, y + hy,
      x - hx, y + hy
    ]);

    drawVerts(verts, this.color, gl.TRIANGLES);
  }
}

class Triangle {
  constructor(position, color, sizePx) {
    this.position = position;
    this.color = color;
    this.sizePx = sizePx;
  }

  render() {
    const x = this.position[0];
    const y = this.position[1];

    const sx = (this.sizePx / canvas.width) * 2.0;
    const sy = (this.sizePx / canvas.height) * 2.0;

    const hx = sx / 2.0;
    const hy = sy / 2.0;

    const verts = new Float32Array([
      x, y + hy,
      x - hx, y - hy,
      x + hx, y - hy
    ]);

    drawVerts(verts, this.color, gl.TRIANGLES);
  }
}

class Circle {
  constructor(position, color, sizePx, segments) {
    this.position = position;
    this.color = color;
    this.sizePx = sizePx;
    this.segments = segments;
  }

  render() {
    const x = this.position[0];
    const y = this.position[1];

    const sx = (this.sizePx / canvas.width) * 2.0;
    const sy = (this.sizePx / canvas.height) * 2.0;

    const r = Math.min(sx, sy) / 2.0;

    const n = Math.max(3, this.segments);
    const verts = [];

    verts.push(x, y);

    for (let i = 0; i <= n; i++) {
      const a = (i / n) * Math.PI * 2.0;
      verts.push(x + r * Math.cos(a), y + r * Math.sin(a));
    }

    drawVerts(new Float32Array(verts), this.color, gl.TRIANGLE_FAN);
  }
}

function main() {
  setupWebGL();
  connectVariablesToGLSL();
  connectUI();
  handleClicks();

  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  renderAllShapes();
}

function setupWebGL() {
  canvas = document.getElementById("webgl");

  gl = canvas.getContext("webgl", { preserveDrawingBuffer: true });
  if (!gl) {
    gl = getWebGLContext(canvas);
  }

  if (!gl) {
    console.log("Failed to get WebGL context.");
  }
}

function connectVariablesToGLSL() {
  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.log("Failed to initialize shaders.");
    return;
  }

  a_Position = gl.getAttribLocation(gl.program, "a_Position");
  if (a_Position < 0) {
    console.log("Failed to get a_Position.");
    return;
  }

  u_FragColor = gl.getUniformLocation(gl.program, "u_FragColor");
  if (!u_FragColor) {
    console.log("Failed to get u_FragColor.");
    return;
  }

  vertexBuffer = gl.createBuffer();
  if (!vertexBuffer) {
    console.log("Failed to create buffer.");
    return;
  }

  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_Position);
}

function connectUI() {
  const redSlider = document.getElementById("redSlider");
  const greenSlider = document.getElementById("greenSlider");
  const blueSlider = document.getElementById("blueSlider");
  const sizeSlider = document.getElementById("sizeSlider");
  const segSlider = document.getElementById("segSlider");

  const clearButton = document.getElementById("clearButton");
  const birdButton = document.getElementById("drawPictureButton");

  const squareButton = document.getElementById("squareButton");
  const triangleButton = document.getElementById("triangleButton");
  const circleButton = document.getElementById("circleButton");

  function updateColor() {
    const r = Number(redSlider.value) / 255;
    const g = Number(greenSlider.value) / 255;
    const b = Number(blueSlider.value) / 255;
    g_selectedColor = [r, g, b, 1.0];
  }

  function updateSize() {
    g_selectedSize = Number(sizeSlider.value);
  }

  function updateSegments() {
    g_selectedSegments = Number(segSlider.value);
  }

  redSlider.addEventListener("input", updateColor);
  greenSlider.addEventListener("input", updateColor);
  blueSlider.addEventListener("input", updateColor);

  sizeSlider.addEventListener("input", updateSize);
  segSlider.addEventListener("input", updateSegments);

  clearButton.addEventListener("click", () => {
    shapesList = [];
    renderAllShapes();
  });

  birdButton.addEventListener("click", () => {
    drawCockatielPicture();
  });

  squareButton.addEventListener("click", () => {
    g_selectedType = "square";
  });

  triangleButton.addEventListener("click", () => {
    g_selectedType = "triangle";
  });

  circleButton.addEventListener("click", () => {
    g_selectedType = "circle";
  });

  updateColor();
  updateSize();
  updateSegments();
}

function addShapeAt(pos) {
  const color = [g_selectedColor[0], g_selectedColor[1], g_selectedColor[2], 1.0];
  const sizePx = g_selectedSize;

  if (g_selectedType === "square") {
    shapesList.push(new Square(pos, color, sizePx));
  } else if (g_selectedType === "triangle") {
    shapesList.push(new Triangle(pos, color, sizePx));
  } else {
    shapesList.push(new Circle(pos, color, sizePx, g_selectedSegments));
  }
}

function handleClicks() {
  canvas.onmousedown = function (ev) {
    g_isDragging = true;
    const pos = convertMouseToGL(ev);
    g_lastPos = pos;

    addShapeAt(pos);
    renderAllShapes();
  };

  canvas.onmouseup = function () {
    g_isDragging = false;
    g_lastPos = null;
  };

  canvas.onmouseleave = function () {
    g_isDragging = false;
    g_lastPos = null;
  };

  canvas.onmousemove = function (ev) {
    if (!g_isDragging || ev.buttons !== 1) return;

    const pos = convertMouseToGL(ev);
    if (!g_lastPos) g_lastPos = pos;

    const dx = pos[0] - g_lastPos[0];
    const dy = pos[1] - g_lastPos[1];
    const dist = Math.sqrt(dx * dx + dy * dy);

    const steps = Math.max(1, Math.ceil(dist / g_strokeStep));

    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const ix = g_lastPos[0] + dx * t;
      const iy = g_lastPos[1] + dy * t;
      addShapeAt([ix, iy]);
    }

    g_lastPos = pos;
    renderAllShapes();
  };
}

function renderAllShapes() {
  gl.clear(gl.COLOR_BUFFER_BIT);

  for (let i = 0; i < shapesList.length; i++) {
    shapesList[i].render();
  }
}

function drawVerts(verts, color, mode) {
  gl.uniform4f(u_FragColor, color[0], color[1], color[2], color[3]);

  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, verts, gl.DYNAMIC_DRAW);

  gl.drawArrays(mode, 0, verts.length / 2);
}

function convertMouseToGL(ev) {
  let x = ev.clientX;
  let y = ev.clientY;
  const rect = ev.target.getBoundingClientRect();

  x = ((x - rect.left) - canvas.width / 2) / (canvas.width / 2);
  y = (canvas.height / 2 - (y - rect.top)) / (canvas.height / 2);

  return [x, y];
}

function drawTriangle(coords, color) {
  const verts = new Float32Array(coords);

  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, verts, gl.DYNAMIC_DRAW);

  gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_Position);

  gl.uniform4f(u_FragColor, color[0], color[1], color[2], color[3]);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
}

function drawCockatielPicture() {
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT);

  const Y1 = [1.0, 0.92, 0.18, 1.0];
  const Y2 = [0.92, 0.82, 0.10, 1.0];
  const OR = [0.95, 0.35, 0.20, 1.0];
  const DK = [0.10, 0.10, 0.10, 1.0];

  const BR1 = [0.55, 0.32, 0.14, 1.0];
  const BR2 = [0.45, 0.26, 0.12, 1.0];

  const G1 = [0.72, 0.84, 0.62, 1.0];
  const G2 = [0.45, 0.70, 0.36, 1.0];
  const G3 = [0.30, 0.55, 0.28, 1.0];

  const GR1 = [0.80, 0.80, 0.80, 1.0];
  const GR2 = [0.62, 0.62, 0.62, 1.0];
  const GR3 = [0.50, 0.50, 0.50, 1.0];

  drawTriangle([-0.95, -0.12, 0.98, -0.12, -0.95, -0.22], BR1);
  drawTriangle([0.98, -0.12, -0.95, -0.22, 0.98, -0.22], BR2);

  drawTriangle([0.42, -0.12, 0.70, -0.06, 0.42, -0.22], BR2);
  drawTriangle([0.70, -0.06, 0.42, -0.22, 0.74, -0.18], BR1);

  drawTriangle([0.62, 0.02, 0.82, 0.16, 0.66, 0.22], G1);
  drawTriangle([0.62, 0.02, 0.66, 0.22, 0.52, 0.12], G2);

  drawTriangle([0.74, 0.02, 0.96, 0.02, 0.80, 0.12], G1);
  drawTriangle([0.74, 0.02, 0.80, 0.12, 0.62, 0.08], G3);

  drawTriangle([0.62, -0.20, 0.90, -0.28, 0.76, -0.06], G1);
  drawTriangle([0.62, -0.20, 0.76, -0.06, 0.54, -0.02], G2);

  drawTriangle([0.46, -0.04, 0.58, 0.10, 0.44, 0.18], G1);
  drawTriangle([0.46, -0.04, 0.44, 0.18, 0.34, 0.06], G3);

  drawTriangle([-0.98, -0.78, -0.44, -0.28, -0.26, -0.56], GR3);
  drawTriangle([-0.26, -0.56, -0.44, -0.28, -0.08, -0.44], GR2);
  drawTriangle([-0.44, -0.28, -0.18, -0.18, -0.08, -0.44], GR1);

  drawTriangle([-1.10, -0.86, -0.98, -0.78, -0.94, -0.74], GR2);
  drawTriangle([-1.18, -0.92, -1.10, -0.86, -1.06, -0.82], GR3);

  drawTriangle([-0.42, -0.20, -0.12, 0.24, 0.22, -0.12], GR1);
  drawTriangle([-0.42, -0.20, 0.22, -0.12, -0.10, -0.44], GR2);
  drawTriangle([-0.10, -0.44, 0.22, -0.12, 0.10, -0.50], GR3);

  drawTriangle([-0.12, 0.24, 0.06, 0.20, -0.02, 0.04], GR1);
  drawTriangle([-0.12, 0.24, -0.02, 0.04, -0.18, 0.08], GR2);

  drawTriangle([-0.26, -0.06, -0.02, 0.10, -0.06, -0.22], GR3);
  drawTriangle([-0.06, -0.22, -0.02, 0.10, 0.16, -0.10], GR2);
  drawTriangle([-0.22, -0.30, 0.02, -0.34, -0.10, -0.50], GR1);
  drawTriangle([0.02, -0.34, 0.16, -0.10, -0.10, -0.50], GR2);

  drawTriangle([-0.08, -0.18, 0.12, -0.18, 0.06, -0.06], GR2);
  drawTriangle([0.06, -0.06, 0.12, -0.18, 0.22, -0.12], GR3);

  drawTriangle([0.06, 0.22, 0.20, 0.18, 0.14, 0.06], GR1);
  drawTriangle([0.14, 0.06, 0.20, 0.18, 0.28, 0.10], GR2);
  drawTriangle([0.02, 0.18, 0.06, 0.22, 0.14, 0.06], GR3);

  drawTriangle([0.14, 0.50, 0.40, 0.42, 0.22, 0.24], Y1);
  drawTriangle([0.14, 0.50, 0.22, 0.24, 0.06, 0.36], Y2);
  drawTriangle([0.40, 0.42, 0.34, 0.26, 0.22, 0.24], Y2);

  drawTriangle([0.10, 0.54, 0.22, 0.82, 0.16, 0.52], Y1);
  drawTriangle([0.16, 0.52, 0.30, 0.74, 0.22, 0.48], Y2);
  drawTriangle([0.04, 0.52, 0.14, 0.70, 0.10, 0.48], Y2);

  drawTriangle([0.18, 0.38, 0.30, 0.34, 0.22, 0.24], OR);
  drawTriangle([0.18, 0.38, 0.22, 0.24, 0.14, 0.30], OR);

  drawTriangle([0.38, 0.38, 0.52, 0.32, 0.36, 0.26], DK);
  drawTriangle([0.36, 0.26, 0.52, 0.32, 0.46, 0.20], DK);

  drawTriangle([0.28, 0.40, 0.30, 0.42, 0.32, 0.40], DK);
  drawTriangle([0.28, 0.40, 0.32, 0.40, 0.30, 0.38], DK);

  drawTriangle([0.00, -0.20, 0.10, -0.20, 0.04, -0.12], GR3);
  drawTriangle([0.12, -0.20, 0.24, -0.20, 0.18, -0.12], GR3);
}
s