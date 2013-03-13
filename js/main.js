function resize(){
	width=window.innerWidth
	height=window.innerHeight
	camera.aspect=width/height
	camera.updateProjectionMatrix()
	renderer.setSize(width,height)
	composer.setSize(width,height)
	coolPass.uniforms.aspect.value=camera.aspect
}
d=0.017
function respawn(){
	if(respawning==0){
		respawning=0.01
	}
}
//time=new Date().valueOf()
function render(){
	step()
	composer.render()
	//setTimeout(render,1000/2)
	window.webkitRequestAnimationFrame(render)
}
function smooth(value,target,friction){
	return value+friction*(target-value)
}
velocity=new THREE.Vector3()//Sum of velocities
thrust=new THREE.Vector3()//Internal thrust
external=new THREE.Vector3()//External forces
fall=0
recover=0
respawnpoint=new THREE.Matrix4()
respawning=0
savingPlace=-1
function savePlace(){
	respawnpoint.copy(ship.matrix)
	//console.log('saving place')
	return savingPlace=setTimeout(savePlace,1000)
}
t=0
function step(){
	if(!track){return}//No track? No race.
	
	gamepad()//For gamepad support
	t+=0.02//For the flanger
	
	//Make the exhaust look like it's alive
	modelthrust.material.map.offset.y=Math.random()*0.2-0.1
	modelboost.material.map.offset.y=Math.random()*0.2-0.1
	
	//Handle speedy stuff
	pushing=Math.max(0,pushing-d)
	var stillboost=coolPass.uniforms.phase.value>0&&coolPass.uniforms.phase.value<1
	if(stillboost){
		coolPass.uniforms.phase.value+=d*2
	}
	if(boost>0){
		if(coolPass.uniforms.phase.value==0){
			coolPass.uniforms.phase.value=0.01
			t=0//Resets the flanger
			playBoostSound()
			//energy-=0.05
		}
	}
	else{
		if(!stillboost){
			coolPass.uniforms.phase.value=0
		}
	}
	coolPass.uniforms.damage.value=
		smooth(coolPass.uniforms.damage.value,0,0.05)
	//Exhaust behavior and other smoothing things
	modelthrust.material.map.offset.x=
		smooth(modelthrust.material.map.offset.x,-1+Math.max(accel>thresh?accel:0,boost),0.1)
	modelboost.material.map.offset.x=
		smooth(modelboost.material.map.offset.x,boost||pushing>0?0:-1,0.1)
	coolPass.uniforms.boost.value=
		smooth(coolPass.uniforms.boost.value,boost?1:0,0.1)
	coolPass.uniforms.motionblur.value=
		smooth(coolPass.uniforms.motionblur.value,boost||stillboost||pushing>0?1:0,0.1)
	audioStep()
	if(savingPlace<0){//Floating
		recover=0
		model.position.y=smooth(model.position.y,float,0.05)
	}
	else{
		model.position.y=Math.max(0,model.position.y+recover)
		recover=smooth(recover,float-model.position.y,0.05)*0.9
		recover=model.position.y==0?Math.max(0,recover):recover
	}
	//Movement
	var length=thrust.length()
	var morelength=0
	if(boost||stillboost){//Going FAAAAAAST!
		grip=1//Strong grip
		if(length<boostspeed){
			morelength=0.10*(maxspeed-length)//Speed of sound is 340 m/s
		}
		//energy-=0.001
	}
	else{
		grip=drift
		if(pushing>0){//Being pushed along
			if(length<pushspeed){
				morelength+=Math.min(0.10*(maxspeed-length),pushspeed-length)
			}
		}
		else if(accel>0){//Normal acceleration
			if(length<accelspeed){
				morelength+=Math.min(accelconst*accel,maxspeed-length)
			}
		}
	}
	if(brake>thresh){//Braking?
		if(length>0){
			morelength-=Math.min(brakeconst*brake,length)
		}
	}
	if(Math.abs(steer)>thresh){//Steering
		ship.matrix.rotateY(-steer*turnspeed*(velocity.length()*0.001+1))
		model.rotation.z+=1.5*(-steer*turnspeed)
		ship.rotation.setEulerFromRotationMatrix(ship.matrix)
	}
	model.updateMatrix()
	var newvel=new THREE.Vector3(0,0,-length-morelength*(1/grip))
	thrust.copy(
		ship.matrix.rotateAxis(newvel.clone()).multiplyScalar(newvel.length()*grip)
		.add(thrust.clone().multiplyScalar(1-grip))
	)//Adjustable skid
	
	if(brake>thresh){//Brake friction
		thrust.multiplyScalar(Math.pow(1-brake*(1-brakeconst),d))
	}
	thrust.multiplyScalar(Math.pow(friction,d))//Thrust friction
	external.multiplyScalar(extfriction)//External friction
	
	//Left/right shift
	$shift=smooth($shift,Math.abs(shift)>thresh?-shift*shiftconst:0,$$shift)
	velocity.addVectors(thrust.clone().applyAxisAngle(ship.up,$shift),external)
	
	//Move the ship
	collide()
	ship.position.add(velocity.clone().multiplyScalar(d))
	
	//Have the camera follow the ship
	var camfollow=0.7//Math.pow(0.01,d)
	/*camera.position.x+=steer*turnspeed*10
	camera.position.x*=camfollow*/
	front.multiplyScalar(camfollow)
		.add(model.matrixWorld.rotateAxis(new THREE.Vector3(0,0,-1)).multiplyScalar(10*(1-camfollow)))
	camera.up.multiplyScalar(camfollow)
		.add(ship.matrixWorld.rotateAxis(new THREE.Vector3(0,1,0)).multiplyScalar(1-camfollow))
	behind.multiplyScalar(camfollow)
		.add(model.matrixWorld.rotateAxis(camchase.clone()).multiplyScalar(1-camfollow))
	camera.position.addVectors(ship.position,behind.clone().multiplyScalar(6-3*(Math.min(180,camera.fov)-minfov)/(180-minfov)))
	camera.lookAt(front.clone().add(ship.position))
	//camera.rotation.copy(ship.rotation)
	var shipfollow=0.9//Math.pow(0.01,d)
	model.rotation.multiplyScalar(shipfollow)
	//Adjust the camera fov
	camera.fov=Math.min(180,minfov+(maxfov-minfov)*(thrust.length()/maxspeed))
	camera.updateProjectionMatrix()
	if(respawning>=1){//Back on track
		if(energy<0){
			energy=1//Fully healed
		}
		ship.position.getPositionFromMatrix(respawnpoint)
		ship.rotation.setEulerFromRotationMatrix(respawnpoint)
		velocity.set(0,0,0)
		if(fall<0){
			model.position.y=model.position.y+fall
		}
		fall=0
		respawning=0
	}
	else if(respawning>0){//Respawn animation
		respawning+=2*d
		coolPass.uniforms.cover.value=respawning
	}
	else if(ship.position.distanceTo(track.geometry.boundingSphere.center)>track.geometry.boundingSphere.radius){//Outside
		respawning=0.01//Auto-respawn
	}
	else{//Normal
		coolPass.uniforms.cover.value=smooth(coolPass.uniforms.cover.value,0,0.05)
	}
	updateHud()
}
//Cam follow purposes
front=new THREE.Vector3(0,0,-1)
behind=camchase.clone().normalize()

resize()
window.addEventListener('resize',resize,false)
window.addEventListener('load',function(){
	document.getElementById('lowerright').style.display=''
	document.getElementById('lowerleft').style.display=''
	document.getElementById('loading').style.display='none'
	render()
},false)
//Somehow, event listeners don't work on body :(
//Maybe it's not initialized yet?
