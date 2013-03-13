//Sets up the scene, and everything inside it
/* Object heirarchy
 * Scene | Track
 * 		 | Ship | Camera
 * 				| Model | Hull
 * 						| ModelThrust
 * 						| ModelBoost
*/
//Get the essentials up and running
container=document.getElementById('container')
renderer=new THREE.WebGLRenderer({clearColor:0x000000,clearAlpha:1})
container.appendChild(renderer.domElement)
camera=new THREE.PerspectiveCamera(minfov,0,near,far)
camera.position.copy(camchase)
scene=new THREE.Scene()
loader=new THREE.JSONLoader()

//Skybox. Wonderful.
skyMaterial=new THREE.ShaderMaterial(THREE.ShaderLib.cube)
skyCube=THREE.ImageUtils.loadTextureCube(skyImages)
skyMaterial.uniforms.tCube.value=skyCube
skyBox=new THREE.Mesh(new THREE.CubeGeometry(-100000,-100000,-100000,1,1,1),skyMaterial)
scene.add(skyBox)

ship=new THREE.Object3D()
//ship.add(camera)
scene.add(camera)
scene.add(ship)
//Load the stuff
model=new THREE.Object3D()
model.position.y=adhere
ship.add(model)
loader.load('scene/ship/Ship.js',function(geo){
	hull=new THREE.Mesh(
		geo,
		new THREE.MeshLambertMaterial({
			map:THREE.ImageUtils.loadTexture('scene/ship/Ship.png'),
			color: 0x999999,
			shininess: 10.0,
			ambient: 0x666666,
			emissive: 0x999999,
			specular: 0xAAAAAA,
			envMap:skyCube,
			reflectivity:1.0
		})
	)
	//hull.material.map.anisotropy=renderer.getMaxAnisotropy()
	model.add(hull)
})
loader.load('scene/ship/Thrust.js',function(geo){
	modelthrust=new THREE.Mesh(
		geo,
		new THREE.MeshBasicMaterial({
			map:THREE.ImageUtils.loadTexture('scene/ship/Thrust.png'),
			transparent:true,
			blending:THREE.AdditiveBlending
		})
	)
	modelthrust.material.map.offset.x=-1
	model.add(modelthrust)
})
loader.load('scene/ship/Boost.js',function(geo){
	modelboost=new THREE.Mesh(
		geo,
		new THREE.MeshBasicMaterial({
			map:THREE.ImageUtils.loadTexture('scene/ship/Thrust.png'),
			transparent:true,
			blending:THREE.AdditiveBlending,
			side:THREE.DoubleSide
		})
	)
	modelboost.material.map.offset.x=-1
	model.add(modelboost)
})
track=false
//new THREE.SceneLoader()
loader.load('scene/track2/Track.js',function(data){
	/*dat=data
	scene=dat.scene
	camera=dat.currentCamera
	camera.updateProjectionMatrix()
	return*/
	//console.log(data)
	//track=data.objects.Track
	track=new THREE.Mesh(
		data,
		new THREE.MeshPhongMaterial({
			map:THREE.ImageUtils.loadTexture('scene/tracktex/Track.png'),
			color: 0xFFFFFF,
			//shininess: 100.0,
			//ambient: 0x666666,
			//emissive: 0x999999,
			//specular: 0xAAAAAA,
			//combine:THREE.MultiplyOperation,
			//envMap:skyCube,
			//reflectivity:1.0,
			side:THREE.DoubleSide
		})
	)
	//track.rotation.x+=Math.PI/2
	track.updateMatrix()
	//new THREE.Matrix4().getInverse
	//.rotateX(Math.PI/2)
	//.scale(new THREE.Vector3(-1,-1,-1))
	//track.geometry.applyMatrix(new THREE.Matrix4().getInverse(track.matrix))
	track.material.map.anisotropy=renderer.getMaxAnisotropy()
	track.geometry.computeBoundingSphere()
	scene.add(track)
})
/*loader.load('scene/track/Structure.js',function(data){
	structure=new THREE.Mesh(
		data,
		new THREE.MeshLambertMaterial()
	)
	scene.add(structure)
})*/
//Lensflare
flareTexture = THREE.ImageUtils.loadTexture( "scene/flare/lensflare0.png");
flareTexture1 = THREE.ImageUtils.loadTexture( "scene/flare/lensflare3.png");
flareTexture2 = THREE.ImageUtils.loadTexture( "scene/flare/hexangle.png");
flareColor=new THREE.Color(0xFFFF66)

flare = new THREE.LensFlare( flareTexture, 700, 0.0, THREE.AdditiveBlending);
flare.add( flareTexture1, 512, 0.0, THREE.AdditiveBlending, flareColor);
flare.add( flareTexture1, 512, 0.0, THREE.AdditiveBlending, flareColor);
flare.add( flareTexture1, 512, 0.0, THREE.AdditiveBlending, flareColor);

flare.add( flareTexture2, 60, 0.6, THREE.AdditiveBlending, flareColor);
flare.add( flareTexture2, 70, 0.7, THREE.AdditiveBlending, flareColor);
flare.add( flareTexture2, 120, 0.9, THREE.AdditiveBlending, flareColor);
flare.add( flareTexture2, 70, 1.0, THREE.AdditiveBlending, flareColor);

var lightSource=new THREE.Vector3(-6452.946084495651,2955.202170343886,7044.591326896616)
flare.customUpdateCallback = lensFlareUpdateCallback;
flare.position.copy(lightSource)
scene.add(flare);
function lensFlareUpdateCallback( object ) {
	var f, fl = object.lensFlares.length;
	var flare;
	var vecX = -object.positionScreen.x * 2;
	var vecY = -object.positionScreen.y * 2;
	for( f = 0; f < fl; f++ ) {
		   flare = object.lensFlares[ f ];
		   flare.x = object.positionScreen.x + vecX * flare.distance;
		   flare.y = object.positionScreen.y + vecY * flare.distance;
		   flare.rotation = 0;
	}
	object.lensFlares[ 2 ].y += 0.025;
	object.lensFlares[ 3 ].rotation = object.positionScreen.x * 0.5 + THREE.Math.degToRad( 45 );
}

//Lights, camera, action!
directional1=new THREE.DirectionalLight(0xFFFFFF,1.0)
directional1.position.copy(lightSource)
scene.add(directional1)
ambient1=new THREE.AmbientLight(0x888888)
scene.add(ambient1)
