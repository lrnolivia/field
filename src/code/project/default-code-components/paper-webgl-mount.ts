// Shared WebGL2 mount emitted into each Paper-derived shader component.
// Cleanup releases owned resources while keeping a mounted canvas reusable.

export const LEGACY_PAPER_WEBGL_DISPOSAL = `      gl.deleteProgram(program);
      var ext = gl.getExtension('WEBGL_lose_context');
      if (ext) ext.loseContext();`;

export const PAPER_WEBGL_DISPOSAL = `      gl.useProgram(null);
      gl.deleteBuffer(buf);
      gl.deleteProgram(program);`;

export const LEGACY_PAPER_WEBGL_FIT = `    if (canvas.width !== tw || canvas.height !== th) {
      canvas.width = tw;
      canvas.height = th;
      gl.viewport(0, 0, tw, th);
      gl.useProgram(program);
      var lr = loc('u_resolution');
      if (lr) gl.uniform2f(lr, tw, th);
      var lp = loc('u_pixelRatio');
      if (lp) gl.uniform1f(lp, tw / w);
      render();
    }`;

export const PAPER_WEBGL_FIT = `    if (canvas.width !== tw || canvas.height !== th) {
      canvas.width = tw;
      canvas.height = th;
    }
    // Each newly mounted program needs its own uniforms, even at the same size.
    gl.viewport(0, 0, tw, th);
    gl.useProgram(program);
    var lr = loc('u_resolution');
    if (lr) gl.uniform2f(lr, tw, th);
    var lp = loc('u_pixelRatio');
    if (lp) gl.uniform1f(lp, tw / w);
    render();`;

export const PAPER_WEBGL_MOUNT = `function __psCreateMount(canvas, fragmentShader, vertexShader) {
  var gl = canvas.getContext('webgl2');
  if (!gl || gl.isContextLost()) return null;

  // Some mobile GPUs run mediump at <23 bits, which breaks these shaders — force highp there.
  var fmt = gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.MEDIUM_FLOAT);
  if (fmt && fmt.precision < 23) {
    vertexShader = vertexShader.replace(/precision\\s+(lowp|mediump)\\s+float;/g, 'precision highp float;');
    fragmentShader = fragmentShader
      .replace(/precision\\s+(lowp|mediump)\\s+float/g, 'precision highp float')
      .replace(/\\b(uniform|varying|attribute)\\s+(lowp|mediump)\\s+(\\w+)/g, '$1 highp $3');
  }

  function compile(type, src) {
    var sh = gl.createShader(type);
    if (!sh) return null;
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      if (!gl.isContextLost()) console.error('Shader compile failed:', gl.getShaderInfoLog(sh));
      gl.deleteShader(sh);
      return null;
    }
    return sh;
  }
  var vs = compile(gl.VERTEX_SHADER, vertexShader);
  if (!vs) return null;
  var fs = compile(gl.FRAGMENT_SHADER, fragmentShader);
  var program = fs && gl.createProgram();
  if (!program) {
    gl.deleteShader(vs);
    if (fs) gl.deleteShader(fs);
    return null;
  }
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    if (!gl.isContextLost()) console.error('Shader link failed:', gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    return null;
  }

  var buf = gl.createBuffer();
  if (!buf) {
    gl.deleteProgram(program);
    return null;
  }
  gl.useProgram(program);
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  var locs = {};
  function loc(name) {
    if (!(name in locs)) locs[name] = gl.getUniformLocation(program, name);
    return locs[name];
  }

  var textures = {};
  var units = {};
  var frameMs = 0;
  var speed = 0;
  var raf = 0;
  var last = 0;
  var disposed = false;
  var MAX_PX = 1920 * 1080 * 4;

  function render() {
    if (disposed) return;
    gl.useProgram(program);
    var lt = loc('u_time');
    if (lt) gl.uniform1f(lt, frameMs * 0.001);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  function fit() {
    if (disposed) return;
    var w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    var tw = Math.round(w * dpr), th = Math.round(h * dpr);
    var cap = Math.min(1, Math.sqrt(MAX_PX) / Math.sqrt(tw * th));
    tw = Math.max(1, Math.round(tw * cap));
    th = Math.max(1, Math.round(th * cap));
${PAPER_WEBGL_FIT}
  }
  var ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(fit) : null;
  if (ro) ro.observe(canvas);
  fit();

  function tick(now) {
    raf = requestAnimationFrame(tick);
    if (document.hidden) { last = now; return; }
    var dt = last ? now - last : 0;
    last = now;
    frameMs += dt * speed;
    render();
  }

  function bindTexture(name, upload, aspect, mip) {
    gl.useProgram(program);
    if (!(name in units)) units[name] = Object.keys(units).length;
    var unit = units[name];
    gl.activeTexture(gl.TEXTURE0 + unit);
    if (textures[name]) gl.deleteTexture(textures[name]);
    var tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    upload();
    if (mip) {
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    }
    textures[name] = tex;
    var l = loc(name);
    if (l) gl.uniform1i(l, unit);
    var la = loc(name + 'AspectRatio');
    if (la) gl.uniform1f(la, aspect);
    render();
  }

  return {
    parseColor: __psParseColor,
    setUniforms: function (map) {
      if (disposed) return;
      gl.useProgram(program);
      for (var k in map) {
        var v = map[k];
        var l = loc(k);
        if (!l || v === undefined || v === null) continue;
        if (typeof v === 'number') gl.uniform1f(l, v);
        else if (typeof v === 'boolean') gl.uniform1i(l, v ? 1 : 0);
        else if (Array.isArray(v)) {
          if (Array.isArray(v[0])) {
            var flat = [];
            for (var i = 0; i < v.length; i++) for (var j = 0; j < v[i].length; j++) flat.push(v[i][j]);
            gl.uniform4fv(l, flat);
          } else if (v.length === 2) gl.uniform2fv(l, v);
          else if (v.length === 3) gl.uniform3fv(l, v);
          else if (v.length === 4) gl.uniform4fv(l, v);
        }
      }
      render();
    },
    setTexture: function (name, image, mip) {
      if (disposed) return;
      var aspect = (image.naturalWidth || image.width || 1) / (image.naturalHeight || image.height || 1);
      bindTexture(name, function () {
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
      }, aspect, mip);
    },
    setEmptyTexture: function (name) {
      if (disposed) return;
      bindTexture(name, function () {
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 0]));
      }, 1, false);
    },
    setSpeed: function (s) {
      if (disposed) return;
      speed = s || 0;
      if (speed !== 0 && !raf) { last = 0; raf = requestAnimationFrame(tick); }
      if (speed === 0 && raf) { cancelAnimationFrame(raf); raf = 0; render(); }
    },
    setFrameMs: function (ms) { frameMs = ms; render(); },
    resize: fit,
    dispose: function () {
      if (disposed) return;
      disposed = true;
      if (raf) cancelAnimationFrame(raf);
      if (ro) ro.disconnect();
      for (var k in textures) gl.deleteTexture(textures[k]);
${PAPER_WEBGL_DISPOSAL}
    }
  };
}
`;
