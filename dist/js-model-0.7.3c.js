/*  js-model JavaScript library, version 0.7.3c
 *  (c) 2010 Ben Pickles
 *
 *  Released under MIT license.
 */
var Model = function(name, methods) {
  var model = function(attributes) {
    this._name = name;
    this.attributes = attributes || {};
    this.callbacks = {};
    this.changes = {};
    this.collection = collection;
    this.errors = new Model.Errors(this);
  };

  var collection;
  if (methods && methods.collection) {
    collection = methods.collection;
    delete methods.collection;
  } else {
    collection = Model.Collection();
  };

  model = $.extend(model, collection);

  model.prototype = $.extend({
    attr: function(name, value) {
      if (arguments.length == 0) {
        return $.extend(_.clone(this.attributes), this.changes);
      } else if (arguments.length == 2) {
        if (_.isEqual(this.attributes[name], value)) {
          delete this.changes[name];
        } else {
          this.changes[name] = value;
        };
        return this;
      } else if (typeof name == "object") {
        for (var key in name) {
          this.attr(key, name[key]);
        };
        return this;
      } else {
        return (name in this.changes) ?
          this.changes[name] :
          this.attributes[name];
      };
    },

    bind: function(event, callback) {
      this.callbacks[event] = this.callbacks[event] || [];
      this.callbacks[event].push(callback);
      return this;
    },

    callPersistMethod: function(method, callback) {
      var self = this;

      var manageCollection = function(changes) {
        if (!self.collection) return;
        if (method == "create") {
          self.collection.add(self);
        } else if (method == "destroy") {
          self.collection.remove(self.id());
          self.collection.trigger('destroy', [self]);
        } else {
          self.collection.trigger(method, [self, changes]);
        };
      };

      var wrappedCallback = function(success) {
        if (success) {
          var changed = _.clone(self.changes);

          self.merge(changed).reset();

          manageCollection(changed);

          self.trigger(method);
        };

        var value;

        if (callback) value = callback.apply(self, arguments);

        return value;
      };

      if (this.persistence) {
        this.persistence[method](this, wrappedCallback);
      } else {
        wrappedCallback.call(this, true);
      };
    },

    destroy: function(callback) {
      this.callPersistMethod("destroy", callback);
      return this;
    },

    id: function() {
      return this.attributes.id || null;
    },

    merge: function(attributes) {
      $.extend(this.attributes, attributes);
      return this;
    },

    newRecord: function() {
      return this.id() == null;
    },

    reset: function() {
      this.errors.clear();
      this.changes = {};
      return this;
    },

    save: function(callback) {
      if (this.valid()) {
        var method = this.newRecord() ? "create" : "update";
        this.callPersistMethod(method, callback);
      } else {
        if (callback) callback(false);
      }

      return this;
    },

    trigger: function(name, data) {
      var callbacks = this.callbacks[name];

      if (callbacks) {
        for (var i = 0; i < callbacks.length; i++) {
          callbacks[i].apply(this, data || []);
        };
      };

      return this;
    },

    update: function(attributes) {
      this.merge(attributes).trigger("update");
      return this;
    },

    valid: function() {
      this.errors.clear();
      this.validate();
      return this.errors.size() == 0;
    },

    validate: function() {
      return this;
    }
  }, methods);

  return model;
};
Model.Errors = function(model) {
  this.errors = {};
  this.model = model;
};

