var augment = require('./vendor/augment'),
  glmatrix = require('./vendor/gl-matrix'),
  Rectangle = require('./math/rectangle'),
  MinimapNavigator = require('./minimap-navigator'),
  Point = require('./math/point');

var mat2d = glmatrix.mat2d;

var Minimap = augment(PIXI.Container, function(uber){
  this.constructor = function(width, height, camera, options){
    uber.constructor.apply(this, arguments);
    this.camera = camera;
    this.minimapDimensions = {width: width, height: height};
    this.worldBoundRect = new Rectangle(0, 0, 100, 100);
    this.viewportRect = new Rectangle(0, 0, 100, 100);
    
    this.items = [];
    this.build();

    this.navigator = new MinimapNavigator(this);
  },


  this.build = function(){
    this.worldBounds = new PIXI.Graphics();
    this.worldBounds.alpha = 0.5;
    this.addChild(this.worldBounds);

    this.viewport = new PIXI.Graphics();
    this.viewport.alpha = 0.5;
    this.addChild(this.viewport);

    this.itemsLayer = new PIXI.Graphics();
    this.addChild(this.itemsLayer);
    
    this.debugLayer = new PIXI.Graphics();
    this.addChild(this.debugLayer);
  },

  this.add = function(object){
    this.items.push(object);
  },
  
  this.drawObjects = function(){
    this.itemsLayer.clear();  

    var item;
    for(var i = 0, l = this.items.length; i<l; i++){
      item = this.items[i];
      
      var bounds = item.getLocalBounds();
      var w1 = 0
      var h1 = 0
      
      if(item.anchor){
        w1 = item.width * -item.anchor.x;
        h1 = item.height * -item.anchor.y;  
      }
      
      bounds = new Rectangle( item.x + w1, item.y + h1, item.width, item.height);
      this.drawObject(bounds);  
      
    }
  },
  
  this.drawObject = function(bounds){
    var rect = this.worldRectToMinimap(bounds);
    this.drawRect(this.itemsLayer, rect.x, rect.y, rect.width, rect.height, { color: 0x00ffff });
  }

  this.setWorldBounds = function(rect){
    this.worldBoundRect = rect;
  }
  
  this.update = function(){
    this.navigator.update();
    
    this.viewportRect = this.camera.getViewport();
    this.draw();
  }
  
  /////////
  //Core //
  /////////

  this.getWorldToMinimapRatio = function(){
    var ratio = this.getRatios(this.minimapDimensions, this.worldBoundRect);
    return { x: ratio.x, y: ratio.y }
  }
  
  this.getRatios = function(base, world){
    var baseWidth = base.width,
        baseHeight = base.height,
        worldWidth = world.width,
        worldHeight = world.height;
    
    var x = baseWidth/worldWidth;
    var y = baseHeight/worldHeight;
    
    var worldToMinimap = {
      x: x,
      y: y,
      min: Math.min(x,y),
      max: Math.max(x,y) 
    }

    return worldToMinimap;
  }

  this.worldRectToMinimap = function(rect){
    var ratio = this.getWorldToMinimapRatio();

    var newRect = rect.clone();
    newRect.tl = newRect.tl.subtract(this.worldBoundRect.tl);//align it to world center
    newRect.scaleWithPoint(ratio);

    return newRect;
  }

  this.minimapToWorld = function(point){
    if(!(point instanceof Point) ){
      point = new Point(point.x, point.y);
    }
    var p = point.toArray();
    var mat = mat2d.identity([]);
    var ratio = this.getWorldToMinimapRatio();
    
    mat2d.translate(mat, mat, [this.worldBoundRect.x, this.worldBoundRect.y ]);
    mat2d.scale(mat, mat, [1/ratio.x, 1/ratio.y]);
    glmatrix.vec2.transformMat2d(p, p, mat);
    return new Point(p[0], p[1]);
  }

  this.worldPointToMinimap = function(point){
    if(!(point instanceof Point) ){
      point = new Point(point.x, point.y);
    }
    
    var p = point.toArray();
    var mat = mat2d.identity([]);
    var ratio = this.getWorldToMinimapRatio();
    
    mat2d.scale(mat, mat, [ratio.x, ratio.y]);
    mat2d.translate(mat, mat, [-this.worldBoundRect.x, -this.worldBoundRect.y ]);
    
    glmatrix.vec2.transformMat2d(p, p, mat);

    return new Point(p[0], p[1]);
  }


  
  ////////////
  //Drawing //
  ////////////
  this.draw = function(){
    this.drawViewport(this.viewportRect, 0xffff00);
    this.drawWorldBounds(this.worldBoundRect, 0x000000);
    
    this.drawObjects();
  }

  this.drawViewport = function(bounds, color){
    bounds = this.worldRectToMinimap(bounds);
    var graphics = this.viewport;
    this.viewport.position.set(bounds.x, bounds.y);
    this.viewport.clear();
    this.drawRect(this.viewport, 0,0, bounds.width, bounds.height, {color:color});
  }
  
  this.drawWorldBounds = function(bounds, color){
    var worldBoundsInMinimap = bounds.clone();
    worldBoundsInMinimap.scaleWithPoint(this.getWorldToMinimapRatio());
    this.worldBounds.clear();
    
    this.drawRect(this.worldBounds, 0,0, worldBoundsInMinimap.width, worldBoundsInMinimap.height, {color:color});
    this.drawOrigin(this.worldBounds, -worldBoundsInMinimap.x, -worldBoundsInMinimap.y, worldBoundsInMinimap.width, worldBoundsInMinimap.height);
  }

  this.drawRect = function(g, x, y, width, height, options){
    var options = options || {};
    var color = options.hasOwnProperty('color') ? options.color : 0xffffff;
    var center = options.center === true;
    g.beginFill(color);
    
    if(center){
      g.drawRect( x-width/2, y-height/2, width, height);
    }else{
      g.drawRect( x, y, width, height);
    }
    g.endFill();
  },

  this.drawOrigin = function(graphics, x, y, width, height){
    var dx = x;
    var dy = y; //flip
    
    graphics.lineStyle(1, 0xffffff, 1);
    graphics.drawPolygon(x-dx,y, x+width- dx, y);
    graphics.drawPolygon(x,y-dy, x, y + height-dy);
  }

});



Object.defineProperties(Minimap.prototype, {
  width: {
    get: function (){ return this.minimapDimensions.width }
  },
  height: {
    get: function (){ return this.minimapDimensions.height }
  }
});

module.exports = Minimap;