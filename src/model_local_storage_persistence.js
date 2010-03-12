// TODO: Work on me some more...

Model.LocalStoragePersistence = function(keyName, methods) {

  if(!('localStorage' in window)) throw new Error("This browser does not support local storage.");

  var model_resource = function() {
    this.keyName = keyName;
  };

  model_resource.prototype = $.extend({
    
    create: function(model, callback) {
      
    },
    
    destroy: function(model, callback) {
      
    },
    
    update: function(model, callback) {
      
    }
  
  }, methods);

  return new model_resource();
};