Model.Errors.prototype = {
  add: function(attribute, message) {
    if (!this.errors[attribute]) this.errors[attribute] = [];
    this.errors[attribute].push(message);
  },

  all: function() {
    return this.errors;
  },

  clear: function() {
    this.errors = {};
  },

  each: function(func) {
    var self = this;

    for (var attribute in this.errors) {
      for (var i = 0; i < this.errors[attribute].length; i++) {
        func.call(this, attribute, this.errors[attribute][i]);
      }
    }
  },

  on: function(attribute) {
    return this.errors[attribute] || [];
  },

  size: function() {
    var count = 0;
    this.each(function() { count++; });
    return count;
  }
}
Model.Log = function() {
  if (window.console) window.console.log.apply(window.console, arguments);
};
Model.Collection = function(methods) {
  var model_collection = function(collection) {
    this.collection = collection || [];
    this.callbacks = {};
  };

  var chain = function(collection) {
    return new model_collection(collection);
  };

  model_collection.prototype = $.extend({
    add: function() {
      var added = [];

      for (var i = 0; i < arguments.length; i++) {
        var model = arguments[i];
        var existing_elem = this.detect(function() {
          return this.id() != null && this.id() == model.id();
        });

        if (!existing_elem) {
          this.collection.push(model);
          added.push(model);
        }
      };

      if (added.length > 0) this.trigger("add", added);

      return this;
    },

    all: function() {
      return this.collection;
    },

    bind: function(event, callback) {
      this.callbacks[event] = this.callbacks[event] || [];
      this.callbacks[event].push(callback);
      return this;
    },

    count: function() {
      return this.collection.length;
    },

    detect: function(func) {
      return _.detect(this.all(), function(model, i) {
        return func.call(model, i);
      }) || null;
    },

    each: function(func) {
      $.each(this.all(), function(i) {
        func.call(this, i);
      });
      return this;
    },

    find: function(id) {
      return this.detect(function() {
        return this.id() == id;
      });
    },

    first: function() {
      return this.all()[0] || null;
    },

    last: function() {
      var all = this.all();
      return all[all.length - 1] || null;
    },

    remove: function(id) {
      var ids = _.invoke(this.collection, 'id');
      var index = _.indexOf(ids, id);
      if (index > -1) {
        this.collection.splice(index, 1);
        this.trigger("remove");
        return true;
      } else {
        return false;
      };
    },

    select: function(func) {
      var selected = _.select(this.all(), function(model, i) {
        return func.call(model, i);
      });
      return chain(selected);
    },

    sort: function(func) {
      var sorted = _.sortBy(this.all(), function(model, i) {
        return func.call(model, i);
      });
      return chain(sorted);
    },

    trigger: function(name, data) {
      var callbacks = this.callbacks[name];

      if (callbacks) {
        for (var i = 0; i < callbacks.length; i++) {
          callbacks[i].apply(this, data || []);
        };
      };

      return this;
    }
  }, methods);

  return new model_collection();
};
Model.RestPersistence = function(resource, methods) {
  var model_resource = function() {
    this.resource = resource;
  };

  model_resource.prototype = $.extend({
    create: function(model, callback) {
      return this.xhr('POST', this.create_path(model), model, callback);
    },

    create_path: function(model) {
      return this.resource;
    },

    destroy: function(model, callback) {
      return this.xhr('DELETE', this.destroy_path(model), model, callback);
    },

    destroy_path: function(model) {
      return this.update_path(model);
    },

    params: function(model) {
      var params;
      if (model) {
        var attributes = model.attr();
        delete attributes.id;
        params = {};
        params[model._name] = attributes;
      } else {
        params = null;
      }
      return params;
    },

    parseResponseData: function(xhr) {
      try {
        return jQuery.parseJSON(xhr.responseText);
      } catch(e) {
        Model.Log(e);
      };
    },

    update: function(model, callback) {
      return this.xhr('PUT', this.update_path(model), model, callback);
    },

    update_path: function(model) {
      return [this.resource, model.id()].join('/');
    },

    xhr: function(method, url, model, callback) {
      var self = this;
      var data = method == "DELETE" ? null : this.params(model);

      return $.ajax({
        type: method,
        url: url,
        dataType: "text",
        data: data,
        complete: function(xhr, textStatus) {
          self.xhrComplete(xhr, textStatus, model, callback);
        }
      });
    },

    xhrComplete: function(xhr, textStatus, model, callback) {
      var data = this.parseResponseData(xhr);
      var success = textStatus == "success";

      if (data) {
        if (success) {
          model.attr(data);
        } else if (xhr.status == 422) {
          model.errors.clear();

          for (var attribute in data) {
            for (var i = 0; i < data[attribute].length; i++) {
              model.errors.add(attribute, data[attribute][i]);
            }
          }
        }
      }

      if (callback) callback.call(model, success, xhr);
    }
  }, methods);

  return new model_resource();
};

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

