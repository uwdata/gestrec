var GestureLibrary = (function() {

  function GestureLibrary(el) {
    this._el = el;
    this._store = new GestureStore();
    this._names = [];
    this._namelut = {};
    this._thumbsize = 100;
    this._selected = null;
  }

  var proto = GestureLibrary.prototype;

  proto.setSelected = function(name) {
    this._selected = name;
    d3.select(this._el)
      .selectAll("div.entry")
      .classed("selected", function(n) { return name === n.name; });
  };

  proto._nameCheck = function(name) {
    if (this._namelut[name] == null) {
      this._namelut[name] = this._names.length;
      this._names.push({name: name});
    }
    this.setSelected(name);
    return name;
  };
  
  proto._nameUpdate = function(oldname, newname) {
    if (newname == null || newname.length == 0) {
      throw new Error("Missing name.");
    }
    if (this._namelut[oldname] == null) {
      throw new Error("Unrecognized name: " + oldname);
    }
    if (this._namelut[newname] != null) {
      throw new Error("Name already in use: " + newname);
    }
    var idx = this._namelut[oldname];
    this._namelut[newname] = idx;
    delete this._namelut[oldname];
    this._names[idx].name = newname;
  };
  
  proto._nameRemove = function(name) {
    if (this._namelut[name] == null) {
      throw new Error("Unrecognized name: " + oldname);
    }
    var idx = this._namelut[name];
    delete this._namelut[name];
    this._names.splice(idx, 1);
  };

  proto.recognize = function(gesture) {
    return this._store.recognize(gesture);
  };

  proto.addGesture = function(name, gesture) {
    if (gesture == null) {
      gesture = name;
      name = this._selected;
    }
    this._nameCheck(name);
    this._store.addGesture(name, gesture);
    return this;
  };
  
  proto.removeGesture = function(name, gesture) {
    this._store.removeGesture(name, gesture);
    return this;
  };

  proto.addEntry = function() {
    var name = "Gesture " + (1+this._names.length);
    this._nameCheck(name);
    return this;
  };

  proto.removeEntry = function(name) {
    this._nameRemove(name);
    this._store.removeEntry(name);
    return this;
  };
  
  proto.renameEntry = function(oldname, newname) {
    this._nameUpdate(oldname, newname);
    var gestures = this._store.getGestures(oldname) || [];
    this._store.removeEntry(oldname);
    for (var i=0; i<gestures.length; ++i) {
      this._store.addGesture(newname, gestures[i]);
    }
    return this;
  };
  
  proto.toJSON = function() {
    var json = this._store.toJSON();
    json.names = this._names.map(function(n) { return n.name; });
    return JSON.stringify(json);
  };
  
  proto.fromJSON = function(json) {
    data = JSON.parse(json);
    this._store = GestureStore.fromJSON(data);
    this._names = [];
    this._namelut = {};
    this._selected = null;
    for (var i=0; i<data.names.length; ++i) {
      this._nameCheck(data.names[i]);
    }
    return this;
  };
  
  proto.render = function() {
    var lib = this;

    var el = d3.select(lib._el)
      .classed("library", true)
      .html(""); // clear contents
      
    el.append("div")
      .attr("class", "header")
      .text("Gesture Library");
    
    var entry = el.selectAll("div.entry")
        .data(lib._names)
      .enter().append("div")
        .attr("class", "entry")
        .classed("selected", function(n) { return lib._selected === n.name; })
        .on("click", function(n) { lib.setSelected(n.name); }, true);
    
    var head = entry.append("div")
      .attr("class", "head");
    
    head.append("span")
      .attr("class", "name")
      .text(function(n) { return n.name; })
      .on("dblclick", showInput);
    
    head.append("span")
      .attr("class", "control rename")
      .text("rename")
      .on("click", showInput);
    
    function showInput(n) {
      el.select(".entry.selected .input")
        .classed("show", true)
        .select("input")
          .property("value", n.name)
          .node().select();
    }
    function hideInput() {
      el.select(".entry.selected .input")
        .classed("show", false)
        .select("input")
          .property("value", "");
    }
    function rename(n) {
      var entry = el.select(".entry.selected");
      var newname = entry.select("input").property("value");
      if (n.name !== newname) {
        try {
          lib.renameEntry(n.name, newname);
        } catch (err) {
          alert(err);
        }
        entry.select(".name").text(newname);
      }
      hideInput();
    }
    
    var input = head.append("div").attr("class", "input");
    input.append("input")
      .attr("type", "text")
      .attr("placeholder", "Enter gesture name...")
      .on("keyup", function(n) {
        var key = d3.event.keyCode;
        if (key === 13) rename(n); // enter key
        if (key === 27) hideInput(); // esc key
      });
    input.append("button").text("Save").on("click", rename);
    input.append("button").text("Cancel").on("click", hideInput);

    head.append("a")
      .attr("class", "remove")
      .attr("title", "Remove Gesture")
      .text("x")
      .on("click", function(n) { lib.removeEntry(n.name).render(); });

    var instance = entry.selectAll("div.instance")
        .data(function(n) {
          return lib._store.getGestures(n.name).map(function(g) {
            return {name: n.name, gesture: g};
          });
        })
      .enter().append("div")
        .attr("class", "instance");

    instance.append("canvas")
        .attr("width", lib._thumbsize)
        .attr("height", lib._thumbsize)
        .each(function(d) {
          GestureLibrary.drawGesture(this, d.gesture);
        });

    instance.append("a")
        .attr("class", "remove")
        .attr("title", "Remove Training Example")
        .text("x")
        .on("click", function(d) {
          lib.removeGesture(d.name, d.gesture);
          lib.render();
        });

    el.append("div")
      .attr("class", "control")
      .text("+ Add New Gesture")
      .on("click", function() {
        lib.addEntry();
        lib.render();
      })

    return lib;
  };
  
  GestureLibrary.drawPoints = function(canvas, points) {
    var g = canvas.getContext("2d"),
        w = canvas.width,
        h = canvas.height;

    g.clearRect(0, 0, w, h);
    if (points.length < 1) return;

    g.lineWidth = 3;
    g.lineCap = "round";
    g.lineJoin = "round";
    g.strokeStyle = "black";

    g.beginPath();
    g.moveTo(w*points[0].x, h*points[0].y);
    for (var i=1; i<points.length; ++i) {
      g.lineTo(w*points[i].x, h*points[i].y);
    }
    g.stroke();
  };

  GestureLibrary.drawGesture = function(canvas, gesture) {
    var g = canvas.getContext("2d"),
        w = canvas.width,
        h = canvas.height,
        strokes = gesture.getStrokes();

    g.clearRect(0, 0, w, h);
    g.lineWidth = 3;
    g.lineCap = "round";

    for (var s=0; s<strokes.length; ++s) {
      var points = strokes[s].points;
      if (points.length < 1) return;

      var start = 240;
      var len = points.length / 2, frac;
      for (var i=2; i<points.length; i+=2) {
        frac = (i/2) / (len-1);
        drawLine(g,
          w*points[i-2], h*points[i-1],
          w*points[i],   h*points[i+1],
          Math.floor(start * frac)
        );
      }
    }
  };
  
  function drawLine(g, x1, y1, x2, y2, gray) {
    g.strokeStyle = "rgb("+[gray,gray,gray].join(",")+")";
    g.beginPath();
    g.moveTo(x1, y1);
    g.lineTo(x2, y2);
    g.stroke();
  }

  return GestureLibrary;

})();