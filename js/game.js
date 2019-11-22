var Jumper = function() {};
Jumper.Play = function() {};
let platformIndex = 0;

Jumper.Play.prototype = {

  preload: function() {
    this.load.image( 'hero', 'assets/astronauta.png' );
    this.load.image( 'pixel', 'https://s3-us-west-2.amazonaws.com/s.cdpn.io/836/pixel_1.png' );
  },

  create: function() {
    // background color
    this.stage.backgroundColor = '#6bf';

    // scaling
    this.scale.scaleMode = Phaser.ScaleManager.SHOW_ALL;
    this.scale.maxWidth = this.game.width;
    this.scale.maxHeight = this.game.height;
    this.scale.pageAlignHorizontally = false;
    this.scale.pageAlignVertically = false;
    this.scale.setScreenSize( true );

    // physics
    this.physics.startSystem( Phaser.Physics.ARCADE );

    // camera and platform tracking vars
    this.cameraYMin = 99999;
    this.platformYMin = 99999;

    // create platforms
    this.platformsCreate();

    // create hero
    this.heroCreate();

    // cursor controls
    this.cursor = this.input.keyboard.createCursorKeys();
  
    //click controls
    this.game.input.onDown.add(this.moveHeroByClick, this);
    this.game.input.onTap.add(this.moveHeroByClick, this);
  },

  update: function() {

    // this is where the main magic happens
    // the y offset and the height of the world are adjusted
    // to match the highest point the hero has reached
    this.world.setBounds( 0, -this.hero.yChange, this.world.width, this.game.height + this.hero.yChange );

    // the built in camera follow methods won't work for our needs
    // this is a custom follow style that will not ever move down, it only moves up
    this.cameraYMin = Math.min( this.cameraYMin, this.hero.y - this.game.height + 130 );
    this.camera.y = this.cameraYMin;

    // hero collisions and movement
    this.physics.arcade.collide( this.hero, this.platforms );
    this.heroMove();

    // for each plat form, find out which is the highest
    // if one goes below the camera view, then create a new one at a distance from the highest one
    // these are pooled so they are very performant

    this.platforms.forEachAlive( function( elem ) {
      this.platformYMin = Math.min( this.platformYMin, elem.y );
      
      if( elem.y > this.camera.y + this.game.height ) {
        elem.kill();
        this.platformSpawn(this.platformYMin - 100, 50);
      }
    }, this );
  },

  platformSpawn: function(y) {
    let array = [this.game.width * 0.25 , this.game.width * 0.75];
    let index = platformIndex % 2;
    this.platformsCreateOne( array[index], y, 50);
    platformIndex++;
  },

  platformsCreate: function() {
    // platform basic setup
    this.platforms = this.add.group();
    this.platforms.enableBody = true;
    this.platforms.createMultiple( 10, 'pixel' );

    // create the base platform, with buffer on either side so that the hero doesn't fall through
    this.platformsCreateOne( -16, this.world.height - 16, this.world.width * 2 + 40 );
    let array = [this.game.width * 0.25 , this.game.width * 0.75];
    // create a batch of platforms that start to move up the level
    for( var i = 0; i < 9; i++ ) {
      this.platformSpawn( this.world.height - 150 * i, 50 );
    }
  },

  platformsCreateOne: function( x, y, width ) {
    // this is a helper function since writing all of this out can get verbose elsewhere
    var platform = this.platforms.getFirstDead();
    platform.reset( x, y );
    platform.scale.x = width;
    platform.scale.y = 16;
    platform.x -= width * 0.5;
    platform.body.immovable = true;
    return platform;
  },

  heroCreate: function() {
    // basic hero setup
    this.hero = game.add.sprite( this.world.centerX, this.world.height - 36, 'hero' );
    this.hero.scale.setTo(0.2,0.2)
    this.hero.anchor.set( 0.5 );
    
    // track where the hero started and how much the distance has changed from that point
    this.hero.yOrig = this.hero.y;
    this.hero.yChange = 0;

    // hero collision setup
    // disable all collisions except for down
    this.physics.arcade.enable( this.hero );
    //this.hero.body.gravity.y = 500;
    this.hero.body.checkCollision.up = false;
    this.hero.body.checkCollision.left = false;
    this.hero.body.checkCollision.right = false;
  },

  moveHeroByClick: function() {
    if( !this.hero.body.touching.down ) {
      return;
    }

    let jumpVelocities = this.getJumpVelocitiesForNextPlatform();
    console.log(jumpVelocities);
    this.hero.body.velocity.y = jumpVelocities[1];
    if ( this.game.input.activePointer.x > this.game.width/2 ){
      this.hero.body.velocity.x = jumpVelocities[0];
    } else {
      this.hero.body.velocity.x = -jumpVelocities[0];
    }
  },

  getJumpVelocitiesForNextPlatform: function() {
    const jumpVelocities = [10, 10];

    const heroX = this.hero.position.x;
    const heroY = this.hero.position.y;
    let platformXMin = 0;
    let platformYMin = 0;
    this.platforms.forEachAlive((platform) => {
      if ( platform.position.y < platformYMin ) {
        platformYMin = platform.position.y;
        platformXMin =  platform.position.x;
      }
    });

    console.log(platformXMin, platformYMin);
    console.log(heroX, heroY);

    // calculate parabole velocities
    let xVelocity = Math.abs( ( heroX - platformXMin ) * 0.7 );
    let yVelocity = -450;

    jumpVelocities[0] = xVelocity;
    jumpVelocities[1] = yVelocity;

    return jumpVelocities;
  },

  heroMove: function() {
    // handle the left and right movement of the hero
    // if(game.input.pointer1.isDown){
    //   console.log("ciao");
    // }
    /*
    if( this.cursor.left.isDown ) {
      this.hero.body.velocity.x = -200;
    } else if( this.cursor.right.isDown ) {
      this.hero.body.velocity.x = 200;
    } else {
      this.hero.body.velocity.x = 0;
    }

    // handle hero jumping
    if( this.cursor.up.isDown && this.hero.body.touching.down ) {
      this.hero.body.velocity.y = -350;
    } */

    let currentTime = this.game.time.time;
    if ( this.hero.body.touching.down ) {
      this.hero.body.velocity.x = 0;
    }
    
    // wrap world coordinated so that you can warp from left to right and right to left
    this.world.wrap( this.hero, this.hero.width / 2, false );

    // track the maximum amount that the hero has travelled
    this.hero.yChange = Math.max( this.hero.yChange, Math.abs( this.hero.y - this.hero.yOrig ) );
    
    // if the hero falls below the camera view, gameover
    if( this.hero.y > this.cameraYMin + this.game.height && this.hero.alive ) {
      this.state.start( 'Play' );
    }
    
    /* if (this.move == 1){
      this.hero.body.velocity.x = 200;
      if(this.contatore < 20){
        this.hero.body.velocity.y = -200;
      }
      this.contatore += 1;
    }

    else if (this.move == -1){
      this.hero.body.velocity.x = -200;
      if(this.contatore < 20){
        this.hero.body.velocity.y = -200;
      }
      this.contatore += 1;
    }
    else {
      this.hero.body.velocity.x =0;
    } */

  },

  shutdown: function() {
    // reset everything, or the world will be messed up
    this.world.setBounds( 0, 0, this.game.width, this.game.height );
    this.cursor = null;
    this.hero.destroy();
    this.hero = null;
    this.platforms.destroy();
    this.platforms = null;
  },
}

var height = document.getElementById("game-container").offsetHeight;
var width = document.getElementById("game-container").offsetWidth;


var game = new Phaser.Game( width, height,Phaser.CANVAS, 'game-container' );
game.state.add( 'Play', Jumper.Play );
game.state.start( 'Play' );