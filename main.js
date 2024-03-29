main();

function main() {
  const canvas = document.querySelector("#canvas");
  const gl = canvas.getContext("webgl");
  if (!gl) {
    return;
  }

  var vs = `
    attribute vec4 a_position;
    void main() {
        gl_Position = a_position;
    }
    `;

  var fs = `
  precision highp float;
  #define MARCHINGITERATIONS 64
  
  #define MARCHINGSTEP 0.5
  #define SMALLESTSTEP 0.1
  
  #define DISTANCE 3.0
  
  #define MAXMANDELBROTDIST 1.5
  #define MANDELBROTSTEPS 64
  
  uniform vec3 iResolution; 
  uniform float iTime;
  uniform vec4 iMouse;
  
  // cosine based palette, 4 vec3 params
  vec3 cosineColor( in float t, in vec3 a, in vec3 b, in vec3 c, in vec3 d )
  {
      return a + b*cos( 6.28318*(c*t+d) );
  }
  vec3 palette (float t) {
      // return cosineColor( t, vec3(0.5,0.5,0.5),vec3(0.5,0.5,0.5),vec3(0.02,0.01,0.0),vec3(0.5, 0.20, 0.25) ); 
      return cosineColor( t, vec3(0.5,0.5,0.5),vec3(0.5,0.5,0.5),vec3(0.01,0.01,0.01),vec3(0.0, 0.10, 0.20) );
  
  }
  
  // distance estimator to a mandelbulb set
  vec2 DE(vec3 pos) {
      float Power = 3.0+4.0*(sin(iTime/30.0)+1.0);
    vec3 z = pos;
    float dr = 1.0;
    float r = 0.0;
    for (int i = 0; i < MANDELBROTSTEPS ; i++) {
      r = length(z);
      if (r>MAXMANDELBROTDIST) break;
      
      // convert to polar coordinates
      float theta = acos(z.z/r);
      float phi = atan(z.y,z.x);
      dr =  pow( r, Power-1.0)*Power*dr + 1.0;
      
      // scale and rotate the point
      float zr = pow( r,Power);
      theta = theta*Power;
      phi = phi*Power;
      
      // back to cartesian coordinates
      z = zr*vec3(sin(theta)*cos(phi), sin(phi)*sin(theta), cos(theta));
      z+=pos;
    }
    return vec2(0.5*log(r)*r/dr,50.0*pow(dr,0.128/float(MARCHINGITERATIONS)));
  }
  
  // MAPPING FUNCTION 
  vec2 map( in vec3 p )
  {
       vec2 d = DE(p);
       return d;
  }
  
  
  // TRACING A PATH : 
  vec2 trace  (vec3 origin, vec3 ray) {
    
      //t is the point at which we are in the measuring of the distance
      float t =0.0;
      float c = 0.0;
      
      for (int i=0; i<MARCHINGITERATIONS; i++) {
        vec3 path = origin + ray * t;	
        vec2 dist = map(path);
        
          t += MARCHINGSTEP * dist.x;
          c += dist.y;
          if (dist.y < SMALLESTSTEP) break;
      }
      
      return vec2(t,c);
  }
  
  void main()
  {
      vec2 fragCoord = gl_FragCoord.xy;
      vec2 uv = fragCoord/iResolution.xy;
  
      uv = uv * 2.0 - 1.0;
  
      uv.x *= iResolution.x / iResolution.y;
      
      vec3 ray = normalize(vec3 (uv,1.0));
  
      float rotAngle = 0.3+iTime/40.0 + 6.28*iMouse.x / iResolution.x;
      
      ray.xz *= mat2(cos(rotAngle), -sin(rotAngle), sin(rotAngle), cos(rotAngle));
      
      float camDist = DISTANCE * iMouse.y / iResolution.y;
      if (iMouse.xy==vec2(0)) camDist = DISTANCE*0.55;
      vec3 origin = vec3 (camDist * sin(rotAngle),0.0,-camDist *cos(rotAngle));           
      
    vec2 depth = trace(origin,ray);
    
    float fog = 1.0 / (1.0 + depth.x * depth.x * 0.1);
    
      vec3 fc = vec3(fog);
      
      
      gl_FragColor = vec4(palette(depth.y)*fog,1.0);
  }`;
  var program = webglUtils.createProgramFromSources(gl, [vs, fs]);

  const positionAttributeLocation = gl.getAttribLocation(program, "a_position");

  // buffer
  const positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
    gl.DYNAMIC_DRAW
  );

  webglUtils.resizeCanvasToDisplaySize(gl.canvas);
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

  gl.useProgram(program);

  var resolution = gl.getUniformLocation(program, "iResolution");
  var time = gl.getUniformLocation(program, "iTime");

  function render(scene) {
    webglUtils.resizeCanvasToDisplaySize(gl.canvas);

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.uniform3fv(resolution, [gl.canvas.width, gl.canvas.height, 0]);

    scene /= 1500;

    gl.uniform1f(time, scene);

    var size = 2;
    var type = gl.FLOAT;
    var normalize = false;
    var stride = 0;
    var offset = 0;

    gl.vertexAttribPointer(
      positionAttributeLocation,
      size,
      type,
      normalize,
      stride,
      offset
    );

    gl.enableVertexAttribArray(positionAttributeLocation);
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

    gl.drawArrays(gl.TRIANGLES, 0, 6);
    window.requestAnimationFrame(render);
  }
  window.requestAnimationFrame(render);
}
