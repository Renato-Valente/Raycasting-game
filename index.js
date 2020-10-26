const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const tile_size = 64;
const num_rows = 11, num_cols = 15;
const window_width = num_cols * tile_size;
const window_height = num_rows * tile_size;
const fov_angle = 60 * (Math.PI/180);
const wall_width = 1;
const number_rays = window_width/wall_width;
const minimap_scale = 0.2;

var rays = [];

canvas.width = window_width;
canvas.height = window_height;

const map ={ 
     grid : [[1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
             [1,0,0,0,0,0,0,0,0,0,0,0,0,0,1], 
             [1,0,0,0,0,1,1,1,0,0,0,0,0,0,1], 
             [1,0,0,0,0,1,0,0,0,0,0,0,0,0,1], 
             [1,0,0,0,0,1,0,0,0,0,0,0,0,0,1], 
             [1,0,0,0,0,0,0,0,0,0,0,0,0,0,1], 
             [1,0,0,0,0,0,0,0,0,0,1,0,0,0,1], 
             [1,0,0,0,0,0,0,0,0,0,1,0,0,0,1], 
             [1,0,0,0,0,0,0,0,0,0,1,0,0,0,1], 
             [1,0,0,0,0,0,0,0,1,1,1,1,0,0,1], 
             [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1] ],

             render(){
                var i = j = 0;
                while(i<num_rows){
                    j = 0;
                    while(j<num_cols){
                        var tileX = j * tile_size;
                        var tileY = i * tile_size;
                        if(this.grid[i][j] == 1){
                            ctx.fillStyle = 'black';
                        }
                        else{
                            ctx.fillStyle = 'white';
                        }
                        ctx.fillRect(minimap_scale *tileX,
                            minimap_scale *tileY,
                            minimap_scale *tile_size,
                            minimap_scale *tile_size);
                        j++;
                    }
                    i++;
                }
             },

             hasWallAt(x,y){
                var gridIndexX = Math.floor(x / tile_size);
                var gridIndexY = Math.floor(y / tile_size);
                if(this.grid[gridIndexY][gridIndexX] == 1){
                    return true;
                }
                return false;
             }
}


const player = {
    x: window_width/2,
    y: window_height/2,
    radius: 7,
    turnDirection: 0,
    walkDirection: 0,
    rotationAngle: Math.PI/2,
    moveSpeed: 2,
    rotationSpeed: 2 * (Math.PI/180),

    render(){
        ctx.fillStyle = 'black';
        ctx.beginPath();
        ctx.arc(minimap_scale *this.x, 
            minimap_scale *this.y, 
            minimap_scale *this.radius, 
            0, 2 * Math.PI);
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(minimap_scale *this.x, 
            minimap_scale *this.y);

        ctx.lineTo(
            minimap_scale * (this.x + (Math.cos(this.rotationAngle)*30)), 
            minimap_scale * (this.y + (Math.sin(this.rotationAngle)*30)));
        ctx.stroke();
    },

    update(){
        this.rotationAngle += this.turnDirection * this.rotationSpeed;

        var movstep = this.walkDirection * this.moveSpeed;
        var newPlayerX = this.x + Math.cos(this.rotationAngle) * movstep;
        var newPlayerY = this.y + Math.sin(this.rotationAngle) * movstep;
        if(!map.hasWallAt(newPlayerX,newPlayerY)){
            this.x = newPlayerX;
            this.y = newPlayerY;
        }

    }
}
function normalizeAngle(angle){
    angle = angle % (2*Math.PI);
    if(angle<0){
        angle = (2*Math.PI) + angle;
    }
    return angle;
}

function findDistance(x1,y1,x2,y2){
    var distance = Math.sqrt((x2 - x1) * (x2 - x1) + (y2-y1) * (y2-y1));
    return distance;
}

class Ray{
    constructor(rayAngle){
        this.rayAngle = normalizeAngle(rayAngle);
        this.wallHitX = 0;
        this.wallHitY = 0;
        this.wallHitDistance = 0;
        this.wasHitVertical = false;

        if(this.rayAngle>0 && this.rayAngle<Math.PI){
            this.isRayFacingDown = true;
            this.isRayFacingUp = false;
        }
        else{
            this.isRayFacingDown = false;
            this.isRayFacingUp = true;
        }

        if(this.rayAngle<0.5*Math.PI || this.rayAngle>1.5*Math.PI){
            this.isRayFacingRight = true;
            this.isRayFacingLeft = false;
        }
        else{
            this.isRayFacingRight = false;
            this.isRayFacingLeft = true;
        }
        
    }

    cast(){
        var xintercept,yintercept,xstep,ystep;
        var horzWallHitX = 0;
        var horzWallHitY = 0;
        var vertWallHitX = 0;
        var vertWallHitY = 0;

        var foundHorzWall = false;
        var foundVertWall = false;
        ///////////horizontal interception///////

        //console.log('is ray facing up? ' + this.isRayFacingUp);

        yintercept = Math.floor(player.y/tile_size) * tile_size;
        if(this.isRayFacingDown){
            yintercept += tile_size;
        }
        xintercept = player.x + (yintercept - player.y)/Math.tan(this.rayAngle);

        ystep = tile_size;
        if(this.isRayFacingUp){
           // console.log('passamor por aqui');
            ystep *= -1;
        }

        xstep = tile_size/Math.tan(this.rayAngle);
        if((this.isRayFacingRight && xstep<0) || (this.isRayFacingLeft && xstep>0)){
            xstep *= -1;
        }
        var nextHorzTouchX = xintercept;
        var nextHorzTouchY = yintercept;

        if(this.isRayFacingUp){
            nextHorzTouchY--;
        }

        while(nextHorzTouchX>=0 && nextHorzTouchX<=window_width && nextHorzTouchY>=0 && nextHorzTouchY<= window_height){
            if(map.hasWallAt(nextHorzTouchX,nextHorzTouchY)){
                if(this.isRayFacingUp){
                    nextHorzTouchY++; //change nerxtHorzTouchY back to normal
                }
                horzWallHitX = nextHorzTouchX;
                horzWallHitY = nextHorzTouchY;
                foundHorzWall = true;
                //console.log(wallHitX);
                ctx.strokeStyle = 'red';
                //console.log(ystep);
               /* ctx.beginPath();
                ctx.moveTo(player.x, player.y);
                ctx.lineTo(horzWallHitX, horzWallHitY);
                
                ctx.stroke(); */

                break;
            }
            else{
                nextHorzTouchX += xstep;
                nextHorzTouchY += ystep;
            }
        }

        /////////vertical intersections////////////////// a partir daqui começa a duvida

        xintercept = Math.floor(player.x/tile_size)*tile_size;
        if(this.isRayFacingRight){
            xintercept += tile_size;
        }

        yintercept = player.y + (xintercept - player.x) * Math.tan(this.rayAngle);

        xstep = tile_size;
        if(this.isRayFacingLeft){
            xstep*= (-1);
        }

        ystep = tile_size * Math.tan(this.rayAngle);

        if((this.isRayFacingUp && ystep>0) || (this.isRayFacingDown && ystep<0)){
            ystep*=(-1);
        }

        var nextVertTouchX = xintercept;
        var nextVertTouchY = yintercept;
        if(this.isRayFacingLeft){
            nextVertTouchX--;
        }

        while(nextVertTouchX>=0 && nextVertTouchX<=window_width && nextVertTouchY>=0 && nextVertTouchY<=window_height ){
            if(map.hasWallAt(nextVertTouchX,nextVertTouchY)){
                if(this.isRayFacingLeft){
                    nextVertTouchX++;   //change nerxtVertTouchX back to normal
                }
                vertWallHitX = nextVertTouchX;
                vertWallHitY = nextVertTouchY;
                foundVertWall = true;
                /*
                ctx.beginPath();
                ctx.moveTo(player.x, player.y);
                ctx.lineTo(vertWallHitX, vertWallHitY);
                ctx.stroke(); */
                break;
            }
            else{
                nextVertTouchX += xstep;
                nextVertTouchY += ystep;
            }
        }

        /////////calculate both distances and pick the closer one/////// ///aqui começa a duvida

        var horzDistance;
        var vertDistance;
        if(foundHorzWall){
            horzDistance = findDistance(player.x,player.y,horzWallHitX,horzWallHitY);
        }
        else{
            horzDistance = Number.MAX_VALUE;
        }

        if(foundVertWall){
            vertDistance = findDistance(player.x,player.y,vertWallHitX,vertWallHitY)
        }
        else{
            vertDistance = Number.MAX_VALUE;
        }

        if(horzDistance<vertDistance){
            this.wallHitX = horzWallHitX;
            this.wallHitY = horzWallHitY;
            this.wallHitDistance = horzDistance;
            this.wasHitVertical = true;
        }
        else{
            this.wallHitX = vertWallHitX;
            this.wallHitY = vertWallHitY;
            this.wallHitDistance = vertDistance;
            this.wasHitVertical = false;
        }

    }

    

    render(){
        //console.log('chegeui aqui');
        ctx.beginPath();
        ctx.moveTo(
            minimap_scale * player.x, 
            minimap_scale * player.y);
        ctx.lineTo(
            minimap_scale * this.wallHitX,
            minimap_scale * this.wallHitY);
        ctx.stroke();
    }
}

function castAllRays(){
    var rayAngle = player.rotationAngle - (fov_angle/2);
    rays = [];

    var cont = 0;
    while(cont<number_rays){
        var ray = new Ray(rayAngle);
        ray.cast();
        rays.push(ray);
        ray.render();
        rayAngle += (fov_angle/number_rays);
        cont++
    }
}

function render3D(){
    var cont = 0;
    while(cont<rays.length){

        var ray = rays[cont];
        //var rayDistance = ray.wallHitDistance;
        var rayDistance = ray.wallHitDistance * Math.cos(ray.rayAngle - player.rotationAngle);

        //calculate distance from the player to the projection plane
        var distanceProjection = (window_width/2)/(Math.tan(fov_angle/2));

        var wallRenderHeight = (tile_size/rayDistance) * distanceProjection;
        var color;
        if(ray.wasHitVertical){
            color = 1;
        }
        else{
            color = 0.5;
        }
        //0, 102, 255
        ctx.fillStyle = 'rgb('+color* 0 +','+color* 102 +','+color* 255 +')';

        ctx.fillRect(
            cont*wall_width,
            (window_height/2) - (wallRenderHeight/2),
            wall_width,
            wallRenderHeight
        );

        cont++;
    }
}

function game(){

    ctx.clearRect(0,0,window_width,window_height);
    
    ;
    render3D();
    map.render();
    castAllRays()
    
    player.update();
    
    player.render();
    requestAnimationFrame(game);
    
}


addEventListener('keydown',function(e){
    if(e.keyCode == 87){
        player.walkDirection = 1;
    }
    if(e.keyCode == 83){
        player.walkDirection = -1;
    }
    if(e.keyCode == 65){
        player.turnDirection = -1;
    }
    if(e.keyCode == 68){
        player.turnDirection = 1;
    }
})

addEventListener('keyup',function(e){
    if(e.keyCode == 87){
        player.walkDirection = 0;
    }
    if(e.keyCode == 83){
        player.walkDirection = 0;
    }
    if(e.keyCode == 65){
        player.turnDirection = 0;
    }
    if(e.keyCode == 68){
        player.turnDirection = 0;
    }
})