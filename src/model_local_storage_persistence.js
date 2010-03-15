// TODO: Work on me some more...

Model.LocalStoragePersistence = function(keyName, methods, defer) {

  if(!('localStorage' in window)) throw new Error("This browser does not support local storage.");

  var model_resource = function() {
    this.keyName = keyName;
    this.timerHandle = false;
  };

  model_resource.prototype = $.extend({
    
    populateCollection: function(collection, modelClass) {
      var modelData = this.loadFromLocalStorage();
      for (var i=0; i < modelData.length; i++) {
        var data = modelData[i],
            mdl = new modelClass(data);
        collection.add(mdl);
      };
      return collection;
    },
    
    create: function(model, callback) {
      // generate a unique-ish id for the model...
      model.attr({
        'id': ((new Date).getTime() + _.uniqueId())
      });
      if (callback) callback.call(model, true, null);
      
      return this.saveToLocalStorage( model.collection.all() );
    },
    
    destroy: function(model, callback) {
      if (callback) callback.call(model, true, null);
      return this.saveToLocalStorage( model.collection.all() );
    },
    
    update: function(model, callback) {
      if (callback) callback.call(model, true, null);
      return this.saveToLocalStorage( model.collection.all() );
    },
    
    saveToLocalStorage: function(modelList) {
      var data = _.map(modelList, function(mdl){ return mdl.attr(); });
      if(defer) {
        // Save the localStorage a little later...
        var self = this;
        if(this.timerHandle) clearTimeout(this.timerHandle);
        this.timerHandle = setTimeout(function(){
          window.localStorage[self.keyName] = JSON.stringify(data);
          self.timerHandle = false;
          console.log('SAVING TO LOCAL STORAGE (Defered):')
          console.log(data)
        }, (defer * 1000)); // Defer is defined in seconds...
      }
      else {
        window.localStorage[this.keyName] = JSON.stringify(data);
        console.log('SAVING TO LOCAL STORAGE:')
        console.log(data)
      }
      return true;
    },
    
    loadFromLocalStorage: function() {
      if(this.keyName in window.localStorage)
        return jQuery.parseJSON( window.localStorage[this.keyName] );
      else
        return []
    }
  
  }, methods);

  return new model_resource();
};
